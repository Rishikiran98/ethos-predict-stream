import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MapPin, Filter, TrendingUp, AlertTriangle, BarChart3, Clock, MapPinned } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useState, useMemo } from "react";
import Plot from 'react-plotly.js';

export const CrimeMapView = () => {
  const [selectedCrimeType, setSelectedCrimeType] = useState<string | null>(null);
  const [activeSubTab, setActiveSubTab] = useState("overview");

  // Fetch real crime data
  const { data: crimeData, isLoading: crimeLoading } = useQuery({
    queryKey: ['crime-stream'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('crime_stream')
        .select('*')
        .order('date', { ascending: false })
        .limit(1000);
      
      if (error) throw error;
      return data || [];
    },
    refetchInterval: 30000,
  });

  // Get unique crime types
  const crimeTypes = useMemo(() => {
    if (!crimeData) return [];
    const types = [...new Set(crimeData.map(c => c.primary_type))].filter(Boolean);
    return types.sort();
  }, [crimeData]);

  // Filter data by selected crime type
  const filteredData = useMemo(() => {
    if (!crimeData) return [];
    if (!selectedCrimeType) return crimeData;
    return crimeData.filter(c => c.primary_type === selectedCrimeType);
  }, [crimeData, selectedCrimeType]);

  // Aggregate stats
  const stats = useMemo(() => {
    const total = filteredData.length;
    const arrests = filteredData.filter(c => c.arrest).length;
    const arrestRate = total > 0 ? (arrests / total * 100).toFixed(1) : '0.0';
    
    const communityAreas = [...new Set(filteredData.map(c => c.community_area))].filter(Boolean).length;
    
    const crimesByType = filteredData.reduce((acc, crime) => {
      const type = crime.primary_type || 'Unknown';
      acc[type] = (acc[type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const topCrimes = Object.entries(crimesByType)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10);

    const crimesByArea = filteredData.reduce((acc, crime) => {
      const area = crime.community_area?.toString() || 'Unknown';
      if (!acc[area]) {
        acc[area] = { count: 0, arrests: 0 };
      }
      acc[area].count += 1;
      if (crime.arrest) acc[area].arrests += 1;
      return acc;
    }, {} as Record<string, { count: number; arrests: number }>);

    const areaStats = Object.entries(crimesByArea)
      .map(([area, data]) => ({
        area,
        count: data.count,
        arrests: data.arrests,
        arrestRate: data.count > 0 ? (data.arrests / data.count * 100).toFixed(1) : '0.0',
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 20);

    return { total, arrests, arrestRate, communityAreas, topCrimes, areaStats };
  }, [filteredData]);

  return (
    <div className="space-y-6">
      {/* Crime Type Filter */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Filter className="h-5 w-5 text-primary" />
                Crime Type Filter
              </CardTitle>
              <CardDescription>
                Select a crime category to view specific data on the map
              </CardDescription>
            </div>
            {selectedCrimeType && (
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setSelectedCrimeType(null)}
              >
                Clear Filter
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {crimeLoading ? (
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map(i => (
                <div key={i} className="h-8 w-24 bg-muted animate-pulse rounded" />
              ))}
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              {crimeTypes.map(type => (
                <Button
                  key={type}
                  variant={selectedCrimeType === type ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedCrimeType(type === selectedCrimeType ? null : type)}
                >
                  {type}
                </Button>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Stats Overview */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Incidents</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total.toLocaleString()}</div>
            {selectedCrimeType && (
              <p className="text-xs text-muted-foreground mt-1">{selectedCrimeType}</p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Arrests Made</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.arrests.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground mt-1">{stats.arrestRate}% arrest rate</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Areas Affected</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.communityAreas}</div>
            <p className="text-xs text-muted-foreground mt-1">Community areas</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Data Source</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">Real-Time</div>
            <p className="text-xs text-muted-foreground mt-1">Live Chicago data</p>
          </CardContent>
        </Card>
      </div>

      {/* Crime Map */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPinned className="h-5 w-5 text-primary" />
            {selectedCrimeType ? `${selectedCrimeType} Incidents Map` : 'All Crime Incidents'}
          </CardTitle>
          <CardDescription>
            Showing {filteredData.length.toLocaleString()} incidents across Chicago
          </CardDescription>
        </CardHeader>
        <CardContent>
          {crimeLoading ? (
            <div className="aspect-video bg-muted rounded-lg flex items-center justify-center">
              <div className="text-center space-y-2">
                <MapPin className="h-12 w-12 text-muted-foreground mx-auto animate-pulse" />
                <p className="text-sm text-muted-foreground">Loading crime data...</p>
              </div>
            </div>
          ) : (
            <div className="w-full">
              <Plot
                data={[{
                  type: 'scattermapbox',
                  lat: filteredData.map(c => c.latitude).filter(Boolean),
                  lon: filteredData.map(c => c.longitude).filter(Boolean),
                  mode: 'markers',
                  marker: {
                    size: 6,
                    color: filteredData.map(c => c.arrest ? '#22c55e' : '#ef4444'),
                    opacity: 0.6,
                  },
                  text: filteredData.map(c => 
                    `${c.primary_type}<br>` +
                    `${c.arrest ? 'Arrest Made' : 'No Arrest'}<br>` +
                    `Area: ${c.community_area || 'Unknown'}`
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
            </div>
          )}
        </CardContent>
      </Card>

      {/* Detailed Tabs */}
      <Card>
        <CardHeader>
          <CardTitle>Detailed Analysis</CardTitle>
          <CardDescription>
            {selectedCrimeType 
              ? `Breakdown of ${selectedCrimeType} incidents`
              : 'Overall crime statistics and patterns'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={activeSubTab} onValueChange={setActiveSubTab}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="overview">Crime Types</TabsTrigger>
              <TabsTrigger value="areas">By Area</TabsTrigger>
              <TabsTrigger value="timeline">Timeline</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-4">
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Crime Type</TableHead>
                      <TableHead className="text-right">Incidents</TableHead>
                      <TableHead className="text-right">% of Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {stats.topCrimes.map(([type, count]) => {
                      const percentage = stats.total > 0 ? (count / stats.total * 100).toFixed(1) : '0.0';
                      return (
                        <TableRow key={type}>
                          <TableCell className="font-medium">{type}</TableCell>
                          <TableCell className="text-right">{count.toLocaleString()}</TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-2">
                              <div className="w-16 h-2 bg-muted rounded-full overflow-hidden">
                                <div 
                                  className="h-full bg-primary rounded-full"
                                  style={{ width: `${percentage}%` }}
                                />
                              </div>
                              <span className="text-sm font-medium min-w-[3rem]">
                                {percentage}%
                              </span>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>

            <TabsContent value="areas" className="space-y-4">
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Community Area</TableHead>
                      <TableHead className="text-right">Incidents</TableHead>
                      <TableHead className="text-right">Arrests</TableHead>
                      <TableHead className="text-right">Arrest Rate</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {stats.areaStats.map((area) => (
                      <TableRow key={area.area}>
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            <MapPin className="h-3 w-3 text-muted-foreground" />
                            Area {area.area}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">{area.count.toLocaleString()}</TableCell>
                        <TableCell className="text-right">{area.arrests.toLocaleString()}</TableCell>
                        <TableCell className="text-right">
                          <Badge variant={
                            parseFloat(area.arrestRate) > 30 ? "default" : 
                            parseFloat(area.arrestRate) > 15 ? "secondary" : "outline"
                          }>
                            {area.arrestRate}%
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>

            <TabsContent value="timeline" className="space-y-4">
              <div className="text-center py-8 text-muted-foreground">
                <Clock className="h-12 w-12 mx-auto mb-2" />
                <p className="text-sm">Timeline visualization coming soon</p>
                <p className="text-xs mt-1">Real-time data: {filteredData.length} recent incidents</p>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};
