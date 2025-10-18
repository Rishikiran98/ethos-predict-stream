import { Shield, AlertTriangle, Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export const DashboardHeader = () => {
  return (
    <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Shield className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">
                Ethical AI Policing Platform
              </h1>
              <p className="text-sm text-muted-foreground">
                Chicago Crime Analysis • 6.2M Records
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Badge variant="outline" className="gap-2">
              <div className="h-2 w-2 rounded-full bg-success animate-pulse" />
              System Active
            </Badge>
            <Badge variant="secondary" className="gap-2">
              <Clock className="h-3 w-3" />
              Last Updated: 2m ago
            </Badge>
          </div>
        </div>

        <div className="mt-4 flex items-center gap-2 text-sm">
          <AlertTriangle className="h-4 w-4 text-warning" />
          <span className="text-muted-foreground">
            Fairness constraints active • Geographic cross-validation enabled • 
            Temporal validation preventing data leakage
          </span>
        </div>
      </div>
    </header>
  );
};
