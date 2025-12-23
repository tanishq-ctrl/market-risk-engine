"""Data fetching service using yfinance."""
import yfinance as yf
import pandas as pd
import numpy as np
from pathlib import Path
from typing import Tuple, List, Dict
import logging
from datetime import datetime

from app.core.config import settings
from app.models.schemas import MissingReportItem

logger = logging.getLogger(__name__)


def _get_cache_path(symbol: str, start: str, end: str) -> Path:
    """Generate deterministic cache file path."""
    cache_key = f"{symbol}_{start}_{end}".replace("-", "_")
    # Sanitize for filesystem
    cache_key = "".join(c for c in cache_key if c.isalnum() or c in "._-")
    return Path(settings.RAW_DIR) / f"{cache_key}.parquet"


def _extract_price_column(df: pd.DataFrame, symbol: str) -> pd.Series:
    """
    Extract price column with fallback: Adj Close -> Close.
    
    Returns:
        Series with prices, or None if no valid column found
    """
    if df.empty:
        return None
    
    # Try Adj Close first
    if "Adj Close" in df.columns:
        prices = df["Adj Close"]
        if not prices.isna().all():
            return prices
    
    # Fallback to Close
    if "Close" in df.columns:
        prices = df["Close"]
        if not prices.isna().all():
            return prices
    
    return None


def fetch_prices(
    symbols: List[str],
    start: str,
    end: str
) -> Tuple[pd.DataFrame, List[str], List[MissingReportItem]]:
    """
    Fetch prices for symbols from Yahoo Finance.
    
    Args:
        symbols: List of symbols to fetch
        start: Start date (YYYY-MM-DD)
        end: End date (YYYY-MM-DD)
    
    Returns:
        Tuple of:
        - prices_df: DataFrame with columns=symbols, index=date
        - failed_symbols: List of symbols that failed
        - missing_report: List of missing data reports
    """
    if not symbols:
        return pd.DataFrame(), [], []
    
    # Normalize symbols
    symbols = [s.strip().upper() for s in symbols if s.strip()]
    
    logger.info(f"Fetching prices for {len(symbols)} symbols from {start} to {end}")
    
    prices_dict: Dict[str, pd.Series] = {}
    failed_symbols: List[str] = []
    missing_report: List[MissingReportItem] = []
    
    # Try bulk download first
    try:
        logger.debug("Attempting bulk download")
        bulk_df = yf.download(
            symbols,
            start=start,
            end=end,
            group_by="column",
            auto_adjust=False,
            progress=False
        )
        
        if bulk_df.empty:
            raise ValueError("Bulk download returned empty")
        
        # Handle multi-level columns
        if isinstance(bulk_df.columns, pd.MultiIndex):
            for symbol in symbols:
                if symbol in bulk_df.columns.levels[1]:
                    symbol_df = bulk_df.xs(symbol, level=1, axis=1)
                    prices = _extract_price_column(symbol_df, symbol)
                    if prices is not None:
                        prices_dict[symbol] = prices
                    else:
                        failed_symbols.append(symbol)
                else:
                    failed_symbols.append(symbol)
        else:
            # Single symbol case
            if len(symbols) == 1:
                prices = _extract_price_column(bulk_df, symbols[0])
                if prices is not None:
                    prices_dict[symbols[0]] = prices
                else:
                    failed_symbols.extend(symbols)
            else:
                # Try to extract per symbol
                for symbol in symbols:
                    if symbol in bulk_df.columns:
                        prices = bulk_df[symbol]
                        if not prices.isna().all():
                            prices_dict[symbol] = prices
                        else:
                            failed_symbols.append(symbol)
                    else:
                        failed_symbols.append(symbol)
    
    except Exception as e:
        logger.warning(f"Bulk download failed: {e}, falling back to per-symbol download")
        # Fallback to per-symbol
        for symbol in symbols:
            try:
                symbol_df = yf.download(
                    symbol,
                    start=start,
                    end=end,
                    auto_adjust=False,
                    progress=False
                )
                
                prices = _extract_price_column(symbol_df, symbol)
                if prices is not None:
                    prices_dict[symbol] = prices
                else:
                    failed_symbols.append(symbol)
                    logger.warning(f"No valid price data for {symbol}")
            except Exception as e:
                failed_symbols.append(symbol)
                logger.warning(f"Failed to fetch {symbol}: {e}")
    
    # Build wide DataFrame
    if not prices_dict:
        logger.warning("No prices fetched successfully")
        return pd.DataFrame(), symbols, []
    
    # Outer join all series
    prices_df = pd.DataFrame(prices_dict)
    prices_df.index = pd.to_datetime(prices_df.index).normalize()
    prices_df = prices_df.sort_index()
    
    # Compute missing reports
    for symbol in prices_df.columns:
        series = prices_df[symbol]
        total = len(series)
        missing = series.isna().sum()
        missing_pct = missing / total if total > 0 else 1.0
        
        # Find longest consecutive gap
        longest_gap = 0
        current_gap = 0
        for is_na in series.isna():
            if is_na:
                current_gap += 1
                longest_gap = max(longest_gap, current_gap)
            else:
                current_gap = 0
        
        missing_report.append(MissingReportItem(
            symbol=symbol,
            missing_pct=missing_pct,
            longest_gap=longest_gap
        ))
    
    # Cache to parquet (per symbol)
    for symbol in prices_df.columns:
        try:
            cache_path = _get_cache_path(symbol, start, end)
            symbol_series = prices_df[symbol].to_frame()
            symbol_series.to_parquet(cache_path)
            logger.debug(f"Cached {symbol} to {cache_path}")
        except Exception as e:
            logger.warning(f"Failed to cache {symbol}: {e}")
    
    logger.info(f"Successfully fetched {len(prices_df.columns)} symbols, {len(failed_symbols)} failed")
    
    return prices_df, failed_symbols, missing_report

