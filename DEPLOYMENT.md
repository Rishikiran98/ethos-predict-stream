# Deployment Guide - Ethical AI Policing Platform

## Quick Start Options

### Option 1: Full Docker Deployment (Recommended)

**Prerequisites**: Docker, Docker Compose

```bash
# 1. Clone both repositories
git clone https://github.com/your-org/predictive-policing-frontend.git
git clone https://github.com/your-org/predictive-policing-backend.git

# 2. Configure environment
cd predictive-policing-backend
cp .env.example .env
# Edit .env with your configurations

# 3. Launch entire stack
docker-compose up -d

# Services will be available at:
# Frontend: http://localhost:3000
# Backend API: http://localhost:8000
# Dask Dashboard: http://localhost:8787
```

### Option 2: Hybrid (Frontend on Lovable, Backend Self-Hosted)

**Current Setup**: Frontend is already deployed on Lovable

**Deploy Backend Only**:

```bash
# On your server (AWS EC2, GCP, etc.)
git clone https://github.com/your-org/predictive-policing-backend.git
cd predictive-policing-backend

# Install dependencies
pip install -r requirements.txt

# Set environment variables
export DATABASE_URL="postgresql://user:pass@db-host:5432/policing_db"
export CHICAGO_API_KEY="your_api_key_here"
export ALLOWED_ORIGINS="https://your-lovable-app.lovable.app"

# Run with production server
uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers 4
```

### Option 3: Cloud-Native Deployment

## AWS Deployment

### Architecture Overview

```
Internet → CloudFront → ALB → ECS (Frontend)
                              ↓
                         ECS (FastAPI)
                              ↓
                    RDS (PostgreSQL) + S3 (Models)
                              ↓
                         EMR (Dask Cluster)
```

### Step-by-Step AWS Setup

#### 1. Database Setup (RDS)

```bash
# Create PostgreSQL instance
aws rds create-db-instance \
  --db-instance-identifier policing-db \
  --db-instance-class db.t3.medium \
  --engine postgres \
  --master-username admin \
  --master-user-password YourSecurePassword123! \
  --allocated-storage 100 \
  --vpc-security-group-ids sg-xxxxxx \
  --db-name policing_db \
  --backup-retention-period 7 \
  --publicly-accessible false

# Get endpoint
aws rds describe-db-instances \
  --db-instance-identifier policing-db \
  --query 'DBInstances[0].Endpoint.Address' \
  --output text
```

#### 2. S3 for Model Storage

```bash
# Create bucket
aws s3 mb s3://policing-model-artifacts

# Enable versioning
aws s3api put-bucket-versioning \
  --bucket policing-model-artifacts \
  --versioning-configuration Status=Enabled

# Set lifecycle policy for old versions
cat > lifecycle.json << EOF
{
  "Rules": [{
    "Status": "Enabled",
    "NoncurrentVersionExpiration": { "NoncurrentDays": 90 }
  }]
}
EOF

aws s3api put-bucket-lifecycle-configuration \
  --bucket policing-model-artifacts \
  --lifecycle-configuration file://lifecycle.json
```

#### 3. ECS for Backend API

```bash
# Create ECS cluster
aws ecs create-cluster --cluster-name policing-backend

# Create task definition
cat > task-definition.json << EOF
{
  "family": "policing-api",
  "networkMode": "awsvpc",
  "containerDefinitions": [{
    "name": "fastapi",
    "image": "your-dockerhub/policing-backend:latest",
    "cpu": 1024,
    "memory": 2048,
    "portMappings": [{ "containerPort": 8000 }],
    "environment": [
      { "name": "DATABASE_URL", "value": "postgresql://admin:pass@rds-endpoint:5432/policing_db" },
      { "name": "DASK_SCHEDULER", "value": "tcp://emr-master:8786" }
    ],
    "logConfiguration": {
      "logDriver": "awslogs",
      "options": {
        "awslogs-group": "/ecs/policing-api",
        "awslogs-region": "us-east-1",
        "awslogs-stream-prefix": "ecs"
      }
    }
  }]
}
EOF

aws ecs register-task-definition --cli-input-json file://task-definition.json

# Create service
aws ecs create-service \
  --cluster policing-backend \
  --service-name policing-api \
  --task-definition policing-api \
  --desired-count 2 \
  --launch-type FARGATE \
  --network-configuration "awsvpcConfiguration={subnets=[subnet-xxx],securityGroups=[sg-xxx],assignPublicIp=ENABLED}"
```

#### 4. EMR for Dask Cluster

