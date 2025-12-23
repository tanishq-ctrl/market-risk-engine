"""Pydantic models for request/response schemas."""
from pydantic import BaseModel, Field, field_validator, model_validator
from typing import Optional, List, Dict, Any, Literal
from datetime import datetime


class PortfolioRow(BaseModel):
    """Universal portfolio row with symbol and weight."""
    symbol: str = Field(..., description="Instrument symbol (e.g., AAPL, TLT, ^GSPC)")
    weight: float = Field(..., description="Portfolio weight (can be negative for shorts)")
    asset_type: Optional[str] = Field(None, description="Optional asset type label")
    display_name: Optional[str] = Field(None, description="Optional display name")
    price_field: Optional[str] = Field(None, description="Price field preference (Adj Close or Close)")
    # Optional fields for advanced stress testing
    duration: Optional[float] = Field(None, description="Modified duration for bonds (years)")
    dv01: Optional[float] = Field(None, description="Dollar value of 1bp (DV01) for bonds")
    currency: Optional[str] = Field(None, description="Currency code (e.g., USD, EUR)")
    price: Optional[float] = Field(None, description="Current price per unit")
    quantity: Optional[float] = Field(None, description="Number of units held")
    
    @field_validator("symbol")
    @classmethod
    def validate_symbol(cls, v: str) -> str:
        """Normalize symbol (uppercase but preserve special chars)."""
        if not v or not v.strip():
            raise ValueError("Symbol cannot be empty")
        return v.strip().upper()
    
    @model_validator(mode="before")
    @classmethod
    def handle_ticker_alias(cls, data: Any) -> Any:
        """Accept 'ticker' as alias for 'symbol'."""
        if isinstance(data, dict) and "ticker" in data and "symbol" not in data:
            data["symbol"] = data.pop("ticker")
        return data


# Market Prices
class MarketPricesRequest(BaseModel):
    """Request for market prices."""
    symbols: List[str] = Field(..., description="List of symbols to fetch")
    start: str = Field(..., description="Start date (YYYY-MM-DD)")
    end: str = Field(..., description="End date (YYYY-MM-DD)")
    
    @model_validator(mode="before")
    @classmethod
    def handle_tickers_alias(cls, data: Any) -> Any:
        """Accept 'tickers' as alias for 'symbols'."""
        if isinstance(data, dict) and "tickers" in data and "symbols" not in data:
            data["symbols"] = data.pop("tickers")
        return data


class MissingReportItem(BaseModel):
    """Missing data report for a symbol."""
    symbol: str
    missing_pct: float = Field(..., description="Percentage of missing data (0-1)")
    longest_gap: int = Field(..., description="Longest consecutive gap in trading days")


class PricesResponse(BaseModel):
    """Response with price data."""
    dates: List[str] = Field(..., description="List of dates (YYYY-MM-DD)")
    prices: Dict[str, List[Optional[float]]] = Field(..., description="Prices by symbol (None for missing values)")
    missing_report: List[MissingReportItem] = Field(default_factory=list)
    failed_symbols: List[str] = Field(default_factory=list)


# Portfolio Normalization
class NormalizePortfolioRequest(BaseModel):
    """Request to normalize portfolio weights."""
    portfolio: List[PortfolioRow]


class NormalizePortfolioResponse(BaseModel):
    """Response from portfolio normalization."""
    portfolio: List[PortfolioRow]
    was_normalized: bool
    sum_before: float


# Risk Metrics
class RiskMetricsRequest(BaseModel):
    """Request for risk metrics."""
    portfolio: List[PortfolioRow]
    start: str = Field(..., description="Start date (YYYY-MM-DD)")
    end: str = Field(..., description="End date (YYYY-MM-DD)")
    benchmark: Optional[str] = Field("SPY", description="Benchmark symbol")
    rolling_windows: List[int] = Field(default_factory=lambda: [30, 90, 252])
    return_type: Literal["simple", "log"] = Field("log", description="Return type: simple or log")
    risk_free_rate: float = Field(0.0, ge=0, le=1, description="Annual risk-free rate (e.g. 0.045)")
    annualization_days: int = Field(252, ge=1, description="Trading days per year")
    include_benchmark: bool = Field(True, description="Include benchmark analytics")


