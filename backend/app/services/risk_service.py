"""Risk metrics calculation service with industry-standard analytics."""
import pandas as pd
import numpy as np
import logging
from typing import Dict, List, Optional, Tuple
from scipy.stats import skew, kurtosis
from statsmodels.regression.linear_model import OLS

from app.services.returns_service import compute_returns, portfolio_returns
from app.services.data_service import fetch_prices
from app.utils.math import drawdown_duration

logger = logging.getLogger(__name__)

DEFAULT_ANNUALIZATION_DAYS = 252


def _daily_rf(annual_rf: float, return_type: str, ann_days: int) -> float:
    """Convert annual risk-free rate to daily."""
    if return_type == "log":
        return annual_rf / ann_days
    # simple
    return (1 + annual_rf) ** (1 / ann_days) - 1


def _annualize_return(returns: pd.Series, return_type: str, ann_days: int) -> float:
    """Annualize returns based on type."""
    n = len(returns)
    if n == 0:
        return 0.0
    if return_type == "log":
        return float(returns.mean() * ann_days)
    # simple: CAGR-style
    total = (1 + returns).prod()
    if total <= 0:
        return -1.0
    return float(total ** (ann_days / n) - 1)


def calculate_sharpe_ratio(
    returns: pd.Series,
    risk_free_rate: float = 0.0,
    return_type: str = "log",
    ann_days: int = DEFAULT_ANNUALIZATION_DAYS,
) -> float:
    """
    Calculate annualized Sharpe ratio (industry standard).

    Uses arithmetic annualization of daily excess mean:
      rf_daily = _daily_rf(...)
      excess = returns - rf_daily
      sharpe = (mean(excess) * ann_days) / (std(returns) * sqrt(ann_days))
    """
    if len(returns) == 0 or returns.std() == 0:
        return 0.0

    rf_daily = _daily_rf(risk_free_rate, return_type, ann_days)
    excess = returns - rf_daily

    excess_ann = float(excess.mean() * ann_days)
    vol_ann = float(returns.std() * np.sqrt(ann_days))

    return float(excess_ann / vol_ann) if vol_ann > 0 else 0.0


def calculate_sortino_ratio(
    returns: pd.Series,
    risk_free_rate: float = 0.0,
    return_type: str = "log",
    ann_days: int = DEFAULT_ANNUALIZATION_DAYS,
) -> float:
    """
    Calculate annualized Sortino ratio (industry standard).

      excess = returns - rf_daily
      excess_ann = mean(excess) * ann_days
      downside = excess.clip(upper=0)
      downside_dev_ann = downside.std(ddof=1) * sqrt(ann_days)
      sortino = excess_ann / downside_dev_ann

    If downside_dev_ann == 0:
      - return +inf if excess_ann > 0 else 0
    """
    if len(returns) == 0:
        return 0.0

    rf_daily = _daily_rf(risk_free_rate, return_type, ann_days)
    excess = returns - rf_daily

    excess_ann = float(excess.mean() * ann_days)

    downside = excess.clip(upper=0)
    downside_std = float(downside.std(ddof=1))
    downside_dev_ann = downside_std * np.sqrt(ann_days)

    if downside_dev_ann == 0:
        return float("inf") if excess_ann > 0 else 0.0

    return float(excess_ann / downside_dev_ann)


def calculate_cumulative_returns(returns: pd.Series, return_type: str = "log") -> pd.Series:
    """Calculate cumulative returns."""
    if return_type == "log":
        simple_returns = np.exp(returns) - 1
    else:
        simple_returns = returns
    return (1 + simple_returns).cumprod()


def calculate_drawdown_series(returns: pd.Series, return_type: str = "log") -> pd.Series:
    """Calculate drawdown series from returns."""
    cum_returns = calculate_cumulative_returns(returns, return_type)
    running_max = cum_returns.cummax()
    drawdown = (cum_returns / running_max) - 1  # Negative values
    return drawdown


