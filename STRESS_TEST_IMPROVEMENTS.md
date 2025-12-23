# Stress Test Page Improvements

## What Was Wrong?

The stress test page had several confusing aspects:

1. **Misleading UI**: The page showed "Multi-Factor" scenarios with different shocks for bonds, commodities, credit spreads, etc., but the backend was only applying a single uniform shock to everything.

2. **Confusing Date Range**: A date range picker was shown but completely unused - stress tests apply hypothetical shocks, not historical analysis.

3. **No Explanations**: Users had no clear understanding of:
   - How stress tests actually work
   - What the calculations mean
   - Why results look the way they do

4. **Unclear Sensitivity Analysis**: The sensitivity chart had no explanation that it's just a linear approximation.

5. **Historical Scenarios Misconception**: Users might think "COVID Crash" replays actual March 2020 data, when it just applies a -34% shock uniformly.

## What Was Fixed?

### Backend Improvements (`backend/app/services/stress_service.py`)

1. **Asset-Type Specific Shocks for Multi-Factor Scenarios**
   ```python
   # Now multi-factor scenarios properly apply different shocks by asset type
   MULTI_FACTOR_SCENARIOS = {
       "STAGFLATION": {
           "equity_shock": -0.15,
           "bond_shock": -0.10,
           "commodity_shock": 0.20,
           ...
       }
   }
   ```

2. **Asset Type Mapping**
   - Added `ASSET_TYPE_MAPPING` to classify common symbols (TLT=bond, GLD=commodity, etc.)
   - Added `_get_asset_type()` function to determine asset type
   - Added `_get_shock_for_asset()` to apply appropriate shock based on asset type

3. **Better Documentation**
   - Extensive docstrings explaining exactly how the calculations work
   - Clear notes that this is a simplified linear model
   - Examples showing the math: `weight × shock = P&L`

### Frontend Improvements (`frontend/src/pages/StressTests.tsx`)

1. **Added Prominent Info Banner**
   - Explains how stress tests work in plain English
   - Shows the calculation formula clearly
   - Clarifies what multi-factor and historical scenarios actually do

2. **Removed Confusing Date Range Picker**
   - Date range is not used in stress tests (only for API consistency)
   - Removed UI element to avoid confusion

3. **Enhanced Scenario Descriptions**
   - Each scenario type now has clear explanatory text
   - Multi-factor scenarios show which assets get which shocks
   - Historical scenarios clarify they're approximations, not replays

4. **Added Results Explanation Banner**
   - Shows the calculation formula with an example
   - Appears right above results to help users understand what they're seeing

5. **Improved Sensitivity Analysis**
   - Added explanation that it's a linear approximation
   - Better comments in the code explaining the calculation

### Documentation Updates

1. **Backend README** (`backend/README.md`)
   - Added "How Stress Tests Work" section
   - Listed all scenario types with clear descriptions
   - Added example response with explanation
   - Clear notes about limitations

2. **API Route Documentation** (`backend/app/api/routes_stress.py`)
   - Extensive Swagger/OpenAPI documentation
   - Step-by-step explanation of how calculations work
   - Complete list of all supported scenarios
   - Clear notes about what the model does and doesn't do

## How Stress Tests Actually Work

### The Simple Formula

For each asset in your portfolio:
```
P&L Impact = Asset Weight × Shock
```

For the entire portfolio:
```
Portfolio P&L = Sum of all asset P&L impacts
```

### Example

**Portfolio:**
- AAPL: 40% weight
- TLT: 60% weight

**Scenario:** EQUITY_-10 (uniform -10% shock)

**Calculation:**
- AAPL impact: 0.40 × -0.10 = -0.04 (-4%)
- TLT impact: 0.60 × -0.10 = -0.06 (-6%)
- **Total Portfolio P&L: -0.10 (-10%)**

### Multi-Factor Example

**Scenario:** STAGFLATION
- Stocks: -15% shock
- Bonds: -10% shock
- Commodities: +20% shock

**Portfolio:**
- AAPL (stock): 40% → 0.40 × -0.15 = -0.06
- TLT (bond): 40% → 0.40 × -0.10 = -0.04
- GLD (commodity): 20% → 0.20 × 0.20 = +0.04
- **Total Portfolio P&L: -0.06 (-6%)**

## Important Limitations (Now Clearly Communicated)

1. **Linear Model**: Assumes P&L is directly proportional to shock magnitude
2. **No Historical Data**: Doesn't use actual price movements or correlations
3. **No Rebalancing**: Assumes static portfolio weights
4. **Simplified Classification**: Asset types determined by symbol mapping
5. **No Dynamic Effects**: Doesn't model volatility spikes, liquidity effects, etc.

## Testing Your Changes

1. **Start the backend:**
   ```bash
   cd backend
   uvicorn app.main:app --reload --port 8000
   ```

2. **Test the API directly:**
   ```bash
   curl -X POST "http://localhost:8000/api/stress/run" \
     -H "Content-Type: application/json" \
     -d '{
       "portfolio": [
         {"symbol": "AAPL", "weight": 0.4, "asset_type": "stock"},
         {"symbol": "TLT", "weight": 0.4, "asset_type": "bond"},
         {"symbol": "GLD", "weight": 0.2, "asset_type": "commodity"}
       ],
       "start": "2023-01-01",
       "end": "2024-12-01",
       "scenario": "STAGFLATION"
     }'
   ```

3. **Check the Swagger docs:**
   Visit: http://localhost:8000/docs
   Navigate to `/api/stress/run` to see the new documentation

4. **Test the frontend:**
   - Navigate to the Stress Tests page
   - Notice the new info banners explaining how it works
   - Try different scenario types and see the appropriate shocks applied
   - Check that multi-factor scenarios now properly differentiate between asset types

## Summary

The stress test page now:
- ✅ Clearly explains what stress tests are and how they work
- ✅ Properly implements multi-factor scenarios with asset-specific shocks
- ✅ Removes confusing/unused UI elements (date range)
- ✅ Provides helpful context throughout the user experience
- ✅ Sets correct expectations about limitations
- ✅ Has comprehensive documentation for developers and users


