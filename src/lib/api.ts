/**
 * API Client for Ethical AI Policing Backend
 * 
 * This module handles all HTTP communication with the FastAPI backend.
 * When backend is not available, it returns mock data for demonstration.
 */

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1';

// Mock data flag - set to false when backend is deployed
const USE_MOCK_DATA = true;

export interface PredictionRequest {
  community_area: string;
  date_range: {
    start: string;
    end: string;
  };
}

export interface PredictionResponse {
  prediction_id: string;
  community_area: string;
  predicted_crimes: number;
  confidence: number;
  risk_level: 'low' | 'medium' | 'high';
  contributing_factors: Array<{
    feature: string;
    contribution: number;
    importance: number;
  }>;
}

export interface FairnessMetrics {
  demographic_parity_diff: number;
  equalized_odds_ratio: number;
  f1_variance: number;
  calibration_error: number;
  community_metrics: Array<{
    area: string;
    f1_score: number;
    population: number;
    crime_rate: number;
  }>;
}

export interface PerformanceMetrics {
  model_version: string;
  r2_score: number;
  rmse: number;
  mae: number;
  training_time: string;
  timestamp: string;
}

export interface AuditEntry {
  id: string;
  timestamp: string;
  operation_type: string;
  status: 'success' | 'warning' | 'error' | 'info';
  message: string;
  details: Record<string, any>;
}

export interface CommunityFeedback {
  community_area: string;
  prediction_id: string;
  feedback_type: 'bias_report' | 'accuracy_concern' | 'general';
  description: string;
  reporter_id?: string;
}

class APIError extends Error {
  constructor(public statusCode: number, message: string) {
    super(message);
    this.name = 'APIError';
  }
}

async function fetchAPI<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  if (USE_MOCK_DATA) {
    console.log(`[MOCK] API call to ${endpoint}`);
    return getMockData(endpoint) as T;
  }

  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      throw new APIError(response.status, `API error: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error(`API call failed: ${endpoint}`, error);
    throw error;
  }
}

// Mock data for demonstration
function getMockData(endpoint: string): any {
  if (endpoint.includes('/predict')) {
    return {
      prediction_id: 'pred_' + Math.random().toString(36).substr(2, 9),
      community_area: 'Austin',
      predicted_crimes: 127,
      confidence: 0.87,
      risk_level: 'high',
      contributing_factors: [
        { feature: 'Historical 30-day trend', contribution: 42, importance: 0.33 },
        { feature: 'Day of week (Saturday)', contribution: 18, importance: 0.14 },
        { feature: 'Recent spike', contribution: 15, importance: 0.12 },
      ],
    };
  }

  if (endpoint.includes('/metrics/fairness')) {
    return {
      demographic_parity_diff: 0.043,
      equalized_odds_ratio: 0.92,
      f1_variance: 0.065,
      calibration_error: 0.078,
      community_metrics: [
        { area: 'Austin', f1_score: 0.71, population: 98514, crime_rate: 8.2 },
        { area: 'West Town', f1_score: 0.75, population: 87435, crime_rate: 6.1 },
        { area: 'South Shore', f1_score: 0.69, population: 49767, crime_rate: 9.3 },
      ],
    };
  }

  if (endpoint.includes('/metrics/performance')) {
    return {
      model_version: '2.4.1',
      r2_score: 0.723,
      rmse: 2.14,
      mae: 1.67,
      training_time: '12.4min',
      timestamp: new Date().toISOString(),
    };
  }

  if (endpoint.includes('/audit')) {
    return {
      entries: [
        {
          id: 'audit_1',
          timestamp: new Date().toISOString(),
          operation_type: 'model_training',
          status: 'success',
          message: 'Model trained successfully with fairness constraints',
          details: { r2: 0.723, fairness_score: 0.93 },
        },
      ],
    };
  }

  return {};
}

// Public API functions

export async function makePrediction(request: PredictionRequest): Promise<PredictionResponse> {
  return fetchAPI<PredictionResponse>('/predict', {
    method: 'POST',
    body: JSON.stringify(request),
  });
}

export async function getFairnessMetrics(): Promise<FairnessMetrics> {
  return fetchAPI<FairnessMetrics>('/metrics/fairness');
}

export async function getPerformanceMetrics(): Promise<PerformanceMetrics> {
  return fetchAPI<PerformanceMetrics>('/metrics/performance');
}

export async function getAuditLog(filters?: {
  start_date?: string;
  end_date?: string;
  operation_type?: string;
}): Promise<{ entries: AuditEntry[] }> {
  const queryParams = new URLSearchParams(filters as any).toString();
  return fetchAPI(`/audit?${queryParams}`);
}

export async function submitCommunityFeedback(feedback: CommunityFeedback): Promise<{ id: string }> {
  return fetchAPI<{ id: string }>('/feedback/community', {
    method: 'POST',
    body: JSON.stringify(feedback),
  });
}

export async function getExplanation(predictionId: string): Promise<{
  shap_values: Record<string, number>;
  lime_explanation: Array<{ feature: string; contribution: number }>;
}> {
  return fetchAPI(`/explain/${predictionId}`);
}

export async function getSystemHealth(): Promise<{
  status: 'healthy' | 'degraded' | 'down';
  database: boolean;
  dask_cluster: boolean;
  model_loaded: boolean;
}> {
  return fetchAPI('/health');
}
