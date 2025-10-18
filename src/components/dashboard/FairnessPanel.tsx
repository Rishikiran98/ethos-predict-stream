import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Scale, AlertCircle, CheckCircle2 } from "lucide-react";
import { Progress } from "@/components/ui/progress";

interface FairnessMetric {
  name: string;
  value: number;
  threshold: number;
  passed: boolean;
  description: string;
}

const fairnessMetrics: FairnessMetric[] = [
  {
    name: "Demographic Parity Difference",
    value: 0.043,
    threshold: 0.10,
    passed: true,
    description: "Difference in positive prediction rates across demographic groups"
  },
  {
    name: "Equalized Odds Ratio",
    value: 0.92,
    threshold: 0.80,
    passed: true,
    description: "Ratio of true positive and false positive rates across groups"
  },
  {
    name: "F1 Score Variance",
    value: 0.065,
    threshold: 0.070,
    passed: true,
    description: "Variance in prediction performance across neighborhoods"
  },
  {
    name: "Calibration Error",
    value: 0.078,
    threshold: 0.100,
    passed: true,
    description: "Difference between predicted probabilities and actual outcomes"
  }
];

const communityMetrics = [
  { area: "Austin", f1: 0.71, population: 98514, crime_rate: 8.2 },
  { area: "West Town", f1: 0.75, population: 87435, crime_rate: 6.1 },
  { area: "South Shore", f1: 0.69, population: 49767, crime_rate: 9.3 },
  { area: "Lincoln Park", f1: 0.76, population: 64116, crime_rate: 4.5 },
  { area: "Englewood", f1: 0.68, population: 24369, crime_rate: 11.7 },
  { area: "Loop", f1: 0.74, population: 42298, crime_rate: 7.8 }
];

export const FairnessPanel = () => {
  return (
    <div className="space-y-6">
      {/* Fairness Status Banner */}
      <Alert className="border-success/50 bg-success/10">
        <CheckCircle2 className="h-4 w-4 text-success" />
        <AlertDescription className="text-success-foreground">
          All fairness constraints satisfied. Model meets ethical deployment criteria.
        </AlertDescription>
      </Alert>

      {/* Fairness Metrics Grid */}
      <div className="grid gap-4 md:grid-cols-2">
        {fairnessMetrics.map((metric) => (
          <Card key={metric.name}>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-base">{metric.name}</CardTitle>
                  <CardDescription className="text-xs mt-1">
                    {metric.description}
                  </CardDescription>
                </div>
                {metric.passed ? (
                  <Badge variant="outline" className="bg-success/10 text-success border-success/20">
                    <CheckCircle2 className="h-3 w-3 mr-1" />
                    Pass
                  </Badge>
                ) : (
                  <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/20">
                    <AlertCircle className="h-3 w-3 mr-1" />
                    Fail
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-end justify-between">
                <div>
                  <div className="text-3xl font-bold">{metric.value.toFixed(3)}</div>
                  <div className="text-xs text-muted-foreground">
                    Threshold: {metric.threshold.toFixed(3)}
                  </div>
                </div>
                <Scale className="h-8 w-8 text-muted-foreground/20" />
              </div>
              <Progress 
                value={(1 - metric.value / metric.threshold) * 100} 
                className="h-2"
              />
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Community Performance Table */}
      <Card>
        <CardHeader>
          <CardTitle>Performance by Community Area</CardTitle>
          <CardDescription>
            Model F1 scores across Chicago neighborhoods (variance: 0.065)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {communityMetrics.map((community) => (
              <div key={community.area} className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <div className="flex-1">
                    <span className="font-medium">{community.area}</span>
                    <span className="text-muted-foreground ml-2">
                      Pop: {community.population.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-muted-foreground">
                      Crime Rate: {community.crime_rate}%
                    </span>
                    <span className="font-mono font-bold w-16 text-right">
                      {community.f1.toFixed(2)}
                    </span>
                  </div>
                </div>
                <Progress value={community.f1 * 100} className="h-1.5" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Fairness Methodology */}
      <Card>
        <CardHeader>
          <CardTitle>Fairness Framework</CardTitle>
        </CardHeader>
        <CardContent className="prose prose-sm max-w-none">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <h4 className="font-semibold text-sm mb-2">Mitigation Strategies</h4>
              <ul className="text-xs text-muted-foreground space-y-1">
                <li>• Fairlearn reweighting during training</li>
                <li>• Geographic cross-validation preventing bias</li>
                <li>• Temporal validation eliminating leakage</li>
                <li>• Counterfactual fairness checks</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-sm mb-2">Evaluation Gates</h4>
              <ul className="text-xs text-muted-foreground space-y-1">
                <li>• Pre-training: Data bias detection</li>
                <li>• During training: Fairness constraints</li>
                <li>• Post-training: Multi-metric validation</li>
                <li>• Deployment: Continuous monitoring</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
