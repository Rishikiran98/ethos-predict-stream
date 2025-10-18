-- Create crime_stream table for real-time Chicago crime data
CREATE TABLE IF NOT EXISTS public.crime_stream (
  case_number TEXT PRIMARY KEY,
  date TIMESTAMPTZ NOT NULL,
  primary_type TEXT NOT NULL,
  community_area INTEGER,
  arrest BOOLEAN,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  inserted_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_crime_stream_date ON public.crime_stream(date DESC);
CREATE INDEX IF NOT EXISTS idx_crime_stream_community ON public.crime_stream(community_area);

-- Enable RLS
ALTER TABLE public.crime_stream ENABLE ROW LEVEL SECURITY;

-- Anyone can view crime data (it's public data)
CREATE POLICY "Anyone can view crime stream data"
ON public.crime_stream
FOR SELECT
USING (true);

-- Only admins can insert/update crime data
CREATE POLICY "Admins can manage crime stream data"
ON public.crime_stream
FOR ALL
USING (has_role(auth.uid(), 'admin'));

-- Create ingestion_log table to track data fetches
CREATE TABLE IF NOT EXISTS public.ingestion_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id TEXT NOT NULL,
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ,
  new_rows INTEGER DEFAULT 0,
  duplicates INTEGER DEFAULT 0,
  errors INTEGER DEFAULT 0,
  error_details TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ingestion_log_created ON public.ingestion_log(created_at DESC);

ALTER TABLE public.ingestion_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view ingestion logs"
ON public.ingestion_log
FOR SELECT
USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert ingestion logs"
ON public.ingestion_log
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'));

-- Create performance_history table for tracking model metrics over time
CREATE TABLE IF NOT EXISTS public.performance_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  model_id UUID REFERENCES public.model_artifacts(id),
  metrics JSONB NOT NULL,
  evaluated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  data_period_start TIMESTAMPTZ,
  data_period_end TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_performance_history_model ON public.performance_history(model_id);
CREATE INDEX IF NOT EXISTS idx_performance_history_evaluated ON public.performance_history(evaluated_at DESC);

ALTER TABLE public.performance_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view performance history"
ON public.performance_history
FOR SELECT
USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert performance history"
ON public.performance_history
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'));