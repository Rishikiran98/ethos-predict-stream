# Backend Implementation Template

This document provides code templates for implementing the FastAPI backend that this dashboard connects to.

## Project Structure

```
predictive-policing-backend/
├── app/
│   ├── __init__.py
│   ├── main.py              # FastAPI application entry point
│   ├── config.py            # Configuration and environment variables
│   ├── database.py          # Database connection and models
│   ├── models/              # SQLAlchemy models
│   │   ├── __init__.py
│   │   ├── prediction.py
│   │   ├── audit.py
│   │   └── fairness.py
│   ├── schemas/             # Pydantic schemas
│   │   ├── __init__.py
│   │   ├── prediction.py
│   │   └── fairness.py
│   ├── routers/             # API route handlers
│   │   ├── __init__.py
│   │   ├── predict.py
│   │   ├── metrics.py
│   │   ├── audit.py
│   │   └── feedback.py
│   ├── services/            # Business logic
│   │   ├── __init__.py
│   │   ├── ml_service.py
│   │   ├── fairness_service.py
│   │   └── explanation_service.py
│   └── utils/               # Utility functions
│       ├── __init__.py
│       ├── data_loader.py
│       └── leakage_prevention.py
├── ml/                      # ML pipeline
│   ├── __init__.py
│   ├── trainer.py
│   ├── evaluator.py
│   ├── explainer.py
│   └── models/              # Saved model artifacts
├── processing/              # Data processing
│   ├── __init__.py
│   ├── pipeline.py
│   ├── feature_engineering.py
│   └── chicago_data_loader.py
├── tests/
│   ├── __init__.py
│   ├── test_api.py
│   ├── test_fairness.py
│   └── test_leakage.py
├── .env.example
├── requirements.txt
├── Dockerfile
├── docker-compose.yml
└── README.md
```

## 1. Main Application (app/main.py)

```python
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import logging

from app.config import settings
from app.routers import predict, metrics, audit, feedback
from app.database import engine, Base
from ml.trainer import load_production_model

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Global model storage
ml_model = None

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup and shutdown events"""
    # Startup
    logger.info("Starting Ethical AI Policing API...")
    
    # Create database tables
    Base.metadata.create_all(bind=engine)
    logger.info("Database tables created")
    
    # Load ML model
    global ml_model
    try:
        ml_model = load_production_model()
        logger.info(f"Loaded model version: {ml_model.version}")
    except Exception as e:
        logger.error(f"Failed to load model: {e}")
        ml_model = None
    
    yield
    
    # Shutdown
    logger.info("Shutting down API...")

app = FastAPI(
    title="Ethical AI Policing API",
    description="Production API for predictive policing with fairness constraints",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(predict.router, prefix="/api/v1", tags=["predictions"])
app.include_router(metrics.router, prefix="/api/v1", tags=["metrics"])
app.include_router(audit.router, prefix="/api/v1", tags=["audit"])
app.include_router(feedback.router, prefix="/api/v1", tags=["feedback"])

@app.get("/health")
async def health_check():
    """System health check endpoint"""
    from app.services.ml_service import check_model_loaded
    from app.database import check_database_connection
    
    return {
        "status": "healthy",
        "database": await check_database_connection(),
        "model_loaded": check_model_loaded(ml_model),
        "api_version": "1.0.0",
    }

@app.get("/")
async def root():
    return {
        "message": "Ethical AI Policing API",
        "docs": "/docs",
        "health": "/health",
    }
```

## 2. Prediction Router (app/routers/predict.py)

```python
from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
from datetime import datetime
import uuid

from app.database import get_db
from app.schemas.prediction import PredictionRequest, PredictionResponse
from app.services.ml_service import make_prediction
from app.services.explanation_service import generate_explanation
from app.models.prediction import Prediction
from app.models.audit import AuditLog

router = APIRouter()

@router.post("/predict", response_model=PredictionResponse)
async def predict_crime(
    request: PredictionRequest,
    db: Session = Depends(get_db)
):
    """
    Generate crime prediction for a community area and time period.
    
    This endpoint:
    1. Validates input parameters
    2. Loads trained model
    3. Generates prediction with confidence score
    4. Computes SHAP/LIME explanation
    5. Logs prediction in database
    6. Returns result with audit trail
    """
    try:
        # Make prediction
        prediction_result = await make_prediction(
            community_area=request.community_area,
            date_range=request.date_range,
        )
        
        # Generate explanation
        explanation = await generate_explanation(
            prediction_result['prediction_id']
        )
        
        # Store in database
        db_prediction = Prediction(
            id=prediction_result['prediction_id'],
            community_area=request.community_area,
            prediction_date=request.date_range['start'],
            predicted_crimes=prediction_result['predicted_crimes'],
            confidence=prediction_result['confidence'],
            risk_level=prediction_result['risk_level'],
            model_version=prediction_result['model_version'],
        )
        db.add(db_prediction)
        
        # Audit log
        audit_entry = AuditLog(
            id=str(uuid.uuid4()),
            operation_type='prediction',
            status='success',
            message=f"Prediction made for {request.community_area}",
            details={
                'prediction_id': prediction_result['prediction_id'],
                'confidence': prediction_result['confidence'],
            }
        )
        db.add(audit_entry)
        db.commit()
        
        return {
            **prediction_result,
            'contributing_factors': explanation['factors'],
        }
        
    except Exception as e:
        # Log error
        audit_entry = AuditLog(
            id=str(uuid.uuid4()),
            operation_type='prediction',
            status='error',
            message=f"Prediction failed: {str(e)}",
            details={'error': str(e)}
        )
        db.add(audit_entry)
        db.commit()
        
        raise HTTPException(status_code=500, detail=str(e))
```

