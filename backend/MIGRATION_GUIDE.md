# Migration Guide: Mock Data → Production Database

This guide helps you transition from the mock data implementation to the full production-grade system with database persistence.

## 🎯 Overview

**Before (75% Complete)**
- Mock data in memory
- No database persistence
- No Redis caching
- No rate limiting
- Basic monitoring

**After (90% Complete)**
- Full PostgreSQL database
- Redis caching layer
- Rate limiting per endpoint
- Prometheus metrics
- Structured logging
- Production-ready deployment

## 🔄 Migration Steps

### Step 1: Update Frontend API Configuration

In `src/lib/api.ts`, disable mock data:

```typescript
// Change this line:
const USE_MOCK_DATA = true;

// To:
const USE_MOCK_DATA = false;

// And update the API URL:
const API_BASE_URL = process.env.VITE_API_URL || "http://localhost:8000";
```

### Step 2: Set Up Production Backend

1. **Install Dependencies**
```bash
cd backend
pip install -r requirements.txt
```

2. **Configure Environment**
```bash
cp .env.production .env
# Edit .env with your actual values
```

3. **Initialize Database**
```bash
# Start PostgreSQL (or use Docker)
docker run -d \
  --name ethical-ai-db \
  -e POSTGRES_PASSWORD=your_password \
  -e POSTGRES_DB=ethical_ai \
  -p 5432:5432 \
  postgres:15-alpine

# Run migrations
alembic upgrade head
```

4. **Start Redis**
```bash
docker run -d \
  --name ethical-ai-redis \
  -p 6379:6379 \
  redis:7-alpine
```

5. **Start API Server**
```bash
# Development
uvicorn main:app --reload --host 0.0.0.0 --port 8000

# Or use Docker Compose
docker compose -f docker-compose.prod.yml up --build
```

### Step 3: Connect Frontend to Backend

Update your frontend environment variables:

```env
# .env (in frontend)
VITE_API_URL=http://localhost:8000
```

Restart your frontend development server.

### Step 4: Verify Integration

Test each endpoint:

```bash
# Health check
curl http://localhost:8000/health

# Make a prediction
curl -X POST http://localhost:8000/api/v1/predict \
  -H "Content-Type: application/json" \
  -d '{
    "community_area": "Austin",
    "date_range": {
      "start": "2024-01-01",
      "end": "2024-01-31"
    }
  }'

# Get fairness metrics
curl http://localhost:8000/api/v1/metrics/fairness

# Check audit logs
curl http://localhost:8000/api/v1/audit
```

### Step 5: Populate Initial Data

If you need to seed the database with historical predictions or fairness evaluations:

```python
# seed_database.py
from database import get_db
from models import Prediction, FairnessEvaluation
from datetime import datetime
import uuid

with get_db() as db:
    # Add sample predictions
    for i in range(10):
        prediction = Prediction(
            prediction_id=str(uuid.uuid4()),
            community_area=f"Area {i+1}",
            date_range_start=datetime(2024, 1, 1),
            date_range_end=datetime(2024, 1, 31),
            predicted_crimes=100 + i * 10,
            confidence=0.75,
            risk_level="medium",
            contributing_factors=[],
            model_version="2.4.1",
            status="completed"
        )
        db.add(prediction)
    
    db.commit()
    print("Database seeded successfully!")
```

## 🔍 Verification Checklist

### Backend Tests
- [ ] Health endpoint returns database: true
- [ ] Predictions are stored in database
- [ ] Fairness evaluations persist
- [ ] Audit logs are created
- [ ] Community feedback saves correctly
- [ ] Redis caching works (check cache hit rate)
- [ ] Rate limiting triggers after threshold
- [ ] Prometheus metrics are exposed

### Frontend Tests
- [ ] Dashboard loads predictions from API
- [ ] Geographic map displays real data
- [ ] Fairness metrics update from backend
- [ ] Community feedback submits successfully
- [ ] Admin panel shows database records
- [ ] Audit log displays backend entries

## 🚨 Common Issues

### Issue: "Database connection failed"

**Solution:**
```bash
# Check DATABASE_URL format
echo $DATABASE_URL

# Should be: postgresql://user:password@host:port/dbname

# Test connection
psql $DATABASE_URL -c "SELECT 1"
```

