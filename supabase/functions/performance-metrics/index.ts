import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? ""
    );

    const url = new URL(req.url);
    const endpoint = url.pathname.split("/").pop();

    // GET /performance-metrics/history - Historical performance across model versions
    if (endpoint === "history") {
      const { data: performanceData, error: perfError } = await supabase
        .from("performance_history")
        .select(`
          id,
          model_id,
          metrics,
          evaluated_at,
          data_period_start,
          data_period_end,
          model_artifacts (
            version,
            r2_score,
            rmse,
            mae
          )
        `)
        .order("evaluated_at", { ascending: true })
        .limit(100);

      if (perfError) throw perfError;

      // Also fetch fairness evaluations for trend analysis
      const { data: fairnessData, error: fairnessError } = await supabase
        .from("fairness_evaluations")
        .select("*")
        .order("evaluation_date", { ascending: true })
        .limit(100);

      if (fairnessError) throw fairnessError;

      // Format data for time-series charting
      const timeSeries = {
        performance: performanceData?.map(p => {
          const modelArtifact = Array.isArray(p.model_artifacts) ? p.model_artifacts[0] : p.model_artifacts;
          return {
            timestamp: p.evaluated_at,
            model_version: modelArtifact?.version,
            metrics: p.metrics,
            r2_score: modelArtifact?.r2_score,
            rmse: modelArtifact?.rmse,
            mae: modelArtifact?.mae,
          };
        }) || [],
        fairness: fairnessData?.map(f => ({
          timestamp: f.evaluation_date,
          model_version: f.model_version,
          demographic_parity_diff: f.demographic_parity_diff,
          equalized_odds_ratio: f.equalized_odds_ratio,
          f1_variance: f.f1_variance,
          calibration_error: f.calibration_error,
          passed_thresholds: f.passed_thresholds,
        })) || [],
      };

      return new Response(
        JSON.stringify(timeSeries),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        }
      );
    }

    // GET /performance-metrics/current - Current performance on recent data
    if (endpoint === "current") {
      // Get the most recent 30 days of crime data
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const { data: recentCrimes, error: crimeError } = await supabase
        .from("crime_stream")
        .select("*")
        .gte("date", thirtyDaysAgo.toISOString())
        .order("date", { ascending: false })
        .limit(10000);

      if (crimeError) throw crimeError;

      // Get active model
      const { data: activeModel, error: modelError } = await supabase
        .from("model_artifacts")
        .select("*")
        .eq("is_active", true)
        .single();

      if (modelError) {
        console.error("No active model found:", modelError);
      }

      // Calculate basic statistics on recent data
      const totalRecords = recentCrimes?.length || 0;
      const arrestRate = recentCrimes?.filter(c => c.arrest).length / totalRecords;
      
      // Group by community area for distribution analysis
      const communityDistribution: Record<string, number> = {};
      recentCrimes?.forEach(crime => {
        const area = crime.community_area?.toString() || "unknown";
        communityDistribution[area] = (communityDistribution[area] || 0) + 1;
      });

      // Calculate diversity metrics
      const uniqueAreas = Object.keys(communityDistribution).length;
      const avgCrimesPerArea = totalRecords / uniqueAreas;

      const currentMetrics = {
        last_updated: new Date().toISOString(),
        data_period: {
          start: thirtyDaysAgo.toISOString(),
          end: new Date().toISOString(),
          days: 30,
        },
        model: {
          version: activeModel?.version || "unknown",
          r2_score: activeModel?.r2_score || null,
          rmse: activeModel?.rmse || null,
          mae: activeModel?.mae || null,
        },
        recent_data: {
          total_records: totalRecords,
          arrest_rate: arrestRate,
          unique_areas: uniqueAreas,
          avg_crimes_per_area: avgCrimesPerArea,
          community_distribution: Object.entries(communityDistribution)
            .sort(([,a], [,b]) => b - a)
            .slice(0, 10)
            .map(([area, count]) => ({ area, count })),
        },
        health: {
          data_freshness: totalRecords > 0 ? "healthy" : "no_recent_data",
          coverage: uniqueAreas >= 50 ? "good" : "limited",
        },
      };

      return new Response(
        JSON.stringify(currentMetrics),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        }
      );
    }

    // GET /performance-metrics/ingestion-status - Latest ingestion stats
    if (endpoint === "ingestion-status") {
      const { data: latestLogs, error: logError } = await supabase
        .from("ingestion_log")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(10);

      if (logError) throw logError;

      const totalRecordsIngested = latestLogs?.reduce((sum, log) => sum + (log.new_rows || 0), 0) || 0;
      const totalErrors = latestLogs?.reduce((sum, log) => sum + (log.errors || 0), 0) || 0;
      const latestBatch = latestLogs?.[0];

      return new Response(
        JSON.stringify({
          last_ingestion: latestBatch?.created_at || null,
          last_batch_id: latestBatch?.batch_id || null,
          last_new_rows: latestBatch?.new_rows || 0,
          recent_batches: latestLogs || [],
          total_ingested: totalRecordsIngested,
          total_errors: totalErrors,
          success_rate: totalRecordsIngested / (totalRecordsIngested + totalErrors) || 0,
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        }
      );
    }

    return new Response(
      JSON.stringify({ error: "Unknown endpoint" }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 404,
      }
    );
  } catch (error) {
    console.error("Performance metrics error:", error);
    const errorMsg = error instanceof Error ? error.message : String(error);
    return new Response(
      JSON.stringify({
        error: errorMsg,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
