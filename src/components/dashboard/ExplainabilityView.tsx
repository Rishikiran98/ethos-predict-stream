import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Lightbulb, TrendingUp, TrendingDown } from "lucide-react";
import { Progress } from "@/components/ui/progress";

const shapFeatures = [
  { feature: "Previous 30-day crime count", importance: 0.342, direction: "positive" },
  { feature: "Weekend indicator", importance: 0.187, direction: "positive" },
  { feature: "Historical crime rate", importance: 0.156, direction: "positive" },
  { feature: "Nearby transit stops", importance: 0.089, direction: "positive" },
  { feature: "Season (winter)", importance: 0.071, direction: "negative" },
  { feature: "Population density", importance: 0.063, direction: "positive" },
  { feature: "Unemployment rate", importance: 0.048, direction: "positive" },
  { feature: "Median income", importance: 0.044, direction: "negative" }
];

const examplePrediction = {
  area: "Austin",
  predicted_crimes: 127,
  actual_crimes: 134,
  confidence: 0.87,
  factors: [
    { name: "Historical trend", contribution: "+42 incidents", impact: 0.33 },
    { name: "Day of week (Saturday)", contribution: "+18 incidents", impact: 0.14 },
    { name: "Recent spike", contribution: "+15 incidents", impact: 0.12 },
    { name: "Weather (cold)", contribution: "-8 incidents", impact: -0.06 }
  ]
};

export const ExplainabilityView = () => {
  return (
    <div className="space-y-6">
      {/* SHAP Feature Importance */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lightbulb className="h-5 w-5 text-warning" />
            Global Feature Importance (SHAP)
          </CardTitle>
          <CardDescription>
            Top factors driving crime predictions across all areas
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {shapFeatures.map((feature) => (
              <div key={feature.feature} className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    {feature.direction === "positive" ? (
                      <TrendingUp className="h-4 w-4 text-destructive" />
                    ) : (
                      <TrendingDown className="h-4 w-4 text-success" />
                    )}
                    <span className="font-medium">{feature.feature}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs">
                      {feature.importance.toFixed(3)}
                    </span>
                    <Badge variant="outline" className="text-xs">
                      {(feature.importance * 100).toFixed(1)}%
                    </Badge>
                  </div>
                </div>
                <Progress value={feature.importance * 100} className="h-1.5" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Example LIME Explanation */}
      <Card>
        <CardHeader>
          <CardTitle>Local Explanation (LIME)</CardTitle>
          <CardDescription>
            Detailed breakdown for {examplePrediction.area} prediction
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
            <div>
              <div className="text-sm text-muted-foreground">Predicted</div>
              <div className="text-3xl font-bold">
                {examplePrediction.predicted_crimes}
              </div>
              <div className="text-xs text-muted-foreground">
                incidents in next 7 days
              </div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Actual</div>
              <div className="text-3xl font-bold">
                {examplePrediction.actual_crimes}
              </div>
              <div className="text-xs text-muted-foreground">
                ({Math.abs(((examplePrediction.predicted_crimes - examplePrediction.actual_crimes) / examplePrediction.actual_crimes) * 100).toFixed(1)}% error)
              </div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Confidence</div>
              <div className="text-3xl font-bold text-success">
                {(examplePrediction.confidence * 100).toFixed(0)}%
              </div>
              <div className="text-xs text-muted-foreground">
                prediction certainty
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <h4 className="font-semibold text-sm">Contributing Factors</h4>
            {examplePrediction.factors.map((factor) => (
              <div
                key={factor.name}
                className="flex items-center justify-between p-3 rounded-lg border"
              >
                <div className="flex items-center gap-3">
                  {factor.impact > 0 ? (
                    <TrendingUp className="h-4 w-4 text-destructive" />
                  ) : (
                    <TrendingDown className="h-4 w-4 text-success" />
                  )}
                  <span className="font-medium text-sm">{factor.name}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`text-sm font-mono ${
                    factor.impact > 0 ? "text-destructive" : "text-success"
                  }`}>
                    {factor.contribution}
                  </span>
                  <Badge variant="outline" className="text-xs">
                    {(Math.abs(factor.impact) * 100).toFixed(0)}%
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Interpretation Guidelines */}
      <Card>
        <CardHeader>
          <CardTitle>Model Interpretation Guidelines</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <h4 className="font-semibold text-sm">SHAP (Global)</h4>
              <ul className="text-xs text-muted-foreground space-y-1">
                <li>• Shows average feature impact across all predictions</li>
                <li>• Based on Shapley values from game theory</li>
                <li>• Consistent with model behavior</li>
                <li>• Used for overall model auditing</li>
              </ul>
            </div>
            <div className="space-y-2">
              <h4 className="font-semibold text-sm">LIME (Local)</h4>
              <ul className="text-xs text-muted-foreground space-y-1">
                <li>• Explains individual predictions</li>
                <li>• Approximates model locally with interpretable model</li>
                <li>• Useful for case-by-case justification</li>
                <li>• Supports community transparency</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
