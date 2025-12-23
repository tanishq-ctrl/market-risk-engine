"""VaR and CVaR calculation service with configurable horizons and distributions."""

import logging
from typing import Dict, List, Optional, Tuple

import numpy as np
import pandas as pd
from scipy.stats import norm, t

logger = logging.getLogger(__name__)

MC_SIM_CAP = 200_000


def _build_histogram(series: pd.Series, bins: int = 50) -> Dict[str, List[float]]:
    """Return histogram bins/counts for a return series."""
    counts, edges = np.histogram(series, bins=bins)
    return {"bins": edges.tolist(), "counts": counts.tolist()}


def _aggregate_returns(
    data: pd.DataFrame | pd.Series,
    return_type: str,
    horizon_days: int,
) -> pd.DataFrame | pd.Series:
    """Aggregate returns to the requested horizon."""
    if horizon_days <= 1:
        return data.dropna()

    if return_type == "log":
        aggregated = data.rolling(horizon_days).sum()
    else:
        aggregated = (1 + data).rolling(horizon_days).apply(
            lambda x: np.prod(x) - 1 if len(x) == horizon_days else np.nan,
            raw=True,
        )

    return aggregated.dropna()


def _weighted_quantile(values: np.ndarray, weights: Optional[np.ndarray], q: float) -> float:
    """Stable weighted quantile; falls back to unweighted if weights invalid."""
    if len(values) == 0:
        raise ValueError("Cannot compute quantile on empty array")
    if weights is None:
        return float(np.quantile(values, q))

    weights = np.asarray(weights)
    if weights.shape != values.shape or weights.sum() <= 0:
        return float(np.quantile(values, q))

    sorter = np.argsort(values)
    v_sorted = values[sorter]
    w_sorted = np.maximum(weights[sorter], 0)
    cdf = np.cumsum(w_sorted) / w_sorted.sum()
    return float(np.interp(q, cdf, v_sorted))


def _weighted_cvar(values: np.ndarray, weights: Optional[np.ndarray], alpha: float, quantile_val: float) -> float:
    """Weighted tail mean (loss is positive)."""
    mask = values <= quantile_val
    tail_vals = values[mask]
    if len(tail_vals) == 0:
        return -quantile_val
    if weights is None:
        return -float(tail_vals.mean())
    tail_weights = np.maximum(weights[mask], 0)
    denom = tail_weights.sum()
    if denom <= 0:
        return -quantile_val
    return -float(np.sum(tail_vals * tail_weights) / denom)


def historical_var_cvar(
    returns: pd.Series,
    confidence: float,
    weighting: str = "none",
    hs_lambda: float = 0.94,
) -> Tuple[float, float]:
    """Historical (or weighted historical) VaR/CVaR."""
    alpha = 1 - confidence
    weights = None
    if weighting == "ewma":
        n = len(returns)
        powers = np.arange(n - 1, -1, -1)
        weights = (1 - hs_lambda) * np.power(hs_lambda, powers)
        weights = weights / weights.sum()

    values = returns.values
    quantile_val = _weighted_quantile(values, weights, alpha)
    var = -quantile_val
    cvar = _weighted_cvar(values, weights, alpha, quantile_val)
    return var, cvar


def _student_t_es(df: float, z_alpha: float, alpha: float) -> float:
    """Expected shortfall multiplier for Student-t."""
    numerator = t.pdf(z_alpha, df) * (df + z_alpha**2)
    denom = (df - 1) * alpha
    return numerator / denom


def parametric_var_cvar(
    returns: pd.Series,
    confidence: float,
    dist: str = "normal",
    drift: str = "ignore",
    warnings: Optional[List[str]] = None,
) -> Tuple[float, float, Dict[str, float]]:
    """
    Parametric VaR/CVaR supporting normal and Student-t.

    Note: Assumes input `returns` are already at the desired horizon. No additional
    horizon scaling is applied here to avoid double-scaling when upstream aggregation
    has been performed.
    """
    warnings = warnings or []
    alpha = 1 - confidence
    mu = returns.mean() if drift == "include" else 0.0
    sigma = returns.std()
    if sigma <= 0:
        warnings.append("Return volatility is zero; VaR set to 0.")
        return 0.0, 0.0, {"mu": float(mu), "sigma": float(sigma)}

    if dist == "student_t":
        df, loc, scale = t.fit(returns)
        # Treat fitted loc/scale as already horizon-level
        z_alpha = t.ppf(alpha, df)
        var = -(loc + scale * z_alpha)
        if df <= 2:
            warnings.append("Student-t degrees of freedom <= 2; ES may be unstable.")
        es_mult = _student_t_es(df, z_alpha, alpha)
        cvar = -(loc - scale * es_mult)
        return var, cvar, {"df": float(df), "loc": float(loc), "scale": float(scale)}

    # Normal
    z_alpha = norm.ppf(alpha)
    var = -(mu + sigma * z_alpha)
    cvar = -(mu - sigma * norm.pdf(z_alpha) / alpha)
    return var, cvar, {"mu": float(mu), "sigma": float(sigma)}


