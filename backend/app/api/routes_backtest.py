"""Backtesting API routes."""
from fastapi import APIRouter, HTTPException
import logging

from app.models.schemas import BacktestRequest, BacktestResponse
from app.services.data_service import fetch_prices
from app.services.preprocessing_service import clean_prices
from app.services.returns_service import compute_returns, portfolio_returns
from app.services.backtest_service import backtest_var
from app.services.portfolio_service import filter_failed_symbols
from app.utils.dates import validate_dates

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/backtest", tags=["backtest"])


@router.post("/var", response_model=BacktestResponse)
async def backtest_var_endpoint(request: BacktestRequest):
    """
    Backtest VaR model.
    
    Computes rolling VaR and compares with realized returns to test model accuracy.
    """
    try:
        # Validate dates
        validate_dates(request.start, request.end)
        
        # Get portfolio symbols
        symbols = [row.symbol for row in request.portfolio]
        weights = {row.symbol: row.weight for row in request.portfolio}
        
        # Fetch and clean prices
        prices_df, failed_symbols, _ = fetch_prices(symbols, request.start, request.end)
        
        if prices_df.empty:
            raise HTTPException(
                status_code=400,
                detail="No price data available"
            )
        
        # Filter failed symbols
        portfolio_rows, _ = filter_failed_symbols(request.portfolio, failed_symbols)
        symbols = [row.symbol for row in portfolio_rows]
        weights = {row.symbol: row.weight for row in portfolio_rows}
        
        # Clean prices
        cleaned_df, additional_failed, _ = clean_prices(prices_df, [])
        if additional_failed:
            portfolio_rows, _ = filter_failed_symbols(portfolio_rows, additional_failed)
            symbols = [row.symbol for row in portfolio_rows]
            weights = {row.symbol: row.weight for row in portfolio_rows}
        
        # Compute returns with requested definition (default log for backtest parity)
        ret_type = request.return_type or "log"
        asset_returns = compute_returns(cleaned_df[symbols], ret_type)
        port_returns = portfolio_returns(asset_returns, weights)
        
        if len(port_returns) == 0:
            raise HTTPException(
                status_code=400,
                detail="Insufficient data for backtesting"
            )
        
        # Run backtest
        backtest_result = backtest_var(
            port_returns,
            asset_returns if request.method == "monte_carlo" else None,
            weights if request.method == "monte_carlo" else None,
            request.method,
            request.confidence,
            request.lookback,
            request.backtest_days,
            request.mc_sims,
            request.seed
        )
        
        return BacktestResponse(**backtest_result)
    
    except HTTPException:
        raise
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error running backtest: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal error: {str(e)}")

