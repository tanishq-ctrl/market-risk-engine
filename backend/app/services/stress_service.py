"""Stress testing service."""
import logging
from typing import Dict, List, Optional

from app.models.schemas import PortfolioRow

logger = logging.getLogger(__name__)


# Toggle for strict custom shock validation
STRICT_CUSTOM_SHOCKS = True

# Historical crisis scenarios (simplified shock approximations)
# Keys match frontend constants.ts
# Supports two formats:
#   1. Float (uniform shock): applied to all assets as return shock
#   2. Dict (multi-asset): different shocks by asset type or symbol
# Backward compatibility: float values preserved as-is
HISTORICAL_SCENARIOS = {
    "COVID_CRASH": {
        "equity_shock": -0.34,
        "credit_shock": -0.25,
        "bond_rate_bps": -75,  # rates fell (bond prices up)
        "commodity_shock": 0.05,
        "description": "S&P 500 -34% in March 2020, rates down, credit stressed"
    },
    "FINANCIAL_CRISIS": {
        "equity_shock": -0.50,
        "credit_shock": -0.40,
        "bond_rate_bps": -150,  # flight to quality
        "description": "2008 Financial Crisis, S&P -57%, credit collapse"
    },
    "DOTCOM_BUBBLE": {
        "equity_shock": -0.30,
        "growth_shock": -0.60,
        "bond_rate_bps": -50,
        "description": "Tech bubble burst 2000-2002, Nasdaq -78%"
    },
    "BLACK_MONDAY": {
        "equity_shock": -0.226,
        "description": "Black Monday 1987, Dow -22.6%"
    },
    "TAPER_TANTRUM": {
        "equity_shock": -0.06,
        "bond_rate_bps": 50,  # rates up (bond prices down)
        "description": "2013 Taper Tantrum, rates spike"
    },
    "EUROPEAN_DEBT": {
        "equity_shock": -0.19,
        "credit_shock": -0.15,
        "bond_rate_bps": 25,
        "description": "European Debt Crisis 2011"
    },
    "FLASH_CRASH": {
        "equity_shock": -0.09,
        "description": "Flash Crash 2010, intraday -9%"
    },
}

# Multi-factor scenarios with asset-type specific shocks
# The shock applied depends on the asset type (stock, bond, etc.)
MULTI_FACTOR_SCENARIOS = {
    "STAGFLATION": {
        "equity_shock": -0.15,      # Stocks down 15%
        "bond_shock": -0.10,        # Bonds down 10% (rates up)
        "commodity_shock": 0.20,    # Commodities up 20%
        "description": "High inflation + slow growth"
    },
    "RATE_SHOCK": {
        "equity_shock": -0.12,      # Stocks down 12%
        "bond_shock": -0.08,        # Bonds down 8%
        "growth_shock": -0.20,      # Growth stocks hit harder
        "description": "Hawkish Fed, unexpected rate hike"
    },
    "LIQUIDITY_CRISIS": {
        "equity_shock": -0.25,      # Stocks down 25%
        "bond_shock": -0.05,        # Bonds slightly down
        "credit_shock": -0.35,      # Credit hit hard
        "description": "Market liquidity freeze"
    },
    "CORRELATION_BREAKDOWN": {
        "equity_shock": -0.20,      # Stocks down 20%
        "bond_shock": -0.15,        # Bonds also down (no diversification)
        "description": "All correlations spike to 1"
    },
}

# Asset type mapping for multi-factor scenarios
# Maps common symbols to asset categories
ASSET_TYPE_MAPPING = {
    # Bonds / Fixed Income
    "TLT": "bond",     # 20+ Year Treasury
    "IEF": "bond",     # 7-10 Year Treasury
    "SHY": "bond",     # 1-3 Year Treasury
    "AGG": "bond",     # Aggregate Bond
    "BND": "bond",     # Total Bond Market
    "LQD": "credit",   # Investment Grade Corporate
    "HYG": "credit",   # High Yield Corporate
    "JNK": "credit",   # High Yield
    
    # Commodities
    "GLD": "commodity",  # Gold
    "IAU": "commodity",  # Gold
    "SLV": "commodity",  # Silver
    "DBC": "commodity",  # Commodities
    "USO": "commodity",  # Oil
    "UNG": "commodity",  # Natural Gas
    
    # Growth Stocks / Tech
    "QQQ": "growth",     # Nasdaq 100
    "ARKK": "growth",    # Innovation ETF
    "TQQQ": "growth",    # 3x Nasdaq
    
    # Default to equity for everything else (stocks, equity ETFs, indices)
}


