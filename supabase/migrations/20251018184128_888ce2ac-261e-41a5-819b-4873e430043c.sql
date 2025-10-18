-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Create enum types
CREATE TYPE app_role AS ENUM ('public', 'analyst', 'admin');
CREATE TYPE prediction_status AS ENUM ('pending', 'completed', 'failed');
CREATE TYPE audit_status AS ENUM ('success', 'warning', 'error', 'info');
CREATE TYPE feedback_type AS ENUM ('bias_report', 'accuracy_concern', 'general');

-- User roles table
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL DEFAULT 'public',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, role)
);

-- Profiles table for user metadata
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Model artifacts table (stores trained models)
CREATE TABLE public.model_artifacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  version TEXT NOT NULL UNIQUE,
  model_binary BYTEA NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  r2_score NUMERIC(5,4),
  rmse NUMERIC(10,4),
  mae NUMERIC(10,4),
  training_time_seconds INTEGER,
  is_active BOOLEAN DEFAULT FALSE,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Predictions table
CREATE TABLE public.predictions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prediction_id TEXT NOT NULL UNIQUE,
  community_area TEXT NOT NULL,
  date_range_start DATE NOT NULL,
  date_range_end DATE NOT NULL,
  predicted_crimes INTEGER NOT NULL,
  confidence NUMERIC(3,2) NOT NULL,
  risk_level TEXT NOT NULL CHECK (risk_level IN ('low', 'medium', 'high')),
  contributing_factors JSONB NOT NULL DEFAULT '[]'::jsonb,
  model_version TEXT NOT NULL,
  status prediction_status DEFAULT 'completed',
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Fairness evaluations table
CREATE TABLE public.fairness_evaluations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  model_version TEXT NOT NULL,
  demographic_parity_diff NUMERIC(5,4) NOT NULL,
  equalized_odds_ratio NUMERIC(5,4) NOT NULL,
  f1_variance NUMERIC(5,4) NOT NULL,
  calibration_error NUMERIC(5,4) NOT NULL,
  community_metrics JSONB NOT NULL DEFAULT '[]'::jsonb,
  passed_thresholds BOOLEAN NOT NULL,
  evaluation_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Audit logs table with cryptographic hash chain
CREATE TABLE public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sequence_number BIGSERIAL,
  operation_type TEXT NOT NULL,
  status audit_status NOT NULL,
  message TEXT NOT NULL,
  details JSONB NOT NULL DEFAULT '{}'::jsonb,
  user_id UUID REFERENCES auth.users(id),
  previous_hash TEXT,
  current_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Community feedback table
CREATE TABLE public.community_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  feedback_id TEXT NOT NULL UNIQUE,
  community_area TEXT NOT NULL,
  prediction_id UUID REFERENCES public.predictions(id),
  feedback_type feedback_type NOT NULL,
  description TEXT NOT NULL,
  reporter_id UUID REFERENCES auth.users(id),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'resolved')),
  admin_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.model_artifacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.predictions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fairness_evaluations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_feedback ENABLE ROW LEVEL SECURITY;

-- Security definer function to check roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Function to create audit hash chain
CREATE OR REPLACE FUNCTION public.generate_audit_hash()
RETURNS TRIGGER AS $$
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for audit hash chain
CREATE TRIGGER audit_hash_trigger
BEFORE INSERT ON public.audit_logs
FOR EACH ROW
EXECUTE FUNCTION public.generate_audit_hash();

-- Function to auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email)
  );
  
  -- Assign default 'public' role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'public');
  
  RETURN NEW;
END;
$$;

-- Trigger to create profile on user signup
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.handle_new_user();

-- RLS Policies

-- user_roles: Users can view their own roles, admins can view all
CREATE POLICY "Users can view own roles"
ON public.user_roles FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all roles"
ON public.user_roles FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage roles"
ON public.user_roles FOR ALL
USING (public.has_role(auth.uid(), 'admin'));

-- profiles: Users can view all profiles but only update their own
CREATE POLICY "Profiles are viewable by authenticated users"
ON public.profiles FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Users can update own profile"
ON public.profiles FOR UPDATE
USING (auth.uid() = id);

-- model_artifacts: Public read, admin write
CREATE POLICY "Anyone can view model artifacts"
ON public.model_artifacts FOR SELECT
USING (true);

CREATE POLICY "Admins can manage model artifacts"
ON public.model_artifacts FOR ALL
USING (public.has_role(auth.uid(), 'admin'));

-- predictions: Public read, analyst+ create, admin full access
CREATE POLICY "Anyone can view predictions"
ON public.predictions FOR SELECT
USING (true);

CREATE POLICY "Analysts can create predictions"
ON public.predictions FOR INSERT
TO authenticated
WITH CHECK (
  public.has_role(auth.uid(), 'analyst') OR 
  public.has_role(auth.uid(), 'admin')
);

CREATE POLICY "Admins can manage predictions"
ON public.predictions FOR ALL
USING (public.has_role(auth.uid(), 'admin'));

-- fairness_evaluations: Public read, admin write
CREATE POLICY "Anyone can view fairness evaluations"
ON public.fairness_evaluations FOR SELECT
USING (true);

CREATE POLICY "Admins can manage fairness evaluations"
ON public.fairness_evaluations FOR ALL
USING (public.has_role(auth.uid(), 'admin'));

-- audit_logs: Public read (transparency), system/admin write
CREATE POLICY "Anyone can view audit logs"
ON public.audit_logs FOR SELECT
USING (true);

CREATE POLICY "Admins can create audit logs"
ON public.audit_logs FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- community_feedback: Authenticated read, authenticated create, admin full access
CREATE POLICY "Authenticated users can view feedback"
ON public.community_feedback FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can submit feedback"
ON public.community_feedback FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = reporter_id);

CREATE POLICY "Users can update own feedback"
ON public.community_feedback FOR UPDATE
USING (auth.uid() = reporter_id);

CREATE POLICY "Admins can manage all feedback"
ON public.community_feedback FOR ALL
USING (public.has_role(auth.uid(), 'admin'));

-- Create indexes for performance
CREATE INDEX idx_predictions_community_area ON public.predictions(community_area);
CREATE INDEX idx_predictions_created_at ON public.predictions(created_at);
CREATE INDEX idx_predictions_model_version ON public.predictions(model_version);
CREATE INDEX idx_audit_logs_operation_type ON public.audit_logs(operation_type);
CREATE INDEX idx_audit_logs_created_at ON public.audit_logs(created_at);
CREATE INDEX idx_audit_logs_sequence ON public.audit_logs(sequence_number);
CREATE INDEX idx_feedback_status ON public.community_feedback(status);
CREATE INDEX idx_feedback_created_at ON public.community_feedback(created_at);
CREATE INDEX idx_model_artifacts_version ON public.model_artifacts(version);
CREATE INDEX idx_model_artifacts_active ON public.model_artifacts(is_active) WHERE is_active = TRUE;