# Ethical AI Policing Platform - Backend

FastAPI backend for the Ethical AI Policing Platform with built-in fairness constraints and explainability.

## Quick Start

### Local Development

```bash
# Install dependencies
pip install -r requirements.txt

# Run the server
python main.py

# Or with uvicorn directly
uvicorn main:app --reload --port 8000
```

The API will be available at `http://localhost:8000`

API documentation: `http://localhost:8000/docs`

### Docker Deployment

```bash
# Build image
docker build -t ethical-policing-api .

# Run container
docker run -p 8000:8000 ethical-policing-api
```

## Project Structure

```
backend/
├── main.py              # FastAPI application with all endpoints
├── pipeline.py          # Data ingestion and preprocessing (Dask)
├── model.py             # ML models with fairness constraints
├── audit.py             # Fairness auditing (Fairlearn)
├── explain.py           # Model explainability (SHAP)
├── requirements.txt     # Python dependencies
├── Dockerfile           # Container configuration
└── .env.example         # Environment variables template
```

## API Endpoints

### Health Check
```
GET /health
```

### Prediction
```
POST /api/v1/predict
{
  "community_area": "Austin",
  "date_range": {
    "start": "2024-01-01",
    "end": "2024-01-31"
  }
}
```

### Fairness Metrics
```
GET /api/v1/metrics/fairness
```

### Performance Metrics
```
GET /api/v1/metrics/performance
```

### Audit Logs
```
GET /api/v1/audit?operation_type=prediction&limit=100
```

### Explanation
```
GET /api/v1/explain/{prediction_id}
```

### Community Feedback
```
POST /api/v1/feedback/community
{
  "community_area": "Austin",
  "prediction_id": "abc-123",
  "feedback_type": "bias_report",
  "description": "Prediction seems too high"
}
```

## Features

### 1. Data Leakage Prevention
- Temporal validation gates
- Strict past-data-only feature engineering
- Time series cross-validation

### 2. Fairness Constraints
- Demographic parity monitoring
- Equalized odds evaluation
- F1 variance tracking
- Per-community performance metrics

### 3. Model Explainability
- SHAP for global importance
- Local explanations for predictions
- Natural language summaries

### 4. Audit Logging
- Immutable audit trail
- Cryptographic signatures
- Complete operation history

## Configuration

Copy `.env.example` to `.env` and configure:

```bash
cp .env.example .env
```

Key settings:
- `CHICAGO_API_KEY`: Your Chicago Data Portal API key
- `ALLOWED_ORIGINS`: Frontend URLs for CORS
- `MODEL_PATH`: Path to saved model file

## Model Training

The model auto-trains on first startup if no saved model exists.

To manually trigger training:

```python
from pipeline import ChicagoCrimeDataPipeline
from model import EthicalCrimePredictor

# Load data
pipeline = ChicagoCrimeDataPipeline()
X, y = pipeline.get_full_pipeline(
    start_year=2020,
    end_year=2023,
    prediction_date="2024-01-01"
)

# Train model
model = EthicalCrimePredictor(model_type="xgboost")
model.train_with_temporal_validation(X, y, n_splits=3)

# Save
model.save("models/crime_predictor.pkl")
```

## Testing

```bash
# Run tests
pytest tests/

# With coverage
pytest --cov=. tests/
```

## Performance

- **Throughput**: ~100 predictions/second
- **Latency**: <50ms per prediction
- **Memory**: ~500MB base + ~1GB for model

## Connecting to Frontend

Update the frontend's environment variable:

```bash
# In frontend .env
VITE_API_BASE_URL=http://localhost:8000/api/v1
```

Or for production:
```bash
VITE_API_BASE_URL=https://your-backend-domain.com/api/v1
```

## Production Deployment

### AWS EC2
```bash
# Launch EC2 instance
# Install Docker
sudo yum install docker
sudo service docker start

# Pull and run
docker pull your-registry/ethical-policing-api:latest
docker run -d -p 8000:8000 --env-file .env your-registry/ethical-policing-api:latest
```

### GCP Cloud Run
```bash
# Build and push
gcloud builds submit --tag gcr.io/your-project/ethical-policing-api

# Deploy
gcloud run deploy ethical-policing-api \
  --image gcr.io/your-project/ethical-policing-api \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated
```

## Monitoring

Health check endpoint provides system status:

```bash
curl http://localhost:8000/health
```

Response:
```json
{
  "status": "healthy",
  "model_loaded": true,
  "model_version": "2.4.1",
  "api_version": "1.0.0",
  "timestamp": "2024-10-18T10:30:00"
}
```

## Troubleshooting

### Model Not Loading
- Check `MODEL_PATH` in .env
- Verify models/ directory exists
- Try deleting cached model and retraining

### High Memory Usage
- Reduce `BATCH_SIZE` in pipeline
- Use smaller time windows for training
- Enable Dask distributed processing

### SHAP Errors
- SHAP requires tree-based models (XGBoost/LightGBM)
- Fallback explanations used if SHAP unavailable
- Check model type compatibility

## License

MIT License - See LICENSE file for details

## Contact

- Technical Issues: engineering@your-org.com
- Fairness Concerns: ethics@your-org.com
- API Support: api-support@your-org.com
