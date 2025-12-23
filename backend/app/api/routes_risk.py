"""Risk metrics API routes."""
from fastapi import APIRouter, HTTPException
import logging
import pandas as pd

from app.models.schemas import RiskMetricsRequest, RiskMetricsResponse, VaRRequest, VaRResponse
from app.services.data_service import fetch_prices
from app.services.preprocessing_service import clean_prices
from app.services.returns_service import compute_returns, portfolio_returns
from app.services.risk_service import compute_risk_metrics
from app.services.var_service import compute_var as compute_var_service
from app.services.portfolio_service import filter_failed_symbols
from app.utils.dates import validate_dates

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/risk", tags=["risk"])


@router.post("/metrics", response_model=RiskMetricsResponse)
async def get_risk_metrics(request: RiskMetricsRequest):
    """
    Compute comprehensive risk metrics for portfolio.
    
    Returns volatility, drawdown, beta, correlation, and risk contributions.
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
                detail="No price data available for portfolio symbols"
            )
        
        # Filter failed symbols from portfolio
        portfolio_rows, warnings = filter_failed_symbols(request.portfolio, failed_symbols)
        if warnings:
            logger.warning(f"Portfolio filtering warnings: {warnings}")
        
        # Update symbols and weights after filtering
        symbols = [row.symbol for row in portfolio_rows]
        weights = {row.symbol: row.weight for row in portfolio_rows}
        
        # Ensure we have data for all portfolio symbols
        available_symbols = set(prices_df.columns)
        portfolio_symbols = set(symbols)
        missing_symbols = portfolio_symbols - available_symbols
        
        if missing_symbols:
            logger.warning(f"Missing symbols in price data: {missing_symbols}")
            # Filter portfolio again
            portfolio_rows = [r for r in portfolio_rows if r.symbol in available_symbols]
            symbols = [row.symbol for row in portfolio_rows]
            weights = {row.symbol: row.weight for row in portfolio_rows}
        
        if not symbols:
            raise HTTPException(
                status_code=400,
                detail="No valid symbols remaining after filtering"
            )
        
        # Clean prices
        cleaned_df, additional_failed, _ = clean_prices(prices_df, [])
        if additional_failed:
            portfolio_rows, _ = filter_failed_symbols(portfolio_rows, additional_failed)
            symbols = [row.symbol for row in portfolio_rows]
            weights = {row.symbol: row.weight for row in portfolio_rows}
        
        # Compute returns (1-day, return_type handled in service)
        ret_type = getattr(request, "return_type", "log") or "log"
        asset_returns = compute_returns(cleaned_df[symbols], ret_type)
        port_returns = portfolio_returns(asset_returns, weights)
        
        if len(port_returns) == 0:
            raise HTTPException(
                status_code=400,
                detail="Insufficient data to compute returns"
            )
        
        # Compute risk metrics with all new params
        metrics = compute_risk_metrics(
            port_returns,
            asset_returns,
            weights,
            benchmark_symbol=request.benchmark if getattr(request, "include_benchmark", True) else None,
            rolling_windows=request.rolling_windows,
            risk_free_rate=getattr(request, "risk_free_rate", 0.0),
            annualization_days=getattr(request, "annualization_days", 252),
            return_type=ret_type,
            include_benchmark=getattr(request, "include_benchmark", True),
        )
        
        # Log the metrics structure for debugging
        logger.info(f"Computed metrics keys: {metrics.keys()}")
        
        try:
            return RiskMetricsResponse(**metrics)
        except Exception as validation_error:
            logger.error(f"Response validation error: {validation_error}", exc_info=True)
            logger.error(f"Metrics data: {metrics}")
            raise HTTPException(status_code=500, detail=f"Response validation failed: {str(validation_error)}")
    
    except HTTPException:
        raise
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error computing risk metrics: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal error: {str(e)}")


@router.post("/var", response_model=VaRResponse)
async def compute_var(request: VaRRequest):
    """
    Compute Value at Risk (VaR) and Conditional VaR (CVaR).
    
    Supports historical, parametric, and Monte Carlo methods.
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
        
        # Compute returns with requested definition
        asset_returns = compute_returns(cleaned_df[symbols], request.return_type)
        port_returns = portfolio_returns(asset_returns, weights)
        
        if len(port_returns) == 0:
            raise HTTPException(
                status_code=400,
                detail="Insufficient data for VaR calculation"
            )
        
        # Compute VaR
        var_result = compute_var_service(
            port_returns,
            asset_returns,
            weights,
            request.method,
            request.confidence,
            request.lookback,
            request.mc_sims,
            request.seed,
            return_type=request.return_type,
            horizon_days=request.horizon_days,
            drift=request.drift,
            parametric_dist=request.parametric_dist,
            hs_weighting=request.hs_weighting,
            hs_lambda=request.hs_lambda,
            portfolio_value=request.portfolio_value,
            rolling_window=request.rolling_window,
        )
        
        return VaRResponse(**var_result)
    
    except HTTPException:
        raise
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error computing VaR: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal error: {str(e)}")

