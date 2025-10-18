# Production Deployment Guide

This guide covers deploying the Ethical AI Policing Platform backend to production with full database integration, caching, monitoring, and security hardening.

## 🚀 Quick Start

### Prerequisites
- Docker & Docker Compose installed
- PostgreSQL (or use Docker container)
- Redis (or use Docker container)
- SSL certificates (for HTTPS)

### 1. Environment Setup

Copy the production environment template:
```bash
cp .env.production .env
```

Update the following critical values in `.env`:
```bash
DATABASE_URL=postgresql://postgres:YOUR_SECURE_PASSWORD@db:5432/ethical_ai
POSTGRES_PASSWORD=YOUR_SECURE_PASSWORD
ALLOWED_ORIGINS=https://yourdomain.com
JWT_SECRET=YOUR_RANDOM_SECRET_HERE
CHICAGO_API_KEY=your_chicago_api_key
```

### 2. SSL Certificates

Place your SSL certificates in the `ssl/` directory:
```bash
mkdir -p ssl
# Copy your certificates
cp /path/to/cert.pem ssl/cert.pem
cp /path/to/key.pem ssl/key.pem
```

For testing, generate self-signed certificates:
```bash
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout ssl/key.pem -out ssl/cert.pem
```

### 3. Deploy with Docker Compose

```bash
# Build and start all services
docker compose -f docker-compose.prod.yml up --build -d

# Check logs
docker compose -f docker-compose.prod.yml logs -f

# Stop services
docker compose -f docker-compose.prod.yml down
```

### 4. Initialize Database

Run Alembic migrations:
```bash
# Enter API container
docker exec -it ethical-ai-api bash

# Run migrations
alembic upgrade head

# Exit container
exit
```

### 5. Verify Deployment

Check health endpoint:
```bash
curl http://localhost/health
```

Expected response:
```json
{
  "status": "healthy",
  "database": true,
  "redis": true,
  "model_loaded": true,
  "model_version": "2.4.1",
  "api_version": "2.0.0",
  "uptime_seconds": 123.45
}
```

## 📊 Monitoring & Observability

### Prometheus Metrics

Access Prometheus metrics at:
```
https://yourdomain.com/metrics/prometheus
```

Key metrics tracked:
- `api_requests_total` - Total API requests by endpoint and status
- `api_request_latency_seconds` - Request latency histogram
- `model_predictions_total` - Total predictions made
- `model_prediction_latency_seconds` - Prediction latency
- `fairness_drift_score` - Current fairness drift score
- `cache_hit_rate` - Redis cache hit rate

### Structured Logging

All requests are logged in JSON format:
```bash
# View logs
docker compose logs -f api
```

Example log entry:
```json
{
  "timestamp": "2024-01-15T10:30:00Z",
  "method": "POST",
  "path": "/api/v1/predict",
  "status_code": 200,
  "latency_ms": 45.23,
  "user_agent": "...",
  "client_ip": "192.168.1.1"
}
```

### Health Checks

Monitor system health:
- **Endpoint**: `GET /health`
- **Frequency**: Every 30 seconds (configured in Dockerfile)
- **Checks**: Database, Redis, Model status

## 🔒 Security Features

### 1. Rate Limiting

SlowAPI rate limits implemented:
- Predictions: 50 requests/minute per IP
- Audit logs: 30 requests/minute per IP
- Feedback: 10 submissions/minute per IP
- Global: 100 requests/minute per IP

### 2. CORS Restrictions

CORS restricted to allowed origins only (configured in `.env`):
```bash
ALLOWED_ORIGINS=https://yourdomain.com,https://www.yourdomain.com
```

### 3. HTTPS Enforced

Nginx configuration:
- All HTTP traffic redirected to HTTPS
- TLS 1.2 and 1.3 only
- Strong cipher suites
- HSTS enabled

### 4. Security Headers

Automatic security headers:
- `X-Frame-Options: SAMEORIGIN`
- `X-Content-Type-Options: nosniff`
- `X-XSS-Protection: 1; mode=block`
- `Strict-Transport-Security`

## 🗄️ Database Management

