"""
Redis caching utilities
"""

import redis
import json
import os
import logging
from typing import Optional, Any
from functools import wraps

logger = logging.getLogger(__name__)

# Redis connection with auto-fallback
REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379/0")

def connect_redis():
    """Try to connect to Redis, gracefully fallback if unavailable"""
    try:
        client = redis.from_url(REDIS_URL, decode_responses=True, socket_connect_timeout=2)
        client.ping()
        logger.info("✅ Redis cache connected")
        return client
    except Exception as e:
        logger.info(f"ℹ️  Redis unavailable - caching disabled (this is OK for development)")
        return None

redis_client = connect_redis()

def cache_response(ttl: int = 300):
    """
    Decorator to cache endpoint responses in Redis.
    
    Args:
        ttl: Time-to-live in seconds (default: 5 minutes)
    
    Usage:
        @cache_response(ttl=300)
        async def get_fairness_metrics():
            ...
    """
    def decorator(func):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            if not redis_client:
                # Cache disabled, call function directly
                return await func(*args, **kwargs)
            
            # Generate cache key
            cache_key = f"{func.__name__}:{json.dumps(kwargs, sort_keys=True)}"
            
            # Try to get from cache
            try:
                cached_data = redis_client.get(cache_key)
                if cached_data:
                    logger.debug(f"Cache HIT: {cache_key}")
                    return json.loads(cached_data)
            except Exception as e:
                logger.error(f"Cache read error: {e}")
            
            # Cache miss - call function
            logger.debug(f"Cache MISS: {cache_key}")
            result = await func(*args, **kwargs)
            
            # Store in cache
            try:
                redis_client.setex(
                    cache_key,
                    ttl,
                    json.dumps(result, default=str)
                )
            except Exception as e:
                logger.error(f"Cache write error: {e}")
            
            return result
        
        return wrapper
    return decorator

def invalidate_cache(pattern: str):
    """
    Invalidate cache entries matching pattern.
    
    Args:
        pattern: Redis key pattern (e.g., "get_fairness_metrics:*")
    """
    if not redis_client:
        return
    
    try:
        keys = redis_client.keys(pattern)
        if keys:
            redis_client.delete(*keys)
            logger.info(f"Invalidated {len(keys)} cache entries matching '{pattern}'")
    except Exception as e:
        logger.error(f"Cache invalidation error: {e}")

def get_cache_stats() -> dict:
    """Get Redis cache statistics"""
    if not redis_client:
        return {"status": "disabled"}
    
    try:
        info = redis_client.info()
        return {
            "status": "connected",
            "used_memory": info.get("used_memory_human"),
            "connected_clients": info.get("connected_clients"),
            "total_commands": info.get("total_commands_processed"),
            "keyspace_hits": info.get("keyspace_hits", 0),
            "keyspace_misses": info.get("keyspace_misses", 0),
            "hit_rate": round(
                info.get("keyspace_hits", 0) / 
                max(info.get("keyspace_hits", 0) + info.get("keyspace_misses", 0), 1) * 100,
                2
            )
        }
    except Exception as e:
        logger.error(f"Failed to get cache stats: {e}")
        return {"status": "error", "error": str(e)}
