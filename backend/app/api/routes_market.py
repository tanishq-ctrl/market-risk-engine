"""Market data API routes."""
from fastapi import APIRouter, HTTPException
import logging
import numpy as np
import pandas as pd

from app.models.schemas import MarketPricesRequest, PricesResponse, CorrelationRequest, CorrelationResponse
from app.services.data_service import fetch_prices
from app.services.preprocessing_service import clean_prices
from app.utils.dates import validate_dates

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/market", tags=["market"])


@router.post("/prices", response_model=PricesResponse)
async def get_prices(request: MarketPricesRequest):
    """
    Fetch market prices for symbols.
    
    Returns prices, missing data report, and failed symbols.
    """
    try:
        # Validate dates
        start_date, end_date = validate_dates(request.start, request.end)
        
        # Fetch prices
        prices_df, failed_symbols, missing_report = fetch_prices(
            request.symbols,
            request.start,
            request.end
        )
        
        # Clean prices
        if not prices_df.empty:
            cleaned_df, additional_failed, updated_missing_report = clean_prices(
                prices_df,
                missing_report
            )
            failed_symbols.extend(additional_failed)
            missing_report = updated_missing_report
        else:
            cleaned_df = prices_df
        
        # Convert to response format
        if cleaned_df.empty:
            return PricesResponse(
                dates=[],
                prices={},
                missing_report=missing_report,
                failed_symbols=failed_symbols
            )
        
        # Format dates
        dates = [d.strftime("%Y-%m-%d") for d in cleaned_df.index]
        
        # Format prices by symbol (replace NaN/Inf with None for JSON compatibility)
        def clean_value(val):
            """Convert NaN/Inf to None for JSON serialization."""
            if pd.isna(val) or (isinstance(val, (float, np.floating)) and (np.isnan(val) or np.isinf(val))):
                return None
            return float(val)
        
        prices_dict = {
            symbol: [clean_value(val) for val in prices.tolist()]
            for symbol, prices in cleaned_df.items()
        }
        
        return PricesResponse(
            dates=dates,
            prices=prices_dict,
            missing_report=missing_report,
            failed_symbols=failed_symbols
        )
    
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error fetching prices: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal error: {str(e)}")


@router.post("/correlation", response_model=CorrelationResponse)
async def get_correlation(request: CorrelationRequest):
    """
    Calculate correlation matrix for symbols.
    
    Returns correlation matrix based on daily returns.
    """
    try:
        logger.info(f"Calculating correlation for symbols: {request.symbols}")
        
        # Validate dates
        start_date, end_date = validate_dates(request.start, request.end)
        
        # Fetch prices
        prices_df, failed_symbols, _ = fetch_prices(
            request.symbols,
            request.start,
            request.end
        )
        
        if prices_df.empty:
            raise ValueError("No valid price data available")
        
        # Clean prices
        cleaned_df, additional_failed, _ = clean_prices(prices_df, [])
        failed_symbols.extend(additional_failed)
        
        if cleaned_df.empty or len(cleaned_df.columns) < 2:
            raise ValueError("Need at least 2 symbols with valid data for correlation")
        
        # Calculate daily returns
        returns_df = cleaned_df.pct_change().dropna()
        
        if returns_df.empty:
            raise ValueError("Not enough data to calculate returns")
        
        # Calculate correlation matrix
        corr_matrix = returns_df.corr()
        
        logger.info(f"Calculated correlation matrix for {len(corr_matrix.columns)} symbols")
        
        # Convert to response format
        symbols_list = corr_matrix.columns.tolist()
        corr_data = []
        
        for symbol in symbols_list:
            row_data = []
            for other_symbol in symbols_list:
                val = corr_matrix.loc[symbol, other_symbol]
                # Handle NaN values
                if pd.isna(val):
                    row_data.append(0.0)
                else:
                    row_data.append(float(val))
            corr_data.append(row_data)
        
        result = {
            "correlation": {
                "symbols": symbols_list,
                "matrix": corr_data
            }
        }
        
        logger.info(f"Returning correlation response with {len(symbols_list)} symbols")
        
        return CorrelationResponse(**result)
    
    except HTTPException:
        raise
    except ValueError as e:
        logger.error(f"ValueError in get_correlation: {e}", exc_info=True)
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error calculating correlation: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal error: {str(e)}")