def calculate_rolling_sharpe(
    returns: pd.Series,
    windows: List[int],
    risk_free_rate: float = 0.0,
    ann_days: int = DEFAULT_ANNUALIZATION_DAYS,
    return_type: str = "log",
) -> Dict:
    """Calculate rolling Sharpe ratio for multiple windows."""
    rf_daily = _daily_rf(risk_free_rate, return_type, ann_days)
    rolling_sharpe_data: Dict = {"dates": []}

    for window in windows:
        # Industry standard rolling Sharpe: mean(excess)*ann / (std(returns)*sqrt(ann))
        # Note: compute_risk_metrics passes return_type-specific rf via risk_free_rate + return_type,
        # but this function only gets the daily returns series; use daily rf conversion outside.
        rolling_excess_mean_ann = (returns - rf_daily).rolling(window=window).mean() * ann_days
        rolling_vol_ann = returns.rolling(window=window).std() * np.sqrt(ann_days)
        rolling_sharpe = rolling_excess_mean_ann / rolling_vol_ann
        rolling_sharpe = rolling_sharpe.replace([np.inf, -np.inf], np.nan).dropna()

        if window == windows[0]:
            rolling_sharpe_data["dates"] = [d.strftime("%Y-%m-%d") for d in rolling_sharpe.index]

        sharpe_values = []
        for date_str in rolling_sharpe_data["dates"]:
            date = pd.to_datetime(date_str)
            if date in rolling_sharpe.index:
                val = float(rolling_sharpe.loc[date])
                sharpe_values.append(val if not np.isnan(val) else None)
            else:
                sharpe_values.append(None)

        rolling_sharpe_data[f"sharpe_{window}"] = sharpe_values

    return rolling_sharpe_data


def _fetch_benchmark_returns(
    benchmark_symbol: str,
    start_date: str,
    end_date: str,
    return_type: str,
) -> Optional[pd.Series]:
    """Fetch benchmark returns once."""
    try:
        benchmark_prices, _, _ = fetch_prices([benchmark_symbol], start_date, end_date)
        if benchmark_prices.empty:
            return None
        bench_ret = compute_returns(benchmark_prices, return_type).iloc[:, 0]
        return bench_ret
    except Exception as e:
        logger.warning(f"Failed to fetch benchmark {benchmark_symbol}: {e}")
        return None


def _compute_benchmark_analytics(
    port_returns: pd.Series,
    bench_returns: pd.Series,
    ann_days: int,
    return_type: str,
) -> Tuple[Dict, pd.Series]:
    """Compute benchmark analytics from aligned returns."""
    aligned = pd.concat([port_returns, bench_returns], axis=1).dropna()
    aligned.columns = ["portfolio", "benchmark"]

    if len(aligned) < 10:
        return {}, aligned["benchmark"]

    y = aligned["portfolio"].values
    X = aligned["benchmark"].values
    X_const = np.column_stack([np.ones(len(X)), X])

    model = OLS(y, X_const).fit()
    alpha_daily = float(model.params[0])
    beta = float(model.params[1])
    r2 = float(model.rsquared)
    corr = float(aligned["portfolio"].corr(aligned["benchmark"]))

    # Active returns
    active = aligned["portfolio"] - aligned["benchmark"]
    te_daily = float(active.std(ddof=1))
    tracking_error_ann = te_daily * np.sqrt(ann_days)

    active_mean_ann = float(active.mean() * ann_days)
    info_ratio = float(active_mean_ann / tracking_error_ann) if tracking_error_ann and tracking_error_ann > 0 else None

    alpha_ann = alpha_daily * ann_days

    return {
        "beta": beta,
        "alpha_ann": alpha_ann,
        "r2": r2,
        "corr": corr,
        "tracking_error_ann": tracking_error_ann,
        "information_ratio": info_ratio,
    }, aligned["benchmark"]


