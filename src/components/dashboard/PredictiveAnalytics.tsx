import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Brain, TrendingUp, AlertCircle, CheckCircle2, Loader2 } from "lucide-react";
import { useState } from "react";
import { makePredictionML } from "@/lib/api";
import { toast } from "sonner";

export const PredictiveAnalytics = () => {
  const [loading, setLoading] = useState(false);
  const [prediction, setPrediction] = useState<any>(null);
  const [features, setFeatures] = useState({
    primary_type: 'THEFT',
    community_area: 25,
    hour: 14,
    day_of_week: 'Monday',
    month: 10,
    latitude: 41.8781,
    longitude: -87.6298,
  });

  const handlePredict = async () => {
    setLoading(true);
    try {
      const result = await makePredictionML(features);
      setPrediction(result);
      toast.success('Prediction generated successfully');
    } catch (error) {
      console.error('Prediction error:', error);
      toast.error('Failed to generate prediction');
    } finally {
      setLoading(false);
    }
  };

  const getRiskColor = (level: string) => {
    switch (level) {
      case 'high': return 'bg-destructive/10 text-destructive border-destructive/20';
      case 'medium': return 'bg-warning/10 text-warning border-warning/20';
      case 'low': return 'bg-success/10 text-success border-success/20';
      default: return 'bg-muted';
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-primary" />
            AI-Powered Crime Prediction
          </CardTitle>
          <CardDescription>
            Generate intelligent predictions using real-time data analysis
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Crime Type</Label>
              <Select 
                value={features.primary_type}
                onValueChange={(value) => setFeatures({...features, primary_type: value})}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="THEFT">Theft</SelectItem>
                  <SelectItem value="BATTERY">Battery</SelectItem>
                  <SelectItem value="ASSAULT">Assault</SelectItem>
                  <SelectItem value="BURGLARY">Burglary</SelectItem>
                  <SelectItem value="ROBBERY">Robbery</SelectItem>
                  <SelectItem value="NARCOTICS">Narcotics</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Community Area</Label>
              <Input
                type="number"
                value={features.community_area}
                onChange={(e) => setFeatures({...features, community_area: parseInt(e.target.value)})}
                min="1"
                max="77"
              />
            </div>

            <div className="space-y-2">
              <Label>Hour of Day</Label>
              <Input
                type="number"
                value={features.hour}
                onChange={(e) => setFeatures({...features, hour: parseInt(e.target.value)})}
                min="0"
                max="23"
              />
            </div>

            <div className="space-y-2">
              <Label>Day of Week</Label>
              <Select 
                value={features.day_of_week}
                onValueChange={(value) => setFeatures({...features, day_of_week: value})}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Monday">Monday</SelectItem>
                  <SelectItem value="Tuesday">Tuesday</SelectItem>
                  <SelectItem value="Wednesday">Wednesday</SelectItem>
                  <SelectItem value="Thursday">Thursday</SelectItem>
                  <SelectItem value="Friday">Friday</SelectItem>
                  <SelectItem value="Saturday">Saturday</SelectItem>
                  <SelectItem value="Sunday">Sunday</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Month</Label>
              <Input
                type="number"
                value={features.month}
                onChange={(e) => setFeatures({...features, month: parseInt(e.target.value)})}
                min="1"
                max="12"
              />
            </div>

            <div className="space-y-2">
              <Label>Latitude</Label>
              <Input
                type="number"
                step="0.0001"
                value={features.latitude}
                onChange={(e) => setFeatures({...features, latitude: parseFloat(e.target.value)})}
              />
            </div>

            <div className="space-y-2">
              <Label>Longitude</Label>
              <Input
                type="number"
                step="0.0001"
                value={features.longitude}
                onChange={(e) => setFeatures({...features, longitude: parseFloat(e.target.value)})}
              />
            </div>
          </div>

          <Button 
            onClick={handlePredict} 
            disabled={loading}
            className="w-full"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Generating Prediction...
              </>
            ) : (
              <>
                <Brain className="mr-2 h-4 w-4" />
                Generate Prediction
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {prediction && (
        <Card>
          <CardHeader>
            <CardTitle>Prediction Results</CardTitle>
            <CardDescription>
              AI-generated analysis for the specified crime scenario
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-3">
              <div className="p-4 rounded-lg border bg-card">
                <div className="text-sm text-muted-foreground mb-1">Arrest Probability</div>
                <div className="text-2xl font-bold">
                  {(prediction.arrest_probability * 100).toFixed(1)}%
                </div>
              </div>

              <div className="p-4 rounded-lg border bg-card">
                <div className="text-sm text-muted-foreground mb-1">Risk Score</div>
                <div className="text-2xl font-bold">
                  {(prediction.risk_score * 100).toFixed(1)}%
                </div>
              </div>

              <div className="p-4 rounded-lg border bg-card">
                <div className="text-sm text-muted-foreground mb-1">Confidence</div>
                <div className="text-2xl font-bold">
                  {(prediction.confidence * 100).toFixed(1)}%
                </div>
              </div>
            </div>

            <div>
              <div className="flex items-center gap-2 mb-2">
                <AlertCircle className="h-4 w-4" />
                <span className="text-sm font-medium">Risk Level</span>
              </div>
              <Badge variant="outline" className={`${getRiskColor(prediction.risk_level)} text-sm px-3 py-1`}>
                {prediction.risk_level.toUpperCase()}
              </Badge>
            </div>

            {prediction.explanation && (
              <div className="p-4 rounded-lg bg-muted">
                <div className="text-sm font-medium mb-2">AI Analysis</div>
                <p className="text-sm text-muted-foreground">{prediction.explanation}</p>
              </div>
            )}

            {prediction.contributing_factors && prediction.contributing_factors.length > 0 && (
              <div>
                <div className="text-sm font-medium mb-3">Contributing Factors</div>
                <div className="space-y-2">
                  {prediction.contributing_factors.map((factor: any, idx: number) => (
                    <div key={idx} className="flex items-center justify-between p-3 rounded-lg border bg-card">
                      <div className="flex items-center gap-2">
                        {factor.contribution > 0 ? (
                          <CheckCircle2 className="h-4 w-4 text-success" />
                        ) : (
                          <AlertCircle className="h-4 w-4 text-warning" />
                        )}
                        <span className="text-sm font-medium">{factor.feature}</span>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-medium">
                          {(factor.importance * 100).toFixed(0)}% importance
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {factor.contribution > 0 ? '+' : ''}{(factor.contribution * 100).toFixed(1)}% impact
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {prediction.prediction_id && (
              <div className="text-xs text-muted-foreground">
                Prediction ID: {prediction.prediction_id}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};
