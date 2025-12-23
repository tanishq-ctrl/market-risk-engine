import numpy as np
import pandas as pd
import pytest

from app.services.var_service import (
    _aggregate_returns,
    _weighted_quantile,
    compute_var,
    parametric_var_cvar,
)


def test_weighted_quantile_matches_manual():
    values = np.array([1.0, 2.0, 3.0, 4.0])
    weights = np.array([0.1, 0.2, 0.3, 0.4])
    median = _weighted_quantile(values, weights, 0.5)
    assert median == pytest.approx(3.0)


def test_student_t_converges_to_normal_for_high_df():
    rng = np.random.default_rng(42)
    series = pd.Series(rng.normal(0, 0.01, 5_000))
    warnings: list[str] = []
    var_norm, cvar_norm, _ = parametric_var_cvar(series, 0.99, dist="normal", warnings=warnings)
    var_t, cvar_t, meta_t = parametric_var_cvar(series, 0.99, dist="student_t", warnings=warnings)
    # High df should approximate normal
    assert meta_t["df"] > 10
    assert var_t == pytest.approx(var_norm, rel=0.1)
    assert cvar_t == pytest.approx(cvar_norm, rel=0.1)


def test_component_var_sums_to_total():
    rng = np.random.default_rng(1)
    asset_returns = pd.DataFrame(
        rng.normal(0, 0.01, (1000, 2)),
        columns=["A", "B"],
    )
    weights = {"A": 0.6, "B": 0.4}
    portfolio_returns = asset_returns.mul([weights["A"], weights["B"]], axis=1).sum(axis=1)

    res = compute_var(
        portfolio_returns,
        asset_returns,
        weights,
        method="parametric",
        confidence=0.95,
    )
    contributions = res["contributions_var"]
    assert all(c["component_var"] >= 0 for c in contributions)
    comp_sum = sum(c["component_var"] for c in contributions)
    assert comp_sum == pytest.approx(res["var"], rel=0.05)


def test_horizon_scaling_simple_and_log():
    series = pd.Series([0.01, 0.02])
    simple_h2 = _aggregate_returns(series, "simple", 2)
    log_series = pd.Series(np.log(1 + series))
    log_h2 = _aggregate_returns(log_series, "log", 2)

    expected_simple = (1.01 * 1.02) - 1
    expected_log = np.log(1.01) + np.log(1.02)

    assert float(simple_h2.iloc[0]) == pytest.approx(expected_simple, rel=1e-6)
    assert float(log_h2.iloc[0]) == pytest.approx(expected_log, rel=1e-6)


def test_component_var_z_positive():
    rng = np.random.default_rng(7)
    asset_returns = pd.DataFrame(rng.normal(0, 0.005, (800, 2)), columns=["X", "Y"])
    weights = {"X": 0.7, "Y": 0.3}
    port = asset_returns.mul([weights["X"], weights["Y"]], axis=1).sum(axis=1)
    res = compute_var(
        port,
        asset_returns,
        weights,
        method="parametric",
        confidence=0.975,
    )
    comps = res["contributions_var"]
    assert all(c["component_var"] >= 0 for c in comps)
    assert sum(c["component_var"] for c in comps) == pytest.approx(res["var"], rel=0.05)


def test_rolling_parametric_no_double_scale():
    rng = np.random.default_rng(21)
    daily = pd.Series(rng.normal(0.0005, 0.001, 400))
    # Use simple returns, horizon 5 days
    res = compute_var(
        daily,
        None,
        None,
        method="parametric",
        confidence=0.95,
        horizon_days=5,
        return_type="simple",
        rolling_window=120,
    )
    overall_var = res["var"]
    rolling = res["rolling"]
    assert rolling is not None
    # Rolling var should be in same order of magnitude as overall var (no ~5x blow-up)
    assert max(rolling["var_series"]) <= overall_var * 2


def test_mc_return_type_log_consistency():
    rng = np.random.default_rng(99)
    asset_returns = pd.DataFrame(rng.normal(0, 0.01, (500, 2)), columns=["A", "B"])
    weights = {"A": 0.5, "B": 0.5}
    port = asset_returns.dot(np.array([weights["A"], weights["B"]]))
    res = compute_var(
        port,
        asset_returns,
        weights,
        method="monte_carlo",
        confidence=0.95,
        mc_sims=20000,
        return_type="log",
        horizon_days=1,
    )
    assert res["histogram_simulated"] is not None
    # Recompute expected VaR directly from MC engine to compare
    from app.services.var_service import monte_carlo_var_cvar

    expected_var, _, sim_returns, _ = monte_carlo_var_cvar(
        asset_returns,
        weights,
        0.95,
        n_sims=20000,
        return_type="log",
    )
    assert res["var"] == pytest.approx(expected_var, rel=0.05)
    # Ensure simulated histogram aligns with simulated returns length
    assert len(sim_returns) == 20000

