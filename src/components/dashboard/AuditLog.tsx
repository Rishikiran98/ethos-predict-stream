import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Filter, Download, AlertCircle, CheckCircle2, Info, Clock } from "lucide-react";

const auditEntries = [
  {
    timestamp: "2024-10-18 14:23:15",
    type: "model_training",
    status: "success",
    message: "XGBoost model trained successfully with fairness constraints",
    details: { r2: 0.723, fairness_score: 0.93, duration: "12.4min" }
  },
  {
    timestamp: "2024-10-18 14:10:42",
    type: "data_validation",
    status: "success",
    message: "Temporal validation gate passed - no future data leakage detected",
    details: { records_validated: 247891, violations: 0 }
  },
  {
    timestamp: "2024-10-18 13:58:11",
    type: "fairness_audit",
    status: "success",
    message: "All fairness metrics within acceptable thresholds",
    details: { demographic_parity: 0.043, equalized_odds: 0.92 }
  },
  {
    timestamp: "2024-10-18 13:45:28",
    type: "prediction",
    status: "info",
    message: "Batch prediction completed for 77 community areas",
    details: { predictions_made: 77, avg_confidence: 0.86 }
  },
  {
    timestamp: "2024-10-18 13:32:05",
    type: "feature_engineering",
    status: "success",
    message: "Feature engineering completed using distributed workers",
    details: { features_created: 42, processing_time: "8.2min" }
  },
  {
    timestamp: "2024-10-18 12:15:44",
    type: "data_leakage_check",
    status: "warning",
    message: "Potential data leakage detected in temporal features - auto-corrected",
    details: { suspicious_features: 3, action_taken: "removed" }
  },
  {
    timestamp: "2024-10-18 11:47:22",
    type: "community_feedback",
    status: "info",
    message: "Community bias report received for South Shore area",
    details: { area: "South Shore", reporter_id: "anon_4729", flagged_prediction: 134 }
  },
  {
    timestamp: "2024-10-18 10:23:59",
    type: "model_deployment",
    status: "success",
    message: "Model v2.4.1 deployed to production after validation",
    details: { previous_version: "2.4.0", validation_passed: true }
  }
];

const getStatusIcon = (status: string) => {
  switch (status) {
    case "success":
      return <CheckCircle2 className="h-4 w-4 text-success" />;
    case "warning":
      return <AlertCircle className="h-4 w-4 text-warning" />;
    case "error":
      return <AlertCircle className="h-4 w-4 text-destructive" />;
    default:
      return <Info className="h-4 w-4 text-primary" />;
  }
};

const getStatusBadge = (status: string) => {
  const variants: Record<string, string> = {
    success: "bg-success/10 text-success border-success/20",
    warning: "bg-warning/10 text-warning border-warning/20",
    error: "bg-destructive/10 text-destructive border-destructive/20",
    info: "bg-primary/10 text-primary border-primary/20"
  };
  
  return (
    <Badge variant="outline" className={variants[status]}>
      {status}
    </Badge>
  );
};

export const AuditLog = () => {
  return (
    <div className="space-y-6">
      {/* Search and Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Search audit logs..." 
                className="pl-10"
              />
            </div>
            <Button variant="outline" size="icon">
              <Filter className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="icon">
              <Download className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Audit Entries */}
      <Card>
        <CardHeader>
          <CardTitle>System Audit Log</CardTitle>
          <CardDescription>
            Complete record of all system operations, validations, and interventions
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {auditEntries.map((entry, idx) => (
              <div
                key={idx}
                className="flex items-start gap-3 p-4 rounded-lg border hover:bg-accent/5 transition-colors"
              >
                <div className="mt-0.5">
                  {getStatusIcon(entry.status)}
                </div>
                
                <div className="flex-1 space-y-2">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm">{entry.message}</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        <span>{entry.timestamp}</span>
                        <span>•</span>
                        <span className="font-mono">{entry.type}</span>
                      </div>
                    </div>
                    {getStatusBadge(entry.status)}
                  </div>
                  
                  {entry.details && (
                    <div className="pl-4 border-l-2 border-muted">
                      <pre className="text-xs text-muted-foreground font-mono">
                        {JSON.stringify(entry.details, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Audit Statistics */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">1,247</div>
            <p className="text-xs text-muted-foreground">Total operations logged</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-success">1,189</div>
            <p className="text-xs text-muted-foreground">Successful operations</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-warning">47</div>
            <p className="text-xs text-muted-foreground">Warnings issued</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-destructive">11</div>
            <p className="text-xs text-muted-foreground">Errors caught</p>
          </CardContent>
        </Card>
      </div>

      {/* Compliance Statement */}
      <Card className="border-primary/50">
        <CardHeader>
          <CardTitle className="text-base">Compliance & Transparency</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            All system operations are logged with complete traceability. Audit logs are
            immutable and cryptographically signed. Retention period: 7 years. Available
            for regulatory review and community oversight upon request.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};