def monte_carlo_var_cvar(
    asset_returns: pd.DataFrame,
    weights: Dict[str, float],
    confidence: float,
    horizon_days: int = 1,
    n_sims: int = 10000,
    seed: int = 42,
    drift: str = "ignore",
    return_type: str = "simple",
) -> Tuple[float, float, np.ndarray, Dict[str, float]]:
    """Monte Carlo VaR/CVaR using multivariate normal with horizon scaling."""
    n_sims = min(int(n_sims), MC_SIM_CAP)
    np.random.seed(seed)

    mean_vector = asset_returns.mean().values
    cov_matrix = asset_returns.cov().values

    # If drift ignored, center means
    if drift == "ignore":
        mean_vector = np.zeros_like(mean_vector)

    # Horizon scaling approach for MC: scale mean/cov by horizon_days (mvn_scaled)
    mean_vector = mean_vector * horizon_days
    cov_matrix = cov_matrix * horizon_days

    symbols = asset_returns.columns.tolist()
    weight_vector = np.array([weights.get(s, 0.0) for s in symbols])

    simulated_returns = np.random.multivariate_normal(mean_vector, cov_matrix, n_sims)
    portfolio_sim_returns = simulated_returns.dot(weight_vector)

    # If using log returns, keep in log space; otherwise simple.
    # For log returns, we can optionally convert to simple for histogram; stay consistent with return_type.
    if return_type == "log":
        sim_for_metrics = portfolio_sim_returns  # log returns
    else:
        sim_for_metrics = portfolio_sim_returns

    alpha = 1 - confidence
    quantile_val = np.quantile(sim_for_metrics, alpha)
    var = -quantile_val
    tail_returns = sim_for_metrics[sim_for_metrics <= quantile_val]
    cvar = -float(tail_returns.mean()) if len(tail_returns) else var

    metadata = {"simulations": n_sims, "horizon_model": "mvn_scaled"}
    return var, cvar, sim_for_metrics, metadata


def component_var_normal(
    asset_returns: pd.DataFrame,
    weights: Dict[str, float],
    confidence: float,
    horizon_days: int = 1,
) -> Optional[List[Dict[str, float]]]:
    """Component VaR for multivariate normal assumption."""
    if asset_returns.empty:
        return None

    symbols = asset_returns.columns.tolist()
    weight_vector = np.array([weights.get(s, 0.0) for s in symbols])
    cov_matrix = asset_returns.cov().values * horizon_days

    portfolio_var = float(weight_vector.T @ cov_matrix @ weight_vector)
    if portfolio_var <= 0:
        return None
    portfolio_sigma = np.sqrt(portfolio_var)
    alpha = 1 - confidence
    z = -norm.ppf(alpha)  # positive multiplier for tail losses
    marginal = cov_matrix @ weight_vector / portfolio_sigma
    component = weight_vector * z * marginal

    return [
        {
            "symbol": sym,
            "weight": float(weight_vector[i]),
            "marginal_var": float(z * marginal[i]),
            "component_var": float(component[i]),
        }
        for i, sym in enumerate(symbols)
    ]


