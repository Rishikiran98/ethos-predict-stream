-- Create table to track AI model performance by scenario
CREATE TABLE IF NOT EXISTS public.ai_model_performance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  model_name TEXT NOT NULL, -- 'google/gemini-2.5-pro', 'google/gemini-2.5-flash', etc.
  crime_type TEXT NOT NULL,
  community_area TEXT,
  avg_confidence NUMERIC,
  success_count INTEGER DEFAULT 0,
  failure_count INTEGER DEFAULT 0,
  avg_response_time_ms INTEGER,
  last_used_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(model_name, crime_type, community_area)
);

-- Enable RLS
ALTER TABLE public.ai_model_performance ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Admins can manage AI model performance"
  ON public.ai_model_performance
  FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Analysts can view AI model performance"
  ON public.ai_model_performance
  FOR SELECT
  USING (has_role(auth.uid(), 'analyst'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

-- Create index for fast lookups
CREATE INDEX idx_ai_model_performance_lookup ON public.ai_model_performance(crime_type, community_area);

-- Function to automatically activate best performing model version
CREATE OR REPLACE FUNCTION public.auto_activate_best_model()
RETURNS TRIGGER AS $$
BEGIN
  -- Check if this new model meets promotion criteria
  IF NEW.r2_score > 0.80 AND NEW.rmse < 3.0 THEN
    -- Verify fairness
    IF EXISTS (
      SELECT 1 FROM public.fairness_evaluations
      WHERE model_version = NEW.version
      AND passed_thresholds = true
      ORDER BY evaluation_date DESC
      LIMIT 1
    ) THEN
      -- Deactivate all other models
      UPDATE public.model_artifacts
      SET is_active = false
      WHERE id != NEW.id;
      
      -- Activate this model
      NEW.is_active := true;
      
      -- Log the auto-activation
      INSERT INTO public.audit_logs (operation_type, status, message, details)
      VALUES (
        'model_auto_activation',
        'success',
        'Automatically activated model version: ' || NEW.version,
        jsonb_build_object(
          'model_id', NEW.id,
          'version', NEW.version,
          'r2_score', NEW.r2_score,
          'rmse', NEW.rmse
        )
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for auto-activation
CREATE TRIGGER trigger_auto_activate_best_model
  BEFORE INSERT ON public.model_artifacts
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_activate_best_model();

-- Function to get best AI model for a scenario
CREATE OR REPLACE FUNCTION public.get_best_ai_model(
  p_crime_type TEXT,
  p_community_area TEXT DEFAULT NULL
)
RETURNS TEXT AS $$
DECLARE
  v_best_model TEXT;
  v_min_failures INTEGER := 3; -- Minimum attempts before considering
BEGIN
  -- First try to find best model for specific crime type + area
  IF p_community_area IS NOT NULL THEN
    SELECT model_name INTO v_best_model
    FROM public.ai_model_performance
    WHERE crime_type = p_crime_type
      AND community_area = p_community_area
      AND (success_count + failure_count) >= v_min_failures
    ORDER BY 
      (success_count::FLOAT / NULLIF(success_count + failure_count, 0)) DESC,
      avg_confidence DESC
    LIMIT 1;
    
    IF v_best_model IS NOT NULL THEN
      RETURN v_best_model;
    END IF;
  END IF;
  
  -- Fall back to best model for crime type (any area)
  SELECT model_name INTO v_best_model
  FROM public.ai_model_performance
  WHERE crime_type = p_crime_type
    AND (success_count + failure_count) >= v_min_failures
  ORDER BY 
    (success_count::FLOAT / NULLIF(success_count + failure_count, 0)) DESC,
    avg_confidence DESC
  LIMIT 1;
  
  IF v_best_model IS NOT NULL THEN
    RETURN v_best_model;
  END IF;
  
  -- Default to balanced model
  RETURN 'google/gemini-2.5-flash';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON TABLE public.ai_model_performance IS 'Tracks performance of different AI models by crime type and area for intelligent routing';
COMMENT ON FUNCTION public.get_best_ai_model IS 'Returns the best performing AI model for a given crime type and optional community area';
COMMENT ON FUNCTION public.auto_activate_best_model IS 'Automatically activates model versions that meet performance and fairness criteria';