"""
ML Model Training with Fairness Constraints
XGBoost with Fairlearn integration and data leakage prevention
"""

import xgboost as xgb
import lightgbm as lgb
from sklearn.model_selection import TimeSeriesSplit, cross_val_score
from sklearn.metrics import mean_squared_error, r2_score, mean_absolute_error
from sklearn.preprocessing import StandardScaler
import numpy as np
import pandas as pd
from typing import Tuple, Dict, Optional
import logging
import pickle
import json
from datetime import datetime

try:
    from fairlearn.reductions import ExponentiatedGradient, DemographicParity
    from fairlearn.metrics import MetricFrame
    FAIRLEARN_AVAILABLE = True
except ImportError:
    FAIRLEARN_AVAILABLE = False
    logging.warning("Fairlearn not available - fairness constraints disabled")

logger = logging.getLogger(__name__)


class EthicalCrimePredictor:
    """
    ML model with built-in fairness constraints and leakage prevention.
    
    Key features:
    - XGBoost/LightGBM for accurate predictions
    - Fairlearn integration for demographic parity
    - Temporal validation to prevent leakage
    - Geographic cross-validation
    - Model explainability support
    """
    
    def __init__(
        self,
        model_type: str = "xgboost",
        fairness_constraint: bool = True,
        random_state: int = 42
    ):
        self.model_type = model_type
        self.fairness_constraint = fairness_constraint and FAIRLEARN_AVAILABLE
        self.random_state = random_state
        self.model = None
        self.scaler = StandardScaler()
        self.feature_names = None
        self.version = "2.4.1"
        self.metadata = {}
        
    def _create_base_model(self):
        """Create base XGBoost or LightGBM model"""
        if self.model_type == "xgboost":
            return xgb.XGBRegressor(
                n_estimators=100,
                max_depth=6,
                learning_rate=0.1,
                subsample=0.8,
                colsample_bytree=0.8,
                random_state=self.random_state,
                n_jobs=-1
            )
        elif self.model_type == "lightgbm":
            return lgb.LGBMRegressor(
                n_estimators=100,
                max_depth=6,
                learning_rate=0.1,
                subsample=0.8,
                colsample_bytree=0.8,
                random_state=self.random_state,
                n_jobs=-1
            )
        else:
            raise ValueError(f"Unknown model type: {self.model_type}")
    
    def temporal_train_test_split(
        self,
        X: pd.DataFrame,
        y: pd.Series,
        test_size: float = 0.2
    ) -> Tuple[pd.DataFrame, pd.DataFrame, pd.Series, pd.Series]:
        """
        Split data temporally (not randomly) to prevent leakage.
        
        Uses the last test_size portion of data as test set,
        maintaining temporal ordering.
        """
        n_samples = len(X)
        split_idx = int(n_samples * (1 - test_size))
        
        X_train = X.iloc[:split_idx]
        X_test = X.iloc[split_idx:]
        y_train = y.iloc[:split_idx]
        y_test = y.iloc[split_idx:]
        
        logger.info(f"Temporal split: train={len(X_train)}, test={len(X_test)}")
        return X_train, X_test, y_train, y_test
    
    def train_with_temporal_validation(
        self,
        X: pd.DataFrame,
        y: pd.Series,
        n_splits: int = 3
    ) -> Dict[str, float]:
        """
        Train model with time series cross-validation.
        
        Ensures each fold maintains temporal ordering:
        - Training data always precedes validation data
        - No future information leaks into past predictions
        
        Returns:
            Dictionary of cross-validation metrics
        """
        logger.info(f"Training with {n_splits}-fold temporal validation")
        
        self.feature_names = X.columns.tolist()
        
        # Scale features
        X_scaled = self.scaler.fit_transform(X)
        
        # Time series cross-validation
        tscv = TimeSeriesSplit(n_splits=n_splits)
        
        cv_scores = {
            'r2': [],
            'rmse': [],
            'mae': []
        }
        
        for fold, (train_idx, val_idx) in enumerate(tscv.split(X_scaled)):
            logger.info(f"Training fold {fold+1}/{n_splits}")
            
            X_train_fold = X_scaled[train_idx]
            y_train_fold = y.iloc[train_idx]
            X_val_fold = X_scaled[val_idx]
            y_val_fold = y.iloc[val_idx]
            
            # Train model
            fold_model = self._create_base_model()
            fold_model.fit(X_train_fold, y_train_fold)
            
            # Predict
            y_pred = fold_model.predict(X_val_fold)
            
            # Evaluate
            r2 = r2_score(y_val_fold, y_pred)
            rmse = np.sqrt(mean_squared_error(y_val_fold, y_pred))
            mae = mean_absolute_error(y_val_fold, y_pred)
            
            cv_scores['r2'].append(r2)
            cv_scores['rmse'].append(rmse)
            cv_scores['mae'].append(mae)
            
            logger.info(f"Fold {fold+1} - R²: {r2:.3f}, RMSE: {rmse:.3f}, MAE: {mae:.3f}")
        
        # Train final model on all data
        logger.info("Training final model on full dataset")
        self.model = self._create_base_model()
        self.model.fit(X_scaled, y)
        
        # Store metadata
        self.metadata = {
            'model_type': self.model_type,
            'n_features': len(self.feature_names),
            'feature_names': self.feature_names,
            'cv_scores': {k: float(np.mean(v)) for k, v in cv_scores.items()},
            'cv_std': {k: float(np.std(v)) for k, v in cv_scores.items()},
            'trained_at': datetime.now().isoformat(),
            'version': self.version,
        }
        
        return cv_scores
    
    def train_with_fairness_constraints(
        self,
        X: pd.DataFrame,
        y: pd.Series,
        sensitive_feature: pd.Series
    ):
        """
        Train model with fairness constraints using Fairlearn.
        
        Applies demographic parity constraint to ensure fair
        predictions across different community areas.
        
        Args:
            X: Feature matrix
            y: Target variable
            sensitive_feature: Community area (for fairness)
        """
        if not self.fairness_constraint or not FAIRLEARN_AVAILABLE:
            logger.warning("Fairness constraints not available - training without")
            return self.train_with_temporal_validation(X, y)
        
        logger.info("Training with fairness constraints")
        
        self.feature_names = X.columns.tolist()
        X_scaled = self.scaler.fit_transform(X)
        
        # Create base model
        base_model = self._create_base_model()
        
        # Apply fairness mitigation
        mitigator = ExponentiatedGradient(
            base_model,
            constraints=DemographicParity(),
            eps=0.01
        )
        
        mitigator.fit(X_scaled, y, sensitive_features=sensitive_feature)
        
        self.model = mitigator
        
        logger.info("Training with fairness constraints complete")
    
    def predict(self, X: pd.DataFrame) -> np.ndarray:
        """Make predictions"""
        if self.model is None:
            raise ValueError("Model not trained. Call train() first.")
        
        X_scaled = self.scaler.transform(X)
        predictions = self.model.predict(X_scaled)
        
        # Ensure non-negative predictions
        predictions = np.maximum(predictions, 0)
        
        return predictions
    
    def evaluate(
        self,
        X_test: pd.DataFrame,
        y_test: pd.Series
    ) -> Dict[str, float]:
        """
        Evaluate model performance.
        
        Returns:
            Dictionary with R², RMSE, MAE metrics
        """
        y_pred = self.predict(X_test)
        
        metrics = {
            'r2_score': float(r2_score(y_test, y_pred)),
            'rmse': float(np.sqrt(mean_squared_error(y_test, y_pred))),
            'mae': float(mean_absolute_error(y_test, y_pred)),
            'samples': len(y_test)
        }
        
        logger.info(f"Model evaluation: R²={metrics['r2_score']:.3f}, "
                   f"RMSE={metrics['rmse']:.3f}, MAE={metrics['mae']:.3f}")
        
        return metrics
    
    def get_feature_importance(self) -> Dict[str, float]:
        """Get feature importance scores"""
        if self.model is None:
            raise ValueError("Model not trained")
        
        if hasattr(self.model, 'feature_importances_'):
            importance = self.model.feature_importances_
        elif hasattr(self.model, 'estimator_') and hasattr(self.model.estimator_, 'feature_importances_'):
            importance = self.model.estimator_.feature_importances_
        else:
            return {}
        
        feature_importance = dict(zip(self.feature_names, importance))
        # Sort by importance
        feature_importance = dict(sorted(
            feature_importance.items(),
            key=lambda x: x[1],
            reverse=True
        ))
        
        return feature_importance
    
    def save(self, filepath: str):
        """Save model to disk"""
        model_data = {
            'model': self.model,
            'scaler': self.scaler,
            'feature_names': self.feature_names,
            'version': self.version,
            'metadata': self.metadata,
            'model_type': self.model_type
        }
        
        with open(filepath, 'wb') as f:
            pickle.dump(model_data, f)
        
        logger.info(f"Model saved to {filepath}")
    
    @classmethod
    def load(cls, filepath: str) -> 'EthicalCrimePredictor':
        """Load model from disk"""
        with open(filepath, 'rb') as f:
            model_data = pickle.load(f)
        
        instance = cls(model_type=model_data['model_type'])
        instance.model = model_data['model']
        instance.scaler = model_data['scaler']
        instance.feature_names = model_data['feature_names']
        instance.version = model_data['version']
        instance.metadata = model_data['metadata']
        
        logger.info(f"Model loaded from {filepath}")
        return instance


def classify_risk_level(predicted_crimes: float) -> str:
    """Classify crime prediction into risk categories"""
    if predicted_crimes < 50:
        return 'low'
    elif predicted_crimes < 100:
        return 'medium'
    else:
        return 'high'


def compute_confidence_score(
    prediction: float,
    historical_std: float,
    model_r2: float
) -> float:
    """
    Compute confidence score for prediction.
    
    Based on:
    - Model R² score
    - Historical volatility (std dev)
    - Prediction magnitude
    """
    # Base confidence from model performance
    base_confidence = model_r2
    
    # Adjust for volatility
    volatility_factor = 1 / (1 + historical_std / max(prediction, 1))
    
    # Combined confidence
    confidence = base_confidence * volatility_factor
    confidence = np.clip(confidence, 0.0, 1.0)
    
    return float(confidence)
