import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { TrendingUp, TrendingDown, Users, MapPin, AlertTriangle, Activity } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

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
        {trend !== "neutral" && (
          <div className={`flex items-center gap-1 mt-2 text-xs ${trendColor}`}>
            <TrendIcon className="h-3 w-3" />
            <span className="font-medium">{Math.abs(change)}%</span>
            <span className="text-muted-foreground">vs last period</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

interface MetricsOverviewProps {
  onNavigate: (tab: string) => void;
}

export const MetricsOverview = ({ onNavigate }: MetricsOverviewProps) => {
  const { data: predictions } = useQuery({
    queryKey: ['crime-overview'],
    queryFn: async () => {
      const { data } = await supabase
        .from('predictions')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);
      return data || [];
    },
    refetchInterval: 30000,
  });

  const { data: feedback } = useQuery({
    queryKey: ['feedback-overview'],
    queryFn: async () => {
      const { data } = await supabase
        .from('community_feedback')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);
      return data || [];
    },
    refetchInterval: 30000,
  });

  // Calculate statistics
  const totalPredictedCrimes = predictions?.reduce((sum, p) => sum + (p.predicted_crimes || 0), 0) || 0;
  const highRiskAreas = predictions?.filter(p => p.risk_level === 'high').length || 0;
  const avgConfidence = predictions?.length 
    ? (predictions.reduce((sum, p) => sum + (p.confidence || 0), 0) / predictions.length * 100).toFixed(1)
    : 0;
  const activeCommunities = new Set(predictions?.map(p => p.community_area)).size || 0;
  const reportsThisWeek = feedback?.filter(f => {
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    return new Date(f.created_at) > weekAgo;
  }).length || 0;

  return (
    <div className="space-y-6">
      {/* Crime Statistics Overview */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title="Total Predicted Incidents"
          value={totalPredictedCrimes.toLocaleString()}
          change={12.3}
          trend="up"
          icon={<AlertTriangle className="h-4 w-4 text-destructive" />}
          description="Across all areas • Click for map"
          onClick={() => onNavigate("geography")}
        />
        <MetricCard
          title="High-Risk Areas"
          value={highRiskAreas.toString()}
          change={-8.2}
          trend="down"
          icon={<MapPin className="h-4 w-4 text-warning" />}
          description="Critical zones • Click for map"
          onClick={() => onNavigate("geography")}
        />
        <MetricCard
          title="Prediction Confidence"
          value={`${avgConfidence}%`}
          change={5.1}
          trend="up"
          icon={<Activity className="h-4 w-4 text-success" />}
          description="Average model confidence • Click for map"
          onClick={() => onNavigate("geography")}
        />
        <MetricCard
          title="Active Communities"
          value={activeCommunities.toString()}
          change={0}
          trend="neutral"
          icon={<Users className="h-4 w-4 text-primary" />}
          description="Monitored areas • Click for map"
          onClick={() => onNavigate("geography")}
        />
      </div>

      {/* Crime Reporting Activity */}
      <Card>
        <CardHeader>
          <CardTitle>Community Engagement</CardTitle>
          <CardDescription>
            Real-time crime reporting activity from residents
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Reports This Week</span>
              <span className="font-medium">{reportsThisWeek} reports</span>
            </div>
            <Progress value={Math.min((reportsThisWeek / 50) * 100, 100)} className="h-2" />
          </div>
          
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Total Feedback Entries</span>
              <span className="font-medium">{feedback?.length || 0} entries</span>
            </div>
            <Progress value={Math.min(((feedback?.length || 0) / 100) * 100, 100)} className="h-2" />
          </div>
          
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Response Rate</span>
              <span className="font-medium">87.3%</span>
            </div>
            <Progress value={87} className="h-2" />
          </div>
        </CardContent>
      </Card>

      {/* Demographics & Crime Context */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card 
          className="cursor-pointer transition-all hover:shadow-lg hover:scale-[1.02]"
          onClick={() => onNavigate("geography")}
        >
          <CardHeader>
            <CardTitle className="text-base">Total Population Covered</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">2.7M</div>
            <p className="text-xs text-muted-foreground mt-1">
              Chicago residents monitored • Click for map
            </p>
          </CardContent>
        </Card>

        <Card 
          className="cursor-pointer transition-all hover:shadow-lg hover:scale-[1.02]"
          onClick={() => onNavigate("geography")}
        >
          <CardHeader>
            <CardTitle className="text-base">Crime Rate Trend</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-success">↓ 8.2%</div>
            <p className="text-xs text-muted-foreground mt-1">
              Year-over-year reduction • Click for map
            </p>
          </CardContent>
        </Card>

        <Card 
          className="cursor-pointer transition-all hover:shadow-lg hover:scale-[1.02]"
          onClick={() => onNavigate("geography")}
        >
          <CardHeader>
            <CardTitle className="text-base">Data Timespan</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">24 Years</div>
            <p className="text-xs text-muted-foreground mt-1">
              Historical data (2001-2024) • Click for map
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};