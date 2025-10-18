import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Activity, RefreshCw, Database, TrendingUp, Clock } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchCurrentPerformance, fetchIngestionStatus, triggerDataIngestion } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { Progress } from "@/components/ui/progress";

export const LiveMetricsPanel = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch current performance metrics (auto-refresh every 60s)
  const { data: currentMetrics, isLoading: metricsLoading } = useQuery({
    queryKey: ['current-performance'],
    queryFn: fetchCurrentPerformance,
    refetchInterval: 60000, // Refresh every 60 seconds
  });

  // Fetch ingestion status (auto-refresh every 30s)
  const { data: ingestionStatus, isLoading: ingestionLoading } = useQuery({
    queryKey: ['ingestion-status'],
    queryFn: fetchIngestionStatus,
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  // Mutation to trigger manual ingestion
  const ingestMutation = useMutation({
    mutationFn: triggerDataIngestion,
    onSuccess: (data) => {
      toast({
        title: "Data Ingestion Triggered",
        description: `Fetched ${data.total_fetched} records. ${data.new_rows} new, ${data.duplicates} duplicates.`,
      });
      queryClient.invalidateQueries({ queryKey: ['ingestion-status'] });
      queryClient.invalidateQueries({ queryKey: ['current-performance'] });
    },
    onError: (error) => {
      toast({
        title: "Ingestion Failed",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    },
  });

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return 'Never';
    return new Date(dateStr).toLocaleString();
  };

  const getHealthBadge = (status: string) => {
    if (status === 'healthy') return <Badge className="bg-success/10 text-success border-success/20">Healthy</Badge>;
    if (status === 'no_recent_data') return <Badge className="bg-warning/10 text-warning border-warning/20">No Recent Data</Badge>;
    return <Badge className="bg-muted text-muted-foreground">Unknown</Badge>;
  };

  return (
    <div className="space-y-6">
      {/* Real-time Data Ingestion Status */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Database className="h-5 w-5" />
                Live Data Ingestion
              </CardTitle>
              <CardDescription>
                Automatic data sync from Chicago Open Data Portal
              </CardDescription>
            </div>
            <Button
              onClick={() => ingestMutation.mutate()}
              disabled={ingestMutation.isPending}
              size="sm"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${ingestMutation.isPending ? 'animate-spin' : ''}`} />
              {ingestMutation.isPending ? 'Syncing...' : 'Sync Now'}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {ingestionLoading ? (
            <div className="text-sm text-muted-foreground">Loading ingestion status...</div>
          ) : (
            <>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <div className="text-xs text-muted-foreground">Last Sync</div>
                  <div className="text-sm font-medium flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {formatDate(ingestionStatus?.last_ingestion)}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Last Batch</div>
                  <div className="text-sm font-medium">{ingestionStatus?.last_new_rows || 0} records</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Total Ingested</div>
                  <div className="text-sm font-medium">{ingestionStatus?.total_ingested?.toLocaleString() || 0}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Success Rate</div>
                  <div className="text-sm font-medium">{((ingestionStatus?.success_rate || 0) * 100).toFixed(1)}%</div>
                </div>
              </div>

              {ingestionStatus?.recent_batches && ingestionStatus.recent_batches.length > 0 && (
                <div className="space-y-2">
                  <div className="text-sm font-medium">Recent Sync History</div>
                  <div className="space-y-1">
                    {ingestionStatus.recent_batches.slice(0, 3).map((batch: any) => (
                      <div key={batch.batch_id} className="flex items-center justify-between text-xs p-2 rounded bg-muted/50">
                        <span className="text-muted-foreground">{formatDate(batch.created_at)}</span>
                        <span className="font-medium">{batch.new_rows} new • {batch.duplicates} dup • {batch.errors} err</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Current Model Performance on Live Data */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Current Model Performance
          </CardTitle>
          <CardDescription>
            Metrics on recent 30-day crime data • Auto-refreshes every 60 seconds
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {metricsLoading ? (
            <div className="text-sm text-muted-foreground">Loading current metrics...</div>
          ) : (
            <>
              <div className="flex items-center justify-between">
                <div className="text-xs text-muted-foreground">Last Updated</div>
                <div className="text-xs font-medium">{formatDate(currentMetrics?.last_updated)}</div>
              </div>

              {/* Model Info */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 rounded-lg bg-muted/30">
                <div>
                  <div className="text-xs text-muted-foreground">Model Version</div>
                  <div className="text-sm font-bold">{currentMetrics?.model.version}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">R² Score</div>
                  <div className="text-sm font-bold">{currentMetrics?.model.r2_score?.toFixed(3) || 'N/A'}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">RMSE</div>
                  <div className="text-sm font-bold">{currentMetrics?.model.rmse?.toFixed(2) || 'N/A'}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">MAE</div>
                  <div className="text-sm font-bold">{currentMetrics?.model.mae?.toFixed(2) || 'N/A'}</div>
                </div>
              </div>

              {/* Live Data Statistics */}
              <div>
                <div className="text-sm font-medium mb-3">Recent Data Analysis</div>
                <div className="space-y-3">
                  <div>
                    <div className="flex items-center justify-between text-sm mb-1">
                      <span className="text-muted-foreground">Total Records (30 days)</span>
                      <span className="font-medium">{currentMetrics?.recent_data.total_records?.toLocaleString()}</span>
                    </div>
                    <Progress value={100} className="h-2" />
                  </div>

                  <div>
                    <div className="flex items-center justify-between text-sm mb-1">
                      <span className="text-muted-foreground">Arrest Rate</span>
                      <span className="font-medium">{((currentMetrics?.recent_data.arrest_rate || 0) * 100).toFixed(1)}%</span>
                    </div>
                    <Progress value={(currentMetrics?.recent_data.arrest_rate || 0) * 100} className="h-2" />
                  </div>

                  <div>
                    <div className="flex items-center justify-between text-sm mb-1">
                      <span className="text-muted-foreground">Community Coverage</span>
                      <span className="font-medium">{currentMetrics?.recent_data.unique_areas} / 77 areas</span>
                    </div>
                    <Progress value={((currentMetrics?.recent_data.unique_areas || 0) / 77) * 100} className="h-2" />
                  </div>
                </div>
              </div>

              {/* Health Status */}
              <div className="flex items-center justify-between p-3 rounded-lg border">
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-success" />
                  <div>
                    <div className="text-sm font-medium">System Health</div>
                    <div className="text-xs text-muted-foreground">Data freshness & coverage</div>
                  </div>
                </div>
                <div className="flex gap-2">
                  {getHealthBadge(currentMetrics?.health.data_freshness)}
                  <Badge variant={currentMetrics?.health.coverage === 'good' ? 'default' : 'secondary'}>
                    {currentMetrics?.health.coverage}
                  </Badge>
                </div>
              </div>

              {/* Top Crime Areas (from live data) */}
              {currentMetrics?.recent_data.community_distribution && (
                <div>
                  <div className="text-sm font-medium mb-2">Top Crime Areas (Recent 30 Days)</div>
                  <div className="space-y-1">
                    {currentMetrics.recent_data.community_distribution.slice(0, 5).map((item: any) => (
                      <div key={item.area} className="flex items-center justify-between text-xs p-2 rounded bg-muted/30">
                        <span className="font-medium">Area {item.area}</span>
                        <span className="text-muted-foreground">{item.count} incidents</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
