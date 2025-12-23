"""Logging configuration with request ID middleware."""
import logging
import uuid
from fastapi import Request
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import Response

# Configure root logger with safe format (request_id added dynamically)
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - [%(request_id)s] - %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S"
)

# Set up default request_id factory to avoid KeyError
old_factory = logging.getLogRecordFactory()

def default_record_factory(*args, **kwargs):
    record = old_factory(*args, **kwargs)
    if not hasattr(record, 'request_id'):
        record.request_id = "system"
    return record

logging.setLogRecordFactory(default_record_factory)

logger = logging.getLogger(__name__)


class RequestIDMiddleware(BaseHTTPMiddleware):
    """Middleware to add request ID to each request."""
    
    async def dispatch(self, request: Request, call_next):
        request_id = str(uuid.uuid4())[:8]
        request.state.request_id = request_id
        
        # Add request ID to logger context
        old_factory = logging.getLogRecordFactory()
        
        def record_factory(*args, **kwargs):
            record = old_factory(*args, **kwargs)
            record.request_id = getattr(request.state, "request_id", "unknown")
            return record
        
        logging.setLogRecordFactory(record_factory)
        
        try:
            response = await call_next(request)
            response.headers["X-Request-ID"] = request_id
            return response
        finally:
            # Restore original factory
            logging.setLogRecordFactory(old_factory)

