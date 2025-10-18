-- Fix the security definer view issue
DROP VIEW IF EXISTS public.community_feedback_public;

-- Recreate view with SECURITY INVOKER (uses querying user's permissions)
CREATE VIEW public.community_feedback_public 
WITH (security_invoker = true) AS
SELECT 
  feedback_id,
  feedback_type,
  community_area,
  description,
  status,
  created_at,
  updated_at
FROM public.community_feedback;

-- Grant access to the public view
GRANT SELECT ON public.community_feedback_public TO authenticated;
GRANT SELECT ON public.community_feedback_public TO anon;

-- Add RLS to the view
ALTER VIEW public.community_feedback_public SET (security_invoker = on);

COMMENT ON VIEW public.community_feedback_public IS 'Public view of community feedback without sensitive reporter information or admin notes. Uses security invoker for proper RLS enforcement.';