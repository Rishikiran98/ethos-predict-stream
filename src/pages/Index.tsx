import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { MetricsOverview } from "@/components/dashboard/MetricsOverview";
import { FairnessPanel } from "@/components/dashboard/FairnessPanel";
import { GeographicView } from "@/components/dashboard/GeographicView";
import { ModelPerformance } from "@/components/dashboard/ModelPerformance";
import { AuditLog } from "@/components/dashboard/AuditLog";
import { ExplainabilityView } from "@/components/dashboard/ExplainabilityView";
import { CommunityFeedback } from "@/components/dashboard/CommunityFeedback";
import { AdminPanel } from "@/components/dashboard/AdminPanel";
import { useAuth } from "@/contexts/AuthContext";

const Index = () => {
  const [activeTab, setActiveTab] = useState("overview");
  const { userRole } = useAuth();

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/30 to-background">
      <DashboardHeader />
      
      <main className="container mx-auto px-4 py-6 space-y-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-8 lg:w-auto">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="fairness">Fairness</TabsTrigger>
            <TabsTrigger value="geography">Geography</TabsTrigger>
            <TabsTrigger value="performance">Performance</TabsTrigger>
            <TabsTrigger value="explain">Explainability</TabsTrigger>
            <TabsTrigger value="feedback">Feedback</TabsTrigger>
            <TabsTrigger value="audit">Audit</TabsTrigger>
            {userRole === 'admin' && <TabsTrigger value="admin">Admin</TabsTrigger>}
          </TabsList>

          <TabsContent value="overview" className="mt-6 space-y-6">
            <MetricsOverview />
          </TabsContent>

          <TabsContent value="fairness" className="mt-6">
            <FairnessPanel />
          </TabsContent>

          <TabsContent value="geography" className="mt-6">
            <GeographicView />
          </TabsContent>

          <TabsContent value="performance" className="mt-6">
            <ModelPerformance />
          </TabsContent>

          <TabsContent value="explain" className="mt-6">
            <ExplainabilityView />
          </TabsContent>

          <TabsContent value="feedback" className="mt-6">
            <CommunityFeedback />
          </TabsContent>

          <TabsContent value="audit" className="mt-6">
            <AuditLog />
          </TabsContent>

          {userRole === 'admin' && (
            <TabsContent value="admin" className="mt-6">
              <AdminPanel />
            </TabsContent>
          )}
        </Tabs>
      </main>
    </div>
  );
};

export default Index;
