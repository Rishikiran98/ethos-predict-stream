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
    // Authentication check - require valid JWT
    const authHeader = req.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      console.error('Authentication failed:', authError);
      return new Response(
        JSON.stringify({ error: 'Unauthorized - valid authentication required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const url = new URL(req.url);
    const endpoint = url.pathname.split('/').pop();

    // Get geographic predictions aggregated by area
    if (endpoint === 'geo-predictions') {
      const { data: crimes } = await supabase
        .from('crime_stream')
        .select('*')
        .order('date', { ascending: false })
        .limit(1000);

      const areaAggregation: Record<string, any> = {};
      
      crimes?.forEach(crime => {
        const area = crime.community_area?.toString() || 'Unknown';
        if (!areaAggregation[area]) {
          areaAggregation[area] = {
            community_area: area,
            count: 0,
            arrests: 0,
            latSum: 0,
            lonSum: 0,
            latCount: 0,
          };
        }
        areaAggregation[area].count++;
        if (crime.arrest) areaAggregation[area].arrests++;
        if (crime.latitude && crime.longitude) {
          areaAggregation[area].latSum += crime.latitude;
          areaAggregation[area].lonSum += crime.longitude;
          areaAggregation[area].latCount++;
        }
      });

      const predictions = Object.values(areaAggregation).map((area: any) => {
        const arrestProb = area.count > 0 ? area.arrests / area.count : 0;
        return {
          community_area: area.community_area,
          risk_score: arrestProb,
          arrest_prob: arrestProb,
          count: area.count,
          latitude: area.latCount > 0 ? area.latSum / area.latCount : 41.8781,
          longitude: area.latCount > 0 ? area.lonSum / area.latCount : -87.6298,
          risk_level: arrestProb > 0.3 ? 'high' : arrestProb > 0.15 ? 'medium' : 'low',
        };
      });

      return new Response(
        JSON.stringify({ predictions, timestamp: new Date().toISOString() }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get timeline activity
    if (endpoint === 'timeline') {
      const { data: crimes } = await supabase
        .from('crime_stream')
        .select('date, arrest, community_area')
        .order('date', { ascending: false })
        .limit(5000);

      const dailyAggregation: Record<string, any> = {};
      
      crimes?.forEach(crime => {
        const date = crime.date.split('T')[0];
        if (!dailyAggregation[date]) {
          dailyAggregation[date] = { date, count: 0, arrests: 0 };
        }
        dailyAggregation[date].count++;
        if (crime.arrest) dailyAggregation[date].arrests++;
      });

      const timeline = Object.values(dailyAggregation)
        .map((day: any) => ({
          date: day.date,
          count: day.count,
          risk_avg: day.count > 0 ? day.arrests / day.count : 0,
          arrests: day.arrests,
        }))
        .sort((a: any, b: any) => a.date.localeCompare(b.date))
        .slice(-90); // Last 90 days

      return new Response(
        JSON.stringify({ timeline, timestamp: new Date().toISOString() }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get hotspots using spatial clustering
    if (endpoint === 'hotspots') {
      const { data: crimes } = await supabase
        .from('crime_stream')
        .select('latitude, longitude, primary_type, arrest')
        .not('latitude', 'is', null)
        .not('longitude', 'is', null)
        .order('date', { ascending: false })
        .limit(1000);

      // Simple grid-based clustering
      const gridSize = 0.02; // ~1.2 miles
      const grid: Record<string, any> = {};

      crimes?.forEach(crime => {
        const gridX = Math.floor(crime.latitude / gridSize);
        const gridY = Math.floor(crime.longitude / gridSize);
        const key = `${gridX},${gridY}`;
        
        if (!grid[key]) {
          grid[key] = {
            latitude: crime.latitude,
            longitude: crime.longitude,
            count: 0,
            arrests: 0,
            types: {} as Record<string, number>,
          };
        }
        grid[key].count++;
        if (crime.arrest) grid[key].arrests++;
        grid[key].types[crime.primary_type] = (grid[key].types[crime.primary_type] || 0) + 1;
      });

      const hotspots = Object.values(grid)
        .filter((cell: any) => cell.count >= 5)
        .map((cell: any) => {
          const topType = Object.entries(cell.types)
            .sort(([, a], [, b]) => (b as number) - (a as number))[0];
          
          return {
            latitude: cell.latitude,
            longitude: cell.longitude,
            intensity: cell.count,
            arrest_rate: cell.count > 0 ? cell.arrests / cell.count : 0,
            primary_type: topType?.[0] || 'Unknown',
            risk_level: cell.count > 50 ? 'high' : cell.count > 20 ? 'medium' : 'low',
          };
        })
        .sort((a: any, b: any) => b.intensity - a.intensity)
        .slice(0, 20);

      return new Response(
        JSON.stringify({ hotspots, timestamp: new Date().toISOString() }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get trend analysis
    if (endpoint === 'trends') {
      const { data: crimes } = await supabase
        .from('crime_stream')
        .select('date, primary_type, community_area')
        .order('date', { ascending: false })
        .limit(10000);

      const now = new Date();
      const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

      let thisWeek = 0, lastWeek = 0;

      crimes?.forEach(crime => {
        const date = new Date(crime.date);
        if (date >= oneWeekAgo) thisWeek++;
        else if (date >= twoWeeksAgo) lastWeek++;
      });

      const weeklyChange = lastWeek > 0 
        ? ((thisWeek - lastWeek) / lastWeek * 100).toFixed(1)
        : '0.0';

      return new Response(
        JSON.stringify({
          weekly_trend: {
            this_week: thisWeek,
            last_week: lastWeek,
            change_percent: parseFloat(weeklyChange),
            direction: thisWeek > lastWeek ? 'increase' : 'decrease',
          },
          timestamp: new Date().toISOString(),
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    throw new Error('Invalid endpoint');

  } catch (error) {
    console.error('Error in ml-analytics:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
