import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { TrendingUp, TrendingDown, Activity, Users, AlertTriangle, Shield } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";

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
      {/* Crime Statistics Overview */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title="Total Crimes (2024)"
          value="84,293"
          change={-12.4}
          trend="down"
          icon={<AlertTriangle className="h-4 w-4 text-destructive" />}
          description="Compared to 2023 • View geographic data"
          onClick={() => onNavigate("geography")}
        />
        <MetricCard
          title="Violent Crimes"
          value="18,547"
          change={-8.2}
          trend="down"
          icon={<Shield className="h-4 w-4 text-warning" />}
          description="22% of total crimes • View details"
          onClick={() => onNavigate("geography")}
        />
        <MetricCard
          title="Property Crimes"
          value="52,891"
          change={-14.1}
          trend="down"
          icon={<Activity className="h-4 w-4 text-primary" />}
          description="63% of total crimes • View map"
          onClick={() => onNavigate("geography")}
        />
        <MetricCard
          title="Clearance Rate"
          value="31.2%"
          change={4.8}
          trend="up"
          icon={<TrendingUp className="h-4 w-4 text-success" />}
          description="Cases resolved • View trends"
          onClick={() => onNavigate("geography")}
        />
      </div>

      {/* Crime Categories Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle>Crime Categories (2024)</CardTitle>
          <CardDescription>Distribution of reported incidents across Chicago</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Theft</span>
              <span className="font-medium">28,347 incidents (33.6%)</span>
            </div>
            <Progress value={34} className="h-2" />
          </div>
          
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Battery</span>
              <span className="font-medium">15,923 incidents (18.9%)</span>
            </div>
            <Progress value={19} className="h-2" />
          </div>
          
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Criminal Damage</span>
              <span className="font-medium">12,584 incidents (14.9%)</span>
            </div>
            <Progress value={15} className="h-2" />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Assault</span>
              <span className="font-medium">9,472 incidents (11.2%)</span>
            </div>
            <Progress value={11} className="h-2" />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Other Offenses</span>
              <span className="font-medium">17,967 incidents (21.3%)</span>
            </div>
            <Progress value={21} className="h-2" />
          </div>
        </CardContent>
      </Card>

      {/* Demographics & Time Patterns */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card 
          className="cursor-pointer transition-all hover:shadow-lg hover:scale-[1.02]"
          onClick={() => onNavigate("geography")}
        >
          <CardHeader>
            <CardTitle className="text-base">Peak Crime Hours</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">6PM - 10PM</div>
            <p className="text-xs text-muted-foreground mt-1">
              42% of incidents occur during evening • View patterns
            </p>
          </CardContent>
        </Card>

        <Card 
          className="cursor-pointer transition-all hover:shadow-lg hover:scale-[1.02]"
          onClick={() => onNavigate("geography")}
        >
          <CardHeader>
            <CardTitle className="text-base">Most Affected Age Group</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">25-34 years</div>
            <p className="text-xs text-muted-foreground mt-1">
              31% of reported victims • View demographics
            </p>
          </CardContent>
        </Card>

        <Card 
          className="cursor-pointer transition-all hover:shadow-lg hover:scale-[1.02]"
          onClick={() => onNavigate("geography")}
        >
          <CardHeader>
            <CardTitle className="text-base">Community Areas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">77</div>
            <p className="text-xs text-muted-foreground mt-1">
              Districts monitored across Chicago • View map
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Monthly Trend */}
      <Card>
        <CardHeader>
          <CardTitle>Monthly Crime Trends (Last 12 Months)</CardTitle>
          <CardDescription>Comparing current year to previous year</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[
              { month: "October 2024", current: 7240, previous: 8156, change: -11.2 },
              { month: "September 2024", current: 7482, previous: 8423, change: -11.2 },
              { month: "August 2024", current: 7891, previous: 8934, change: -11.7 },
              { month: "July 2024", current: 8123, previous: 9245, change: -12.1 },
              { month: "June 2024", current: 7654, previous: 8712, change: -12.1 },
              { month: "May 2024", current: 6923, previous: 7834, change: -11.6 },
            ].map((data) => (
              <div key={data.month} className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium">{data.month}</span>
                  <div className="flex items-center gap-3">
                    <span className="text-muted-foreground">
                      {data.current.toLocaleString()} incidents
                    </span>
                    <Badge variant="outline" className="bg-success/10 text-success border-success/20">
                      <TrendingDown className="h-3 w-3 mr-1" />
                      {Math.abs(data.change)}%
                    </Badge>
                  </div>
                </div>
                <Progress value={(data.current / data.previous) * 100} className="h-1.5" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