## 3. ML Service (app/services/ml_service.py)

```python
import numpy as np
import pandas as pd
from datetime import datetime, timedelta
import uuid

from ml.trainer import load_production_model
from processing.feature_engineering import create_features
from utils.leakage_prevention import validate_temporal_features

# Global model instance
_model = None

def get_model():
    """Get loaded ML model"""
    global _model
    if _model is None:
        _model = load_production_model()
    return _model

async def make_prediction(community_area: str, date_range: dict):
    """
    Generate crime prediction using trained model.
    
    Steps:
    1. Load historical data for the community area
    2. Engineer features (with leakage prevention)
    3. Run model prediction
    4. Classify risk level
    5. Return prediction with metadata
    """
    model = get_model()
    
    # Load historical data
    from processing.chicago_data_loader import load_community_data
    historical_data = await load_community_data(
        community_area=community_area,
        end_date=date_range['start']  # Only past data
    )
    
    # Feature engineering
    features = create_features(
        historical_data,
        prediction_date=date_range['start'],
    )
    
    # Validate no future data leakage
    validate_temporal_features(
        features,
        prediction_date=date_range['start']
    )
    
    # Make prediction
    X = features.values.reshape(1, -1)
    predicted_crimes = model.predict(X)[0]
    confidence = model.predict_proba(X)[0].max() if hasattr(model, 'predict_proba') else 0.85
    
    # Classify risk level
    risk_level = classify_risk(predicted_crimes)
    
    prediction_id = str(uuid.uuid4())
    
    return {
        'prediction_id': prediction_id,
        'community_area': community_area,
        'predicted_crimes': int(round(predicted_crimes)),
        'confidence': float(confidence),
        'risk_level': risk_level,
        'model_version': model.version,
        'features_used': list(features.index),
    }

def classify_risk(predicted_crimes: float) -> str:
    """Classify prediction into risk categories"""
    if predicted_crimes < 50:
        return 'low'
    elif predicted_crimes < 100:
        return 'medium'
    else:
        return 'high'

def check_model_loaded(model) -> bool:
    """Check if ML model is properly loaded"""
    return model is not None and hasattr(model, 'predict')
```

## 4. Fairness Service (app/services/fairness_service.py)

```python
from fairlearn.metrics import (
    demographic_parity_difference,
    equalized_odds_difference,
    MetricFrame
)
from sklearn.metrics import f1_score
import pandas as pd
import numpy as np

async def evaluate_fairness(
    y_true: np.ndarray,
    y_pred: np.ndarray,
    sensitive_features: pd.Series
) -> dict:
    """
    Evaluate model fairness across demographic groups.
    
    Metrics:
    - Demographic Parity Difference (≤0.10 threshold)
    - Equalized Odds Ratio (≥0.80 threshold)
    - F1 Score Variance (≤0.07 threshold)
    - Calibration Error
    """
    
    # Demographic Parity
    dp_diff = demographic_parity_difference(
        y_true, y_pred,
        sensitive_features=sensitive_features
    )
    
    # Equalized Odds
    eo_diff = equalized_odds_difference(
        y_true, y_pred,
        sensitive_features=sensitive_features
    )
    
    # F1 score variance across groups
    metric_frame = MetricFrame(
        metrics={'f1': f1_score},
        y_true=y_true,
        y_pred=y_pred,
        sensitive_features=sensitive_features
    )
    f1_variance = metric_frame.by_group['f1'].var()
    
    # Calibration error
    calibration_error = compute_calibration_error(y_true, y_pred)
    
    # Check thresholds
    passed = (
        dp_diff <= 0.10 and
        abs(eo_diff) <= 0.20 and  # Convert to ratio threshold
        f1_variance <= 0.07 and
        calibration_error <= 0.10
    )
    
    return {
        'demographic_parity_diff': float(dp_diff),
        'equalized_odds_ratio': float(1 - abs(eo_diff)),  # Convert to ratio
        'f1_variance': float(f1_variance),
        'calibration_error': float(calibration_error),
        'passed': passed,
        'community_metrics': get_community_metrics(y_true, y_pred, sensitive_features),
    }

def compute_calibration_error(y_true, y_pred, n_bins=10):
    """Compute Expected Calibration Error (ECE)"""
    # Implementation of calibration error
    # This is a simplified version
    bin_totals = np.histogram(y_pred, bins=n_bins, range=(0, 1))[0]
    bin_accuracies = np.array([
        y_true[(y_pred >= i/n_bins) & (y_pred < (i+1)/n_bins)].mean()
        if bin_totals[i] > 0 else 0
        for i in range(n_bins)
    ])
    bin_confidences = np.array([
        y_pred[(y_pred >= i/n_bins) & (y_pred < (i+1)/n_bins)].mean()
        if bin_totals[i] > 0 else 0
        for i in range(n_bins)
    ])
    
    ece = np.sum(np.abs(bin_accuracies - bin_confidences) * bin_totals) / len(y_pred)
    return ece

def get_community_metrics(y_true, y_pred, sensitive_features):
    """Get per-community performance metrics"""
    df = pd.DataFrame({
        'y_true': y_true,
        'y_pred': y_pred,
        'community': sensitive_features
    })
    
    metrics = []
    for community in df['community'].unique():
        community_data = df[df['community'] == community]
        f1 = f1_score(community_data['y_true'], community_data['y_pred'])
        
        metrics.append({
            'area': community,
            'f1_score': float(f1),
            'population': len(community_data),
            'crime_rate': float(community_data['y_true'].mean()),
        })
    
    return metrics
```

