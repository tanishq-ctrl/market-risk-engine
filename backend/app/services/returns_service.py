"""Returns calculation service."""
import pandas as pd
import numpy as np
import logging
from typing import Dict, Literal

logger = logging.getLogger(__name__)


def compute_returns(
    prices_df: pd.DataFrame,
    return_type: Literal["simple", "log"] = "simple",
) -> pd.DataFrame:
    """
    Compute 1-period returns (simple or log).

    Args:
        prices_df: DataFrame with prices (columns=symbols, index=date)
        return_type: "simple" for pct_change, "log" for log returns

    Returns:
        DataFrame with returns
    """
    if prices_df.empty:
        return pd.DataFrame()

    if return_type == "log":
        returns = np.log(prices_df / prices_df.shift(1))
    else:
        returns = prices_df.pct_change()

    returns = returns.dropna()
    logger.debug(f"Computed {return_type} returns: {len(returns)} observations")
    return returns


def log_returns(prices_df: pd.DataFrame) -> pd.DataFrame:
    """Backward-compatible helper for log returns."""
    return compute_returns(prices_df, "log")


def portfolio_returns(
    returns_df: pd.DataFrame,
    weights_by_symbol: Dict[str, float]
) -> pd.Series:
    """
    Compute portfolio returns as weighted sum.
    
    Args:
        returns_df: DataFrame with asset returns (columns=symbols, index=date)
        weights_by_symbol: Dictionary mapping symbol to weight
    
    Returns:
        Series of portfolio returns
    """
    if returns_df.empty:
        return pd.Series(dtype=float)
    
    # Align weights with returns columns
    symbols = returns_df.columns.tolist()
    weight_vector = np.array([weights_by_symbol.get(s, 0.0) for s in symbols])
    
    # Portfolio return = dot product
    portfolio_ret = returns_df.dot(weight_vector)
    
    # Warn if many NaNs
    nan_count = portfolio_ret.isna().sum()
    if nan_count > 0:
        nan_pct = nan_count / len(portfolio_ret) * 100
        logger.warning(f"Portfolio returns contain {nan_count} NaNs ({nan_pct:.1f}%)")
    
    logger.debug(f"Computed portfolio returns: {len(portfolio_ret)} observations")
    
    return portfolio_ret

