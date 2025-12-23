# Stress Testing Module Upgrade

## Overview

This document describes the industry-realistic upgrades made to the stress testing module while maintaining full backward compatibility.

## What Changed

### 1. Backend Enhancements

#### New Optional Portfolio Fields
- `duration`: Modified duration for bonds (years)
- `dv01`: Dollar value of 1 basis point for bonds
- `currency`: Currency code (e.g., USD, EUR)
- `price`: Current price per unit
- `quantity`: Number of units held

All fields are **optional** and backward compatible.

#### New Stress Modes

**`return_shock` (Default)**
- Linear model: P&L = weight × shock
- Behavior identical to previous version
- Works for all asset types

**`duration_rate_shock` (Advanced)**
- For bonds with duration/DV01: Converts rate shocks (bps) to price shocks using modified duration
- Formula: ΔP/P ≈ -Duration × (rate_bps / 10000)
- Falls back to return_shock if duration unavailable
- Equities and other assets use return_shock

#### Enhanced Historical Scenarios

Historical scenarios now support **dict format** with multi-asset shocks:

```python
"COVID_CRASH": {
    "equity_shock": -0.34,      # Stocks -34%
    "credit_shock": -0.25,      # Credit -25%
    "bond_rate_bps": -75,       # Rates down 75bps (prices up)
    "commodity_shock": 0.05,    # Commodities +5%
    "description": "S&P 500 -34% in March 2020"
}
```

Legacy float format still works:
```python
"BLACK_MONDAY": -0.226  # Uniform -22.6% shock
```

#### Case-Insensitive Custom Shocks

Custom shocks now match symbols case-insensitively:
- Portfolio symbol: `AAPL`, `aapl`, `Aapl` all work
- Shock keys: Automatically normalized to uppercase

#### New Response Fields (Optional)

Added to `by_asset` items for transparency:
- `asset_type`: Asset type used for shock selection
- `shock_type`: "return" or "rate_bps"
- `rate_bps_applied`: Rate shock in basis points (if applicable)

### 2. Frontend Enhancements

#### Advanced Mode Toggle
- **Off by default**: Standard behavior preserved
- **When ON**: Shows stress mode selector

#### Stress Mode Selector
- Return Shock (Default): Linear model
- Duration/Rate Shock (Bonds): Uses duration approximation

#### Helper Text
- Explains what each mode does
- Warns when duration is required

### 3. Test Coverage

**14 new tests** covering:
- Case-insensitive custom shock validation
- Historical scenario dict vs float formats
- Duration-based rate shock calculations
- DV01 to duration inference
- Mixed portfolios (stocks + bonds)
- Fallback behavior
- Backward compatibility

All **7 existing tests** pass with corrected expectations.

## Usage Examples

### Example 1: Default Mode (Unchanged)

```python
# Backend
portfolio = [
    PortfolioRow(symbol="AAPL", weight=0.6),
    PortfolioRow(symbol="TLT", weight=0.4),
]
result = run_stress_test(portfolio, "EQUITY_-10")
# P&L: -10% across all assets
```

```typescript
// Frontend (unchanged)
stressRun({
  portfolio: [
    { symbol: "AAPL", weight: 0.6 },
    { symbol: "TLT", weight: 0.4 }
  ],
  start: "2023-01-01",
  end: "2024-01-01",
  scenario: "EQUITY_-10"
})
```

### Example 2: Advanced Mode with Duration

```python
# Backend
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
        duration=15.0  # 15-year modified duration
    ),
]

# COVID_CRASH has bond_rate_bps: -75 (rates down)
result = run_stress_test(
    portfolio, 
    "COVID_CRASH",
    stress_mode="duration_rate_shock"
)

# Results:
# SPY: equity_shock = -34%, P&L = 0.6 × -0.34 = -0.204
# TLT: rate shock = -75bps → return ≈ -15 × (-0.0075) = +11.25%
#      P&L = 0.4 × 0.1125 = +0.045
# Total: -0.204 + 0.045 = -0.159 (-15.9%)
```

