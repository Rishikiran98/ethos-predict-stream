import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { action, features } = await req.json();

    // Fetch recent crime data for context
    const { data: recentCrimes, error: crimeError } = await supabase
      .from('crime_stream')
      .select('*')
      .order('date', { ascending: false })
      .limit(500);

    if (crimeError) throw crimeError;

    // Aggregate crime statistics by type and area
    const crimeStats: Record<string, any> = {};
    const areaStats: Record<string, any> = {};
    
    recentCrimes?.forEach(crime => {
      const type = crime.primary_type || 'Unknown';
      const area = crime.community_area?.toString() || 'Unknown';
      
      if (!crimeStats[type]) {
        crimeStats[type] = { total: 0, arrests: 0 };
      }
      crimeStats[type].total++;
      if (crime.arrest) crimeStats[type].arrests++;
      
      if (!areaStats[area]) {
        areaStats[area] = { total: 0, arrests: 0 };
      }
      areaStats[area].total++;
      if (crime.arrest) areaStats[area].arrests++;
    });

    if (action === 'predict') {
      // Generate prediction using Lovable AI
      const prompt = `You are an expert crime analyst. Analyze this crime incident and predict the arrest probability.

Crime Features:
- Type: ${features.primary_type}
- Community Area: ${features.community_area}
- Time: ${features.hour}:00 on ${features.day_of_week}
- Location: (${features.latitude}, ${features.longitude})
- Month: ${features.month}

Historical Context:
- ${features.primary_type} crimes: ${crimeStats[features.primary_type]?.total || 0} incidents, ${((crimeStats[features.primary_type]?.arrests || 0) / (crimeStats[features.primary_type]?.total || 1) * 100).toFixed(1)}% arrest rate
- Area ${features.community_area}: ${areaStats[features.community_area]?.total || 0} incidents, ${((areaStats[features.community_area]?.arrests || 0) / (areaStats[features.community_area]?.total || 1) * 100).toFixed(1)}% arrest rate

Return ONLY a JSON object with this structure:
{
  "arrest_probability": <float 0-1>,
  "risk_score": <float 0-1>,
  "confidence": <float 0-1>,
  "risk_level": "low" | "medium" | "high",
  "contributing_factors": [
    {"feature": "string", "contribution": <float -1 to 1>, "importance": <float 0-1>}
  ],
  "explanation": "brief explanation"
}`;

      const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${lovableApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'google/gemini-2.5-flash',
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.3,
        }),
      });

      if (!aiResponse.ok) {
        const errorText = await aiResponse.text();
        console.error('AI API error:', aiResponse.status, errorText);
        throw new Error(`AI API error: ${aiResponse.status}`);
      }

      const aiData = await aiResponse.json();
      const rawContent = aiData.choices[0].message.content;
      
      // Parse JSON from response (handle markdown code blocks)
      let prediction;
      try {
        const jsonMatch = rawContent.match(/\{[\s\S]*\}/);
        prediction = jsonMatch ? JSON.parse(jsonMatch[0]) : JSON.parse(rawContent);
      } catch (e) {
        console.error('Failed to parse AI response:', rawContent);
        throw new Error('Invalid AI response format');
      }

      // Store prediction in database
      const { data: savedPrediction, error: saveError } = await supabase
        .from('predictions')
        .insert({
          prediction_id: `pred_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          community_area: features.community_area?.toString() || 'Unknown',
          date_range_start: new Date().toISOString().split('T')[0],
          date_range_end: new Date().toISOString().split('T')[0],
          predicted_crimes: Math.round(prediction.arrest_probability * 100),
          confidence: prediction.confidence,
          risk_level: prediction.risk_level,
          contributing_factors: prediction.contributing_factors || [],
          model_version: 'lovable-ai-v1',
          status: 'completed',
        })
        .select()
        .single();

      if (saveError) {
        console.error('Error saving prediction:', saveError);
      }

      // Log to audit
      await supabase.from('audit_logs').insert({
        operation_type: 'prediction',
        status: 'success',
        message: `Generated prediction for ${features.primary_type} in area ${features.community_area}`,
        details: { features, prediction },
      });

      return new Response(
        JSON.stringify({
          ...prediction,
          prediction_id: savedPrediction?.prediction_id,
          timestamp: new Date().toISOString(),
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'batch_predict') {
      // Batch predictions for latest crimes
      const crimesToPredict = recentCrimes?.slice(0, 50) || [];
      const predictions = [];

      for (const crime of crimesToPredict) {
        const features = {
          primary_type: crime.primary_type,
          community_area: crime.community_area,
          hour: new Date(crime.date).getHours(),
          day_of_week: new Date(crime.date).toLocaleDateString('en-US', { weekday: 'long' }),
          month: new Date(crime.date).getMonth() + 1,
          latitude: crime.latitude,
          longitude: crime.longitude,
        };

        // Quick heuristic-based prediction for batch
        const crimeTypeStats = crimeStats[features.primary_type] || { total: 1, arrests: 0 };
        const areaStatsData = areaStats[features.community_area] || { total: 1, arrests: 0 };
        
        const typeArrestRate = crimeTypeStats.arrests / crimeTypeStats.total;
        const areaArrestRate = areaStatsData.arrests / areaStatsData.total;
        const arrestProb = (typeArrestRate * 0.6 + areaArrestRate * 0.4);
        
        predictions.push({
          case_number: crime.case_number,
          arrest_probability: arrestProb,
          risk_score: arrestProb,
          confidence: 0.75,
          risk_level: arrestProb > 0.3 ? 'high' : arrestProb > 0.15 ? 'medium' : 'low',
        });
      }

      return new Response(
        JSON.stringify({ predictions, count: predictions.length }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    throw new Error('Invalid action');

  } catch (error) {
    console.error('Error in ml-predict:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
