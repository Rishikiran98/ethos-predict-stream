-- Fix community_feedback security: Protect whistleblower identities

-- 1. Drop the existing overly permissive policy
DROP POLICY IF EXISTS "Authenticated users can view feedback" ON public.community_feedback;

-- 2. Allow users to view only their own feedback submissions
CREATE POLICY "Users can view own feedback"
ON public.community_feedback
FOR SELECT
TO authenticated
USING (auth.uid() = reporter_id);

-- 3. Admins can view all feedback (they already have full access)
-- Note: The existing "Admins can manage all feedback" policy already covers this

-- 4. Create a public view for feedback that excludes sensitive information
CREATE OR REPLACE VIEW public.community_feedback_public AS
SELECT 
  feedback_id,
  feedback_type,
  community_area,
  description,
  status,
  created_at,
  updated_at
  -- Explicitly exclude: reporter_id, admin_notes, prediction_id
FROM public.community_feedback;

-- 5. Grant access to the public view
GRANT SELECT ON public.community_feedback_public TO authenticated;
GRANT SELECT ON public.community_feedback_public TO anon;

COMMENT ON VIEW public.community_feedback_public IS 'Public view of community feedback without sensitive reporter information or admin notes';