"""Tests for advanced stress testing features."""
import pytest
from app.models.schemas import PortfolioRow
from app.services.stress_service import run_stress_test, _calculate_bond_return_from_rate_shock


class TestCaseInsensitiveCustomShocks:
    """Test case-insensitive custom shock validation."""
    
    def test_custom_shocks_case_insensitive_match(self):
        """Custom shocks should match symbols case-insensitively."""
        portfolio = [
            PortfolioRow(symbol="AAPL", weight=0.5),
            PortfolioRow(symbol="googl", weight=0.3),
            PortfolioRow(symbol="TLT", weight=0.2),
        ]
        
        # Shocks with different casing
        shocks = {
            "aapl": -0.10,  # lowercase
            "GOOGL": -0.08,  # uppercase
            "tlt": 0.02,    # lowercase
        }
        
        result = run_stress_test(portfolio, "CUSTOM", shocks)
        
        # Should not have missing shocks
        assert result["missing_shocks"] is None or len(result["missing_shocks"]) == 0
        
        # Check that shocks were applied correctly
        assert len(result["by_asset"]) == 3
        
        # Symbols should be normalized to uppercase in results
        symbols_in_result = {asset["symbol"] for asset in result["by_asset"]}
        assert symbols_in_result == {"AAPL", "GOOGL", "TLT"}
        
        # Check P&L calculation
        expected_pnl = 0.5 * -0.10 + 0.3 * -0.08 + 0.2 * 0.02
        assert abs(result["portfolio_pnl"] - expected_pnl) < 1e-6
    
    def test_custom_shocks_missing_symbols_detected(self):
        """Missing custom shocks should be detected (case-insensitive)."""
        portfolio = [
            PortfolioRow(symbol="AAPL", weight=0.5),
            PortfolioRow(symbol="MSFT", weight=0.5),
        ]
        
        # Only provide shock for AAPL
        shocks = {"aapl": -0.10}
        
        # Should raise ValueError for strict mode
        with pytest.raises(ValueError, match="missing shocks"):
            run_stress_test(portfolio, "CUSTOM", shocks)


class TestHistoricalScenarioFormats:
    """Test backward compatibility with float and new dict formats."""
    
    def test_dict_scenario_equity_shock(self):
        """Dict-format historical scenario should apply equity_shock to stocks."""
        portfolio = [
            PortfolioRow(symbol="AAPL", weight=0.6, asset_type="equity"),
            PortfolioRow(symbol="MSFT", weight=0.4, asset_type="equity"),
        ]
        
        result = run_stress_test(portfolio, "COVID_CRASH", stress_mode="return_shock")
        
        # COVID_CRASH has equity_shock: -0.34
        expected_pnl = (0.6 + 0.4) * -0.34
        assert abs(result["portfolio_pnl"] - expected_pnl) < 1e-6
    
    def test_dict_scenario_multi_asset(self):
        """Dict-format scenario should apply different shocks by asset type."""
        portfolio = [
            PortfolioRow(symbol="SPY", weight=0.5, asset_type="equity"),
            PortfolioRow(symbol="TLT", weight=0.3, asset_type="bond"),
            PortfolioRow(symbol="HYG", weight=0.2, asset_type="credit"),
        ]
        
        result = run_stress_test(portfolio, "COVID_CRASH", stress_mode="return_shock")
        
        # COVID_CRASH: equity -34%, credit -25%, bond has rate shock but in return mode uses fallback
        # In return_shock mode, bonds without explicit bond_shock use equity_shock as fallback
        expected_pnl = 0.5 * -0.34 + 0.3 * -0.34 + 0.2 * -0.25
        assert abs(result["portfolio_pnl"] - expected_pnl) < 1e-2  # Allow small difference for fallback logic


class TestDurationRateShock:
    """Test duration-based rate shock calculations."""
    
    def test_duration_calculation_basic(self):
        """Test basic duration calculation: ΔP/P ≈ -Duration × Δy."""
        # 100 bps rate increase with duration 6
        return_shock = _calculate_bond_return_from_rate_shock(
            rate_bps=100,
            duration=6.0
        )
        
        # ΔP/P = -6 × (100/10000) = -6 × 0.01 = -0.06 = -6%
        expected = -0.06
        assert abs(return_shock - expected) < 1e-6
    
    def test_duration_calculation_negative_rate(self):
        """Test duration with negative rate shock (rates down, prices up)."""
        # -75 bps rate decrease with duration 7
        return_shock = _calculate_bond_return_from_rate_shock(
            rate_bps=-75,
            duration=7.0
        )
        
        # ΔP/P = -7 × (-75/10000) = -7 × -0.0075 = 0.0525 = 5.25%
        expected = 0.0525
        assert abs(return_shock - expected) < 1e-6
    
    def test_duration_fallback_no_duration(self):
        """Test fallback when no duration provided."""
        return_shock = _calculate_bond_return_from_rate_shock(
            rate_bps=100
        )
        
        # Should return 0 when no duration info available
        assert return_shock == 0.0
    
    def test_duration_from_dv01(self):
        """Test duration inference from DV01."""
        # DV01 (per $100 notional) = Duration × Price × 0.01
        # If DV01 = 6, Price = 100:
        # Duration = (6 × 100) / 100 = 6
        return_shock = _calculate_bond_return_from_rate_shock(
            rate_bps=100,
            dv01=6.0,
            price=100.0
        )
        
        # With implied duration = 6, return shock = -6 × 0.01 = -0.06
        expected = -0.06
        assert abs(return_shock - expected) < 1e-4