def compute_var(
    portfolio_returns: pd.Series,
    asset_returns: Optional[pd.DataFrame],
    weights: Optional[Dict[str, float]],
    method: str,
    confidence: float,
    lookback: Optional[int] = None,
    mc_sims: int = 10000,
    seed: int = 42,
    return_type: str = "simple",
    horizon_days: int = 1,
    drift: str = "ignore",
    parametric_dist: str = "normal",
    hs_weighting: str = "none",
    hs_lambda: float = 0.94,
    portfolio_value: Optional[float] = None,
    rolling_window: int = 250,
) -> Dict:
    """
    Compute VaR using specified method with additional controls.

    Returns a dictionary ready for Pydantic validation with legacy fields preserved.
    """
    warnings: List[str] = []
    effective_lookback = lookback or len(portfolio_returns)
    base_returns = portfolio_returns.tail(effective_lookback).dropna()
    base_asset_returns = asset_returns.tail(effective_lookback).dropna() if asset_returns is not None else None

    # Aggregate for horizon (used for histograms and historical VaR)
    aggregated_port_returns = _aggregate_returns(base_returns, return_type, horizon_days)
    if aggregated_port_returns.empty:
        raise ValueError("Insufficient return data for VaR calculation")

    histogram_realized = _build_histogram(aggregated_port_returns)
    histogram_simulated = None
    contributions_var = None

    metadata = {
        "effective_n": int(len(aggregated_port_returns)),
        "horizon_days": int(horizon_days),
        "return_type": return_type,
        "drift": drift,
        "hs_weighting": hs_weighting,
        "hs_lambda": float(hs_lambda),
        "parametric_dist": parametric_dist,
        "seed": int(seed),
        "mc_sims": int(min(mc_sims, MC_SIM_CAP)),
        "covariance_method": "sample",
        "var_units": "fraction",
        "return_units": return_type,
        "horizon_model": "aggregation",
    }

    if len(aggregated_port_returns) < 50:
        warnings.append("Effective sample size < 50; results may be unstable.")
    if horizon_days > 1:
        warnings.append("Horizon scaling uses rolling aggregation and sqrt(h) approximations.")

    var = 0.0
    cvar = 0.0

    if method == "historical":
        var, cvar = historical_var_cvar(
            aggregated_port_returns,
            confidence,
            weighting=hs_weighting,
            hs_lambda=hs_lambda,
        )
    elif method == "parametric":
        var, cvar, fitted = parametric_var_cvar(
            aggregated_port_returns,
            confidence,
            dist=parametric_dist,
            drift=drift,
            warnings=warnings,
        )
        metadata.update(fitted)

        if base_asset_returns is not None and weights:
            contributions_var = component_var_normal(
                base_asset_returns,
                weights,
                confidence,
                horizon_days=horizon_days,
            )
    elif method == "monte_carlo":
        if base_asset_returns is None or weights is None:
            raise ValueError("Monte Carlo requires asset_returns and weights")
        var, cvar, sim_returns, mc_meta = monte_carlo_var_cvar(
            base_asset_returns,
            weights,
            confidence,
            horizon_days=horizon_days,
            n_sims=mc_sims,
            seed=seed,
            drift=drift,
            return_type=return_type,
        )
        metadata.update(mc_meta)
        metadata["horizon_model"] = mc_meta.get("horizon_model", "mvn_scaled")
        histogram_simulated = _build_histogram(pd.Series(sim_returns))
    else:
        raise ValueError(f"Unknown VaR method: {method}")

    if mc_sims > MC_SIM_CAP:
        warnings.append(f"Monte Carlo sims capped to {MC_SIM_CAP:,}.")
    if method == "monte_carlo" and mc_sims < 5_000:
        warnings.append("Monte Carlo simulations are below 5,000; results may be noisy.")

    # Rolling series (historical + parametric only)
    rolling = None
    if method in {"historical", "parametric"} and rolling_window and len(base_returns) > horizon_days:
        rolling_dates: List[str] = []
        rolling_var: List[float] = []
        rolling_realized: List[float] = []
        series_for_roll = _aggregate_returns(base_returns, return_type, horizon_days)
        if len(series_for_roll) > 2:
            # Adapt window to shorter samples so we get multiple points (aim ~half overlap)
            adaptive_window = max(5, min(rolling_window, max(2, len(series_for_roll) // 2)))
            for i in range(adaptive_window, len(series_for_roll)):
                window_returns = series_for_roll.iloc[i - adaptive_window : i]
                try:
                    if method == "historical":
                        roll_var, _ = historical_var_cvar(
                            window_returns,
                            confidence,
                            weighting=hs_weighting,
                            hs_lambda=hs_lambda,
                        )
                    else:
                        roll_var, _, _ = parametric_var_cvar(
                            window_returns,
                            confidence,
                            dist=parametric_dist,
                            drift=drift,
                            warnings=warnings,
                        )
                    rolling_dates.append(str(window_returns.index[-1])[:10])
                    rolling_var.append(float(roll_var))
                    rolling_realized.append(float(series_for_roll.iloc[i]))
                except Exception:
                    continue

        if rolling_dates:
            rolling = {"dates": rolling_dates, "var_series": rolling_var, "realized": rolling_realized}

    var_amount = float(var * portfolio_value) if portfolio_value is not None else None
    cvar_amount = float(cvar * portfolio_value) if portfolio_value is not None else None

    response = {
        "method": method,
        "confidence": confidence,
        "var": float(var),
        "cvar": float(cvar),
        "var_amount": var_amount,
        "cvar_amount": cvar_amount,
        "histogram": histogram_simulated or histogram_realized,
        "histogram_realized": histogram_realized,
        "histogram_simulated": histogram_simulated,
        "rolling": rolling,
        "returns": aggregated_port_returns.tolist(),
        "warnings": warnings,
        "metadata": metadata,
    }

    if contributions_var:
        response["contributions_var"] = contributions_var

    return response

