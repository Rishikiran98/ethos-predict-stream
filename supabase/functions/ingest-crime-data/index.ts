import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Input validation
const RequestSchema = z.object({
  manual_trigger: z.boolean().optional(),
});

// Simple in-memory rate limiter (stricter for admin operations)
const rateLimiter = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT = 5; // requests per minute (strict for data ingestion)
const RATE_WINDOW = 60000; // 1 minute

function checkRateLimit(userId: string): boolean {
  const now = Date.now();
  const userLimit = rateLimiter.get(userId);
  
  if (!userLimit || now > userLimit.resetAt) {
    rateLimiter.set(userId, { count: 1, resetAt: now + RATE_WINDOW });
    return true;
  }
  
  if (userLimit.count >= RATE_LIMIT) {
    return false;
  }
  
  userLimit.count++;
  return true;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Authentication check - require valid JWT AND admin role
    const authHeader = req.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');
    
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );
    
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Authentication required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if user has admin role
    const { data: hasAdminRole, error: roleError } = await supabase
      .rpc('has_role', { _user_id: user.id, _role: 'admin' });

    if (roleError || !hasAdminRole) {
      return new Response(
        JSON.stringify({ error: 'Admin privileges required' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Rate limiting
    if (!checkRateLimit(user.id)) {
      return new Response(
        JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate input
    const rawBody = await req.json();
    const validationResult = RequestSchema.safeParse(rawBody);
    
    if (!validationResult.success) {
      return new Response(
        JSON.stringify({ error: 'Invalid request parameters' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

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
      throw new Error(`Chicago API error: ${response.status}`);
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
          errorDetails.push(`Batch error`);
        } else {
          newRows += data?.length || 0;
        }
        
        // Add small delay between batches to prevent CPU spike
        await new Promise(resolve => setTimeout(resolve, 50));
      } catch (err) {
        errors += recordsToInsert.length;
        errorDetails.push(`Processing error`);
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
  } catch (error: any) {
    console.error('Ingestion error:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: 'Data ingestion failed. Please try again later.'
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
