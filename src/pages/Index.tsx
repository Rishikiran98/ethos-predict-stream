import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { MetricsOverview } from "@/components/dashboard/MetricsOverview";
import { FairnessPanel } from "@/components/dashboard/FairnessPanel";
import { GeographicView } from "@/components/dashboard/GeographicView";
import { CrimeMapView } from "@/components/dashboard/CrimeMapView";
import { ModelPerformance } from "@/components/dashboard/ModelPerformance";
import { AuditLog } from "@/components/dashboard/AuditLog";
import { ExplainabilityView } from "@/components/dashboard/ExplainabilityView";
import { CommunityFeedback } from "@/components/dashboard/CommunityFeedback";
import { AdminPanel } from "@/components/dashboard/AdminPanel";
import { PredictiveAnalytics } from "@/components/dashboard/PredictiveAnalytics";
import { AnalyticsView } from "@/components/dashboard/AnalyticsView";
import { AIModelPerformance } from "@/components/dashboard/AIModelPerformance";
import { useAuth } from "@/contexts/AuthContext";

const Index = () => {
  const { userRole } = useAuth();
  const [activeTab, setActiveTab] = useState("fairness");

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/30 to-background">
      <DashboardHeader />
      
      <main className="container mx-auto px-4 py-6 space-y-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-6 lg:grid-cols-9 lg:w-auto">
            <TabsTrigger value="fairness">Fairness</TabsTrigger>
            <TabsTrigger value="geography">Crime Map</TabsTrigger>
            <TabsTrigger value="predict">AI Predict</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
            {userRole && <TabsTrigger value="feedback">Report Crime</TabsTrigger>}
            {userRole === 'admin' && <TabsTrigger value="ai-models">AI Models</TabsTrigger>}
            {userRole === 'admin' && <TabsTrigger value="performance">Performance</TabsTrigger>}
            {userRole === 'admin' && <TabsTrigger value="explain">Explainability</TabsTrigger>}
            {userRole === 'admin' && <TabsTrigger value="audit">Audit</TabsTrigger>}
            {userRole === 'admin' && <TabsTrigger value="admin">Admin</TabsTrigger>}
          </TabsList>

          <TabsContent value="fairness" className="mt-6">
            <FairnessPanel onNavigate={setActiveTab} />
          </TabsContent>

          <TabsContent value="geography" className="mt-6">
            <CrimeMapView />
          </TabsContent>

          <TabsContent value="predict" className="mt-6">
            <PredictiveAnalytics />
          </TabsContent>

          <TabsContent value="analytics" className="mt-6">
            <AnalyticsView />
          </TabsContent>

          {userRole && (
            <TabsContent value="feedback" className="mt-6">
              <CommunityFeedback />
            </TabsContent>
          )}

          {userRole === 'admin' && (
            <>
              <TabsContent value="ai-models" className="mt-6">
                <AIModelPerformance />
              </TabsContent>

              <TabsContent value="performance" className="mt-6">
                <ModelPerformance />
              </TabsContent>

              <TabsContent value="explain" className="mt-6">
                <ExplainabilityView />
              </TabsContent>

              <TabsContent value="audit" className="mt-6">
                <AuditLog />
              </TabsContent>

              <TabsContent value="admin" className="mt-6">
                <AdminPanel />
              </TabsContent>
            </>
          )}
        </Tabs>
      </main>
    </div>
  );
};

export default Index;
