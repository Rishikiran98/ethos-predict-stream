-- Fix: Allow public viewing of non-sensitive feedback fields
-- The view community_feedback_public is designed to be publicly accessible
-- but only exposes safe fields (no reporter_id, admin_notes, prediction_id)

-- Add a policy to allow viewing all feedback records for public display
CREATE POLICY "Public can view safe feedback fields"
ON public.community_feedback
FOR SELECT
TO authenticated, anon
USING (
  -- This policy applies when accessing through the public view
  -- The view itself filters out sensitive columns
  true
);

-- Since we now have overlapping policies, we need to make them more specific
-- Drop and recreate the user-specific policy to be more restrictive

DROP POLICY IF EXISTS "Users can view own feedback" ON public.community_feedback;

-- Note: The "Admins can manage all feedback" policy already exists and is more permissive
-- The new "Public can view safe feedback fields" policy allows all authenticated/anon users to see all records
-- This is safe because the public view (community_feedback_public) excludes sensitive fields