def _get_asset_type(symbol: str, asset_type_from_row: Optional[str] = None) -> str:
    """
    Determine the asset type for a given symbol.
    
    Args:
        symbol: The ticker symbol
        asset_type_from_row: Optional asset type from portfolio row
    
    Returns:
        Asset type: equity, bond, credit, commodity, growth
    """
    # First check if portfolio row specifies type
    if asset_type_from_row:
        type_lower = asset_type_from_row.lower()
        if type_lower in ["bond", "fixed_income", "treasury"]:
            return "bond"
        elif type_lower == "commodity":
            return "commodity"
        elif type_lower == "credit":
            return "credit"
        elif type_lower == "growth":
            return "growth"
    
    # Check our mapping
    if symbol in ASSET_TYPE_MAPPING:
        return ASSET_TYPE_MAPPING[symbol]
    
    # Default to equity (stocks, equity ETFs, indices)
    return "equity"


def _calculate_bond_return_from_rate_shock(
    rate_bps: float,
    duration: Optional[float] = None,
    dv01: Optional[float] = None,
    price: Optional[float] = None,
    quantity: Optional[float] = None
) -> float:
    """
    Calculate approximate return shock for a bond given a rate shock in basis points.
    
    Uses modified duration approximation: ΔP/P ≈ -Duration × Δy
    where Δy is the yield change in decimal form.
    
    Args:
        rate_bps: Rate shock in basis points (positive = rates up, prices down)
        duration: Modified duration in years
        dv01: Dollar value of 1bp (optional, used if duration unavailable)
        price: Current bond price (optional, for DV01 conversion)
        quantity: Quantity held (optional, for DV01 conversion)
    
    Returns:
        Approximate return shock (negative = loss)
    """
    # Convert bps to decimal yield change
    delta_yield = rate_bps / 10000.0
    
    # If duration provided, use standard approximation
    if duration is not None and duration > 0:
        # ΔP/P ≈ -Duration × Δy
        return_shock = -duration * delta_yield
        return return_shock
    
    # If DV01 provided, try to infer effective duration
    # DV01 (per $100 notional) ≈ Duration × Price × 0.01
    # So Duration ≈ DV01 / (Price × 0.01) = DV01 × 100 / Price
    # Note: This assumes DV01 is expressed per $100 face value
    if dv01 is not None and price is not None and price > 0:
        # Infer modified duration from DV01
        implied_duration = (dv01 * 100.0) / price
        return_shock = -implied_duration * delta_yield
        return return_shock
    
    # No duration info available, return 0 (no rate sensitivity)
    return 0.0