### Issue: "Redis connection timeout"

**Solution:**
```bash
# Check Redis is running
docker ps | grep redis

# Test connection
redis-cli ping

# Check REDIS_URL in .env
echo $REDIS_URL
```

### Issue: "Rate limit exceeded immediately"

**Solution:**
```python
# Temporarily increase limits in main.py
@limiter.limit("1000/minute")  # Increase limit
async def make_prediction(...):
    ...
```

### Issue: "Model not loading on startup"

**Solution:**
```bash
# Check models directory exists
mkdir -p backend/models

# Re-train model
python -c "
from pipeline import ChicagoCrimeDataPipeline
from model import EthicalCrimePredictor

pipeline = ChicagoCrimeDataPipeline()
X, y = pipeline.get_full_pipeline()

model = EthicalCrimePredictor()
model.train_with_temporal_validation(X, y)
model.save('models/crime_predictor.pkl')
"
```

### Issue: "CORS errors in browser"

**Solution:**
```python
# In main.py, temporarily allow all origins for testing
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Change back to specific domains in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

## 📊 Monitoring Production

### View Live Metrics

```bash
# API health
watch -n 5 'curl -s http://localhost:8000/health | jq .'

# Cache stats
curl http://localhost:8000/health | jq '.cache_hit_rate'

# Prometheus metrics
curl http://localhost:8000/metrics/prometheus | grep prediction
```

### Database Queries

```sql
-- Total predictions
SELECT COUNT(*) FROM predictions;

-- Recent predictions
SELECT prediction_id, community_area, predicted_crimes, confidence 
FROM predictions 
ORDER BY created_at DESC 
LIMIT 10;

-- Fairness evaluations
SELECT model_version, demographic_parity_diff, passed_thresholds 
FROM fairness_evaluations 
ORDER BY evaluation_date DESC 
LIMIT 5;

-- Community feedback summary
SELECT feedback_type, COUNT(*) 
FROM community_feedback 
GROUP BY feedback_type;
```

## 🎯 Performance Optimization

### 1. Enable Query Caching

Already implemented for:
- Fairness metrics (5 min TTL)
- Audit logs (1 min TTL)

Add more caching:
```python
from cache import cache_response

@app.get("/api/v1/statistics")
@cache_response(ttl=600)  # 10 minutes
async def get_statistics():
    # Expensive query
    ...
```

### 2. Database Indexing

```sql
-- Add indexes for common queries
CREATE INDEX idx_predictions_community ON predictions(community_area);
CREATE INDEX idx_predictions_date ON predictions(date_range_start);
CREATE INDEX idx_feedback_status ON community_feedback(status);
```

### 3. Connection Pooling

Already configured in `database.py`:
- Pool size: 10
- Max overflow: 20

Increase if needed:
```python
engine = create_engine(
    DATABASE_URL,
    pool_size=20,  # Increase
    max_overflow=40  # Increase
)
```

## 📈 Next Steps (90% → 100%)

1. **Automated Retraining Pipeline**
   - Implement `/admin/retrain` endpoint
   - Add APScheduler for monthly retraining
   - Store models in database as BYTEA

2. **Advanced Monitoring**
   - Set up Grafana dashboards
   - Configure Prometheus alerts
   - Add error tracking (Sentry)

3. **Enhanced Security**
   - Implement JWT authentication
   - Add API key management
   - Set up WAF rules

4. **Scalability**
   - Kubernetes deployment
   - Auto-scaling policies
   - CDN integration

## 💡 Tips for Success

1. **Start Small**: Deploy locally first, then staging, then production
2. **Monitor Closely**: Watch logs and metrics for the first 24 hours
3. **Backup First**: Always backup database before migrations
4. **Test Thoroughly**: Run full test suite before deploying
5. **Document Changes**: Keep track of configuration changes

## 📚 Additional Resources

- [Production Deployment Guide](./PRODUCTION_DEPLOYMENT.md)
- [API Documentation](./README.md)
- [Backend Architecture](../ARCHITECTURE.md)
- [Testing Guide](./tests/README.md)
