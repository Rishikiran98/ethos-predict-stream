import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TrendingUp, TrendingDown, Minus, Zap, Target, Clock } from "lucide-react";

interface AIModelPerf {
  model_name: string;
  crime_type: string;
  community_area: string | null;
  avg_confidence: number;
  success_count: number;
  failure_count: number;
  avg_response_time_ms: number;
  last_used_at: string;
}

export function AIModelPerformance() {
  const { data: modelPerformance, isLoading } = useQuery({
    queryKey: ['ai-model-performance'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ai_model_performance')
        .select('*')
        .order('success_count', { ascending: false })
        .limit(50);
      
      if (error) throw error;
      return data as AIModelPerf[];
    },
  });

  const { data: activeModel } = useQuery({
    queryKey: ['active-model'],
    queryFn: async () => {
      // Get most recent prediction to show current AI model version
      const { data, error } = await supabase
        .from('predictions')
        .select('ai_model_used, created_at')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      
      if (error) throw error;
      return data ? { version: data.ai_model_used || 'google/gemini-2.5-flash', created_at: data.created_at } : null;
    },
  });

  const getModelBadge = (modelName: string) => {
    if (modelName.includes('pro')) return <Badge variant="default" className="bg-purple-600">Pro</Badge>;
    if (modelName.includes('flash-lite')) return <Badge variant="secondary">Lite</Badge>;
    return <Badge variant="outline">Flash</Badge>;
  };

  const getSuccessRate = (perf: AIModelPerf) => {
    const total = perf.success_count + perf.failure_count;
    return total > 0 ? ((perf.success_count / total) * 100).toFixed(1) : '0.0';
  };

  const getTrendIcon = (perf: AIModelPerf) => {
    const rate = parseFloat(getSuccessRate(perf));
    if (rate >= 90) return <TrendingUp className="h-4 w-4 text-green-500" />;
    if (rate >= 70) return <Minus className="h-4 w-4 text-yellow-500" />;
    return <TrendingDown className="h-4 w-4 text-red-500" />;
  };

  // Group by crime type
  const byCrimeType = modelPerformance?.reduce((acc, perf) => {
    if (!acc[perf.crime_type]) acc[perf.crime_type] = [];
    acc[perf.crime_type].push(perf);
    return acc;
  }, {} as Record<string, AIModelPerf[]>);

  // Get top performing models
  const topModels = modelPerformance
    ?.filter(p => p.success_count + p.failure_count >= 3)
    ?.sort((a, b) => parseFloat(getSuccessRate(b)) - parseFloat(getSuccessRate(a)))
    ?.slice(0, 5);

  if (isLoading) {
    return <div>Loading AI model performance...</div>;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5" />
            AI Model Performance
          </CardTitle>
          <CardDescription>
            Intelligent model selection learns from performance to route predictions optimally
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Primary AI Model</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{activeModel?.version || 'Gemini 2.5 Flash'}</div>
                <p className="text-xs text-muted-foreground">
                  Last used {activeModel?.created_at ? new Date(activeModel.created_at).toLocaleString() : 'recently'}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Total Predictions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {modelPerformance?.reduce((sum, p) => sum + p.success_count + p.failure_count, 0) || 0}
                </div>
                <p className="text-xs text-muted-foreground">
                  Across {modelPerformance?.length || 0} scenarios
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Avg Response Time</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {modelPerformance && modelPerformance.length > 0
                    ? Math.round(modelPerformance.reduce((sum, p) => sum + (p.avg_response_time_ms || 0), 0) / modelPerformance.length)
                    : 0}ms
                </div>
                <p className="text-xs text-muted-foreground">
                  Across all models
                </p>
              </CardContent>
            </Card>
          </div>

          <Tabs defaultValue="top" className="w-full">
            <TabsList>
              <TabsTrigger value="top">Top Performers</TabsTrigger>
              <TabsTrigger value="bycrime">By Crime Type</TabsTrigger>
              <TabsTrigger value="all">All Models</TabsTrigger>
            </TabsList>

            <TabsContent value="top">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Model</TableHead>
                    <TableHead>Crime Type</TableHead>
                    <TableHead>Area</TableHead>
                    <TableHead className="text-right">Success Rate</TableHead>
                    <TableHead className="text-right">Attempts</TableHead>
                    <TableHead className="text-right">Confidence</TableHead>
                    <TableHead className="text-right">Trend</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {topModels?.map((perf, idx) => (
                    <TableRow key={idx}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          {getModelBadge(perf.model_name)}
                        </div>
                      </TableCell>
                      <TableCell>{perf.crime_type}</TableCell>
                      <TableCell>{perf.community_area || 'All'}</TableCell>
                      <TableCell className="text-right font-semibold">
                        {getSuccessRate(perf)}%
                      </TableCell>
                      <TableCell className="text-right">
                        {perf.success_count + perf.failure_count}
                      </TableCell>
                      <TableCell className="text-right">
                        {(perf.avg_confidence * 100).toFixed(1)}%
                      </TableCell>
                      <TableCell className="text-right">
                        {getTrendIcon(perf)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TabsContent>

            <TabsContent value="bycrime">
              <div className="space-y-4">
                {Object.entries(byCrimeType || {}).slice(0, 5).map(([crimeType, perfs]) => (
                  <Card key={crimeType}>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">{crimeType}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {perfs.slice(0, 3).map((perf, idx) => (
                          <div key={idx} className="flex items-center justify-between text-sm">
                            <div className="flex items-center gap-2">
                              {getModelBadge(perf.model_name)}
                              <span className="text-muted-foreground">
                                {perf.community_area ? `Area ${perf.community_area}` : 'All areas'}
                              </span>
                            </div>
                            <div className="flex items-center gap-3">
                              <div className="flex items-center gap-1">
                                <Target className="h-3 w-3 text-muted-foreground" />
                                <span className="font-medium">{getSuccessRate(perf)}%</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <Clock className="h-3 w-3 text-muted-foreground" />
                                <span>{perf.avg_response_time_ms}ms</span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="all">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Model</TableHead>
                    <TableHead>Crime Type</TableHead>
                    <TableHead>Area</TableHead>
                    <TableHead className="text-right">Success</TableHead>
                    <TableHead className="text-right">Failure</TableHead>
                    <TableHead className="text-right">Avg Time</TableHead>
                    <TableHead>Last Used</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {modelPerformance?.map((perf, idx) => (
                    <TableRow key={idx}>
                      <TableCell>{getModelBadge(perf.model_name)}</TableCell>
                      <TableCell className="font-medium">{perf.crime_type}</TableCell>
                      <TableCell>{perf.community_area || 'All'}</TableCell>
                      <TableCell className="text-right text-green-600">
                        {perf.success_count}
                      </TableCell>
                      <TableCell className="text-right text-red-600">
                        {perf.failure_count}
                      </TableCell>
                      <TableCell className="text-right">
                        {perf.avg_response_time_ms}ms
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {new Date(perf.last_used_at).toLocaleString()}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
