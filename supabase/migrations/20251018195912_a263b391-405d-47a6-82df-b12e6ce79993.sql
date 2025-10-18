-- Fix critical security issues: Update existing policies to restrict access

-- 1. Update profiles table policy: Only allow users to view their own profile
DROP POLICY IF EXISTS "Profiles are viewable by authenticated users" ON public.profiles CASCADE;
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles CASCADE;

CREATE POLICY "Users can view own profile"
ON public.profiles
FOR SELECT
TO authenticated
USING (auth.uid() = id);

-- 2. Update audit_logs: Remove public access, allow only admins  
DROP POLICY IF EXISTS "Anyone can view audit logs" ON public.audit_logs CASCADE;
DROP POLICY IF EXISTS "Admins can view audit logs" ON public.audit_logs CASCADE;

CREATE POLICY "Admins can view audit logs"
ON public.audit_logs
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'));