## 5. Requirements.txt

```txt
# FastAPI and server
fastapi==0.104.1
uvicorn[standard]==0.24.0
python-multipart==0.0.6

# Database
sqlalchemy==2.0.23
psycopg2-binary==2.9.9
alembic==1.12.1

# ML and Data Processing
scikit-learn==1.3.2
xgboost==2.0.2
lightgbm==4.1.0
pandas==2.1.3
numpy==1.26.2
dask[complete]==2023.11.0
distributed==2023.11.0

# Fairness and Explainability
fairlearn==0.10.0
shap==0.43.0
lime==0.2.0.1

# Monitoring and Logging
mlflow==2.8.1
prometheus-client==0.19.0

# Testing
pytest==7.4.3
pytest-asyncio==0.21.1
httpx==0.25.2

# Utilities
python-dotenv==1.0.0
pydantic==2.5.2
pydantic-settings==2.1.0
```

## 6. Docker Configuration

```dockerfile
# Dockerfile
FROM python:3.10-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    g++ \
    postgresql-client \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements and install
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Expose port
EXPOSE 8000

# Run with uvicorn
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

```yaml
# docker-compose.yml
version: '3.8'

services:
  backend:
    build: .
    ports:
      - "8000:8000"
    environment:
      - DATABASE_URL=postgresql://postgres:postgres@db:5432/policing_db
      - DASK_SCHEDULER_ADDRESS=tcp://dask-scheduler:8786
      - CHICAGO_API_KEY=${CHICAGO_API_KEY}
    depends_on:
      - db
      - dask-scheduler
    volumes:
      - ./ml/models:/app/ml/models

  db:
    image: postgres:14
    environment:
      - POSTGRES_DB=policing_db
      - POSTGRES_USER=postgres
      - POSTGRES_PASSWORD=postgres
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

  dask-scheduler:
    image: daskdev/dask:latest
    command: dask-scheduler
    ports:
      - "8786:8786"
      - "8787:8787"

  dask-worker:
    image: daskdev/dask:latest
    command: dask-worker tcp://dask-scheduler:8786
    deploy:
      replicas: 6

volumes:
  postgres_data:
```

## 7. Environment Variables (.env.example)

```bash
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/policing_db

# Chicago Data Portal
CHICAGO_API_KEY=your_api_key_here
CHICAGO_API_BASE_URL=https://data.cityofchicago.org/resource

# Dask Cluster
DASK_SCHEDULER_ADDRESS=tcp://localhost:8786

# Model Storage
MODEL_STORAGE_PATH=/app/ml/models
MODEL_VERSION=2.4.1

# Security
SECRET_KEY=your-secret-key-for-jwt-tokens
ALLOWED_ORIGINS=http://localhost:3000,https://your-lovable-app.lovable.app

# Monitoring
MLFLOW_TRACKING_URI=http://localhost:5000
LOG_LEVEL=INFO

# Feature Flags
ENABLE_FAIRNESS_CONSTRAINTS=true
ENABLE_EXPLANATION=true
ENABLE_AUDIT_LOGGING=true
```

## Next Steps

1. Create a new repository: `predictive-policing-backend`
2. Copy these templates into the new repository
3. Implement the full logic following this structure
4. Deploy using Docker Compose or cloud services
5. Update frontend `VITE_API_BASE_URL` to point to your backend

## Testing

```bash
# Run tests
pytest tests/

# Run with coverage
pytest --cov=app tests/

# Test specific endpoint
pytest tests/test_api.py::test_predict_endpoint
```