class TestDurationModeIntegration:
    """Test full integration of duration_rate_shock mode."""
    
    def test_bond_portfolio_duration_mode(self):
        """Test bond portfolio with duration in duration_rate_shock mode."""
        portfolio = [
            PortfolioRow(
                symbol="TLT",
                weight=0.5,
                asset_type="bond",
                duration=15.0  # Long-duration treasury
            ),
            PortfolioRow(
                symbol="IEF",
                weight=0.5,
                asset_type="bond",
                duration=7.5  # Intermediate treasury
            ),
        ]
        
        result = run_stress_test(
            portfolio,
            "COVID_CRASH",  # Has bond_rate_bps: -75
            stress_mode="duration_rate_shock"
        )
        
        # COVID_CRASH: bond_rate_bps = -75 (rates down, prices up)
        # TLT: return = -15 × (-75/10000) = 0.1125 = 11.25%
        # IEF: return = -7.5 × (-75/10000) = 0.05625 = 5.625%
        tlt_pnl = 0.5 * 0.1125
        ief_pnl = 0.5 * 0.05625
        expected_pnl = tlt_pnl + ief_pnl
        
        assert abs(result["portfolio_pnl"] - expected_pnl) < 1e-4
        
        # Check metadata in by_asset
        tlt_result = next(a for a in result["by_asset"] if a["symbol"] == "TLT")
        assert tlt_result.get("shock_type") == "rate_bps"
        assert tlt_result.get("rate_bps_applied") == -75
    
    def test_mixed_portfolio_duration_mode(self):
        """Test mixed portfolio with stocks and bonds in duration mode."""
        portfolio = [
            PortfolioRow(
                symbol="SPY",
                weight=0.6,
                asset_type="equity"
            ),
            PortfolioRow(
                symbol="TLT",
                weight=0.4,
                asset_type="bond",
                duration=15.0
            ),
        ]
        
        result = run_stress_test(
            portfolio,
            "COVID_CRASH",
            stress_mode="duration_rate_shock"
        )
        
        # SPY: equity_shock = -0.34
        # TLT: duration shock = -15 × (-75/10000) = 0.1125
        expected_pnl = 0.6 * -0.34 + 0.4 * 0.1125
        
        assert abs(result["portfolio_pnl"] - expected_pnl) < 1e-4
    
    def test_bond_without_duration_fallback(self):
        """Test bond without duration falls back to return shock."""
        portfolio = [
            PortfolioRow(
                symbol="TLT",
                weight=1.0,
                asset_type="bond"
                # No duration provided
            ),
        ]
        
        result = run_stress_test(
            portfolio,
            "COVID_CRASH",
            stress_mode="duration_rate_shock"
        )
        
        # Should fall back to equity_shock since no duration and no explicit bond_shock
        # COVID_CRASH dict has equity_shock: -0.34
        expected_pnl = 1.0 * -0.34
        assert abs(result["portfolio_pnl"] - expected_pnl) < 1e-2


class TestBackwardCompatibility:
    """Ensure all changes are backward compatible."""
    
    def test_default_mode_unchanged(self):
        """Default behavior (return_shock) should be unchanged."""
        portfolio = [
            PortfolioRow(symbol="AAPL", weight=0.6),
            PortfolioRow(symbol="MSFT", weight=0.4),
        ]
        
        result = run_stress_test(portfolio, "EQUITY_-10")
        
        # Should behave exactly as before
        expected_pnl = (0.6 + 0.4) * -0.10
        assert abs(result["portfolio_pnl"] - expected_pnl) < 1e-6
    
    def test_response_shape_preserved(self):
        """Response should have all expected fields."""
        portfolio = [
            PortfolioRow(symbol="AAPL", weight=1.0),
        ]
        
        result = run_stress_test(portfolio, "EQUITY_-10")
        
        # Check all required fields exist
        assert "scenario_name" in result
        assert "scenario_key" in result
        assert "portfolio_pnl" in result
        assert "by_asset" in result
        assert "net_exposure" in result
        assert "gross_exposure" in result
        assert "weights_sum" in result
        assert "top_loss_contributors" in result
        
        # by_asset should have required fields
        assert len(result["by_asset"]) > 0
        asset = result["by_asset"][0]
        assert "symbol" in asset
        assert "shock" in asset
        assert "pnl" in asset
    
    def test_multifactor_scenarios_unchanged(self):
        """Multi-factor scenarios should work as before."""
        portfolio = [
            PortfolioRow(symbol="SPY", weight=0.5, asset_type="equity"),
            PortfolioRow(symbol="TLT", weight=0.3, asset_type="bond"),
            PortfolioRow(symbol="GLD", weight=0.2, asset_type="commodity"),
        ]
        
        result = run_stress_test(portfolio, "STAGFLATION")
        
        # STAGFLATION: equity -15%, bond -10%, commodity +20%
        expected_pnl = 0.5 * -0.15 + 0.3 * -0.10 + 0.2 * 0.20
        assert abs(result["portfolio_pnl"] - expected_pnl) < 1e-6


if __name__ == "__main__":
    pytest.main([__file__, "-v"])

