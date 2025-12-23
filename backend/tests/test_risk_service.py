"""Unit tests for risk_service computations."""
import numpy as np
import pandas as pd
import pytest

from app.services.risk_service import (
    compute_risk_metrics,
    calculate_sharpe_ratio,
    _daily_rf,
    _annualize_return,
)


def _make_returns(mean: float = 0.0005, std: float = 0.01, n: int = 500, seed: int = 42) -> pd.Series:
    """Generate synthetic daily returns."""
    rng = np.random.default_rng(seed)
    dates = pd.date_range("2022-01-01", periods=n, freq="B")
    return pd.Series(rng.normal(mean, std, n), index=dates)


def _make_asset_returns(n_assets: int = 2, n: int = 500, seed: int = 42) -> pd.DataFrame:
    rng = np.random.default_rng(seed)
    dates = pd.date_range("2022-01-01", periods=n, freq="B")
    data = rng.normal(0.0005, 0.01, (n, n_assets))
    return pd.DataFrame(data, index=dates, columns=[f"A{i}" for i in range(n_assets)])


def test_pct_cctr_sums_to_one():
    """Validate that pct_cctr contributions sum to ~1."""
    asset_returns = _make_asset_returns(n_assets=3, n=500)
    weights = {"A0": 0.5, "A1": 0.3, "A2": 0.2}
    port_returns = asset_returns.mul(list(weights.values()), axis=1).sum(axis=1)

    result = compute_risk_metrics(
        port_returns,
        asset_returns,
        weights,
        benchmark_symbol=None,
        rolling_windows=[30],
        risk_free_rate=0.0,
        annualization_days=252,
        return_type="log",
        include_benchmark=False,
    )

    pct_sum = sum(c["pct_cctr"] for c in result["contributions"])
    assert pct_sum == pytest.approx(1.0, abs=0.05), f"pct_cctr sum={pct_sum}"


def test_tracking_error_formula():
    """Validate tracking error calculation on synthetic data."""
    # Create portfolio and benchmark with known relationship
    rng = np.random.default_rng(123)
    dates = pd.date_range("2022-01-01", periods=300, freq="B")
    bench = pd.Series(rng.normal(0.0004, 0.012, 300), index=dates)
    port = bench + rng.normal(0.0001, 0.005, 300)  # active with ~0.5% daily TE

    # Manual tracking error
    active = port - bench
    te_manual = active.std() * np.sqrt(252)

    result = compute_risk_metrics(
        port,
        pd.DataFrame({"P": port}),
        {"P": 1.0},
        benchmark_symbol=None,  # We'll inject benchmark directly
        rolling_windows=[30],
        risk_free_rate=0.0,
        annualization_days=252,
        return_type="log",
        include_benchmark=False,
    )

    # Now test the helper directly
    from app.services.risk_service import _compute_benchmark_analytics

    bench_block, _ = _compute_benchmark_analytics(port, bench, 252, "log")
    assert bench_block["tracking_error_ann"] == pytest.approx(te_manual, rel=0.01)


def test_sharpe_uses_rf_adjustment():
    """Validate Sharpe ratio changes with risk-free rate and matches arithmetic annualization."""
    returns = _make_returns(mean=0.0005, std=0.01, n=500)

    sharpe_0 = calculate_sharpe_ratio(returns, risk_free_rate=0.0, return_type="log", ann_days=252)
    sharpe_4 = calculate_sharpe_ratio(returns, risk_free_rate=0.04, return_type="log", ann_days=252)

    # With positive rf, Sharpe should decrease
    assert sharpe_4 < sharpe_0, f"Sharpe with rf=4% ({sharpe_4}) should be < rf=0 ({sharpe_0})"

    # Matches arithmetic annualization definition
    rf_daily = _daily_rf(0.04, "log", 252)
    excess = returns - rf_daily
    expected = (excess.mean() * 252) / (returns.std() * np.sqrt(252))
    assert sharpe_4 == pytest.approx(float(expected), rel=1e-6)


def test_information_ratio_uses_active_mean_annualization():
    """Validate IR uses active.mean()*ann_days (not CAGR)."""
    rng = np.random.default_rng(321)
    dates = pd.date_range("2022-01-01", periods=260, freq="B")
    bench = pd.Series(rng.normal(0.0003, 0.01, 260), index=dates)
    active_noise = pd.Series(rng.normal(0.0002, 0.005, 260), index=dates)
    port = bench + active_noise

    from app.services.risk_service import _compute_benchmark_analytics

    block, _ = _compute_benchmark_analytics(port, bench, 252, "log")
    active = port - bench
    te_ann = active.std(ddof=1) * np.sqrt(252)
    expected_ir = (active.mean() * 252) / te_ann
    assert block["information_ratio"] == pytest.approx(float(expected_ir), rel=1e-6)


def test_daily_rf_conversion():
    """Validate daily rf conversion for log and simple."""
    annual_rf = 0.05
    ann_days = 252

    rf_log = _daily_rf(annual_rf, "log", ann_days)
    rf_simple = _daily_rf(annual_rf, "simple", ann_days)

    # Log: rf_daily = rf_annual / 252
    assert rf_log == pytest.approx(0.05 / 252, rel=1e-6)

    # Simple: (1 + rf)^(1/252) - 1
    expected_simple = (1 + 0.05) ** (1 / 252) - 1
    assert rf_simple == pytest.approx(expected_simple, rel=1e-6)


def test_annualize_return_log_vs_simple():
    """Validate annualization for log vs simple returns."""
    # Log returns: mean * 252
    log_returns = pd.Series([0.001] * 252)
    ann_log = _annualize_return(log_returns, "log", 252)
    assert ann_log == pytest.approx(0.252, rel=1e-4)

    # Simple returns: CAGR style
    simple_returns = pd.Series([0.001] * 252)
    ann_simple = _annualize_return(simple_returns, "simple", 252)
    expected_cagr = (1.001 ** 252) ** (252 / 252) - 1
    assert ann_simple == pytest.approx(expected_cagr, rel=1e-4)