class RiskSummary(BaseModel):
    """Summary risk metrics."""
    ann_vol: float = Field(..., description="Annualized volatility")
    max_drawdown: float = Field(..., description="Maximum drawdown (positive fraction)")
    beta: Optional[float] = Field(None, description="Beta vs benchmark")
    dd_duration_days: int = Field(..., description="Maximum drawdown duration in days")
    sharpe_ratio: Optional[float] = Field(None, description="Sharpe ratio (annualized)")
    sortino_ratio: Optional[float] = Field(None, description="Sortino ratio (annualized)")
    ann_return: float = Field(..., description="Annualized return")


class RollingVol(BaseModel):
    """Rolling volatility series."""
    dates: List[str]
    vol_30: List[Optional[float]]
    vol_90: List[Optional[float]]
    vol_252: List[Optional[float]]


class CorrelationMatrix(BaseModel):
    """Correlation matrix."""
    symbols: List[str]
    matrix: List[List[float]]


class RiskContribution(BaseModel):
    """Risk contribution for an asset."""
    symbol: str
    weight: float
    mctr: float = Field(..., description="Marginal contribution to risk (annualized)")
    cctr: float = Field(..., description="Component contribution to risk (annualized)")
    pct_cctr: Optional[float] = Field(None, description="Percentage contribution (sums to ~1)")


class CumulativeReturns(BaseModel):
    """Cumulative returns series."""
    dates: List[str]
    portfolio: List[Optional[float]] = Field(..., description="Portfolio cumulative returns")
    benchmark: Optional[List[Optional[float]]] = Field(None, description="Benchmark cumulative returns")


class DrawdownSeries(BaseModel):
    """Drawdown series."""
    dates: List[str]
    portfolio: List[Optional[float]] = Field(..., description="Portfolio drawdown values (negative fractions)")
    benchmark: Optional[List[Optional[float]]] = Field(None, description="Benchmark drawdown values (negative fractions)")


class RollingSharpe(BaseModel):
    """Rolling Sharpe ratio series."""
    dates: List[str]
    sharpe_30: List[Optional[float]] = Field(..., description="30-day rolling Sharpe")
    sharpe_90: List[Optional[float]] = Field(..., description="90-day rolling Sharpe")
    sharpe_252: List[Optional[float]] = Field(..., description="252-day rolling Sharpe")


class RiskStats(BaseModel):
    """Performance and tail statistics."""
    skew: Optional[float] = Field(None, description="Sample skewness")
    kurtosis: Optional[float] = Field(None, description="Excess kurtosis")
    best_day: Optional[float] = Field(None, description="Best daily return")
    worst_day: Optional[float] = Field(None, description="Worst daily return")
    hit_ratio: Optional[float] = Field(None, description="Fraction of positive days")
    downside_dev_ann: Optional[float] = Field(None, description="Annualized downside deviation")
    calmar_ratio: Optional[float] = Field(None, description="Ann return / max drawdown")


class BenchmarkAnalytics(BaseModel):
    """Benchmark-related analytics."""
    beta: Optional[float] = None
    alpha_ann: Optional[float] = Field(None, description="Annualized alpha from regression")
    r2: Optional[float] = Field(None, description="R-squared from regression")
    corr: Optional[float] = Field(None, description="Correlation with benchmark")
    tracking_error_ann: Optional[float] = Field(None, description="Annualized tracking error")
    information_ratio: Optional[float] = Field(None, description="Ann active return / tracking error")


class RiskMetadata(BaseModel):
    """Metadata for risk metrics calculation."""
    annualization_days: Optional[int] = None
    return_type: Optional[str] = None
    effective_days: Optional[int] = None
    symbols: Optional[List[str]] = None
    benchmark_symbol: Optional[str] = None
    risk_free_rate: Optional[float] = None


