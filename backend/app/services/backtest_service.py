"""VaR backtesting service."""
import pandas as pd
import numpy as np
import logging
from typing import Dict, Optional
from scipy.stats import chi2

from app.services.var_service import historical_var_cvar, parametric_var_cvar, monte_carlo_var_cvar

logger = logging.getLogger(__name__)


def kupiec_pof_test(
    n: int,
    exceptions: int,
    confidence: float,
    eps: float = 1e-6
) -> tuple[Optional[float], Optional[float]]:
    """
    Kupiec Proportion of Failures (POF) test.
    
    Args:
        n: Number of observations
        exceptions: Number of VaR breaches
        confidence: Confidence level
    
    Returns:
        Tuple of (LR statistic, p-value)
    """
    if n <= 0:
        return None, None
    
    expected_rate = 1 - confidence
    exception_rate = exceptions / n

    # Clamp to avoid log(0) while keeping statistical meaning
    exception_rate = max(eps, min(1 - eps, exception_rate))
    expected_rate = max(eps, min(1 - eps, expected_rate))
    
    try:
        LR = -2 * (
            exceptions * np.log(expected_rate) +
            (n - exceptions) * np.log(1 - expected_rate) -
            exceptions * np.log(exception_rate) -
            (n - exceptions) * np.log(1 - exception_rate)
        )
        p_value = 1 - chi2.cdf(LR, df=1)
        return float(LR), float(p_value)
    except (ValueError, OverflowError):
        return None, None


def backtest_var(
    portfolio_returns: pd.Series,
    asset_returns: Optional[pd.DataFrame],
    weights: Optional[Dict[str, float]],
    method: str,
    confidence: float,
    lookback: int,
    backtest_days: int,
    mc_sims: int = 10000,
    seed: int = 42
) -> Dict:
    """
    Backtest VaR model.
    
    Args:
        portfolio_returns: Full series of portfolio returns
        asset_returns: Optional asset returns (for Monte Carlo)
        weights: Optional weights (for Monte Carlo)
        method: VaR method
        confidence: Confidence level
        lookback: Lookback window for VaR estimation
        backtest_days: Number of days to backtest
        mc_sims: Monte Carlo simulations
        seed: Random seed
    
    Returns:
        Dictionary with backtest results
    """
    logger.info(f"Backtesting VaR: method={method}, confidence={confidence}, lookback={lookback}")
    
    # Clean returns first to avoid index drift after dropna
    clean_port_returns = portfolio_returns.dropna()

    # Adapt lookback/backtest to available data to reduce hard failures
    effective_lookback = min(lookback, len(clean_port_returns) - 1)
    max_backtest = max(0, len(clean_port_returns) - effective_lookback)

    if max_backtest <= 0:
        raise ValueError(
            f"Insufficient data: available={len(clean_port_returns)}, "
            f"requested_lookback={lookback}, requested_backtest={backtest_days}"
        )

    effective_backtest = min(backtest_days, max_backtest)
    
    # Define backtest period (last backtest_days) on cleaned series to keep alignment
    backtest_returns = clean_port_returns.tail(effective_backtest)
    backtest_index = pd.to_datetime(backtest_returns.index)
    
    # Compute VaR for each day in backtest period
    dates = []
    realized = []
    var_thresholds = []
    exceptions = []
    
    for i in range(len(backtest_returns)):
        # Get estimation window (prior lookback observations) using cleaned series
        end_loc = backtest_returns.index[i]
        est_returns = clean_port_returns.loc[:end_loc].iloc[-(lookback + 1):-1]
        
        if len(est_returns) < 10:
            continue
        
        try:
            # Estimate VaR
            if method == "historical":
                var_loss, _ = historical_var_cvar(est_returns, confidence)
            elif method == "parametric":
                var_loss, _, _ = parametric_var_cvar(est_returns, confidence)
            elif method == "monte_carlo":
                if asset_returns is None or weights is None:
                    raise ValueError("Monte Carlo requires asset_returns and weights")
                est_asset_returns = asset_returns.loc[est_returns.index].dropna()
                var_loss, _, _, _ = monte_carlo_var_cvar(
                    est_asset_returns,
                    weights,
                    confidence,
                    n_sims=mc_sims,
                    seed=seed + i,
                )
            else:
                raise ValueError(f"Unknown method: {method}")
            
            # Enforce positive VaR (loss) convention
            if var_loss < 0:
                var_loss = abs(var_loss)

            # Realized return
            realized_ret = backtest_returns.iloc[i]
            
            # Threshold is negative
            threshold = -var_loss
            
            # Exception if realized < threshold
            exception = realized_ret < threshold
            
            date_val = backtest_index[i]
            dates.append(date_val.strftime("%Y-%m-%d") if not pd.isna(date_val) else str(date_val))
            realized.append(float(realized_ret))
            var_thresholds.append(float(threshold))
            exceptions.append(bool(exception))
        
        except Exception as e:
            logger.warning(f"Failed to compute VaR for day {i}: {e}")
            continue
    
    if not dates:
        raise ValueError("No valid backtest observations")
    
    # Exception statistics
    exceptions_count = sum(exceptions)
    exceptions_rate = exceptions_count / len(exceptions) if exceptions else 0.0
    
    # Kupiec test using the same exceptions already derived
    LR, p_value = kupiec_pof_test(len(exceptions), exceptions_count, confidence)
    
    # Exceptions table
    exceptions_table = [
        {
            "date": dates[i],
            "realized": realized[i],
            "var_threshold": var_thresholds[i]
        }
        for i in range(len(dates)) if exceptions[i]
    ]
    
    return {
        "exceptions_count": exceptions_count,
        "exceptions_rate": exceptions_rate,
        "kupiec_lr": LR,
        "kupiec_pvalue": p_value,
        "available_days": len(clean_port_returns),
        "series": {
            "dates": dates,
            "realized": realized,
            "var_threshold": var_thresholds,
            "exceptions": exceptions
        },
        "exceptions_table": exceptions_table
    }

