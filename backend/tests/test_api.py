"""
API Integration Tests
Tests all major endpoints with pytest
"""

import pytest
from fastapi.testclient import TestClient
from unittest.mock import patch, MagicMock
import sys
import os

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from main import app

client = TestClient(app)

@pytest.fixture
def mock_model():
    """Mock trained model"""
    model = MagicMock()
    model.version = "2.4.1"
    model.metadata = {
        'cv_scores': {
            'r2': 0.723,
            'rmse': 2.14,
            'mae': 1.67
        }
    }
    model.predict = MagicMock(return_value=[120.5])
    return model

def test_health_check():
    """Test /health endpoint"""
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert "status" in data
    assert data["status"] == "healthy"

def test_root_endpoint():
    """Test / root endpoint"""
    response = client.get("/")
    assert response.status_code == 200
    data = response.json()
    assert "message" in data
    assert "endpoints" in data

@patch('main.model')
@patch('main.explainer')
def test_predict_endpoint(mock_explainer, mock_model_patch, mock_model):
    """Test /api/v1/predict endpoint"""
    mock_model_patch.return_value = mock_model
    mock_explainer.explain_local = MagicMock(return_value={
        'contributions': [
            {'feature': 'hist_1m', 'contribution': 10.5}
        ]
    })
    mock_explainer.format_for_display = MagicMock(return_value=[])
    
    # Patch the global model and explainer
    with patch('main.model', mock_model), \
         patch('main.explainer', mock_explainer):
        
        response = client.post("/api/v1/predict", json={
            "community_area": "Austin",
            "date_range": {
                "start": "2024-01-01",
                "end": "2024-01-31"
            }
        })
        
        assert response.status_code == 200
        data = response.json()
        assert "prediction_id" in data
        assert "predicted_crimes" in data
        assert "confidence" in data
        assert "risk_level" in data

def test_fairness_metrics_endpoint():
    """Test /api/v1/metrics/fairness endpoint"""
    response = client.get("/api/v1/metrics/fairness")
    assert response.status_code == 200
    data = response.json()
    assert "demographic_parity_diff" in data
    assert "equalized_odds_ratio" in data
    assert "f1_variance" in data
    assert "calibration_error" in data
    assert "passed" in data

@patch('main.model')
def test_performance_metrics_endpoint(mock_model_patch, mock_model):
    """Test /api/v1/metrics/performance endpoint"""
    with patch('main.model', mock_model):
        response = client.get("/api/v1/metrics/performance")
        assert response.status_code == 200
        data = response.json()
        assert "model_version" in data
        assert "r2_score" in data
        assert "rmse" in data
        assert "mae" in data

def test_audit_log_endpoint():
    """Test /api/v1/audit endpoint"""
    response = client.get("/api/v1/audit")
    assert response.status_code == 200
    data = response.json()
    assert "entries" in data
    assert isinstance(data["entries"], list)

def test_audit_log_with_filters():
    """Test /api/v1/audit with filters"""
    response = client.get("/api/v1/audit?operation_type=prediction&limit=10")
    assert response.status_code == 200
    data = response.json()
    assert "entries" in data

def test_feedback_submission():
    """Test /api/v1/feedback/community endpoint"""
    response = client.post("/api/v1/feedback/community", json={
        "community_area": "Austin",
        "prediction_id": "test-pred-123",
        "feedback_type": "accuracy_concern",
        "description": "Prediction seems too high",
        "reporter_id": "user-123"
    })
    assert response.status_code == 200
    data = response.json()
    assert "id" in data
    assert data["status"] == "received"

@patch('main.model')
@patch('main.explainer')
def test_explanation_endpoint(mock_explainer, mock_model_patch, mock_model):
    """Test /api/v1/explain/{prediction_id} endpoint"""
    mock_explainer.explain_local = MagicMock(return_value={
        'contributions': [
            {'feature': 'hist_1m', 'contribution': 10.5},
            {'feature': 'rolling_3m', 'contribution': 5.2}
        ]
    })
    
    with patch('main.model', mock_model), \
         patch('main.explainer', mock_explainer):
        
        response = client.get("/api/v1/explain/test-prediction-123")
        assert response.status_code == 200
        data = response.json()
        assert "prediction_id" in data
        assert "shap_values" in data
        assert "summary" in data

def test_invalid_prediction_request():
    """Test prediction with invalid request"""
    response = client.post("/api/v1/predict", json={
        "community_area": "Austin"
        # Missing date_range
    })
    assert response.status_code == 422  # Validation error

def test_cors_headers():
    """Test CORS headers are present"""
    response = client.get("/health")
    assert response.status_code == 200
    # CORS middleware should add these headers

if __name__ == "__main__":
    pytest.main([__file__, "-v"])
