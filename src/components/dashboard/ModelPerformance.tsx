import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, Activity, Zap } from "lucide-react";

const performanceMetrics = [
  { model: "XGBoost (Current)", r2: 0.723, rmse: 2.14, mae: 1.67, training_time: "12.4min" },
  { model: "LightGBM", r2: 0.719, rmse: 2.18, mae: 1.71, training_time: "9.8min" },
  { model: "HistGradientBoosting", r2: 0.701, rmse: 2.29, mae: 1.82, training_time: "15.2min" },
  { model: "Ridge Regression", r2: 0.587, rmse: 2.94, mae: 2.31, training_time: "2.1min" },
  { model: "Baseline (No Leakage)", r2: 0.723, rmse: 2.14, mae: 1.67, training_time: "12.4min" },
  { model: "Before Leakage Fix", r2: 1.000, rmse: 0.02, mae: 0.01, training_time: "11.9min" }
];

const temporalPerformance = [
  { period: "2022 Q1", r2: 0.734, incidents: 42891 },
  { period: "2022 Q2", r2: 0.721, incidents: 45234 },
  { period: "2022 Q3", r2: 0.715, incidents: 48127 },
  { period: "2022 Q4", r2: 0.708, incidents: 41256 },
  { period: "2023 Q1", r2: 0.729, incidents: 43789 },
  { period: "2023 Q2", r2: 0.718, incidents: 46521 }
];

export const ModelPerformance = () => {
  return (
    <div className="space-y-6">
      {/* Key Metrics */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">R² Score</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">0.723</div>
            <p className="text-xs text-muted-foreground mt-1">After leakage prevention</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">RMSE</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">2.14</div>
            <p className="text-xs text-muted-foreground mt-1">Root mean squared error</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">MAE</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">1.67</div>
            <p className="text-xs text-muted-foreground mt-1">Mean absolute error</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Training Time</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">12.4m</div>
            <p className="text-xs text-muted-foreground mt-1">Distributed processing</p>
          </CardContent>
        </Card>
      </div>

      {/* Model Comparison */}
      <Card>
        <CardHeader>
          <CardTitle>Model Comparison</CardTitle>
          <CardDescription>
            Performance across different algorithms and validation approaches
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {performanceMetrics.map((model, idx) => (
              <div
                key={model.model}
                className={`flex items-center justify-between p-3 rounded-lg border ${
                  idx === 0 ? "bg-primary/5 border-primary/20" : "bg-card"
                } ${idx === 5 ? "opacity-60" : ""}`}
              >
                <div className="flex items-center gap-3">
                  {idx === 0 && (
                    <Badge variant="default" className="text-xs">
                      <Zap className="h-3 w-3 mr-1" />
                      Active
                    </Badge>
                  )}
                  {idx === 5 && (
                    <Badge variant="outline" className="text-xs bg-destructive/10 text-destructive">
                      Invalid
                    </Badge>
                  )}
                  <span className="font-medium">{model.model}</span>
                </div>
                
                <div className="flex items-center gap-6 text-sm">
                  <div className="text-center">
                    <div className="text-xs text-muted-foreground">R²</div>
                    <div className="font-mono font-bold">{model.r2.toFixed(3)}</div>
                  </div>
                  <div className="text-center">
                    <div className="text-xs text-muted-foreground">RMSE</div>
                    <div className="font-mono">{model.rmse.toFixed(2)}</div>
                  </div>
                  <div className="text-center">
                    <div className="text-xs text-muted-foreground">MAE</div>
                    <div className="font-mono">{model.mae.toFixed(2)}</div>
                  </div>
                  <div className="text-center min-w-[60px]">
                    <div className="text-xs text-muted-foreground">Time</div>
                    <div className="font-mono text-xs">{model.training_time}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Temporal Performance */}
      <Card>
        <CardHeader>
          <CardTitle>Temporal Validation Results</CardTitle>
          <CardDescription>
            Model performance across time periods (preventing future data leakage)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {temporalPerformance.map((period) => (
              <div key={period.period} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Activity className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">{period.period}</span>
                  <span className="text-sm text-muted-foreground">
                    {period.incidents.toLocaleString()} incidents
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="font-mono">
                    R² = {period.r2.toFixed(3)}
                  </Badge>
                  <TrendingUp className="h-4 w-4 text-success" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Data Leakage Prevention */}
      <Card className="border-warning/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-warning" />
            Data Leakage Prevention
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <h4 className="font-semibold text-sm mb-2">Issue Detected</h4>
              <p className="text-xs text-muted-foreground">
                Original model achieved R² = 1.000 (perfect score) due to including
                future-dated features in training data, creating artificially inflated
                performance metrics.
              </p>
            </div>
            <div>
              <h4 className="font-semibold text-sm mb-2">Resolution Applied</h4>
              <p className="text-xs text-muted-foreground">
                Implemented temporal validation gates that ensure all features are
                computed only from data preceding the prediction window. Reduced R² to
                realistic 0.723 while maintaining fairness.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
