# 🚀 Zero-Configuration Setup Guide

Get the Ethical AI Platform running with **absolutely zero manual configuration**. Everything is automated!

## ⚡ Quick Start (< 2 minutes)

### Step 1: Choose Your Setup Method

#### **Option A: One-Command Automated Setup (Recommended)**

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

#### **Option B: Python Direct**
```bash
cd backend
python3 auto_setup.py
source venv/bin/activate
uvicorn main:app --reload
```

### Step 2: Connect Frontend (30 seconds)

Edit `src/lib/api.ts`:
```typescript
// Line 5: Change this
const USE_MOCK_DATA = false;  // ← Change to false
```

### Step 3: Done! 🎉

Access your running app:
- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:8000
- **API Docs**: http://localhost:8000/docs

---

## 🎯 What Gets Automated?

The setup script handles **everything automatically**:

✅ **Environment Configuration**
- Auto-detects Lovable Cloud database (if connected)
- Falls back to smart defaults if not
- No `.env` files to edit!

✅ **Database Setup**
- Auto-connects to your Lovable Cloud database
- Creates all tables automatically
- Falls back to in-memory mode if database unavailable

✅ **Redis Cache**
- Attempts Redis connection
- Gracefully disables if unavailable (not required)

✅ **ML Model**
- Loads existing model if present
- Trains new model automatically on first run (2-5 min)
- Uses mock predictions as fallback

✅ **Dependencies**
- Creates virtual environment
- Installs all packages
- No manual pip install needed!

---

## 🔗 Integration Points

### Using Lovable Cloud Database

**The backend auto-detects your Lovable Cloud connection!**

It reads these from your environment:
- `VITE_SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

No configuration needed - it just works!

### Using Local Database

If you prefer local development:

```bash
# Start PostgreSQL (Docker)
docker run -d --name postgres \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=ethical_ai \
  -p 5432:5432 \
  postgres:15-alpine

# Run setup
cd backend
python auto_setup.py
```

The script automatically detects and uses your local database!

---

## 📊 Verify Your Setup

### Test Backend

```bash
# Health check
curl http://localhost:8000/health

# Should return:
{
  "status": "healthy",
  "database": true,
  "model_loaded": true,
  "model_version": "2.4.1",
  ...
}
```

### Test Frontend Integration

1. Open http://localhost:5173
2. Navigate to dashboard
3. You should see:
   - Crime predictions loading
   - Geographic map with data
   - Fairness metrics from backend
   - Community feedback working

---

## 🎛️ Advanced Options (Optional)

### Custom Configuration

Only needed for specific requirements:

```bash
# Use specific database
export DATABASE_URL="postgresql://user:pass@host:port/db"

# Use specific Redis
export REDIS_URL="redis://host:port/db"

# Custom origins
export ALLOWED_ORIGINS="http://localhost:3000,https://myapp.com"

# Run setup
python auto_setup.py
```

### Production Deployment

For production, see the [Production Deployment Guide](backend/PRODUCTION_DEPLOYMENT.md).

### Docker Deployment

```bash
cd backend
docker compose -f docker-compose.prod.yml up --build
```

---

## 🧪 Development Workflow

### Daily Development

```bash
# Start backend (automatically activates venv)
cd backend
./start.sh

# In another terminal: Start frontend
npm run dev
```

### Making Changes

The setup script creates a proper development environment:
- Hot reload enabled (code changes auto-restart)
- Detailed logging
- Development mode optimizations

### Testing

```bash
# Backend tests
cd backend
source venv/bin/activate
pytest tests/ -v

# Frontend tests
npm run test
```

---

## 🎨 Architecture Overview

```
┌─────────────────┐
│   Frontend      │
│  (React + TS)   │
│  Port: 5173     │
└────────┬────────┘
         │
         │ HTTP/REST
         ▼
┌─────────────────┐      ┌──────────────┐
│   Backend API   │─────▶│  PostgreSQL  │
│   (FastAPI)     │      │  (Lovable    │
│   Port: 8000    │      │   Cloud)     │
└────────┬────────┘      └──────────────┘
         │
         │ (optional)
         ▼
┌─────────────────┐
│   Redis Cache   │
│   Port: 6379    │
└─────────────────┘
```

### What Runs Where

**Lovable Cloud (Managed for You):**
- PostgreSQL database with all tables
- User authentication system
- File storage (if needed)

**Your Local Machine:**
- FastAPI backend (port 8000)
- React frontend (port 5173)
- Optional: Redis cache (port 6379)

---

## 🚨 Troubleshooting

### "Database connection failed"
✅ **This is OK!** The backend automatically switches to mock data mode.

### "Redis unavailable"
✅ **This is OK!** Caching is optional. The backend runs fine without it.

### "Model training failed"
✅ **This is OK!** The backend will use fallback predictions.

### "Port 8000 already in use"
```bash
# Use different port
uvicorn main:app --reload --port 8001
```

### Frontend can't connect to backend
```bash
# Check backend is running
curl http://localhost:8000/health

# Verify VITE_API_URL (should be http://localhost:8000)
cat .env | grep VITE_API_URL
```

---

## 📚 Next Steps

1. ✅ **Explore the Dashboard**
   - View crime predictions
   - Check fairness metrics
   - Review audit logs

2. ✅ **Try the API**
   - Interactive docs at http://localhost:8000/docs
   - Make test predictions
   - Submit feedback

3. ✅ **Monitor Performance**
   - Prometheus metrics at `/metrics/prometheus`
   - Health check at `/health`
   - Structured JSON logs

4. ✅ **Customize (Optional)**
   - Train model with your data
   - Adjust fairness thresholds
   - Configure rate limits

---

## 🔗 Additional Resources

- [Backend API Documentation](backend/README.md)
- [Production Deployment](backend/PRODUCTION_DEPLOYMENT.md)
- [Migration Guide](backend/MIGRATION_GUIDE.md)
- [Architecture Documentation](ARCHITECTURE.md)
- [Backend Template](BACKEND_TEMPLATE.md)

---

## 💡 Pro Tips

1. **First Run Takes Longer**: Model training happens automatically (2-5 min)
2. **Subsequent Runs Are Fast**: Model loads instantly from disk
3. **Mock Data Mode Works Great**: Perfect for frontend development
4. **Database Is Optional**: Backend gracefully handles missing connections
5. **Redis Is Optional**: Caching improves performance but isn't required

---

## ✨ Summary

You now have a **production-ready** AI platform running with:
- ✅ Full ML pipeline with fairness constraints
- ✅ Database persistence (if connected)
- ✅ REST API with documentation
- ✅ Geographic visualization
- ✅ Community feedback system
- ✅ Audit logging
- ✅ Performance monitoring
- ✅ Rate limiting
- ✅ Caching (if Redis available)

**All configured automatically with zero manual setup!** 🎉
