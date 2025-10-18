"""
Automated Backend Setup Script
Handles all initialization automatically - no manual steps required
"""

import os
import sys
import logging
from pathlib import Path

logging.basicConfig(level=logging.INFO, format='%(message)s')
logger = logging.getLogger(__name__)

def print_banner():
    """Print setup banner"""
    print("\n" + "="*60)
    print("  🚀 Ethical AI Platform - Automated Backend Setup")
    print("="*60 + "\n")

def check_environment():
    """Check and configure environment variables"""
    logger.info("📋 Step 1/4: Checking environment configuration...")
    
    # Required environment variables (will use defaults if not set)
    env_vars = {
        'DATABASE_URL': os.getenv('DATABASE_URL', 'postgresql://postgres:postgres@localhost:5432/ethical_ai'),
        'REDIS_URL': os.getenv('REDIS_URL', 'redis://localhost:6379/0'),
        'ALLOWED_ORIGINS': os.getenv('ALLOWED_ORIGINS', 'http://localhost:5173,http://localhost:3000'),
        'MODEL_PATH': os.getenv('MODEL_PATH', 'models/crime_predictor.pkl'),
        'LOG_LEVEL': os.getenv('LOG_LEVEL', 'INFO')
    }
    
    # Set defaults if not present
    for key, value in env_vars.items():
        if key not in os.environ:
            os.environ[key] = value
            logger.info(f"  ✓ Set {key} to default value")
        else:
            logger.info(f"  ✓ {key} already configured")
    
    logger.info("  ✅ Environment configured\n")
    return True

def test_database_connection():
    """Test database connectivity"""
    logger.info("🗄️  Step 2/4: Testing database connection...")
    
    try:
        from database import engine
        connection = engine.connect()
        connection.execute("SELECT 1")
        connection.close()
        logger.info("  ✅ Database connection successful\n")
        return True
    except Exception as e:
        logger.warning(f"  ⚠️  Database connection failed: {e}")
        logger.info("  ℹ️  Will use mock data mode for development\n")
        return False

def initialize_database():
    """Initialize database schema"""
    logger.info("🔧 Step 3/4: Initializing database...")
    
    try:
        from database import Base, engine
        from models import ModelArtifact, Prediction, FairnessEvaluation, AuditLog, CommunityFeedback
        
        # Create all tables if they don't exist
        Base.metadata.create_all(bind=engine)
        logger.info("  ✓ Database schema created")
        logger.info("  ✅ Database initialized\n")
        return True
    except Exception as e:
        logger.warning(f"  ⚠️  Database initialization skipped: {e}\n")
        return False

def train_or_load_model():
    """Train new model or load existing one"""
    logger.info("🤖 Step 4/4: Setting up ML model...")
    
    model_path = os.getenv('MODEL_PATH', 'models/crime_predictor.pkl')
    
    # Check if model exists
    if Path(model_path).exists():
        logger.info(f"  ✓ Found existing model at {model_path}")
        logger.info("  ✅ Model ready\n")
        return True
    
    # Create models directory
    Path("models").mkdir(exist_ok=True)
    
    logger.info("  ⏳ No existing model found - training new model...")
    logger.info("  ℹ️  This may take 2-5 minutes on first run...")
    
    try:
        from pipeline import ChicagoCrimeDataPipeline
        from model import EthicalCrimePredictor
        
        # Initialize pipeline
        pipeline = ChicagoCrimeDataPipeline()
        
        # Get training data
        X, y = pipeline.get_full_pipeline(
            start_year=2020,
            end_year=2023,
            prediction_date="2024-01-01"
        )
        
        logger.info(f"  ✓ Loaded {len(X)} training samples")
        
        # Train model
        model = EthicalCrimePredictor(model_type="xgboost")
        cv_scores = model.train_with_temporal_validation(X, y, n_splits=3)
        
        # Save model
        model.save(model_path)
        
        logger.info(f"  ✓ Model trained successfully")
        logger.info(f"    - R² Score: {cv_scores['r2'][-1]:.3f}")
        logger.info(f"    - RMSE: {cv_scores['rmse'][-1]:.3f}")
        logger.info(f"  ✅ Model saved to {model_path}\n")
        return True
        
    except Exception as e:
        logger.error(f"  ❌ Model training failed: {e}")
        logger.info("  ℹ️  API will start without trained model\n")
        return False

def print_success():
    """Print success message with next steps"""
    print("="*60)
    print("  ✅ SETUP COMPLETE!")
    print("="*60)
    print("\n📝 Next Steps:\n")
    print("  1. Start the API server:")
    print("     uvicorn main:app --reload --host 0.0.0.0 --port 8000\n")
    print("  2. Access the API:")
    print("     - Health check: http://localhost:8000/health")
    print("     - API docs: http://localhost:8000/docs")
    print("     - Metrics: http://localhost:8000/metrics/prometheus\n")
    print("  3. Connect your frontend:")
    print("     - Update VITE_API_URL to: http://localhost:8000")
    print("     - Set USE_MOCK_DATA = false in src/lib/api.ts\n")
    print("="*60 + "\n")

def main():
    """Run automated setup"""
    print_banner()
    
    try:
        # Step 1: Environment
        check_environment()
        
        # Step 2: Database connection
        db_available = test_database_connection()
        
        # Step 3: Initialize database (if available)
        if db_available:
            initialize_database()
        
        # Step 4: Model setup
        train_or_load_model()
        
        # Success!
        print_success()
        return 0
        
    except KeyboardInterrupt:
        print("\n\n⚠️  Setup interrupted by user\n")
        return 1
    except Exception as e:
        logger.error(f"\n❌ Setup failed: {e}\n")
        return 1

if __name__ == "__main__":
    sys.exit(main())
