"""Stress testing API routes."""
from fastapi import APIRouter, HTTPException
import logging

from app.models.schemas import StressRequest, StressResponse
from app.services.stress_service import run_stress_test

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/stress", tags=["stress"])


@router.post("/run", response_model=StressResponse)
async def run_stress(request: StressRequest):
    """
    Run stress test scenario on a portfolio.
    
    Applies hypothetical percentage shocks to portfolio assets and calculates impact.
    
    **How it works:**
    - Each asset receives a shock (e.g., -10% = -0.10)
    - P&L impact = Asset Weight × Shock
    - Portfolio P&L = Sum of all asset P&Ls
    
    **Example:**
    - Asset with 40% weight and -10% shock contributes -4% to portfolio P&L
    - (0.40 × -0.10 = -0.04)
    
    **Scenario Types:**
    
    1. **Predefined (Quick)**: Uniform shocks applied to all assets
       - EQUITY_-5: All assets -5%
       - EQUITY_-10: All assets -10%
       - EQUITY_-20: All assets -20%
    
    2. **Historical**: Approximations of historical crises (uniform shock)
       - COVID_CRASH: -34% (March 2020)
       - FINANCIAL_CRISIS: -50% (2008)
       - DOTCOM_BUBBLE: -30% (2000-2002)
       - BLACK_MONDAY: -22.6% (1987)
       - TAPER_TANTRUM: -6% (2013)
       - EUROPEAN_DEBT: -19% (2011)
       - FLASH_CRASH: -9% (2010)
    
    3. **Multi-Factor**: Asset-type specific shocks
       - STAGFLATION: Stocks -15%, Bonds -10%, Commodities +20%
       - RATE_SHOCK: Stocks -12%, Bonds -8%, Growth -20%
       - LIQUIDITY_CRISIS: Stocks -25%, Credit -35%
       - CORRELATION_BREAKDOWN: Stocks -20%, Bonds -15%
       
       *Note: Asset types determined by symbol (e.g., TLT=bond, GLD=commodity)*
    
    4. **Custom**: User-defined shocks per asset
       - CUSTOM (requires shocks dictionary)
    
    **Important Notes:**
    - This is a simplified linear shock model
    - Does NOT use historical price data or correlations
    - Does NOT replay actual historical events
    - start/end dates are not used (passed for API consistency)
    """
    try:
        # Validate CUSTOM scenario has shocks
        if request.scenario == "CUSTOM":
            if not request.shocks:
                raise ValueError("CUSTOM scenario requires 'shocks' dictionary")
        
        # Run stress test (validation happens in service layer)
        result = run_stress_test(
            request.portfolio,
            request.scenario,
            request.shocks,
            stress_mode=getattr(request, 'stress_mode', 'return_shock')
        )
        
        return StressResponse(**result)
    
    except ValueError as e:
        logger.error(f"ValueError in stress test: {e}", exc_info=True)
        raise HTTPException(status_code=400, detail=str(e))
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error running stress test: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal error: {str(e)}")