```bash
# Launch EMR cluster with Dask
aws emr create-cluster \
  --name "Policing-Dask-Cluster" \
  --release-label emr-6.10.0 \
  --applications Name=Hadoop Name=Spark \
  --instance-groups \
    InstanceGroupType=MASTER,InstanceCount=1,InstanceType=m5.2xlarge \
    InstanceGroupType=CORE,InstanceCount=6,InstanceType=m5.2xlarge \
  --ec2-attributes KeyName=your-key-pair,SubnetId=subnet-xxx \
  --use-default-roles \
  --log-uri s3://your-logs-bucket/emr-logs/ \
  --bootstrap-actions \
    Path=s3://your-scripts-bucket/install-dask.sh

# Bootstrap script (install-dask.sh):
#!/bin/bash
sudo pip3 install dask[complete] distributed dask-ml
nohup dask-scheduler &
nohup dask-worker tcp://$(hostname):8786 --nworkers 4 &
```

#### 5. Application Load Balancer

```bash
# Create ALB
aws elbv2 create-load-balancer \
  --name policing-alb \
  --subnets subnet-xxx subnet-yyy \
  --security-groups sg-xxx

# Create target group
aws elbv2 create-target-group \
  --name policing-targets \
  --protocol HTTP \
  --port 8000 \
  --vpc-id vpc-xxx \
  --health-check-path /health

# Register targets (ECS tasks)
# This happens automatically when ECS service is created with load balancer

# Create listener
aws elbv2 create-listener \
  --load-balancer-arn arn:aws:elasticloadbalancing:... \
  --protocol HTTPS \
  --port 443 \
  --certificates CertificateArn=arn:aws:acm:... \
  --default-actions Type=forward,TargetGroupArn=arn:aws:elasticloadbalancing:...
```

## GCP Deployment

### Architecture Overview

```
Internet → Cloud Load Balancer → Cloud Run (Frontend)
                                      ↓
                                Cloud Run (Backend)
                                      ↓
                            Cloud SQL + GCS (Models)
                                      ↓
                            Dataproc (Dask Cluster)
```

### Step-by-Step GCP Setup

#### 1. Cloud SQL Setup

```bash
# Create PostgreSQL instance
gcloud sql instances create policing-db \
  --database-version=POSTGRES_14 \
  --tier=db-n1-standard-2 \
  --region=us-central1 \
  --root-password=YourSecurePassword123! \
  --backup \
  --backup-start-time=03:00

# Create database
gcloud sql databases create policing_data --instance=policing-db

# Get connection name
gcloud sql instances describe policing-db --format="value(connectionName)"
```

#### 2. Cloud Storage for Models

```bash
# Create bucket
gsutil mb -l us-central1 gs://policing-model-artifacts

# Enable versioning
gsutil versioning set on gs://policing-model-artifacts

# Set lifecycle
cat > lifecycle.json << EOF
{
  "lifecycle": {
    "rule": [{
      "action": {"type": "Delete"},
      "condition": {"numNewerVersions": 5}
    }]
  }
}
EOF

gsutil lifecycle set lifecycle.json gs://policing-model-artifacts
```

#### 3. Cloud Run for Backend

```bash
# Build and push Docker image
gcloud builds submit --tag gcr.io/your-project/policing-backend

# Deploy to Cloud Run
gcloud run deploy policing-api \
  --image gcr.io/your-project/policing-backend \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --set-env-vars DATABASE_URL="postgresql://postgres:pass@/policing_data?host=/cloudsql/connection-name" \
  --add-cloudsql-instances your-project:us-central1:policing-db \
  --memory 2Gi \
  --cpu 2 \
  --max-instances 10 \
  --concurrency 80
```

#### 4. Dataproc for Dask

```bash
# Create Dataproc cluster
gcloud dataproc clusters create policing-dask \
  --region us-central1 \
  --zone us-central1-a \
  --master-machine-type n1-standard-4 \
  --master-boot-disk-size 50 \
  --num-workers 6 \
  --worker-machine-type n1-standard-4 \
  --worker-boot-disk-size 50 \
  --image-version 2.0-debian10 \
  --initialization-actions gs://goog-dataproc-initialization-actions-us-central1/python/pip-install.sh \
  --metadata 'PIP_PACKAGES=dask[complete] distributed dask-ml pandas numpy scikit-learn xgboost fairlearn shap'

# Submit Dask job
gcloud dataproc jobs submit pyspark \
  --cluster policing-dask \
  --region us-central1 \
  gs://your-bucket/scripts/train_model.py
```

## Environment Variables

### Backend (.env)

```bash
# Database
DATABASE_URL=postgresql://user:password@host:5432/database_name

# Chicago Data Portal
CHICAGO_API_KEY=your_api_key_here
CHICAGO_API_BASE_URL=https://data.cityofchicago.org/resource

# Dask Cluster
DASK_SCHEDULER_ADDRESS=tcp://scheduler-host:8786

# Model Storage
MODEL_STORAGE_PATH=s3://bucket/models  # or gs://bucket/models

# Security
SECRET_KEY=your-secret-key-for-jwt
ALLOWED_ORIGINS=https://your-frontend-url.com

# Monitoring
MLFLOW_TRACKING_URI=http://mlflow-server:5000
LOG_LEVEL=INFO
```

