-- Fix search path security warnings for new functions

-- Update auto_activate_best_model function with search_path
CREATE OR REPLACE FUNCTION public.auto_activate_best_model()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
$$;

-- Update get_best_ai_model function with search_path
CREATE OR REPLACE FUNCTION public.get_best_ai_model(
  p_crime_type TEXT,
  p_community_area TEXT DEFAULT NULL
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_best_model TEXT;
  v_min_failures INTEGER := 3;
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
$$;