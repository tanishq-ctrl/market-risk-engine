"""Price data preprocessing and cleaning."""
import pandas as pd
import numpy as np
from pathlib import Path
from typing import Tuple, List
import logging

from app.core.config import settings
from app.models.schemas import MissingReportItem

logger = logging.getLogger(__name__)


def _get_processed_cache_path(symbols: List[str], start: str, end: str) -> Path:
    """Generate processed cache file path."""
    symbols_str = "_".join(sorted(symbols))
    cache_key = f"{symbols_str}_{start}_{end}".replace("-", "_")
    cache_key = "".join(c for c in cache_key if c.isalnum() or c in "._-")
    return Path(settings.PROCESSED_DIR) / f"{cache_key}.parquet"


def clean_prices(
    price_df: pd.DataFrame,
    missing_report: List[MissingReportItem]
) -> Tuple[pd.DataFrame, List[str], List[MissingReportItem]]:
    """
    Clean and preprocess price data.
    
    Args:
        price_df: Raw price DataFrame
        missing_report: Initial missing data report
    
    Returns:
        Tuple of:
        - cleaned_df: Cleaned prices
        - failed_symbols: Symbols removed due to insufficient data
        - updated_missing_report: Updated missing report
    """
    if price_df.empty:
        return price_df, [], []
    
    logger.info(f"Cleaning prices for {len(price_df.columns)} symbols")
    
    # Ensure datetime index and sorted
    price_df.index = pd.to_datetime(price_df.index).normalize()
    price_df = price_df.sort_index()
    
    cleaned_df = price_df.copy()
    failed_symbols: List[str] = []
    updated_missing_report: List[MissingReportItem] = []
    
    # Process each symbol
    for symbol in price_df.columns:
        series = cleaned_df[symbol]
        
        # Forward fill up to MAX_FFILL_GAP consecutive missing days
        # Count consecutive NaNs and only fill if gap <= MAX_FFILL_GAP
        filled_series = series.copy()
        nan_mask = filled_series.isna()
        
        # Find consecutive NaN groups
        if nan_mask.any():
            # Create groups of consecutive NaNs
            groups = (nan_mask != nan_mask.shift()).cumsum()
            for group_id in groups.unique():
                group_mask = groups == group_id
                if nan_mask[group_mask].any():
                    gap_size = group_mask.sum()
                    if gap_size <= settings.MAX_FFILL_GAP:
                        # Fill this gap
                        start_idx = group_mask.idxmax() if group_mask.any() else None
                        if start_idx:
                            # Forward fill from previous valid value
                            filled_series.loc[group_mask] = filled_series.loc[group_mask].ffill()
        
        cleaned_df[symbol] = filled_series
        
        # Compute updated missing stats
        total = len(filled_series)
        missing = filled_series.isna().sum()
        missing_pct = missing / total if total > 0 else 1.0
        
        # Longest gap after filling
        longest_gap = 0
        current_gap = 0
        for is_na in filled_series.isna():
            if is_na:
                current_gap += 1
                longest_gap = max(longest_gap, current_gap)
            else:
                current_gap = 0
        
        # Check if symbol has enough observations
        valid_obs = (total - missing)
        if valid_obs < settings.MIN_OBS:
            failed_symbols.append(symbol)
            logger.warning(
                f"Removing {symbol}: only {valid_obs} valid observations "
                f"(minimum: {settings.MIN_OBS})"
            )
        else:
            updated_missing_report.append(MissingReportItem(
                symbol=symbol,
                missing_pct=missing_pct,
                longest_gap=longest_gap
            ))
    
    # Remove failed symbols
    if failed_symbols:
        cleaned_df = cleaned_df.drop(columns=failed_symbols)
        logger.info(f"Removed {len(failed_symbols)} symbols with insufficient data")
    
    # Drop rows where all symbols are NaN
    before_drop = len(cleaned_df)
    cleaned_df = cleaned_df.dropna(how='all')
    after_drop = len(cleaned_df)
    if before_drop != after_drop:
        logger.info(f"Dropped {before_drop - after_drop} rows with all NaN")
    
    # Cache processed data
    if not cleaned_df.empty:
        try:
            start_str = cleaned_df.index.min().strftime("%Y-%m-%d")
            end_str = cleaned_df.index.max().strftime("%Y-%m-%d")
            cache_path = _get_processed_cache_path(list(cleaned_df.columns), start_str, end_str)
            cleaned_df.to_parquet(cache_path)
            logger.debug(f"Cached processed data to {cache_path}")
        except Exception as e:
            logger.warning(f"Failed to cache processed data: {e}")
    
    logger.info(f"Cleaned data: {len(cleaned_df)} rows, {len(cleaned_df.columns)} symbols")
    
    return cleaned_df, failed_symbols, updated_missing_report

