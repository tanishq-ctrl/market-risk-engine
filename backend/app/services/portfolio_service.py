"""Portfolio weight normalization and management."""
import logging
from typing import List, Tuple
from collections import defaultdict

from app.models.schemas import PortfolioRow

logger = logging.getLogger(__name__)


def normalize_portfolio_rows(
    rows: List[PortfolioRow]
) -> Tuple[List[PortfolioRow], bool, float]:
    """
    Normalize portfolio weights.
    
    Args:
        rows: List of portfolio rows
    
    Returns:
        Tuple of:
        - normalized_rows: Portfolio rows (aggregated and normalized)
        - was_normalized: Whether normalization occurred
        - sum_before: Sum of weights before normalization
    """
    if not rows:
        raise ValueError("Portfolio cannot be empty")
    
    # Aggregate duplicates by symbol
    symbol_weights: dict[str, float] = defaultdict(float)
    symbol_metadata: dict[str, dict] = {}
    
    for row in rows:
        symbol = row.symbol.upper().strip()
        symbol_weights[symbol] += row.weight
        
        # Keep metadata from first occurrence
        if symbol not in symbol_metadata:
            symbol_metadata[symbol] = {
                "asset_type": row.asset_type,
                "display_name": row.display_name,
                "price_field": row.price_field
            }
    
    # Check for all-zero weights
    if all(abs(w) < 1e-10 for w in symbol_weights.values()):
        raise ValueError("All portfolio weights are zero")
    
    # Check for shorts
    has_shorts = any(w < 0 for w in symbol_weights.values())
    if has_shorts:
        logger.info("Portfolio contains short positions (negative weights)")
    
    # Compute sum before normalization
    sum_before = sum(symbol_weights.values())
    was_normalized = False
    
    # Normalize if needed (tolerance 1e-6)
    tolerance = 1e-6
    if abs(sum_before - 1.0) > tolerance:
        was_normalized = True
        logger.info(f"Normalizing portfolio weights: sum was {sum_before:.6f}")
        for symbol in symbol_weights:
            symbol_weights[symbol] /= sum_before
    
    # Build normalized rows
    normalized_rows = [
        PortfolioRow(
            symbol=symbol,
            weight=weight,
            asset_type=symbol_metadata[symbol].get("asset_type"),
            display_name=symbol_metadata[symbol].get("display_name"),
            price_field=symbol_metadata[symbol].get("price_field")
        )
        for symbol, weight in symbol_weights.items()
    ]
    
    return normalized_rows, was_normalized, sum_before


def filter_failed_symbols(
    portfolio: List[PortfolioRow],
    failed_symbols: List[str]
) -> Tuple[List[PortfolioRow], List[str]]:
    """
    Remove failed symbols from portfolio and renormalize.
    
    Args:
        portfolio: Portfolio rows
        failed_symbols: List of failed symbols
    
    Returns:
        Tuple of:
        - filtered_portfolio: Portfolio with failed symbols removed
        - warnings: List of warning messages
    """
    if not failed_symbols:
        return portfolio, []
    
    failed_set = {s.upper().strip() for s in failed_symbols}
    filtered = [row for row in portfolio if row.symbol.upper().strip() not in failed_set]
    
    if len(filtered) == 0:
        raise ValueError("All portfolio symbols failed")
    
    if len(filtered) < len(portfolio):
        warnings = [f"Removed {len(portfolio) - len(filtered)} failed symbols from portfolio"]
        # Renormalize
        filtered, _, _ = normalize_portfolio_rows(filtered)
        warnings.append("Renormalized portfolio weights after removing failed symbols")
    else:
        warnings = []
    
    return filtered, warnings

