import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, TrendingDown, Activity, Zap, Scale, Target } from "lucide-react";
import { Progress } from "@/components/ui/progress";

interface MetricCardProps {
  title: string;
  value: string;
  change: number;
  icon: React.ReactNode;
  trend: "up" | "down" | "neutral";
  description?: string;
  onClick?: () => void;
}

const MetricCard = ({ title, value, change, icon, trend, description, onClick }: MetricCardProps) => {
  const trendColor = trend === "up" 
    ? "text-success" 
    : trend === "down" 
    ? "text-destructive" 
    : "text-muted-foreground";
  
  const TrendIcon = trend === "up" ? TrendingUp : TrendingDown;

  return (
    <Card 
      className={onClick ? "cursor-pointer transition-all hover:shadow-lg hover:scale-[1.02]" : ""}
      onClick={onClick}
    >
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <div className="p-2 bg-primary/10 rounded-lg">{icon}</div>
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-bold">{value}</div>
        {description && (
          <p className="text-xs text-muted-foreground mt-1">{description}</p>
        )}
        <div className={`flex items-center gap-1 mt-2 text-xs ${trendColor}`}>
          <TrendIcon className="h-3 w-3" />
          <span className="font-medium">{Math.abs(change)}%</span>
          <span className="text-muted-foreground">vs last period</span>
        </div>
      </CardContent>
    </Card>
  );
};

interface MetricsOverviewProps {
  onNavigate: (tab: string) => void;
}

export const MetricsOverview = ({ onNavigate }: MetricsOverviewProps) => {
  return (
    <div className="space-y-6">
      {/* Key Performance Indicators */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title="Model Accuracy (R²)"
          value="0.723"
          change={-27.7}
          trend="down"
          icon={<Target className="h-4 w-4 text-primary" />}
          description="After data leakage prevention"
        />
        <MetricCard
          title="Processing Speed"
          value="8.4x"
          change={740}
          trend="up"
          icon={<Zap className="h-4 w-4 text-warning" />}
          description="Distributed computing gain"
        />
        <MetricCard
          title="Fairness Score"
          value="0.93"
          change={15.2}
          trend="up"
          icon={<Scale className="h-4 w-4 text-success" />}
          description="F1 variance ≤0.07"
          onClick={() => onNavigate("fairness")}
        />
        <MetricCard
          title="Memory Efficiency"
          value="72%"
          change={72}
          trend="up"
          icon={<Activity className="h-4 w-4 text-secondary" />}
          description="Reduction vs baseline"
        />
      </div>

      {/* System Status */}
      <Card>
        <CardHeader>
          <CardTitle>System Health & Resource Utilization</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Dask Cluster (6 workers)</span>
              <span className="font-medium">87% utilized</span>
            </div>
            <Progress value={87} className="h-2" />
          </div>
          
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Data Pipeline Throughput</span>
              <span className="font-medium">2.3M records/hour</span>
            </div>
            <Progress value={92} className="h-2" />
          </div>
          
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Fairness Gate Pass Rate</span>
              <span className="font-medium">94.2%</span>
            </div>
            <Progress value={94} className="h-2" />
          </div>
        </CardContent>
      </Card>

      {/* Data Quality Metrics */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Records Processed</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">6,247,891</div>
            <p className="text-xs text-muted-foreground mt-1">
              Chicago crime data (2001-2024)
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Temporal Validation</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-success">✓ Passed</div>
            <p className="text-xs text-muted-foreground mt-1">
              No future data leakage detected
            </p>
          </CardContent>
        </Card>

        <Card 
          className="cursor-pointer transition-all hover:shadow-lg hover:scale-[1.02]"
          onClick={() => onNavigate("geography")}
        >
          <CardHeader>
            <CardTitle className="text-base">Geographic Coverage</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">77</div>
            <p className="text-xs text-muted-foreground mt-1">
              Community areas analyzed • Click to view map
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
