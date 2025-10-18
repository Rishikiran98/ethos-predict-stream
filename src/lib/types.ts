/**
 * Type definitions for the Ethical AI Policing Platform
 */

export interface CommunityArea {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  population: number;
  crime_rate: number;
  risk_level: 'low' | 'medium' | 'high';
}

export interface CrimeRecord {
  id: string;
  case_number: string;
  date: string;
  primary_type: string;
  description: string;
  location_description: string;
  arrest: boolean;
  domestic: boolean;
  beat: string;
  district: string;
  ward: number;
  community_area: number;
  latitude: number;
  longitude: number;
}

export interface Model {
  version: string;
  algorithm: 'XGBoost' | 'LightGBM' | 'Ridge' | 'HistGradientBoosting';
  r2_score: number;
  rmse: number;
  mae: number;
  training_time: string;
  fairness_score: number;
  deployed: boolean;
  created_at: string;
}

export interface FairnessEvaluation {
  id: string;
  model_version: string;
  evaluation_date: string;
  demographic_parity_diff: number;
  equalized_odds_ratio: number;
  f1_variance: number;
  calibration_error: number;
  passed: boolean;
  community_metrics: Array<{
    area: string;
    f1_score: number;
    population: number;
    crime_rate: number;
  }>;
}

export interface Prediction {
  id: string;
  community_area: string;
  prediction_date: string;
  predicted_crimes: number;
  actual_crimes?: number;
  confidence: number;
  risk_level: 'low' | 'medium' | 'high';
  model_version: string;
  created_at: string;
}

export interface Explanation {
  prediction_id: string;
  global_importance: Array<{
    feature: string;
    importance: number;
    direction: 'positive' | 'negative';
  }>;
  local_explanation: Array<{
    feature: string;
    contribution: number;
    impact: number;
  }>;
  shap_values: Record<string, number>;
  lime_values: Array<[string, number]>;
}

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  operation_type: 'model_training' | 'prediction' | 'fairness_audit' | 'data_validation' | 'feature_engineering' | 'data_leakage_check' | 'community_feedback' | 'model_deployment';
  status: 'success' | 'warning' | 'error' | 'info';
  message: string;
  details: Record<string, any>;
  user_id?: string;
  immutable_hash: string;
}

export interface CommunityFeedbackEntry {
  id: string;
  community_area: string;
  prediction_id: string;
  feedback_type: 'bias_report' | 'accuracy_concern' | 'general' | 'false_positive' | 'false_negative';
  description: string;
  reporter_id: string; // Anonymous identifier
  status: 'pending' | 'reviewed' | 'resolved';
  created_at: string;
  reviewed_at?: string;
  resolution?: string;
}

export interface SystemMetrics {
  timestamp: string;
  dask_cluster: {
    workers: number;
    utilization: number;
    throughput: number; // records per hour
  };
  database: {
    connections: number;
    query_time_avg: number; // milliseconds
    size_mb: number;
  };
  api: {
    requests_per_minute: number;
    average_response_time: number; // milliseconds
    error_rate: number; // percentage
  };
  model: {
    version: string;
    predictions_today: number;
    average_confidence: number;
  };
}

export interface GeographicHotspot {
  area: string;
  latitude: number;
  longitude: number;
  risk_score: number;
  predicted_crimes: number;
  actual_crimes?: number;
  change_percentage: number;
  population: number;
}

export interface TemporalTrend {
  period: string; // YYYY-MM or YYYY-Qn
  total_crimes: number;
  predicted_crimes: number;
  r2_score: number;
  mae: number;
  community_areas: number;
}

export interface FeatureImportance {
  feature_name: string;
  importance: number;
  category: 'temporal' | 'spatial' | 'demographic' | 'environmental';
  description: string;
}

export interface ValidationResult {
  validation_type: 'temporal' | 'geographic' | 'fairness' | 'leakage';
  passed: boolean;
  score: number;
  threshold: number;
  details: string;
  recommendations?: string[];
}

export interface ModelCard {
  model_version: string;
  algorithm: string;
  training_data: {
    start_date: string;
    end_date: string;
    total_records: number;
    community_areas: number;
  };
  performance: {
    r2_score: number;
    rmse: number;
    mae: number;
    cv_scores: number[];
  };
  fairness: {
    demographic_parity_diff: number;
    equalized_odds_ratio: number;
    f1_variance: number;
    passed_all_gates: boolean;
  };
  features: FeatureImportance[];
  limitations: string[];
  intended_use: string;
  ethical_considerations: string[];
  deployment_date: string;
}
