import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { MapPin, TrendingUp, TrendingDown, Activity, Target } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { fetchGeoPredictions, fetchTimeline, fetchHotspots, fetchTrends } from "@/lib/api";
import Plot from 'react-plotly.js';

export const AnalyticsView = () => {
  // Fetch analytics data
  const { data: geoPredictions } = useQuery({
    queryKey: ['geo-predictions'],
    queryFn: fetchGeoPredictions,
    refetchInterval: 60000, // Refresh every minute
  });

  const { data: timelineData } = useQuery({
    queryKey: ['timeline'],
    queryFn: fetchTimeline,
    refetchInterval: 60000,
  });

  const { data: hotspotsData } = useQuery({
    queryKey: ['hotspots'],
    queryFn: fetchHotspots,
    refetchInterval: 60000,
  });

  const { data: trendsData } = useQuery({
    queryKey: ['trends'],
    queryFn: fetchTrends,
    refetchInterval: 60000,
  });

  return (
    <div className="space-y-6">
      {/* Trends Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-primary" />
            Crime Trends Analysis
          </CardTitle>
          <CardDescription>Real-time crime activity patterns and changes</CardDescription>
        </CardHeader>
        <CardContent>
          {trendsData?.weekly_trend && (
            <div className="grid gap-4 md:grid-cols-3">
              <div className="p-4 rounded-lg border bg-card">
                <div className="text-sm text-muted-foreground mb-1">This Week</div>
                <div className="text-2xl font-bold">{trendsData.weekly_trend.this_week.toLocaleString()}</div>
                <p className="text-xs text-muted-foreground mt-1">Total incidents</p>
              </div>

              <div className="p-4 rounded-lg border bg-card">
                <div className="text-sm text-muted-foreground mb-1">Last Week</div>
                <div className="text-2xl font-bold">{trendsData.weekly_trend.last_week.toLocaleString()}</div>
                <p className="text-xs text-muted-foreground mt-1">Total incidents</p>
              </div>

              <div className="p-4 rounded-lg border bg-card">
                <div className="text-sm text-muted-foreground mb-1 flex items-center gap-2">
                  Weekly Change
                  {trendsData.weekly_trend.direction === 'increase' ? (
                    <TrendingUp className="h-4 w-4 text-destructive" />
                  ) : (
                    <TrendingDown className="h-4 w-4 text-success" />
                  )}
                </div>
                <div className="text-2xl font-bold">
                  {trendsData.weekly_trend.change_percent > 0 ? '+' : ''}
                  {trendsData.weekly_trend.change_percent.toFixed(1)}%
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {trendsData.weekly_trend.direction === 'increase' ? 'Increased' : 'Decreased'} from last week
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Tabs for different views */}
      <Tabs defaultValue="geographic" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="geographic">Geographic Risk</TabsTrigger>
          <TabsTrigger value="temporal">Timeline</TabsTrigger>
          <TabsTrigger value="hotspots">Hotspots</TabsTrigger>
        </TabsList>

        {/* Geographic Risk View */}
        <TabsContent value="geographic" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Geographic Risk Distribution</CardTitle>
              <CardDescription>
                Risk scores by community area based on recent crime data
              </CardDescription>
            </CardHeader>
            <CardContent>
              {geoPredictions?.predictions && geoPredictions.predictions.length > 0 ? (
                <div className="space-y-4">
                  <Plot
                    data={[{
                      type: 'scattermapbox',
                      lat: geoPredictions.predictions.map((p: any) => p.latitude),
                      lon: geoPredictions.predictions.map((p: any) => p.longitude),
                      mode: 'markers',
                      marker: {
                        size: geoPredictions.predictions.map((p: any) => Math.sqrt(p.count) * 3),
                        color: geoPredictions.predictions.map((p: any) => p.risk_score * 100),
                        colorscale: [
                          [0, '#22c55e'],
                          [0.5, '#f59e0b'],
                          [1, '#ef4444']
                        ],
                        colorbar: {
                          title: 'Risk Score',
                          thickness: 15,
                          len: 0.7,
                        },
                        opacity: 0.7,
                      },
                      text: geoPredictions.predictions.map((p: any) => 
                        `Area ${p.community_area}<br>` +
                        `Risk: ${(p.risk_score * 100).toFixed(1)}%<br>` +
                        `Incidents: ${p.count}`
                      ),
                      hoverinfo: 'text',
                    }]}
                    layout={{
                      mapbox: {
                        style: 'open-street-map',
                        center: { lat: 41.8781, lon: -87.6298 },
                        zoom: 9.5
                      },
                      height: 500,
                      margin: { t: 0, b: 0, l: 0, r: 0 },
                    }}
                    config={{
                      displayModeBar: true,
                      displaylogo: false,
                    }}
                    className="w-full"
                    useResizeHandler
                  />

                  <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3">
                    {geoPredictions.predictions
                      .sort((a: any, b: any) => b.risk_score - a.risk_score)
                      .slice(0, 6)
                      .map((pred: any) => (
                        <div key={pred.community_area} className="p-3 rounded-lg border bg-card">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-medium">Area {pred.community_area}</span>
                            <Badge variant={
                              pred.risk_level === 'high' ? 'destructive' :
                              pred.risk_level === 'medium' ? 'default' : 'secondary'
                            }>
                              {pred.risk_level}
                            </Badge>
                          </div>
                          <div className="text-xs text-muted-foreground">
                            Risk: {(pred.risk_score * 100).toFixed(1)}% • {pred.count} incidents
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <p className="text-sm">Loading geographic predictions...</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Timeline View */}
        <TabsContent value="temporal" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Crime Activity Timeline</CardTitle>
              <CardDescription>
                Daily crime trends over the last 90 days
              </CardDescription>
            </CardHeader>
            <CardContent>
              {timelineData?.timeline && timelineData.timeline.length > 0 ? (
                <Plot
                  data={[
                    {
                      x: timelineData.timeline.map((d: any) => d.date),
                      y: timelineData.timeline.map((d: any) => d.count),
                      type: 'scatter',
                      mode: 'lines+markers',
                      name: 'Total Incidents',
                      line: { color: 'hsl(var(--primary))' },
                      marker: { size: 4 },
                    },
                    {
                      x: timelineData.timeline.map((d: any) => d.date),
                      y: timelineData.timeline.map((d: any) => d.arrests),
                      type: 'scatter',
                      mode: 'lines+markers',
                      name: 'Arrests',
                      line: { color: '#22c55e' },
                      marker: { size: 4 },
                    },
                  ]}
                  layout={{
                    height: 400,
                    margin: { t: 20, b: 40, l: 50, r: 20 },
                    xaxis: { title: 'Date' },
                    yaxis: { title: 'Count' },
                    showlegend: true,
                    legend: { x: 0, y: 1 },
                  }}
                  config={{
                    displayModeBar: false,
                  }}
                  className="w-full"
                  useResizeHandler
                />
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <p className="text-sm">Loading timeline data...</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Hotspots View */}
        <TabsContent value="hotspots" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5 text-destructive" />
                Crime Hotspots
              </CardTitle>
              <CardDescription>
                High-intensity crime clusters detected through spatial analysis
              </CardDescription>
            </CardHeader>
            <CardContent>
              {hotspotsData?.hotspots && hotspotsData.hotspots.length > 0 ? (
                <div className="space-y-4">
                  <Plot
                    data={[{
                      type: 'scattermapbox',
                      lat: hotspotsData.hotspots.map((h: any) => h.latitude),
                      lon: hotspotsData.hotspots.map((h: any) => h.longitude),
                      mode: 'markers',
                      marker: {
                        size: hotspotsData.hotspots.map((h: any) => Math.sqrt(h.intensity) * 2),
                        color: hotspotsData.hotspots.map((h: any) => 
                          h.risk_level === 'high' ? '#ef4444' :
                          h.risk_level === 'medium' ? '#f59e0b' : '#22c55e'
                        ),
                        opacity: 0.6,
                      },
                      text: hotspotsData.hotspots.map((h: any) => 
                        `Hotspot<br>` +
                        `Intensity: ${h.intensity} incidents<br>` +
                        `Type: ${h.primary_type}<br>` +
                        `Arrest Rate: ${(h.arrest_rate * 100).toFixed(1)}%`
                      ),
                      hoverinfo: 'text',
                    }]}
                    layout={{
                      mapbox: {
                        style: 'open-street-map',
                        center: { lat: 41.8781, lon: -87.6298 },
                        zoom: 10
                      },
                      height: 500,
                      margin: { t: 0, b: 0, l: 0, r: 0 },
                    }}
                    config={{
                      displayModeBar: true,
                      displaylogo: false,
                    }}
                    className="w-full"
                    useResizeHandler
                  />

                  <div className="space-y-2">
                    <h4 className="text-sm font-medium">Top Hotspots</h4>
                    {hotspotsData.hotspots.slice(0, 10).map((hotspot: any, idx: number) => (
                      <div key={idx} className="flex items-center justify-between p-3 rounded-lg border bg-card">
                        <div className="flex items-center gap-3">
                          <MapPin className="h-4 w-4 text-destructive" />
                          <div>
                            <div className="text-sm font-medium">
                              ({hotspot.latitude.toFixed(4)}, {hotspot.longitude.toFixed(4)})
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {hotspot.primary_type}
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-medium">{hotspot.intensity} incidents</div>
                          <div className="text-xs text-muted-foreground">
                            {(hotspot.arrest_rate * 100).toFixed(1)}% arrests
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <p className="text-sm">Loading hotspot data...</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};
