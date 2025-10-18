import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MapPin, TrendingUp, AlertTriangle } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState } from "react";
import Plot from 'react-plotly.js';

const GeographicView = () => {
  const [geoData, setGeoData] = useState<any>(null);

  // Fetch Chicago GeoJSON boundaries
  useEffect(() => {
    const loadGeo = async () => {
      try {
        const res = await fetch('/chicago-boundaries.geojson');
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const text = await res.text();
        const data = JSON.parse(text || '{"type":"FeatureCollection","features":[]}');
        setGeoData(data);
      } catch (err) {
        console.error('Failed to load GeoJSON:', err);
        // Fallback to empty collection so the map can still render
        setGeoData({ type: 'FeatureCollection', features: [] });
      }
    };
    loadGeo();
  }, []);

  // Fetch predictions from database
  const { data: predictions, isLoading } = useQuery({
    queryKey: ['geographic-predictions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('predictions')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);
      
      if (error) throw error;
      return data || [];
    },
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  const queryClient = useQueryClient();
  useEffect(() => {
    const channel = supabase
      .channel('predictions-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'predictions' }, () => {
        queryClient.invalidateQueries({ queryKey: ['geographic-predictions'] });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  // Aggregate predictions by community area
  const hotspots = predictions?.reduce((acc: any[], pred) => {
    const existing = acc.find(h => h.area === pred.community_area);
    if (existing) {
      existing.crimes += pred.predicted_crimes;
      existing.count += 1;
    } else {
      acc.push({
        area: pred.community_area,
        crimes: pred.predicted_crimes,
        risk: pred.risk_level,
        confidence: pred.confidence,
        count: 1
      });
    }
    return acc;
  }, []) || [];

  // Sort by crime count
  const topHotspots = hotspots
    .sort((a, b) => b.crimes - a.crimes)
    .slice(0, 6);

  // Prepare choropleth data
  const choroplethData = geoData && predictions ? [{
    type: 'choroplethmapbox' as const,
    geojson: geoData,
    locations: predictions.map(p => p.community_area),
    z: predictions.map(p => p.predicted_crimes),
    featureidkey: 'properties.community',
    colorscale: [
      [0, '#22c55e'],
      [0.5, '#f59e0b'],
      [1, '#ef4444']
    ],
    colorbar: {
      title: 'Predicted Crimes',
      thickness: 20,
      len: 0.7,
    },
    hovertemplate: '<b>%{location}</b><br>' +
                   'Predicted Crimes: %{z}<br>' +
                   '<extra></extra>',
    marker: {
      opacity: 0.7,
      line: {
        color: 'rgb(255,255,255)',
        width: 1
      }
    }
  }] : [];

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case "high": return "bg-destructive/10 text-destructive border-destructive/20";
      case "medium": return "bg-warning/10 text-warning border-warning/20";
      case "low": return "bg-success/10 text-success border-success/20";
      default: return "bg-muted";
    }
  };

  const highRiskCount = hotspots.filter(h => h.risk === 'high').length;
  return (
    <div className="space-y-6">
      {/* Interactive Heatmap */}
      <Card>
        <CardHeader>
          <CardTitle>Chicago Crime Heat Map</CardTitle>
          <CardDescription>
            Live predictions from your database - updated every 30 seconds
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!geoData ? (
            <div className="aspect-video bg-muted rounded-lg flex items-center justify-center">
              <div className="text-center space-y-2">
                <MapPin className="h-12 w-12 text-muted-foreground mx-auto animate-pulse" />
                <p className="text-sm text-muted-foreground">Loading map...</p>
              </div>
            </div>
          ) : (
            <div className="w-full relative">
              <Plot
                data={(predictions && predictions.length > 0) ? choroplethData : [{
                  type: 'scattermapbox',
                  lat: [41.8781],
                  lon: [-87.6298],
                  mode: 'markers',
                  marker: { size: 1, opacity: 0 }
                }]}
                layout={{
                  mapbox: {
                    style: 'open-street-map',
                    center: { lat: 41.8781, lon: -87.6298 },
                    zoom: 9.5
                  },
                  height: 500,
                  margin: { t: 0, b: 0, l: 0, r: 0 },
                  paper_bgcolor: 'rgba(0,0,0,0)',
                  plot_bgcolor: 'rgba(0,0,0,0)',
                }}
                config={{
                  displayModeBar: true,
                  displaylogo: false,
                  modeBarButtonsToRemove: ['lasso2d', 'select2d']
                }}
                className="w-full"
                useResizeHandler
                style={{ width: '100%' }}
              />
              {(!predictions || predictions.length === 0) && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="px-3 py-1.5 rounded-md bg-background/80 border text-xs text-muted-foreground">
                    No predictions yet — map is live and waiting for data
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* High-Risk Areas from Database */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Priority Areas</CardTitle>
              <CardDescription>
                {isLoading ? 'Loading...' : `Based on ${predictions?.length || 0} recent predictions`}
              </CardDescription>
            </div>
            {highRiskCount > 0 && (
              <Badge variant="outline" className="bg-destructive/10 text-destructive">
                <AlertTriangle className="h-3 w-3 mr-1" />
                {highRiskCount} High Risk
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-16 bg-muted animate-pulse rounded-lg" />
              ))}
            </div>
          ) : topHotspots.length > 0 ? (
            <div className="space-y-3">
              {topHotspots.map((spot) => (
                <div
                  key={spot.area}
                  className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent/5 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <div className="font-medium">{spot.area}</div>
                      <div className="text-xs text-muted-foreground">
                        {spot.count} prediction{spot.count !== 1 ? 's' : ''}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <div className="text-sm font-medium">
                        {Math.round(spot.crimes).toLocaleString()} incidents
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {(spot.confidence * 100).toFixed(0)}% confidence
                      </div>
                    </div>
                    <Badge variant="outline" className={getRiskColor(spot.risk)}>
                      {spot.risk}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <p className="text-sm">No predictions available yet</p>
              <p className="text-xs mt-1">Make a prediction to see priority areas</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Geographic Cross-Validation Info */}
      <Card>
        <CardHeader>
          <CardTitle>Geographic Validation Strategy</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <h4 className="font-semibold text-sm">Training Approach</h4>
              <p className="text-xs text-muted-foreground">
                Models trained on 60 community areas, validated on remaining 17 geographically
                separated areas to prevent spatial autocorrelation bias.
              </p>
            </div>
            <div className="space-y-2">
              <h4 className="font-semibold text-sm">Temporal Splits</h4>
              <p className="text-xs text-muted-foreground">
                3-fold time series cross-validation with 12-month training windows and
                3-month validation periods to ensure robust temporal generalization.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export { GeographicView };
