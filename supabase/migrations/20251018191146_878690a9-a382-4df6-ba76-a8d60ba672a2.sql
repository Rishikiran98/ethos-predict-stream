-- Security Fix: Restrict model artifact access to admins and analysts only
-- Drop the overly permissive policy
DROP POLICY IF EXISTS "Anyone can view model artifacts" ON public.model_artifacts;

-- Create new restricted policy for admins
CREATE POLICY "Admins can view model artifacts"
ON public.model_artifacts
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Create new restricted policy for analysts
CREATE POLICY "Analysts can view model artifacts"
ON public.model_artifacts
FOR SELECT
USING (has_role(auth.uid(), 'analyst'::app_role));