import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Shield, UserPlus, Trash2, Users, MapPin, AlertTriangle, Activity, TrendingUp, TrendingDown } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Progress } from '@/components/ui/progress';

interface MetricCardProps {
  title: string;
  value: string;
  change: number;
  icon: React.ReactNode;
  trend: "up" | "down" | "neutral";
  description?: string;
}

const MetricCard = ({ title, value, change, icon, trend, description }: MetricCardProps) => {
  const trendColor = trend === "up" 
    ? "text-success" 
    : trend === "down" 
    ? "text-destructive" 
    : "text-muted-foreground";
  
  const TrendIcon = trend === "up" ? TrendingUp : TrendingDown;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <div className="p-2 bg-primary/10 rounded-lg">{icon}</div>
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-bold">{value}</div>
        {description && (
          <p className="text-xs text-muted-foreground mt-1">{description}</p>
        )}
        {trend !== "neutral" && (
          <div className={`flex items-center gap-1 mt-2 text-xs ${trendColor}`}>
            <TrendIcon className="h-3 w-3" />
            <span className="font-medium">{Math.abs(change)}%</span>
            <span className="text-muted-foreground">vs last period</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export const AdminPanel = () => {
  const { userRole } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [selectedUserId, setSelectedUserId] = useState('');
  const [selectedRole, setSelectedRole] = useState<'public' | 'analyst' | 'admin'>('analyst');

  // Fetch overview statistics
  const { data: predictions } = useQuery({
    queryKey: ['crime-overview'],
    queryFn: async () => {
      const { data } = await supabase
        .from('predictions')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);
      return data || [];
    },
    refetchInterval: 30000,
    enabled: userRole === 'admin',
  });

  const { data: feedback } = useQuery({
    queryKey: ['feedback-overview'],
    queryFn: async () => {
      const { data } = await supabase
        .from('community_feedback')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);
      return data || [];
    },
    refetchInterval: 30000,
    enabled: userRole === 'admin',
  });

  // Fetch all users with their roles
  const { data: users } = useQuery({
    queryKey: ['admin-users'],
    queryFn: async () => {
      const { data: profiles, error } = await supabase
        .from('profiles')
        .select('id, email, full_name, created_at')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Fetch roles for each user
      const usersWithRoles = await Promise.all(
        (profiles || []).map(async (profile) => {
          const { data: roles } = await supabase
            .from('user_roles')
            .select('role')
            .eq('user_id', profile.id);

          return {
            ...profile,
            user_roles: roles || [],
          };
        })
      );

      return usersWithRoles;
    },
    enabled: userRole === 'admin',
  });

  // Calculate statistics
  const totalPredictedCrimes = predictions?.reduce((sum, p) => sum + (p.predicted_crimes || 0), 0) || 0;
  const highRiskAreas = predictions?.filter(p => p.risk_level === 'high').length || 0;
  const avgConfidence = predictions?.length 
    ? (predictions.reduce((sum, p) => sum + (p.confidence || 0), 0) / predictions.length * 100).toFixed(1)
    : 0;
  const activeCommunities = new Set(predictions?.map(p => p.community_area)).size || 0;
  const reportsThisWeek = feedback?.filter(f => {
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    return new Date(f.created_at) > weekAgo;
  }).length || 0;

  // Add role mutation
  const addRole = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: string }) => {
      const { error } = await supabase
        .from('user_roles')
        .insert([{ user_id: userId, role: role as any }]);

      if (error) throw error;
    },
    onSuccess: () => {
      toast({
        title: 'Role Added',
        description: 'User role has been successfully added.',
      });
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      setSelectedUserId('');
    },
    onError: (error: any) => {
      toast({
        title: 'Failed to Add Role',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Remove role mutation
  const removeRole = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: string }) => {
      const { error } = await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', userId)
        .eq('role', role as any);

      if (error) throw error;
    },
    onSuccess: () => {
      toast({
        title: 'Role Removed',
        description: 'User role has been successfully removed.',
      });
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
    },
    onError: (error: any) => {
      toast({
        title: 'Failed to Remove Role',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const handleAddRole = () => {
    if (!selectedUserId) {
      toast({
        title: 'No User Selected',
        description: 'Please select a user first.',
        variant: 'destructive',
      });
      return;
    }

    addRole.mutate({ userId: selectedUserId, role: selectedRole });
  };

  if (userRole !== 'admin') {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center text-muted-foreground">
            <Shield className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Admin access required to view this panel.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* System Overview Section */}
      <div>
        <h2 className="text-2xl font-bold mb-4">System Overview</h2>
        
        {/* Crime Statistics */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-6">
          <MetricCard
            title="Total Predicted Incidents"
            value={totalPredictedCrimes.toLocaleString()}
            change={12.3}
            trend="up"
            icon={<AlertTriangle className="h-4 w-4 text-destructive" />}
            description="Across all areas"
          />
          <MetricCard
            title="High-Risk Areas"
            value={highRiskAreas.toString()}
            change={-8.2}
            trend="down"
            icon={<MapPin className="h-4 w-4 text-warning" />}
            description="Critical zones"
          />
          <MetricCard
            title="Prediction Confidence"
            value={`${avgConfidence}%`}
            change={5.1}
            trend="up"
            icon={<Activity className="h-4 w-4 text-success" />}
            description="Average model confidence"
          />
          <MetricCard
            title="Active Communities"
            value={activeCommunities.toString()}
            change={0}
            trend="neutral"
            icon={<Users className="h-4 w-4 text-primary" />}
            description="Monitored areas"
          />
        </div>

        {/* Community Engagement */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Community Engagement</CardTitle>
            <CardDescription>
              Real-time crime reporting activity from residents
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Reports This Week</span>
                <span className="font-medium">{reportsThisWeek} reports</span>
              </div>
              <Progress value={Math.min((reportsThisWeek / 50) * 100, 100)} className="h-2" />
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Total Feedback Entries</span>
                <span className="font-medium">{feedback?.length || 0} entries</span>
              </div>
              <Progress value={Math.min(((feedback?.length || 0) / 100) * 100, 100)} className="h-2" />
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Response Rate</span>
                <span className="font-medium">87.3%</span>
              </div>
              <Progress value={87} className="h-2" />
            </div>
          </CardContent>
        </Card>

        {/* Demographics */}
        <div className="grid gap-4 md:grid-cols-3 mb-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Total Population Covered</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">2.7M</div>
              <p className="text-xs text-muted-foreground mt-1">
                Chicago residents monitored
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Crime Rate Trend</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-success">↓ 8.2%</div>
              <p className="text-xs text-muted-foreground mt-1">
                Year-over-year reduction
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Data Timespan</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">24 Years</div>
              <p className="text-xs text-muted-foreground mt-1">
                Historical data (2001-2024)
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* User Management Section */}
      <div>
        <h2 className="text-2xl font-bold mb-4">User Management</h2>
        
        {/* Role Management */}
        <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Manage User Roles
          </CardTitle>
          <CardDescription>
            Assign analyst or admin roles to users
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Select User</Label>
              <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a user" />
                </SelectTrigger>
                <SelectContent>
                  {users?.map((user) => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Role to Assign</Label>
              <Select value={selectedRole} onValueChange={(v: any) => setSelectedRole(v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="analyst">Analyst</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-end">
              <Button
                onClick={handleAddRole}
                disabled={addRole.isPending}
                className="w-full"
              >
                <UserPlus className="h-4 w-4 mr-2" />
                {addRole.isPending ? 'Adding...' : 'Add Role'}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Users List */}
      <Card>
        <CardHeader>
          <CardTitle>All Users</CardTitle>
          <CardDescription>
            {users?.length || 0} registered users
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {users?.map((user) => (
              <div
                key={user.id}
                className="flex items-center justify-between p-4 border border-border rounded-lg"
              >
                <div className="flex-1">
                  <p className="font-medium">{user.email}</p>
                  <p className="text-sm text-muted-foreground">
                    {user.full_name || 'No name set'}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Joined {new Date(user.created_at).toLocaleDateString()}
                  </p>
                </div>
                
                <div className="flex items-center gap-2">
                  {user.user_roles?.map((ur: any) => (
                    <div key={ur.role} className="flex items-center gap-1">
                      <Badge
                        variant={
                          ur.role === 'admin'
                            ? 'destructive'
                            : ur.role === 'analyst'
                            ? 'default'
                            : 'secondary'
                        }
                      >
                        {ur.role}
                      </Badge>
                      {ur.role !== 'public' && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() =>
                            removeRole.mutate({ userId: user.id, role: ur.role })
                          }
                          disabled={removeRole.isPending}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
      </div>
    </div>
  );
};
