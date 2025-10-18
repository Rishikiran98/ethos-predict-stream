"""
SQLAlchemy ORM Models matching Supabase schema
"""

from sqlalchemy import Column, String, Integer, Float, Boolean, DateTime, Text, JSON, LargeBinary, ARRAY, Enum as SQLEnum, BigInteger
from sqlalchemy.dialects.postgresql import UUID, JSONB
from datetime import datetime
import uuid
import enum
from database import Base

# Enum types matching Supabase
class AppRole(str, enum.Enum):
    admin = "admin"
    analyst = "analyst"
    public = "public"

class PredictionStatus(str, enum.Enum):
    pending = "pending"
    completed = "completed"
    failed = "failed"

class FeedbackType(str, enum.Enum):
    accuracy_concern = "accuracy_concern"
    bias_report = "bias_report"
    data_correction = "data_correction"
    general_feedback = "general_feedback"

class AuditStatus(str, enum.Enum):
    success = "success"
    error = "error"
    warning = "warning"
    info = "info"

class ModelArtifact(Base):
    """Model artifacts storage"""
    __tablename__ = "model_artifacts"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    version = Column(Text, nullable=False)
    model_binary = Column(LargeBinary, nullable=False)
    metadata = Column(JSONB, nullable=False, default={})
    r2_score = Column(Float)
    rmse = Column(Float)
    mae = Column(Float)
    training_time_seconds = Column(Integer)
    is_active = Column(Boolean, default=False)
    created_by = Column(UUID(as_uuid=True))
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)

class Prediction(Base):
    """Crime predictions"""
    __tablename__ = "predictions"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    prediction_id = Column(Text, nullable=False, unique=True)
    community_area = Column(Text, nullable=False)
    date_range_start = Column(DateTime, nullable=False)
    date_range_end = Column(DateTime, nullable=False)
    predicted_crimes = Column(Integer, nullable=False)
    confidence = Column(Float, nullable=False)
    risk_level = Column(Text, nullable=False)
    contributing_factors = Column(JSONB, nullable=False, default=[])
    model_version = Column(Text, nullable=False)
    status = Column(SQLEnum(PredictionStatus), default=PredictionStatus.completed)
    created_by = Column(UUID(as_uuid=True))
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)

class FairnessEvaluation(Base):
    """Fairness evaluation results"""
    __tablename__ = "fairness_evaluations"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    model_version = Column(Text, nullable=False)
    evaluation_date = Column(DateTime, nullable=False, default=datetime.utcnow)
    demographic_parity_diff = Column(Float, nullable=False)
    equalized_odds_ratio = Column(Float, nullable=False)
    f1_variance = Column(Float, nullable=False)
    calibration_error = Column(Float, nullable=False)
    passed_thresholds = Column(Boolean, nullable=False)
    community_metrics = Column(JSONB, nullable=False, default=[])
    created_by = Column(UUID(as_uuid=True))
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)

class AuditLog(Base):
    """Immutable audit logs with hash chain"""
    __tablename__ = "audit_logs"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    sequence_number = Column(BigInteger, nullable=False, autoincrement=True)
    operation_type = Column(Text, nullable=False)
    status = Column(SQLEnum(AuditStatus), nullable=False)
    message = Column(Text, nullable=False)
    details = Column(JSONB, nullable=False, default={})
    user_id = Column(UUID(as_uuid=True))
    current_hash = Column(Text, nullable=False)
    previous_hash = Column(Text)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)

class CommunityFeedback(Base):
    """Community feedback on predictions"""
    __tablename__ = "community_feedback"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    feedback_id = Column(Text, nullable=False, unique=True)
    prediction_id = Column(UUID(as_uuid=True))
    community_area = Column(Text, nullable=False)
    feedback_type = Column(SQLEnum(FeedbackType), nullable=False)
    description = Column(Text, nullable=False)
    reporter_id = Column(UUID(as_uuid=True))
    status = Column(Text, default="pending")
    admin_notes = Column(Text)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    updated_at = Column(DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)
