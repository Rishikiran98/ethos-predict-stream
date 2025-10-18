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
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const batchId = `batch_${Date.now()}`;
    const startTime = new Date().toISOString();

    console.log(`Starting data ingestion batch: ${batchId}`);

    // Fetch Chicago crime data from open data portal
    const sodaAppToken = Deno.env.get("SODA_APP_TOKEN") || "";
    const chicagoApiUrl = new URL("https://data.cityofchicago.org/resource/ijzp-q8t2.json");
    
    // Add query parameters for efficient data fetching
    chicagoApiUrl.searchParams.append("$select", "case_number,date,primary_type,community_area,arrest,latitude,longitude");
    chicagoApiUrl.searchParams.append("$limit", "5000");
    chicagoApiUrl.searchParams.append("$order", "date DESC");
    
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    
    if (sodaAppToken) {
      headers["X-App-Token"] = sodaAppToken;
    }

    const response = await fetch(chicagoApiUrl.toString(), { headers });

    if (!response.ok) {
      throw new Error(`Chicago API returned ${response.status}: ${await response.text()}`);
    }

    const crimeData = await response.json();
    console.log(`Fetched ${crimeData.length} records from Chicago API`);

    let newRows = 0;
    let duplicates = 0;
    let errors = 0;
    const errorDetails: string[] = [];

    // Process and insert data
    for (const record of crimeData) {
      try {
        // Skip records without required fields
        if (!record.case_number || !record.date || !record.primary_type) {
          continue;
        }

        const { error: insertError } = await supabase
          .from("crime_stream")
          .upsert({
            case_number: record.case_number,
            date: record.date,
            primary_type: record.primary_type,
            community_area: record.community_area ? parseInt(record.community_area) : null,
            arrest: record.arrest === "true" || record.arrest === true,
            latitude: record.latitude ? parseFloat(record.latitude) : null,
            longitude: record.longitude ? parseFloat(record.longitude) : null,
          }, {
            onConflict: "case_number",
            ignoreDuplicates: true
          });

        if (insertError) {
          if (insertError.code === "23505") {
            // Duplicate key error
            duplicates++;
          } else {
            errors++;
            errorDetails.push(`${record.case_number}: ${insertError.message}`);
          }
        } else {
          newRows++;
        }
      } catch (err) {
        errors++;
        const errorMsg = err instanceof Error ? err.message : String(err);
        errorDetails.push(`${record.case_number}: ${errorMsg}`);
      }
    }

    const endTime = new Date().toISOString();

    // Log ingestion results
    const { error: logError } = await supabase
      .from("ingestion_log")
      .insert({
        batch_id: batchId,
        start_time: startTime,
        end_time: endTime,
        new_rows: newRows,
        duplicates: duplicates,
        errors: errors,
        error_details: errorDetails.length > 0 ? errorDetails.join("; ") : null,
      });

    if (logError) {
      console.error("Failed to log ingestion:", logError);
    }

    console.log(`Ingestion complete: ${newRows} new, ${duplicates} duplicates, ${errors} errors`);

    return new Response(
      JSON.stringify({
        success: true,
        batch_id: batchId,
        new_rows: newRows,
        duplicates: duplicates,
        errors: errors,
        total_fetched: crimeData.length,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    console.error("Ingestion error:", error);
    const errorMsg = error instanceof Error ? error.message : String(error);
    return new Response(
      JSON.stringify({
        success: false,
        error: errorMsg,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
