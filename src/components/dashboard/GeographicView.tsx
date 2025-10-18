import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MapPin, TrendingUp, AlertTriangle } from "lucide-react";

const hotspots = [
  { area: "Austin", lat: 41.8986, lng: -87.7596, risk: "high", crimes: 1247, change: 12.3 },
  { area: "West Town", lat: 41.8956, lng: -87.6732, risk: "medium", crimes: 892, change: -5.2 },
  { area: "South Shore", lat: 41.7567, lng: -87.5766, risk: "high", crimes: 1104, change: 8.7 },
  { area: "Lincoln Park", lat: 41.9217, lng: -87.6463, risk: "low", crimes: 421, change: -2.1 },
  { area: "Loop", lat: 41.8781, lng: -87.6298, risk: "medium", crimes: 756, change: 3.4 },
  { area: "Englewood", lat: 41.7794, lng: -87.6456, risk: "high", crimes: 1389, change: 15.6 }
];

const getRiskColor = (risk: string) => {
  switch (risk) {
    case "high": return "bg-destructive/10 text-destructive border-destructive/20";
    case "medium": return "bg-warning/10 text-warning border-warning/20";
    case "low": return "bg-success/10 text-success border-success/20";
    default: return "bg-muted";
  }
};

export const GeographicView = () => {
  return (
    <div className="space-y-6">
      {/* Map Placeholder */}
      <Card>
        <CardHeader>
          <CardTitle>Chicago Crime Heat Map</CardTitle>
          <CardDescription>
            Predicted crime density by community area (next 30 days)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="aspect-video bg-muted rounded-lg relative overflow-hidden">
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center space-y-2">
                <MapPin className="h-12 w-12 text-muted-foreground mx-auto" />
                <p className="text-sm text-muted-foreground">
                  Interactive map visualization
                </p>
                <p className="text-xs text-muted-foreground">
                  Connect to Mapbox API for full geographic display
                </p>
              </div>
            </div>
            
            {/* Simulated hotspot indicators */}
            {hotspots.map((spot, i) => (
              <div
                key={spot.area}
                className="absolute w-4 h-4 rounded-full bg-destructive/60 animate-pulse"
                style={{
                  left: `${20 + i * 12}%`,
                  top: `${30 + (i % 3) * 20}%`,
                }}
              />
            ))}
          </div>
        </CardContent>
      </Card>

      {/* High-Risk Areas */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Priority Areas</CardTitle>
              <CardDescription>Community areas requiring attention</CardDescription>
            </div>
            <Badge variant="outline" className="bg-destructive/10 text-destructive">
              <AlertTriangle className="h-3 w-3 mr-1" />
              3 High Risk
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {hotspots.map((spot) => (
              <div
                key={spot.area}
                className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent/5 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <div className="font-medium">{spot.area}</div>
                    <div className="text-xs text-muted-foreground">
                      {spot.lat.toFixed(4)}°N, {spot.lng.toFixed(4)}°W
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <div className="text-sm font-medium">
                      {spot.crimes.toLocaleString()} incidents
                    </div>
                    <div className={`text-xs flex items-center gap-1 ${
                      spot.change > 0 ? "text-destructive" : "text-success"
                    }`}>
                      <TrendingUp className="h-3 w-3" />
                      {spot.change > 0 ? "+" : ""}{spot.change}%
                    </div>
                  </div>
                  <Badge variant="outline" className={getRiskColor(spot.risk)}>
                    {spot.risk}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
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
