-- CRITICAL FIX: Revert overly permissive policy
-- The previous migration made ALL community_feedback fields public
-- This exposes reporter_id and admin_notes, defeating whistleblower protection

-- 1. Drop the overly permissive policy
DROP POLICY IF EXISTS "Public can view safe feedback fields" ON public.community_feedback;

-- 2. Restore proper restricted access
-- Users can only view their own feedback
CREATE POLICY "Users can view own feedback"
ON public.community_feedback
FOR SELECT
TO authenticated
USING (auth.uid() = reporter_id);

-- 3. The community_feedback_public VIEW is safe for public access because:
--    - It explicitly excludes: reporter_id, admin_notes, prediction_id
--    - It only exposes: feedback_id, feedback_type, community_area, description, status, timestamps
--    - Views don't need separate RLS policies when properly designed
--    - The security finding has been marked as acceptable

-- 4. Applications should use community_feedback_public for public display
-- 5. Only admins and the reporter can see the full feedback record