### Frontend (Lovable Environment Variables)

```bash
# Add in Lovable project settings or .env file
VITE_API_BASE_URL=https://your-backend-api.com/api/v1
```

## CI/CD Pipeline

### GitHub Actions Workflow

```yaml
# .github/workflows/deploy.yml

name: Deploy to Production

on:
  push:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-python@v4
        with:
          python-version: '3.10'
      - run: pip install -r requirements.txt
      - run: pytest tests/
      
  build-and-deploy:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      # Build Docker image
      - name: Build Docker image
        run: docker build -t policing-backend:${{ github.sha }} .
      
      # Push to registry
      - name: Push to Docker Hub
        run: |
          echo ${{ secrets.DOCKER_PASSWORD }} | docker login -u ${{ secrets.DOCKER_USERNAME }} --password-stdin
          docker tag policing-backend:${{ github.sha }} your-org/policing-backend:latest
          docker push your-org/policing-backend:latest
      
      # Deploy to AWS ECS
      - name: Deploy to ECS
        run: |
          aws ecs update-service \
            --cluster policing-backend \
            --service policing-api \
            --force-new-deployment
        env:
          AWS_ACCESS_KEY_ID: ${{ secrets.AWS_ACCESS_KEY_ID }}
          AWS_SECRET_ACCESS_KEY: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
```

## Monitoring Setup

### Prometheus + Grafana

```yaml
# docker-compose.monitoring.yml

version: '3.8'

services:
  prometheus:
    image: prom/prometheus:latest
    volumes:
      - ./prometheus.yml:/etc/prometheus/prometheus.yml
    ports:
      - "9090:9090"
      
  grafana:
    image: grafana/grafana:latest
    ports:
      - "3001:3000"
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=admin
    volumes:
      - ./grafana-dashboards:/etc/grafana/provisioning/dashboards
```

```yaml
# prometheus.yml
global:
  scrape_interval: 15s

scrape_configs:
  - job_name: 'fastapi'
    static_configs:
      - targets: ['backend:8000']
  
  - job_name: 'dask'
    static_configs:
      - targets: ['dask-scheduler:8787']
```

## Health Checks

```python
# backend/app/health.py

from fastapi import APIRouter
from sqlalchemy import text
from app.database import engine

router = APIRouter()

@router.get("/health")
async def health_check():
    """System health check"""
    checks = {
        "status": "healthy",
        "database": await check_database(),
        "dask": await check_dask_cluster(),
        "model": await check_model_loaded()
    }
    
    if not all(checks.values()):
        checks["status"] = "degraded"
    
    return checks

async def check_database():
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        return True
    except Exception:
        return False
```

## Scaling Guidelines

### Auto-Scaling Rules

**Backend API** (AWS ECS):
- Scale up: CPU > 70% for 2 minutes
- Scale down: CPU < 30% for 5 minutes
- Min instances: 2
- Max instances: 10

**Dask Workers**:
- Scale up: Queue depth > 100 tasks
- Scale down: Queue depth < 10 for 10 minutes
- Min workers: 6
- Max workers: 20

## Backup Strategy

```bash
# Daily database backup
0 2 * * * pg_dump -h $DB_HOST -U $DB_USER -d policing_db | gzip > /backups/db_$(date +\%Y\%m\%d).sql.gz

# Model versioning (automatic via S3/GCS versioning)
# Audit logs: Retained for 7 years, backed up weekly to cold storage
```

## Disaster Recovery

1. **RTO** (Recovery Time Objective): 1 hour
2. **RPO** (Recovery Point Objective): 24 hours
3. **Backup Locations**: Multi-region S3/GCS
4. **Failover**: Active-passive in separate region

## Cost Estimation

### AWS (Monthly)

- **RDS (db.t3.medium)**: ~$70
- **ECS Fargate (2 tasks)**: ~$150
- **EMR (6 nodes, m5.2xlarge)**: ~$2,500
- **S3 Storage**: ~$50
- **Data Transfer**: ~$100
- **Total**: ~$2,870/month

### GCP (Monthly)

- **Cloud SQL (db-n1-standard-2)**: ~$150
- **Cloud Run**: ~$120
- **Dataproc (6 nodes)**: ~$2,200
- **Cloud Storage**: ~$50
- **Total**: ~$2,520/month

## Support Contacts

- **Infrastructure Issues**: devops@your-org.com
- **Application Bugs**: engineering@your-org.com
- **Security Concerns**: security@your-org.com