```typescript
// Frontend (advanced mode ON)
stressRun({
  portfolio: [
    { symbol: "SPY", weight: 0.6, asset_type: "equity" },
    { 
      symbol: "TLT", 
      weight: 0.4, 
      asset_type: "bond",
      duration: 15.0
    }
  ],
  start: "2023-01-01",
  end: "2024-01-01",
  scenario: "COVID_CRASH",
  stress_mode: "duration_rate_shock"  // New parameter
})
```

### Example 3: Case-Insensitive Custom Shocks

```python
portfolio = [
    PortfolioRow(symbol="AAPL", weight=0.5),
    PortfolioRow(symbol="googl", weight=0.3),  # lowercase
    PortfolioRow(symbol="MSFT", weight=0.2),
]

# Shocks with mixed casing - now works!
shocks = {
    "aapl": -0.10,   # lowercase
    "GOOGL": -0.08,  # uppercase
    "msft": -0.12    # lowercase
}

result = run_stress_test(portfolio, "CUSTOM", shocks)
# All symbols matched correctly
```

## Technical Details

### Duration Approximation

The duration-based rate shock uses the standard bond approximation:

```
ΔP/P ≈ -Duration × Δy
```

Where:
- `ΔP/P`: Percentage price change
- `Duration`: Modified duration in years
- `Δy`: Yield change in decimal (rate_bps / 10000)

**DV01 to Duration Conversion:**
```
DV01 (per $100) = Duration × Price × 0.01
Duration = (DV01 × 100) / Price
```

**Limitations:**
- Assumes linear relationship (ignores convexity)
- Doesn't account for coupon structure
- Approximation works best for small rate changes (<200bps)

### Backward Compatibility Guarantees

1. **API Routes**: No URL changes, no field removals
2. **Existing Scenarios**: All work identically
3. **Default Behavior**: `stress_mode` defaults to `return_shock`
4. **Response Shape**: Required fields unchanged, optional fields added
5. **Frontend UI**: Standard mode unchanged, advanced features opt-in

### Migration Path

**No migration required!** Existing code continues to work as-is.

**To use new features:**
1. Add duration/DV01 to bond positions (optional)
2. Enable "Advanced" toggle in UI
3. Select "Duration/Rate Shock" mode
4. Run stress test

## Scenario Reference

### Predefined Scenarios (Uniform)
- `EQUITY_-5`, `EQUITY_-10`, `EQUITY_-20`: Uniform shocks

### Historical Scenarios (Multi-Asset)
- `COVID_CRASH`: Equity -34%, Credit -25%, Rates -75bps
- `FINANCIAL_CRISIS`: Equity -50%, Credit -40%, Rates -150bps
- `DOTCOM_BUBBLE`: Equity -30%, Growth -60%, Rates -50bps
- `BLACK_MONDAY`: Equity -22.6%
- `TAPER_TANTRUM`: Equity -6%, Rates +50bps
- `EUROPEAN_DEBT`: Equity -19%, Credit -15%, Rates +25bps
- `FLASH_CRASH`: Equity -9%

### Multi-Factor Scenarios
- `STAGFLATION`: Equity -15%, Bonds -10%, Commodities +20%
- `RATE_SHOCK`: Equity -12%, Bonds -8%, Growth -20%
- `LIQUIDITY_CRISIS`: Equity -25%, Credit -35%
- `CORRELATION_BREAKDOWN`: Equity -20%, Bonds -15%

## Testing

Run all stress tests:
```bash
cd backend
python -m pytest tests/test_stress_service.py tests/test_stress_service_advanced.py -v
```

Expected: **21 tests pass, 0 failures**

## Future Enhancements

Potential additions (not implemented):
- Convexity adjustments for large rate moves
- FX shock propagation
- Volatility surface shocks
- Correlation breakdown modeling
- Path-dependent scenarios

## Questions?

See the code comments in:
- `backend/app/services/stress_service.py` (core logic)
- `backend/app/models/schemas.py` (request/response models)
- `frontend/src/pages/StressTests.tsx` (UI controls)