class RiskMetricsResponse(BaseModel):
    """Response with risk metrics."""
    summary: RiskSummary
    rolling_vol: RollingVol
    correlation: CorrelationMatrix
    contributions: List[RiskContribution]
    cumulative_returns: Optional[CumulativeReturns] = None
    drawdown_series: Optional[DrawdownSeries] = None
    rolling_sharpe: Optional[RollingSharpe] = None
    stats: Optional[RiskStats] = Field(None, description="Performance and tail statistics")
    benchmark: Optional[BenchmarkAnalytics] = Field(None, description="Benchmark analytics")
    metadata: Optional[RiskMetadata] = Field(None, description="Calculation metadata")
    warnings: List[str] = Field(default_factory=list, description="Non-fatal warnings")


# Correlation
class CorrelationRequest(BaseModel):
    """Request for correlation matrix calculation."""
    symbols: List[str]
    start: str
    end: str


class CorrelationResponse(BaseModel):
    """Response for correlation matrix calculation."""
    correlation: CorrelationMatrix


# VaR
class VaRRequest(BaseModel):
    """Request for VaR calculation."""
    portfolio: List[PortfolioRow]
    start: str
    end: str
    method: str = Field("historical", description="VaR method: historical, parametric, monte_carlo")
    confidence: float = Field(0.95, ge=0.01, le=0.99, description="Confidence level")
    lookback: Optional[int] = Field(None, description="Lookback window for estimation")
    mc_sims: int = Field(10000, description="Monte Carlo simulations")
    seed: int = Field(42, description="Random seed")
    return_type: Literal["simple", "log"] = Field("simple", description="Return definition")
    horizon_days: int = Field(1, ge=1, description="VaR horizon in trading days")
    drift: Literal["include", "ignore"] = Field("ignore", description="Include empirical drift when scaling")
    parametric_dist: Literal["normal", "student_t"] = Field("normal", description="Distribution for parametric VaR")
    hs_weighting: Literal["none", "ewma"] = Field("none", description="Historical weighting scheme")
    hs_lambda: float = Field(0.94, gt=0, lt=1, description="EWMA decay for historical weighting")
    rolling_window: int = Field(250, ge=10, description="Rolling window for charts")
    portfolio_value: Optional[float] = Field(None, description="Optional portfolio value to return currency VaR/CVaR")


class HistogramData(BaseModel):
    """Histogram data."""
    bins: List[float]
    counts: List[int]


class VaRContribution(BaseModel):
    """Contribution to portfolio VaR (parametric)."""
    symbol: str
    weight: float
    marginal_var: float
    component_var: float


class VaRMetadata(BaseModel):
    """Metadata and diagnostics for VaR calculation."""
    effective_n: Optional[int] = None
    horizon_days: Optional[int] = None
    return_type: Optional[str] = None
    drift: Optional[str] = None
    hs_weighting: Optional[str] = None
    hs_lambda: Optional[float] = None
    parametric_dist: Optional[str] = None
    df: Optional[float] = None
    mu: Optional[float] = None
    sigma: Optional[float] = None
    seed: Optional[int] = None
    mc_sims: Optional[int] = None
    covariance_method: Optional[str] = None


class RollingVaR(BaseModel):
    """Rolling VaR series."""
    dates: List[str]
    var_series: List[float] = Field(..., description="VaR values (positive loss fractions)")
    realized: List[float] = Field(..., description="Realized returns (signed)")


class VaRResponse(BaseModel):
    """Response with VaR results."""
    method: str
    confidence: float
    var: float = Field(..., description="VaR as positive loss fraction")
    cvar: float = Field(..., description="CVaR as positive loss fraction")
    var_amount: Optional[float] = Field(None, description="VaR as currency amount if portfolio_value provided")
    cvar_amount: Optional[float] = Field(None, description="CVaR as currency amount if portfolio_value provided")
    histogram: Optional[HistogramData] = None
    histogram_realized: Optional[HistogramData] = Field(None, description="Histogram from realized/aggregated returns")
    histogram_simulated: Optional[HistogramData] = Field(None, description="Histogram from simulated returns (MC)")
    rolling: Optional[RollingVaR] = None
    returns: Optional[List[float]] = Field(None, description="Portfolio returns for analysis")
    warnings: List[str] = Field(default_factory=list, description="Non-fatal warnings from the calculation")
    metadata: Optional[VaRMetadata] = Field(None, description="Calculation metadata and diagnostics")
    contributions_var: Optional[List[VaRContribution]] = Field(None, description="Component VaR (parametric)")
    contributions_cvar: Optional[List[VaRContribution]] = Field(None, description="Component CVaR (if available)")


