#!/usr/bin/env python
"""
Quick verification script for stress testing upgrades.
Run this to verify all new features work correctly.
"""

from app.models.schemas import PortfolioRow
from app.services.stress_service import run_stress_test

def test_default_mode():
    """Test 1: Default mode unchanged"""
    print("\n=== Test 1: Default Mode (Backward Compatible) ===")
    portfolio = [
        PortfolioRow(symbol="AAPL", weight=0.6),
        PortfolioRow(symbol="TLT", weight=0.4),
    ]
    result = run_stress_test(portfolio, "EQUITY_-10")
    print(f"Scenario: EQUITY_-10")
    print(f"Portfolio P&L: {result['portfolio_pnl']:.2%}")
    print(f"Expected: -10.00%")
    assert abs(result['portfolio_pnl'] - (-0.10)) < 1e-6
    print("✓ PASSED\n")

def test_case_insensitive():
    """Test 2: Case-insensitive custom shocks"""
    print("=== Test 2: Case-Insensitive Custom Shocks ===")
    portfolio = [
        PortfolioRow(symbol="AAPL", weight=0.5),
        PortfolioRow(symbol="googl", weight=0.3),  # lowercase
        PortfolioRow(symbol="MSFT", weight=0.2),
    ]
    shocks = {
        "aapl": -0.10,   # lowercase
        "GOOGL": -0.08,  # uppercase
        "msft": -0.12    # lowercase
    }
    result = run_stress_test(portfolio, "CUSTOM", shocks)
    expected = 0.5 * -0.10 + 0.3 * -0.08 + 0.2 * -0.12
    print(f"Scenario: CUSTOM (mixed case)")
    print(f"Portfolio P&L: {result['portfolio_pnl']:.2%}")
    print(f"Expected: {expected:.2%}")
    assert abs(result['portfolio_pnl'] - expected) < 1e-6
    assert not result.get('missing_shocks') or len(result['missing_shocks']) == 0
    print("✓ PASSED\n")

def test_historical_dict():
    """Test 3: Historical scenario with dict format"""
    print("=== Test 3: Multi-Asset Historical Scenario ===")
    portfolio = [
        PortfolioRow(symbol="SPY", weight=0.5, asset_type="equity"),
        PortfolioRow(symbol="HYG", weight=0.3, asset_type="credit"),
        PortfolioRow(symbol="TLT", weight=0.2, asset_type="bond"),
    ]
    result = run_stress_test(portfolio, "COVID_CRASH", stress_mode="return_shock")
    print(f"Scenario: COVID_CRASH")
    print(f"SPY (equity): -34%, HYG (credit): -25%, TLT (bond): -34% (fallback)")
    print(f"Portfolio P&L: {result['portfolio_pnl']:.2%}")
    # SPY: 0.5 * -0.34, HYG: 0.3 * -0.25, TLT: 0.2 * -0.34 (fallback to equity)
    expected = 0.5 * -0.34 + 0.3 * -0.25 + 0.2 * -0.34
    print(f"Expected (approx): {expected:.2%}")
    assert abs(result['portfolio_pnl'] - expected) < 0.02  # Allow for fallback logic
    print("✓ PASSED\n")

def test_duration_mode():
    """Test 4: Duration-based rate shock"""
    print("=== Test 4: Duration-Based Rate Shock ===")
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
            duration=15.0  # Long-duration treasury
        ),
    ]
    result = run_stress_test(
        portfolio, 
        "COVID_CRASH",
        stress_mode="duration_rate_shock"
    )
    print(f"Scenario: COVID_CRASH (duration mode)")
    print(f"SPY: equity_shock = -34%")
    print(f"TLT: bond_rate_bps = -75 → duration effect ≈ +11.25%")
    print(f"Portfolio P&L: {result['portfolio_pnl']:.2%}")
    
    # SPY: 0.6 * -0.34 = -0.204
    # TLT: rate shock -75bps, duration 15 → return ≈ -15 * (-0.0075) = +0.1125
    #      0.4 * 0.1125 = +0.045
    expected = 0.6 * -0.34 + 0.4 * 0.1125
    print(f"Expected: {expected:.2%}")
    assert abs(result['portfolio_pnl'] - expected) < 1e-3
    
    # Check metadata
    tlt_asset = next(a for a in result['by_asset'] if a['symbol'] == 'TLT')
    assert tlt_asset.get('shock_type') == 'rate_bps'
    assert tlt_asset.get('rate_bps_applied') == -75
    print("✓ PASSED\n")

def test_mixed_portfolio_duration():
    """Test 5: Mixed portfolio with duration fallback"""
    print("=== Test 5: Bond Without Duration (Fallback) ===")
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
    print(f"Scenario: COVID_CRASH (duration mode, no duration provided)")
    print(f"TLT: No duration → falls back to equity_shock = -34%")
    print(f"Portfolio P&L: {result['portfolio_pnl']:.2%}")
    expected = 1.0 * -0.34
    print(f"Expected: {expected:.2%}")
    assert abs(result['portfolio_pnl'] - expected) < 0.01
    print("✓ PASSED\n")

def main():
    print("\n" + "="*60)
    print("STRESS TESTING UPGRADE VERIFICATION")
    print("="*60)
    
    try:
        test_default_mode()
        test_case_insensitive()
        test_historical_dict()
        test_duration_mode()
        test_mixed_portfolio_duration()
        
        print("="*60)
        print("ALL TESTS PASSED! ✓")
        print("="*60)
        print("\nStress testing upgrade verified successfully.")
        print("- Backward compatibility maintained")
        print("- Case-insensitive shocks working")
        print("- Multi-asset historical scenarios working")
        print("- Duration-based rate shocks working")
        print("- Fallback logic working")
        
    except AssertionError as e:
        print(f"\n❌ TEST FAILED: {e}")
        return 1
    except Exception as e:
        print(f"\n❌ ERROR: {e}")
        import traceback
        traceback.print_exc()
        return 1
    
    return 0

if __name__ == "__main__":
    exit(main())

