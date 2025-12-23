"""Date validation utilities."""
from datetime import datetime
from typing import Tuple
import logging

logger = logging.getLogger(__name__)


def validate_dates(start: str, end: str) -> Tuple[datetime, datetime]:
    """
    Validate and parse ISO date strings.
    
    Args:
        start: Start date in ISO format (YYYY-MM-DD)
        end: End date in ISO format (YYYY-MM-DD)
    
    Returns:
        Tuple of (start_date, end_date) as datetime objects
    
    Raises:
        ValueError: If dates are invalid or start >= end
    """
    try:
        start_date = datetime.fromisoformat(start)
        end_date = datetime.fromisoformat(end)
    except ValueError as e:
        raise ValueError(f"Invalid date format. Use YYYY-MM-DD: {e}")
    
    if start_date >= end_date:
        raise ValueError(f"Start date ({start}) must be before end date ({end})")
    
    return start_date, end_date