# Stress Tests
class StressRequest(BaseModel):
    """Request for stress test."""
    portfolio: List[PortfolioRow]
    start: str
    end: str
    scenario: str = Field(..., description="Scenario: EQUITY_-5, EQUITY_-10, EQUITY_-20, or CUSTOM")
    shocks: Optional[Dict[str, float]] = Field(None, description="Custom shocks by symbol (for CUSTOM scenario)")
    stress_mode: Literal["return_shock", "duration_rate_shock"] = Field(
        "return_shock",
        description="Stress mode: return_shock (default, linear) or duration_rate_shock (bonds use duration/DV01)"
    )


class AssetStressResult(BaseModel):
    """Stress test result for an asset."""
    symbol: str
    shock: float = Field(..., description="Applied shock (negative = loss)")
    pnl: float = Field(..., description="P&L impact (negative = loss)")
    # Optional fields for advanced stress testing transparency
    asset_type: Optional[str] = Field(None, description="Asset type used for shock selection")
    shock_type: Optional[str] = Field(None, description="Type of shock applied: return, rate_bps")
    rate_bps_applied: Optional[float] = Field(None, description="Rate shock in basis points (if applicable)")


class StressResponse(BaseModel):
    """Response from stress test."""
    scenario_name: str
    scenario_key: Optional[str] = Field(None, description="Original scenario key for mapping")
    portfolio_pnl: float = Field(..., description="Portfolio P&L (negative = loss)")
    by_asset: List[AssetStressResult]
    net_exposure: Optional[float] = Field(None, description="Sum of weights (net exposure)")
    gross_exposure: Optional[float] = Field(None, description="Sum of absolute weights (gross exposure)")
    weights_sum: Optional[float] = Field(None, description="Alias for net exposure")
    top_loss_contributors: Optional[List[AssetStressResult]] = Field(None, description="Top 5 assets by loss")
    missing_shocks: Optional[List[str]] = Field(None, description="Symbols missing shocks for CUSTOM scenario")


# Backtesting
class BacktestRequest(BaseModel):
    """Request for VaR backtesting."""
    portfolio: List[PortfolioRow]
    start: str
    end: str
    method: str = Field("historical", description="VaR method")
    confidence: float = Field(0.95, ge=0.01, le=0.999, description="Confidence level (0-1)")
    lookback: int = Field(250, description="Lookback window for VaR estimation")
    backtest_days: int = Field(250, description="Number of days to backtest")
    mc_sims: Optional[int] = Field(10000, description="Monte Carlo simulations")
    seed: Optional[int] = Field(42, description="Random seed")
    return_type: Optional[Literal["simple", "log"]] = Field("log", description="Return type for backtest returns")

    @model_validator(mode="before")
    @classmethod
    def coerce_defaults(cls, data: Any) -> Any:
        if isinstance(data, dict):
            data.setdefault("return_type", "log")
            data.setdefault("mc_sims", 10000)
            data.setdefault("seed", 42)
        return data


class BacktestSeries(BaseModel):
    """Backtest time series."""
    dates: List[str]
    realized: List[float] = Field(..., description="Realized returns (signed)")
    var_threshold: List[float] = Field(..., description="VaR threshold (negative)")
    exceptions: List[bool] = Field(..., description="Exception flags")


class ExceptionRow(BaseModel):
    """Exception row in backtest."""
    date: str
    realized: float
    var_threshold: float


class BacktestResponse(BaseModel):
    """Response from backtesting."""
    exceptions_count: int
    exceptions_rate: float = Field(..., description="Exception rate (0-1)")
    kupiec_lr: Optional[float] = Field(None, description="Kupiec likelihood ratio statistic")
    kupiec_pvalue: Optional[float] = Field(None, description="Kupiec POF test p-value")
    available_days: int = Field(..., description="Number of return observations available for the requested window")
    series: BacktestSeries
    exceptions_table: List[ExceptionRow]

