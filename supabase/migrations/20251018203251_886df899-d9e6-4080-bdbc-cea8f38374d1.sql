-- Add AI model tracking to predictions table
ALTER TABLE public.predictions 
ADD COLUMN IF NOT EXISTS ai_model_used text;

-- Update fairness_evaluations to track AI models instead of ML models
ALTER TABLE public.fairness_evaluations
ADD COLUMN IF NOT EXISTS ai_model_name text,
ADD COLUMN IF NOT EXISTS evaluation_type text DEFAULT 'ml_model';

-- Add index for better query performance
CREATE INDEX IF NOT EXISTS idx_predictions_ai_model ON public.predictions(ai_model_used);
CREATE INDEX IF NOT EXISTS idx_fairness_ai_model ON public.fairness_evaluations(ai_model_name);
CREATE INDEX IF NOT EXISTS idx_ai_perf_model_crime ON public.ai_model_performance(model_name, crime_type);

-- Update get_best_ai_model function to return model metadata
CREATE OR REPLACE FUNCTION public.get_best_ai_model_with_stats(p_crime_type text, p_community_area text DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_result jsonb;
  v_best_model TEXT;
  v_min_attempts INTEGER := 3;
BEGIN
  -- First try specific crime type + area
  IF p_community_area IS NOT NULL THEN
    SELECT jsonb_build_object(
      'model_name', model_name,
      'success_rate', (success_count::FLOAT / NULLIF(success_count + failure_count, 0)),
      'avg_confidence', avg_confidence,
      'total_attempts', success_count + failure_count
    ) INTO v_result
    FROM public.ai_model_performance
    WHERE crime_type = p_crime_type
      AND community_area = p_community_area
      AND (success_count + failure_count) >= v_min_attempts
    ORDER BY 
      (success_count::FLOAT / NULLIF(success_count + failure_count, 0)) DESC,
      avg_confidence DESC
    LIMIT 1;
    
    IF v_result IS NOT NULL THEN
      RETURN v_result;
    END IF;
  END IF;
  
  -- Fall back to best model for crime type
  SELECT jsonb_build_object(
    'model_name', model_name,
    'success_rate', (success_count::FLOAT / NULLIF(success_count + failure_count, 0)),
    'avg_confidence', avg_confidence,
    'total_attempts', success_count + failure_count
  ) INTO v_result
  FROM public.ai_model_performance
  WHERE crime_type = p_crime_type
    AND (success_count + failure_count) >= v_min_attempts
  ORDER BY 
    (success_count::FLOAT / NULLIF(success_count + failure_count, 0)) DESC,
    avg_confidence DESC
  LIMIT 1;
  
  IF v_result IS NOT NULL THEN
    RETURN v_result;
  END IF;
  
  -- Default fallback
  RETURN jsonb_build_object(
    'model_name', 'google/gemini-2.5-flash',
    'success_rate', NULL,
    'avg_confidence', NULL,
    'total_attempts', 0
  );
END;
$$;