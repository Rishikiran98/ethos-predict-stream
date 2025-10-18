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
    
    // Add query parameters for efficient data fetching (optimized to avoid CPU timeout)
    chicagoApiUrl.searchParams.append("$select", "case_number,date,primary_type,community_area,arrest,latitude,longitude");
    chicagoApiUrl.searchParams.append("$limit", "250"); // Reduced to 250 to stay well under CPU limits
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

    interface CrimeRecord {
      case_number: string;
      date: string;
      primary_type: string;
      community_area?: string;
      arrest?: string | boolean;
      latitude?: string;
      longitude?: string;
    }

    let newRows = 0;
    let duplicates = 0;
    let errors = 0;
    const errorDetails: string[] = [];

    // Process records in smaller batches to avoid CPU timeout
    const batchSize = 25; // Reduced to 25 records per batch for better CPU management
    for (let i = 0; i < crimeData.length; i += batchSize) {
      const batch = crimeData.slice(i, i + batchSize);
      
      const recordsToInsert = batch
        .filter((record: CrimeRecord) => record.case_number && record.date && record.primary_type)
        .map((record: CrimeRecord) => ({
          case_number: record.case_number,
          date: record.date,
          primary_type: record.primary_type,
          community_area: record.community_area ? parseInt(record.community_area) : null,
          arrest: record.arrest === "true" || record.arrest === true,
          latitude: record.latitude ? parseFloat(record.latitude) : null,
          longitude: record.longitude ? parseFloat(record.longitude) : null,
        }));

      if (recordsToInsert.length === 0) continue;

      try {
        const { data, error: insertError } = await supabase
          .from("crime_stream")
          .upsert(recordsToInsert, {
            onConflict: "case_number",
            ignoreDuplicates: false
          })
          .select();

        if (insertError) {
          errors += recordsToInsert.length;
          errorDetails.push(`Batch ${i}-${i + batchSize}: ${insertError.message}`);
        } else {
          newRows += data?.length || 0;
        }
        
        // Add small delay between batches to prevent CPU spike
        await new Promise(resolve => setTimeout(resolve, 50));
      } catch (err) {
        errors += recordsToInsert.length;
        const errorMsg = err instanceof Error ? err.message : String(err);
        errorDetails.push(`Batch ${i}-${i + batchSize}: ${errorMsg}`);
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
