import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { MessageSquare, Send, AlertTriangle, CheckCircle2, Clock } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';

const feedbackSchema = z.object({
  community_area: z.string().trim().min(1, 'Community area is required'),
  feedback_type: z.enum(['bias_report', 'accuracy_concern', 'general']),
  description: z.string().trim().min(10, 'Description must be at least 10 characters').max(1000, 'Description must be less than 1000 characters'),
});

export const CommunityFeedback = () => {
  const { user, userRole } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [communityArea, setCommunityArea] = useState('');
  const [feedbackType, setFeedbackType] = useState<'bias_report' | 'accuracy_concern' | 'general'>('general');
  const [description, setDescription] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Show login prompt if not authenticated
  if (!user) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center space-y-4">
            <MessageSquare className="h-12 w-12 mx-auto text-muted-foreground" />
            <div>
              <h3 className="font-semibold text-lg">Authentication Required</h3>
              <p className="text-sm text-muted-foreground mt-2">
                Please sign in to submit community feedback and view feedback history.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Fetch existing feedback
  const { data: feedbackList } = useQuery({
    queryKey: ['community-feedback'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('community_feedback')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;
      return data;
    },
  });

  // Submit feedback mutation
  const submitFeedback = useMutation({
    mutationFn: async (formData: { community_area: string; feedback_type: 'bias_report' | 'accuracy_concern' | 'general'; description: string }) => {
      const feedbackId = 'fb_' + Math.random().toString(36).substr(2, 9);
      
      const { error } = await supabase
        .from('community_feedback')
        .insert([{
          feedback_id: feedbackId,
          community_area: formData.community_area,
          feedback_type: formData.feedback_type as any,
          description: formData.description,
          reporter_id: user?.id,
          status: 'pending',
        }]);

      if (error) throw error;
    },
    onSuccess: () => {
      toast({
        title: 'Feedback Submitted',
        description: 'Thank you for your input. An admin will review it shortly.',
      });
      setCommunityArea('');
      setDescription('');
      setFeedbackType('general');
      setErrors({});
      queryClient.invalidateQueries({ queryKey: ['community-feedback'] });
    },
    onError: (error: any) => {
      toast({
        title: 'Submission Failed',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const result = feedbackSchema.safeParse({
      community_area: communityArea,
      feedback_type: feedbackType,
      description,
    });

    if (!result.success) {
      const formattedErrors: Record<string, string> = {};
      result.error.issues.forEach((issue) => {
        if (issue.path[0]) {
          formattedErrors[issue.path[0].toString()] = issue.message;
        }
      });
      setErrors(formattedErrors);
      return;
    }

    submitFeedback.mutate({
      community_area: communityArea,
      feedback_type: feedbackType,
      description,
    });
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'resolved':
        return <CheckCircle2 className="h-4 w-4 text-success" />;
      case 'reviewed':
        return <Clock className="h-4 w-4 text-warning" />;
      default:
        return <AlertTriangle className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'bias_report':
        return 'Bias Report';
      case 'accuracy_concern':
        return 'Accuracy Concern';
      default:
        return 'General';
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Submit Feedback Form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Submit Community Feedback
          </CardTitle>
          <CardDescription>
            Report concerns about model bias, accuracy, or provide general feedback
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="community-area">Community Area</Label>
              <Input
                id="community-area"
                placeholder="e.g., Austin, West Town"
                value={communityArea}
                onChange={(e) => setCommunityArea(e.target.value)}
              />
              {errors.community_area && (
                <p className="text-sm text-destructive">{errors.community_area}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="feedback-type">Feedback Type</Label>
              <Select value={feedbackType} onValueChange={(v: any) => setFeedbackType(v)}>
                <SelectTrigger id="feedback-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="general">General Feedback</SelectItem>
                  <SelectItem value="bias_report">Bias Report</SelectItem>
                  <SelectItem value="accuracy_concern">Accuracy Concern</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="Please describe your feedback in detail..."
                rows={5}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
              {errors.description && (
                <p className="text-sm text-destructive">{errors.description}</p>
              )}
              <p className="text-xs text-muted-foreground">
                {description.length}/1000 characters
              </p>
            </div>

            <Button type="submit" className="w-full" disabled={submitFeedback.isPending}>
              <Send className="h-4 w-4 mr-2" />
              {submitFeedback.isPending ? 'Submitting...' : 'Submit Feedback'}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Feedback History */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Feedback</CardTitle>
          <CardDescription>
            {userRole === 'admin' ? 'All community feedback' : 'Your submitted feedback'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4 max-h-[500px] overflow-y-auto">
            {feedbackList && feedbackList.length > 0 ? (
              feedbackList.map((feedback) => (
                <div
                  key={feedback.id}
                  className="p-4 border border-border rounded-lg space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <Badge variant="outline">{getTypeLabel(feedback.feedback_type)}</Badge>
                    <div className="flex items-center gap-2">
                      {getStatusIcon(feedback.status)}
                      <span className="text-xs text-muted-foreground capitalize">
                        {feedback.status}
                      </span>
                    </div>
                  </div>
                  <p className="text-sm font-medium">{feedback.community_area}</p>
                  <p className="text-sm text-muted-foreground">{feedback.description}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(feedback.created_at).toLocaleString()}
                  </p>
                  {feedback.admin_notes && userRole === 'admin' && (
                    <div className="mt-2 p-2 bg-muted rounded">
                      <p className="text-xs font-medium">Admin Notes:</p>
                      <p className="text-xs">{feedback.admin_notes}</p>
                    </div>
                  )}
                </div>
              ))
            ) : (
              <p className="text-center text-muted-foreground py-8">
                No feedback submitted yet
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
