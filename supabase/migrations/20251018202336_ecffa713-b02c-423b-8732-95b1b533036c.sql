-- Fix search path for existing generate_audit_hash function
CREATE OR REPLACE FUNCTION public.generate_audit_hash()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  prev_hash TEXT;
  hash_input TEXT;
BEGIN
  -- Get previous hash
  SELECT current_hash INTO prev_hash 
  FROM public.audit_logs 
  ORDER BY sequence_number DESC 
  LIMIT 1;
  
  NEW.previous_hash := COALESCE(prev_hash, 'GENESIS');
  
  -- Generate current hash
  hash_input := NEW.sequence_number::TEXT || 
                NEW.operation_type || 
                NEW.status::TEXT || 
                NEW.message || 
                NEW.details::TEXT || 
                COALESCE(NEW.user_id::TEXT, 'SYSTEM') ||
                NEW.previous_hash ||
                NEW.created_at::TEXT;
  
  NEW.current_hash := encode(digest(hash_input, 'sha256'), 'hex');
  
  RETURN NEW;
END;
$$;