def compute_risk_metrics(
    portfolio_returns_series: pd.Series,
    asset_returns: pd.DataFrame,
    weights: Dict[str, float],
    benchmark_symbol: Optional[str] = None,
    rolling_windows: Optional[List[int]] = None,
    risk_free_rate: float = 0.0,
    annualization_days: int = DEFAULT_ANNUALIZATION_DAYS,
    return_type: str = "log",
    include_benchmark: bool = True,
) -> Dict:
    """
    Compute comprehensive risk metrics.

    Args:
        portfolio_returns_series: Series of portfolio returns
        asset_returns: DataFrame of asset returns
        weights: Dictionary of weights by symbol
        benchmark_symbol: Optional benchmark symbol
        rolling_windows: List of rolling window sizes
        risk_free_rate: Annual risk-free rate (e.g. 0.045)
        annualization_days: Trading days per year
        return_type: "log" or "simple"
        include_benchmark: Whether to include benchmark analytics

    Returns:
        Dictionary with risk metrics, metadata, warnings
    """
    if rolling_windows is None:
        rolling_windows = [30, 90, 252]

    logger.info("Computing risk metrics")

    warnings: List[str] = []
    ann_days = annualization_days

    # Drop NaNs for clean analysis
    port_returns = portfolio_returns_series.dropna()
    effective_days = len(port_returns)

    if effective_days < 50:
        warnings.append(f"Effective sample size ({effective_days}) < 50; results may be unstable.")

    # Annualized volatility and return
    ann_vol = port_returns.std() * np.sqrt(ann_days)
    ann_return = _annualize_return(port_returns, return_type, ann_days)

    # Sharpe and Sortino ratios
    sharpe = calculate_sharpe_ratio(port_returns, risk_free_rate, return_type, ann_days)
    sortino = calculate_sortino_ratio(port_returns, risk_free_rate, return_type, ann_days)

    # Max drawdown
    drawdown_series = calculate_drawdown_series(port_returns, return_type)
    max_drawdown = abs(drawdown_series.min()) if len(drawdown_series) > 0 else 0.0

    # Drawdown duration
    dd_duration = drawdown_duration(abs(drawdown_series)) if len(drawdown_series) > 0 else 0

    # Cumulative returns
    cum_returns = calculate_cumulative_returns(port_returns, return_type)

    # Tail/performance stats
    stats = {}
    if effective_days > 0:
        stats["skew"] = float(skew(port_returns, nan_policy="omit"))
        stats["kurtosis"] = float(kurtosis(port_returns, nan_policy="omit"))  # excess kurtosis
        stats["best_day"] = float(port_returns.max())
        stats["worst_day"] = float(port_returns.min())
        stats["hit_ratio"] = float((port_returns > 0).sum() / effective_days)

        rf_daily = _daily_rf(risk_free_rate, return_type, ann_days)
        downside = (port_returns - rf_daily).clip(upper=0)
        stats["downside_dev_ann"] = float(downside.std(ddof=1) * np.sqrt(ann_days))

        stats["calmar_ratio"] = float(ann_return / max_drawdown) if max_drawdown > 0 else None

    # Benchmark analytics
    beta = None
    benchmark_block = None
    bench_cum_aligned: Optional[List] = None
    bench_dd_aligned: Optional[List] = None

    if include_benchmark and benchmark_symbol:
        start_str = str(port_returns.index.min().date())
        end_str = str(port_returns.index.max().date())
        bench_returns = _fetch_benchmark_returns(benchmark_symbol, start_str, end_str, return_type)

        if bench_returns is not None and len(bench_returns) > 10:
            # Align first for stable benchmarks + warnings
            aligned_pb = pd.concat([port_returns, bench_returns], axis=1).dropna()
            if len(aligned_pb) < 50:
                warnings.append("Benchmark overlap < 50 days; TE/IR may be unstable.")

            benchmark_block, aligned_bench = _compute_benchmark_analytics(
                port_returns, bench_returns, ann_days, return_type
            )
            if benchmark_block:
                beta = benchmark_block.get("beta")
                if benchmark_block.get("tracking_error_ann") is not None and benchmark_block.get("tracking_error_ann") == 0:
                    warnings.append("Tracking error is zero; information ratio undefined")

            # Benchmark cumulative and drawdown aligned to portfolio dates
            bench_cum = calculate_cumulative_returns(bench_returns, return_type)
            bench_dd = calculate_drawdown_series(bench_returns, return_type)

            bench_cum_aligned = []
            bench_dd_aligned = []
            for d in cum_returns.index:
                if d in bench_cum.index:
                    bench_cum_aligned.append(float(bench_cum.loc[d]))
                    bench_dd_aligned.append(float(bench_dd.loc[d]))
                else:
                    bench_cum_aligned.append(None)
                    bench_dd_aligned.append(None)
        else:
            warnings.append(f"Benchmark {benchmark_symbol} has insufficient overlap with portfolio.")

    # Asset returns cleaning/alignment
    asset_returns = asset_returns.loc[port_returns.index].dropna(how="all")
    symbols = asset_returns.columns.tolist()
    if len(asset_returns) == 0:
        warnings.append("No aligned asset return data available.")
        asset_returns = pd.DataFrame(index=port_returns.index)
        symbols = []

    # Drop columns with >20% missing
    if len(symbols) > 0:
        missing_frac = asset_returns.isna().mean()
        drop_syms = missing_frac[missing_frac > 0.20].index.tolist()
        for sym in drop_syms:
            warnings.append(f"Asset {sym} has >20% missing returns after alignment; dropped from covariance.")
        asset_returns = asset_returns.drop(columns=drop_syms, errors="ignore")
        symbols = asset_returns.columns.tolist()

    clean_assets = asset_returns.dropna()
    if len(clean_assets) < 50:
        warnings.append("Clean aligned asset return sample < 50 rows; correlations/contributions may be unstable.")

    # Correlation matrix
    correlation_matrix = clean_assets.corr().values.tolist() if len(symbols) > 0 else []

    # Risk contributions (annualized)
    cov_daily = clean_assets.cov().values if len(symbols) > 0 else np.zeros((0, 0))
    cov_ann = cov_daily * ann_days
    weight_vector = np.array([weights.get(s, 0.0) for s in symbols])

    port_var_ann = float(weight_vector.T @ cov_ann @ weight_vector)
    port_vol_ann = np.sqrt(port_var_ann) if port_var_ann > 0 else 0.0

    contributions = []
    if port_vol_ann > 0:
        marginal = (cov_ann @ weight_vector) / port_vol_ann
        cctr = weight_vector * marginal
        pct_cctr = cctr / port_vol_ann

        for i, sym in enumerate(symbols):
            contributions.append({
                "symbol": sym,
                "weight": float(weight_vector[i]),
                "mctr": float(marginal[i]),
                "cctr": float(cctr[i]),
                "pct_cctr": float(pct_cctr[i]),
            })
    else:
        for i, sym in enumerate(symbols):
            contributions.append({
                "symbol": sym,
                "weight": float(weight_vector[i]),
                "mctr": 0.0,
                "cctr": 0.0,
                "pct_cctr": 0.0,
            })

    # Rolling volatility
    rolling_vol_data: Dict = {"dates": []}
    for window in rolling_windows:
        rolling_vol_data[f"vol_{window}"] = []

    for window in rolling_windows:
        rolling_vol = port_returns.rolling(window=window).std() * np.sqrt(ann_days)
        rolling_vol = rolling_vol.dropna()

        if window == rolling_windows[0]:
            rolling_vol_data["dates"] = [d.strftime("%Y-%m-%d") for d in rolling_vol.index]

        vol_values = []
        for date_str in rolling_vol_data["dates"]:
            date = pd.to_datetime(date_str)
            if date in rolling_vol.index:
                vol_values.append(float(rolling_vol.loc[date]))
            else:
                vol_values.append(None)
        rolling_vol_data[f"vol_{window}"] = vol_values

    # Rolling Sharpe ratio
    # Note: rolling Sharpe uses return_type-specific rf_daily
    rolling_sharpe_data = calculate_rolling_sharpe(
        port_returns,
        rolling_windows,
        risk_free_rate=risk_free_rate,
        ann_days=ann_days,
        return_type=return_type,
    )

    # Cumulative returns data
    cum_returns_data = {
        "dates": [d.strftime("%Y-%m-%d") for d in cum_returns.index],
        "portfolio": [float(v) for v in cum_returns.values],
    }
    if bench_cum_aligned:
        cum_returns_data["benchmark"] = bench_cum_aligned

    # Drawdown series data
    drawdown_data = {
        "dates": [d.strftime("%Y-%m-%d") for d in drawdown_series.index],
        "portfolio": [float(v) for v in drawdown_series.values],
    }
    if bench_dd_aligned:
        drawdown_data["benchmark"] = bench_dd_aligned

    # Metadata
    metadata = {
        "annualization_days": ann_days,
        "return_type": return_type,
        "effective_days": effective_days,
        "symbols": symbols,
        "benchmark_symbol": benchmark_symbol if include_benchmark else None,
        "risk_free_rate": risk_free_rate,
    }

    result = {
        "summary": {
            "ann_vol": float(ann_vol),
            "max_drawdown": float(max_drawdown),
            "beta": beta,
            "dd_duration_days": dd_duration,
            "sharpe_ratio": float(sharpe),
            "sortino_ratio": float(sortino) if sortino != float("inf") else None,
            "ann_return": float(ann_return),
        },
        "rolling_vol": rolling_vol_data,
        "correlation": {
            "symbols": symbols,
            "matrix": correlation_matrix,
        },
        "contributions": contributions,
        "cumulative_returns": cum_returns_data,
        "drawdown_series": drawdown_data,
        "rolling_sharpe": rolling_sharpe_data,
        "stats": stats,
        "metadata": metadata,
        "warnings": warnings,
    }

    if benchmark_block:
        result["benchmark"] = benchmark_block

    return result
