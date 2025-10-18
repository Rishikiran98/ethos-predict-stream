# ⚡ Quick Start Guide - Zero Configuration Required

Get the Ethical AI Platform backend running in under 2 minutes with **zero manual configuration**.

## 🎯 One-Command Setup

### Option 1: Fully Automated (Recommended)

**Linux/Mac:**
```bash
cd backend
chmod +x setup.sh start.sh
./start.sh
```

**Windows:**
```cmd
cd backend
setup.bat
```

That's it! The script will:
- ✅ Install all dependencies automatically
- ✅ Configure environment variables with smart defaults
- ✅ Test database connectivity
- ✅ Initialize database schema
- ✅ Train ML model on first run (or load existing)
- ✅ Start the API server

### Option 2: Manual Steps (If needed)

If you prefer to see each step:

```bash
# 1. Setup (one-time only)
cd backend
python3 auto_setup.py

# 2. Start server
source venv/bin/activate  # On Windows: venv\Scripts\activate
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

## 📱 Access Your API

Once started, access:

| Endpoint | URL | Description |
|----------|-----|-------------|
| **Health Check** | http://localhost:8000/health | System status |
| **API Docs** | http://localhost:8000/docs | Interactive API documentation |
| **Make Prediction** | http://localhost:8000/api/v1/predict | Crime predictions |
| **Fairness Metrics** | http://localhost:8000/api/v1/metrics/fairness | Model fairness evaluation |
| **Prometheus Metrics** | http://localhost:8000/metrics/prometheus | System metrics |

## 🔗 Connect Frontend

The setup script automatically configures the backend. To connect your frontend:

1. **Update API configuration** in `src/lib/api.ts`:
```typescript
const USE_MOCK_DATA = false;  // Change to false
const API_BASE_URL = "http://localhost:8000";
```

2. **Restart frontend** and you're live!

## 🎛️ Default Configuration

The automated setup uses these smart defaults:

```bash
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/ethical_ai
REDIS_URL=redis://localhost:6379/0
ALLOWED_ORIGINS=http://localhost:5173,http://localhost:3000
MODEL_PATH=models/crime_predictor.pkl
LOG_LEVEL=INFO
```

### Using Lovable Cloud Database

If you want to use your Lovable Cloud (Supabase) database instead:

```bash
export DATABASE_URL="postgresql://postgres:[YOUR-PASSWORD]@[YOUR-HOST]:5432/postgres"
python auto_setup.py
```

The script will automatically connect to your cloud database!

## 🚀 What Happens on First Run?

### Automatic Model Training
On first startup (or if no model exists), the system will:

1. **Download Chicago crime data** (uses mock data if API unavailable)
2. **Process 500,000+ records** with Dask
3. **Train XGBoost model** with temporal validation
4. **Save trained model** to `models/crime_predictor.pkl`
5. **Log performance metrics** (R², RMSE, MAE)

⏱️ **Expected time:** 2-5 minutes

### Subsequent Runs
After first setup:
- Model loads instantly from disk (~1 second)
- Server starts immediately
- No training required

## 🧪 Verify Setup

Test your setup with these commands:

```bash
# Health check
curl http://localhost:8000/health

# Make a prediction
curl -X POST http://localhost:8000/api/v1/predict \
  -H "Content-Type: application/json" \
  -d '{
    "community_area": "Austin",
    "date_range": {"start": "2024-01-01", "end": "2024-01-31"}
  }'

# Get fairness metrics
curl http://localhost:8000/api/v1/metrics/fairness
```

## 🔧 Advanced Configuration (Optional)

Only customize if you need specific settings:

### Custom Database
```bash
export DATABASE_URL="postgresql://user:pass@host:port/dbname"
```

### Custom Redis
```bash
export REDIS_URL="redis://host:port/db"
```

### Production Mode
```bash
export LOG_LEVEL="WARNING"
export ALLOWED_ORIGINS="https://yourdomain.com"
```

## 📊 Monitoring

Built-in monitoring works automatically:

- **Structured logs** (JSON format)
- **Prometheus metrics** at `/metrics/prometheus`
- **Health checks** every 30 seconds
- **Rate limiting** (automatic)
- **Request tracking** (latency, throughput)

## 🐳 Docker Alternative

Prefer containers? Use Docker Compose:

```bash
docker compose -f docker-compose.prod.yml up --build
```

This starts:
- FastAPI backend
- PostgreSQL database
- Redis cache
- Nginx reverse proxy

## 🆘 Troubleshooting

### "Database connection failed"
No problem! The API runs in **mock data mode** automatically. You can still:
- Make predictions
- Test all endpoints
- View fairness metrics

### "Model training failed"
The API will start without a trained model and use fallback predictions.

### "Port 8000 already in use"
```bash
# Use different port
uvicorn main:app --reload --port 8001
```

## 📚 Next Steps

1. ✅ **Connect frontend** (see above)
2. ✅ **Explore API docs** at http://localhost:8000/docs
3. ✅ **Monitor metrics** at `/metrics/prometheus`
4. ✅ **Review fairness** at `/api/v1/metrics/fairness`
5. ✅ **Submit feedback** at `/api/v1/feedback/community`

## 🔗 Additional Resources

- [Full API Documentation](./README.md)
- [Production Deployment](./PRODUCTION_DEPLOYMENT.md)
- [Migration Guide](./MIGRATION_GUIDE.md)
- [Architecture Overview](../ARCHITECTURE.md)

---

**Questions?** Check the [full documentation](./README.md) or review [troubleshooting tips](./PRODUCTION_DEPLOYMENT.md#-troubleshooting).