### Connecting to PostgreSQL

```bash
# Via Docker
docker exec -it ethical-ai-db psql -U postgres -d ethical_ai

# Or use DATABASE_URL from .env
psql $DATABASE_URL
```

### Running Migrations

```bash
# Create a new migration
docker exec -it ethical-ai-api alembic revision --autogenerate -m "description"

# Apply migrations
docker exec -it ethical-ai-api alembic upgrade head

# Rollback
docker exec -it ethical-ai-api alembic downgrade -1
```

### Backup Database

```bash
# Create backup
docker exec ethical-ai-db pg_dump -U postgres ethical_ai > backup.sql

# Restore backup
docker exec -i ethical-ai-db psql -U postgres ethical_ai < backup.sql
```

## 🔧 Performance Tuning

### Redis Caching

Cached endpoints:
- `/api/v1/metrics/fairness` - 5 minutes TTL
- `/api/v1/audit` - 1 minute TTL

Monitor cache performance:
```bash
curl http://localhost/health | jq '.cache_hit_rate'
```

### Database Connection Pooling

Configured in `database.py`:
- Pool size: 10 connections
- Max overflow: 20 connections
- Pre-ping enabled

### Worker Configuration

Adjust workers in `docker-compose.prod.yml`:
```yaml
command: ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "4"]
```

Rule of thumb: `workers = (2 × CPU cores) + 1`

## 📈 Scaling Strategies

### Horizontal Scaling

Scale API containers:
```bash
docker compose up --scale api=3
```

Update Nginx upstream configuration for load balancing.

### Vertical Scaling

Increase container resources in `docker-compose.prod.yml`:
```yaml
api:
  deploy:
    resources:
      limits:
        cpus: '2.0'
        memory: 4G
```

## 🧪 Testing

### Run Test Suite

```bash
# Enter container
docker exec -it ethical-ai-api bash

# Run tests
pytest tests/ -v

# With coverage
pytest tests/ --cov=. --cov-report=html
```

### Load Testing

Use tools like Apache Bench or Locust:
```bash
# Simple load test
ab -n 1000 -c 10 http://localhost/health
```

## 🚨 Troubleshooting

### Database Connection Issues

```bash
# Check database logs
docker compose logs db

# Verify connection
docker exec ethical-ai-api python -c "from database import engine; engine.connect()"
```

### Redis Connection Issues

```bash
# Check Redis logs
docker compose logs redis

# Test connection
docker exec ethical-ai-redis redis-cli ping
```

### Model Not Loading

```bash
# Check if model file exists
docker exec ethical-ai-api ls -lh models/

# View startup logs
docker compose logs api | grep "model"
```

### High Memory Usage

- Reduce Dask workers
- Decrease connection pool size
- Implement request queuing
- Add memory limits in Docker

## 📞 Production Checklist

Before going live:

- [ ] Update all passwords and secrets in `.env`
- [ ] Configure valid SSL certificates
- [ ] Restrict CORS to production domain
- [ ] Set up database backups
- [ ] Configure monitoring alerts
- [ ] Test rate limiting
- [ ] Run security scan
- [ ] Load test API endpoints
- [ ] Document incident response procedures
- [ ] Set up log aggregation
- [ ] Configure CDN (if applicable)
- [ ] Enable database replication

## 🔄 CI/CD Integration

### GitHub Actions Example

```yaml
name: Deploy Production

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      
      - name: Run tests
        run: docker compose run api pytest
      
      - name: Build and push
        run: |
          docker build -t myregistry/ethical-ai:latest ./backend
          docker push myregistry/ethical-ai:latest
      
      - name: Deploy
        run: |
          ssh user@server "cd /app && docker compose pull && docker compose up -d"
```

## 📚 Additional Resources

- [FastAPI Documentation](https://fastapi.tiangolo.com/)
- [SQLAlchemy ORM](https://docs.sqlalchemy.org/)
- [Prometheus Metrics](https://prometheus.io/docs/concepts/metric_types/)
- [Nginx Configuration](https://nginx.org/en/docs/)
- [Docker Compose](https://docs.docker.com/compose/)