def _get_shock_for_asset(
    scenario: str,
    symbol: str,
    asset_type: str,
    custom_shocks: Optional[Dict[str, float]] = None,
    stress_mode: str = "return_shock",
    duration: Optional[float] = None,
    dv01: Optional[float] = None,
    price: Optional[float] = None,
    quantity: Optional[float] = None
) -> tuple[float, Optional[str], Optional[float]]:
    """
    Get the appropriate shock for an asset based on scenario type.
    
    Args:
        scenario: Scenario name
        symbol: Asset symbol (normalized to uppercase)
        asset_type: Asset type (equity, bond, etc.)
        custom_shocks: Custom shocks dictionary (keys normalized to uppercase)
        stress_mode: "return_shock" or "duration_rate_shock"
        duration: Modified duration for bonds
        dv01: DV01 for bonds
        price: Current price for DV01 calculations
        quantity: Quantity for DV01 calculations
    
    Returns:
        Tuple of (shock_value, shock_type, rate_bps_applied)
        - shock_value: Shock as return fraction (negative = loss)
        - shock_type: "return" or "rate_bps"
        - rate_bps_applied: Rate shock in bps if applicable, else None
    """
    # Custom scenario
    if scenario == "CUSTOM":
        shock = custom_shocks.get(symbol, 0.0) if custom_shocks else 0.0
        return (shock, "return", None)
    
    # Predefined EQUITY_ scenarios - uniform shock
    if scenario.startswith("EQUITY_"):
        shock_pct = float(scenario.replace("EQUITY_", ""))
        return (shock_pct / 100.0, "return", None)
    
    # Historical scenarios - support both float (legacy) and dict (new)
    if scenario in HISTORICAL_SCENARIOS:
        scenario_config = HISTORICAL_SCENARIOS[scenario]
        
        # Legacy format: float uniform shock
        if isinstance(scenario_config, (int, float)):
            return (float(scenario_config), "return", None)
        
        # New format: dict with asset-specific shocks
        if isinstance(scenario_config, dict):
            # Check for symbol-specific override first
            if symbol in scenario_config:
                return (scenario_config[symbol], "return", None)
            
            # For bonds in duration_rate_shock mode, check for rate shock
            if asset_type == "bond" and stress_mode == "duration_rate_shock":
                rate_bps = scenario_config.get("bond_rate_bps")
                if rate_bps is not None:
                    # Calculate return shock from rate shock using duration
                    return_shock = _calculate_bond_return_from_rate_shock(
                        rate_bps, duration, dv01, price, quantity
                    )
                    # Only use rate shock if we have duration info (non-zero result or explicit zero duration)
                    # If duration/dv01 are None and we got 0.0, fall through to other shocks
                    if return_shock != 0.0 or (duration is not None or dv01 is not None):
                        return (return_shock, "rate_bps", rate_bps)
                    # Otherwise fall through to try bond_shock or equity_shock
                
                # Fallback to bond_shock if no rate shock or duration unavailable
                bond_shock = scenario_config.get("bond_shock")
                if bond_shock is not None:
                    return (bond_shock, "return", None)
            
            # Map asset type to shock
            if asset_type == "bond":
                shock = scenario_config.get("bond_shock", scenario_config.get("equity_shock", 0.0))
            elif asset_type == "credit":
                shock = scenario_config.get("credit_shock", scenario_config.get("equity_shock", 0.0))
            elif asset_type == "commodity":
                shock = scenario_config.get("commodity_shock", scenario_config.get("equity_shock", 0.0))
            elif asset_type == "growth":
                shock = scenario_config.get("growth_shock", scenario_config.get("equity_shock", 0.0))
            else:  # equity or default
                shock = scenario_config.get("equity_shock", 0.0)
            
            return (shock, "return", None)
    
    # Multi-factor scenarios - asset-type specific shocks
    if scenario in MULTI_FACTOR_SCENARIOS:
        scenario_config = MULTI_FACTOR_SCENARIOS[scenario]
        
        # Map asset type to shock
        if asset_type == "bond":
            shock = scenario_config.get("bond_shock", scenario_config.get("equity_shock", 0.0))
        elif asset_type == "credit":
            shock = scenario_config.get("credit_shock", scenario_config.get("equity_shock", 0.0))
        elif asset_type == "commodity":
            shock = scenario_config.get("commodity_shock", scenario_config.get("equity_shock", 0.0))
        elif asset_type == "growth":
            shock = scenario_config.get("growth_shock", scenario_config.get("equity_shock", 0.0))
        else:  # equity or default
            shock = scenario_config.get("equity_shock", 0.0)
        
        return (shock, "return", None)
    
    return (0.0, "return", None)


