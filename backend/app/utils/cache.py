"""Simple in-memory TTL cache decorator."""
import time
import hashlib
import functools
from typing import Any, Callable
import logging

logger = logging.getLogger(__name__)

# Global cache store
_cache: dict[str, tuple[Any, float]] = {}


def ttl_cache(ttl_seconds: int = 3600):
    """
    Decorator for TTL-based caching.
    
    Args:
        ttl_seconds: Time to live in seconds
    
    Returns:
        Decorated function with caching
    """
    def decorator(func: Callable) -> Callable:
        @functools.wraps(func)
        def wrapper(*args, **kwargs):
            # Create cache key from function name and arguments
            key_parts = [func.__name__]
            key_parts.extend(str(arg) for arg in args)
            key_parts.extend(f"{k}={v}" for k, v in sorted(kwargs.items()))
            cache_key = hashlib.md5("|".join(key_parts).encode()).hexdigest()
            
            # Check cache
            if cache_key in _cache:
                result, timestamp = _cache[cache_key]
                if time.time() - timestamp < ttl_seconds:
                    logger.debug(f"Cache hit for {func.__name__}")
                    return result
                else:
                    # Expired
                    del _cache[cache_key]
            
            # Compute and cache
            result = func(*args, **kwargs)
            _cache[cache_key] = (result, time.time())
            logger.debug(f"Cached result for {func.__name__}")
            return result
        
        return wrapper
    return decorator


def clear_cache():
    """Clear all cached entries."""
    global _cache
    _cache.clear()
    logger.info("Cache cleared")

