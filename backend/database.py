"""
Database Configuration and Session Management
SQLAlchemy ORM with auto-configuration for Lovable Cloud / Supabase
"""

import os
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, Session
from contextlib import contextmanager
import logging

logger = logging.getLogger(__name__)

# Auto-detect Lovable Cloud database URL
# Priority: DATABASE_URL > Supabase env vars > local default
def get_database_url():
    """Auto-detect database URL from various sources"""
    
    # Option 1: Explicit DATABASE_URL
    if os.getenv("DATABASE_URL"):
        return os.getenv("DATABASE_URL")
    
    # Option 2: Lovable Cloud / Supabase environment variables
    supabase_url = os.getenv("VITE_SUPABASE_URL")
    if supabase_url:
        # Extract host from Supabase URL (e.g., https://xxx.supabase.co -> xxx.supabase.co)
        host = supabase_url.replace("https://", "").replace("http://", "")
        project_id = host.split(".")[0]
        
        # Construct PostgreSQL connection string
        # Password should be in SUPABASE_DB_PASSWORD or extracted from service role
        password = os.getenv("SUPABASE_DB_PASSWORD", os.getenv("SUPABASE_SERVICE_ROLE_KEY", "postgres"))
        
        db_url = f"postgresql://postgres:{password}@db.{project_id}.supabase.co:5432/postgres"
        logger.info(f"Auto-detected Lovable Cloud database: {project_id}")
        return db_url
    
    # Option 3: Local development default
    logger.info("Using local development database")
    return "postgresql://postgres:postgres@localhost:5432/ethical_ai"

DATABASE_URL = get_database_url()

# Create SQLAlchemy engine
engine = create_engine(
    DATABASE_URL,
    pool_pre_ping=True,
    pool_size=10,
    max_overflow=20,
    echo=False
)

# Session factory
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Base class for ORM models
Base = declarative_base()

@contextmanager
def get_db():
    """
    Context manager for database sessions.
    
    Usage:
        with get_db() as db:
            db.query(Model).all()
    """
    db = SessionLocal()
    try:
        yield db
        db.commit()
    except Exception as e:
        db.rollback()
        logger.error(f"Database error: {e}")
        raise
    finally:
        db.close()

def init_db():
    """Initialize database - create all tables"""
    from models import ModelArtifact, Prediction, FairnessEvaluation, AuditLog, CommunityFeedback
    Base.metadata.create_all(bind=engine)
    logger.info("Database initialized successfully")

def get_db_session() -> Session:
    """Dependency for FastAPI endpoints"""
    db = SessionLocal()
    try:
        return db
    finally:
        db.close()