def run_stress_test(
    portfolio: List[PortfolioRow],
    scenario: str,
    shocks: Optional[Dict[str, float]] = None,
    stress_mode: str = "return_shock"
) -> Dict:
    """
    Run stress test scenario on the portfolio.
    
    Supports two stress modes:
    1. "return_shock" (default): Linear model applies percentage shocks directly.
       P&L = weight × shock (e.g., 40% weight × -10% shock = -4% portfolio loss)
    
    2. "duration_rate_shock": For bonds, uses duration/DV01 to convert rate shocks (bps)
       into return shocks. Falls back to return_shock if duration unavailable.
       Return ≈ -Duration × (rate_bps / 10000)
       P&L = weight × calculated_return
    
    NOTE: This is an approximation. Actual bond price changes depend on convexity,
    coupon structure, and other factors not modeled here.
    
    Args:
        portfolio: List of portfolio rows with symbols and weights
        scenario: Scenario name (EQUITY_*, historical, multi-factor, or CUSTOM)
        shocks: Optional custom shocks dictionary (required for CUSTOM scenario)
        stress_mode: "return_shock" (default) or "duration_rate_shock"
    
    Returns:
        Dictionary with:
        - scenario_name: Human-readable scenario name
        - portfolio_pnl: Total portfolio P&L (negative = loss)
        - by_asset: List of per-asset results with symbol, shock, pnl, and optional metadata
    """
    logger.info(f"Running stress test: {scenario}, mode: {stress_mode}")
    
    # Validate scenario
    scenario_name = scenario
    scenario_key = None
    missing_shocks: List[str] = []
    normalized_shocks: Optional[Dict[str, float]] = None
    
    if scenario.startswith("EQUITY_"):
        try:
            float(scenario.replace("EQUITY_", ""))
            scenario_name = scenario
            scenario_key = scenario
        except ValueError:
            raise ValueError(f"Invalid equity scenario: {scenario}")
    
    elif scenario in HISTORICAL_SCENARIOS:
        scenario_name = scenario
        scenario_key = scenario
    
    elif scenario in MULTI_FACTOR_SCENARIOS:
        scenario_name = f"{scenario} ({MULTI_FACTOR_SCENARIOS[scenario]['description']})"
        scenario_key = scenario
    
    elif scenario == "CUSTOM":
        if not shocks:
            raise ValueError("CUSTOM scenario requires shocks dictionary")
        # Normalize keys to uppercase for case-insensitive matching
        normalized_shocks = {str(k).strip().upper(): float(v) for k, v in shocks.items()}
        # Normalize portfolio symbols for comparison
        portfolio_symbols_normalized = [row.symbol.strip().upper() for row in portfolio]
        # Strict validation for custom shocks coverage
        if STRICT_CUSTOM_SHOCKS:
            missing_shocks = [sym for sym in portfolio_symbols_normalized if sym not in normalized_shocks]
            if missing_shocks:
                raise ValueError(f"CUSTOM scenario missing shocks for: {', '.join(missing_shocks)}")
        else:
            missing_shocks = [sym for sym in portfolio_symbols_normalized if sym not in normalized_shocks]
        scenario_name = "Custom Scenario"
        scenario_key = "CUSTOM"
    
    else:
        raise ValueError(
            f"Unknown scenario: {scenario}. "
            f"Supported: EQUITY_*, {', '.join(HISTORICAL_SCENARIOS.keys())}, "
            f"{', '.join(MULTI_FACTOR_SCENARIOS.keys())}, CUSTOM"
        )
    
    # Apply shocks to each asset
    by_asset = []
    portfolio_pnl = 0.0
    net_exposure = 0.0
    gross_exposure = 0.0
    
    for row in portfolio:
        # Normalize symbol to uppercase for consistency
        symbol = row.symbol.strip().upper()
        weight = row.weight
        net_exposure += weight
        gross_exposure += abs(weight)
        
        # Determine asset type
        asset_type_hint = getattr(row, 'asset_type', None)
        asset_type = _get_asset_type(symbol, asset_type_hint)
        
        # Extract optional bond parameters
        duration = getattr(row, 'duration', None)
        dv01 = getattr(row, 'dv01', None)
        price = getattr(row, 'price', None)
        quantity = getattr(row, 'quantity', None)
        
        # Get appropriate shock for this asset
        shock, shock_type, rate_bps_applied = _get_shock_for_asset(
            scenario=scenario,
            symbol=symbol,
            asset_type=asset_type,
            custom_shocks=normalized_shocks or shocks,
            stress_mode=stress_mode,
            duration=duration,
            dv01=dv01,
            price=price,
            quantity=quantity
        )
        
        # Calculate P&L impact: weight * shock
        # Example: 40% weight * -10% shock = -4% portfolio loss
        pnl = weight * shock
        portfolio_pnl += pnl
        
        # Build result with optional metadata
        asset_result = {
            "symbol": symbol,
            "shock": shock,
            "pnl": pnl
        }
        
        # Add optional transparency fields for advanced mode
        if stress_mode == "duration_rate_shock" or asset_type != "equity":
            asset_result["asset_type"] = asset_type
        if shock_type:
            asset_result["shock_type"] = shock_type
        if rate_bps_applied is not None:
            asset_result["rate_bps_applied"] = rate_bps_applied
        
        by_asset.append(asset_result)
    
    logger.info(f"Stress test complete. Portfolio P&L: {portfolio_pnl:.2%}")

    # Top loss contributors (most negative pnl)
    top_loss_contributors = sorted(by_asset, key=lambda x: x["pnl"])[:5]
    
    return {
        "scenario_name": scenario_name,
        "scenario_key": scenario_key,
        "portfolio_pnl": portfolio_pnl,
        "by_asset": by_asset,
        "net_exposure": net_exposure,
        "weights_sum": net_exposure,
        "gross_exposure": gross_exposure,
        "top_loss_contributors": top_loss_contributors,
        "missing_shocks": missing_shocks if missing_shocks else None,
    }

