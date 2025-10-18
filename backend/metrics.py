"""
Prometheus metrics collection
"""

from prometheus_client import Counter, Histogram, Gauge, generate_latest, REGISTRY
from fastapi import APIRouter
from fastapi.responses import Response
import time

# Define metrics
request_count = Counter(
    'api_requests_total',
    'Total API requests',
    ['method', 'endpoint', 'status_code']
)

request_latency = Histogram(
    'api_request_latency_seconds',
    'API request latency',
    ['endpoint'],
    buckets=[0.01, 0.05, 0.1, 0.5, 1.0, 2.0, 5.0, 10.0]
)

model_predictions_total = Counter(
    'model_predictions_total',
    'Total number of predictions made'
)

model_prediction_latency = Histogram(
    'model_prediction_latency_seconds',
    'Model prediction latency',
    buckets=[0.01, 0.05, 0.1, 0.5, 1.0, 2.0]
)

fairness_drift = Gauge(
    'fairness_drift_score',
    'Current fairness drift score'
)

active_model_version = Gauge(
    'active_model_version',
    'Active model version (numeric representation)'
)

database_connections = Gauge(
    'database_connections_active',
    'Active database connections'
)

cache_hit_rate = Gauge(
    'cache_hit_rate',
    'Redis cache hit rate'
)

# Metrics registry class
class MetricsRegistry:
    """Centralized metrics tracking"""
    
    def __init__(self):
        self.start_time = time.time()
    
    def increment_request(self, method: str, endpoint: str, status_code: int):
        """Increment request counter"""
        request_count.labels(
            method=method,
            endpoint=endpoint,
            status_code=status_code
        ).inc()
    
    def observe_latency(self, endpoint: str, latency: float):
        """Record request latency"""
        request_latency.labels(endpoint=endpoint).observe(latency)
    
    def increment_prediction(self):
        """Increment prediction counter"""
        model_predictions_total.inc()
    
    def observe_prediction_latency(self, latency: float):
        """Record prediction latency"""
        model_prediction_latency.observe(latency)
    
    def update_fairness_drift(self, drift_score: float):
        """Update fairness drift gauge"""
        fairness_drift.set(drift_score)
    
    def set_model_version(self, version: str):
        """Set active model version"""
        # Convert version string to numeric (e.g., "2.4.1" -> 241)
        version_numeric = int(version.replace('.', ''))
        active_model_version.set(version_numeric)
    
    def get_uptime(self) -> float:
        """Get application uptime in seconds"""
        return time.time() - self.start_time

# Global metrics registry
metrics_registry = MetricsRegistry()

# Prometheus endpoint router
metrics_router = APIRouter()

@metrics_router.get("/metrics/prometheus")
async def prometheus_metrics():
    """
    Expose Prometheus metrics endpoint.
    
    Returns metrics in Prometheus text format.
    """
    return Response(
        content=generate_latest(REGISTRY),
        media_type="text/plain"
    )
