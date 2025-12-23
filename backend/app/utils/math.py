"""Mathematical utilities for risk calculations."""
import numpy as np
import pandas as pd
from typing import Optional
import logging

logger = logging.getLogger(__name__)


def safe_quantile(data: pd.Series, q: float) -> float:
    """
    Compute quantile with error handling.
    
    Args:
        data: Series of values
        q: Quantile level (0-1)
    
    Returns:
        Quantile value
    """
    if len(data) == 0:
        raise ValueError("Cannot compute quantile on empty data")
    
    if q < 0 or q > 1:
        raise ValueError(f"Quantile q must be in [0, 1], got {q}")
    
    return float(data.quantile(q))


def drawdown_duration(drawdown_series: pd.Series) -> int:
    """
    Compute maximum consecutive drawdown duration in days.
    
    Args:
        drawdown_series: Series of drawdown values (negative or zero)
    
    Returns:
        Maximum consecutive days with drawdown > 0
    """
    if len(drawdown_series) == 0:
        return 0
    
    # Convert to boolean: True if in drawdown (dd > 0)
    in_drawdown = drawdown_series > 0
    
    if not in_drawdown.any():
        return 0
    
    # Find consecutive True sequences
    max_duration = 0
    current_duration = 0
    
    for val in in_drawdown:
        if val:
            current_duration += 1
            max_duration = max(max_duration, current_duration)
        else:
            current_duration = 0
    
    return max_duration

