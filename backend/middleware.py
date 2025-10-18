"""
Middleware for logging, metrics, and request tracking
"""

import time
import logging
import json
from fastapi import Request
from starlette.middleware.base import BaseHTTPMiddleware
from datetime import datetime
from typing import Callable

logger = logging.getLogger(__name__)

class StructuredLoggingMiddleware(BaseHTTPMiddleware):
    """
    Structured JSON logging for all API requests.
    Logs: method, path, status_code, latency, user_agent
    """
    
    async def dispatch(self, request: Request, call_next: Callable):
        start_time = time.time()
        
        # Process request
        response = await call_next(request)
        
        # Calculate latency
        latency_ms = (time.time() - start_time) * 1000
        
        # Structured log
        log_data = {
            "timestamp": datetime.utcnow().isoformat(),
            "method": request.method,
            "path": request.url.path,
            "status_code": response.status_code,
            "latency_ms": round(latency_ms, 2),
            "user_agent": request.headers.get("user-agent", "unknown"),
            "client_ip": request.client.host if request.client else "unknown"
        }
        
        # Log as JSON
        if response.status_code >= 500:
            logger.error(json.dumps(log_data))
        elif response.status_code >= 400:
            logger.warning(json.dumps(log_data))
        else:
            logger.info(json.dumps(log_data))
        
        # Add custom headers
        response.headers["X-Process-Time"] = str(latency_ms)
        
        return response

class RequestMetricsMiddleware(BaseHTTPMiddleware):
    """
    Middleware to track request metrics for Prometheus.
    Tracks: request count, latency histogram
    """
    
    def __init__(self, app, registry=None):
        super().__init__(app)
        self.registry = registry
    
    async def dispatch(self, request: Request, call_next: Callable):
        start_time = time.time()
        
        # Process request
        response = await call_next(request)
        
        # Calculate latency
        latency = time.time() - start_time
        
        # Track metrics (will be implemented by Prometheus metrics)
        if self.registry:
            # Increment request counter
            self.registry.increment_request(
                method=request.method,
                endpoint=request.url.path,
                status_code=response.status_code
            )
            
            # Record latency
            self.registry.observe_latency(
                endpoint=request.url.path,
                latency=latency
            )
        
        return response
