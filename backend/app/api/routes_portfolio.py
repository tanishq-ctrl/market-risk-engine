"""Portfolio management API routes."""
from fastapi import APIRouter, HTTPException
import logging

from app.models.schemas import NormalizePortfolioRequest, NormalizePortfolioResponse
from app.services.portfolio_service import normalize_portfolio_rows

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/portfolio", tags=["portfolio"])


@router.post("/normalize", response_model=NormalizePortfolioResponse)
async def normalize_portfolio(request: NormalizePortfolioRequest):
    """
    Normalize portfolio weights.
    
    Aggregates duplicate symbols and normalizes weights to sum to 1.0.
    """
    try:
        normalized, was_normalized, sum_before = normalize_portfolio_rows(
            request.portfolio
        )
        
        return NormalizePortfolioResponse(
            portfolio=normalized,
            was_normalized=was_normalized,
            sum_before=sum_before
        )
    
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error normalizing portfolio: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal error: {str(e)}")

