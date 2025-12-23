import pytest

from app.services.stress_service import run_stress_test, STRICT_CUSTOM_SHOCKS


def _portfolio():
    return [
        type("Row", (), {"symbol": "AAPL", "weight": 0.6, "asset_type": "stock"}),
        type("Row", (), {"symbol": "TLT", "weight": 0.4, "asset_type": "bond"}),
    ]


def test_equity_scenario_parsing():
    res = run_stress_test(_portfolio(), "EQUITY_-10")
    # EQUITY_-10 applies -10% to all assets (uniform shock)
    # Portfolio: AAPL 0.6, TLT 0.4
    # P&L: (0.6 + 0.4) * -0.10 = -0.10
    assert pytest.approx(res["portfolio_pnl"], rel=1e-6) == -0.10
    assert res["scenario_key"] == "EQUITY_-10"


def test_custom_shocks_case_insensitive():
    shocks = {"aapl": -0.1, "tlt": -0.05}
    res = run_stress_test(_portfolio(), "CUSTOM", shocks)
    # Portfolio: AAPL 0.6, TLT 0.4
    # P&L: 0.6 * -0.1 + 0.4 * -0.05 = -0.06 - 0.02 = -0.08
    assert res["portfolio_pnl"] == pytest.approx(-0.08)
    assert res["scenario_key"] == "CUSTOM"


def test_missing_custom_shocks_raises():
    shocks = {"AAPL": -0.1}
    with pytest.raises(ValueError):
        run_stress_test(_portfolio(), "CUSTOM", shocks)


def test_multifactor_sets_scenario_key():
    res = run_stress_test(_portfolio(), "STAGFLATION")
    assert res["scenario_key"] == "STAGFLATION"
    assert "STAGFLATION" in res["scenario_name"]


def test_historical_sets_scenario_key():
    res = run_stress_test(_portfolio(), "COVID_CRASH")
    assert res["scenario_key"] == "COVID_CRASH"


def test_custom_missing_shocks_non_strict(monkeypatch):
    import app.services.stress_service as ss
    monkeypatch.setattr(ss, "STRICT_CUSTOM_SHOCKS", False)
    shocks = {"AAPL": -0.1}
    res = ss.run_stress_test(_portfolio(), "CUSTOM", shocks)
    assert res["missing_shocks"] == ["TLT"]
    assert res["scenario_key"] == "CUSTOM"


def test_net_gross_exposure():
    port = [
        type("Row", (), {"symbol": "AAPL", "weight": 0.7, "asset_type": "stock"}),
        type("Row", (), {"symbol": "TLT", "weight": -0.3, "asset_type": "bond"}),
    ]
    res = run_stress_test(port, "EQUITY_-10")
    assert res["net_exposure"] == pytest.approx(0.4)
    assert res["gross_exposure"] == pytest.approx(1.0)


