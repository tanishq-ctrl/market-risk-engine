# Market Risk Engine Backend

Production-style FastAPI backend for an **End-to-End Market Risk Engine** that supports **any Yahoo Finance symbol** (stocks, ETFs, indices, FX pairs, crypto, futures, rates proxies/bond ETFs, etc.) and lets users assign **weights** to each instrument.

## Features

- **Universal Instrument Support**: Works with any Yahoo Finance symbol (stocks, ETFs, indices, FX, crypto, futures, etc.)
- **Portfolio Risk Metrics**: Volatility, drawdown, beta, correlation, risk contributions
- **VaR/CVaR Calculation**: Historical, Parametric, and Monte Carlo methods
- **Stress Testing**: Predefined equity scenarios and custom shock scenarios
- **VaR Backtesting**: Rolling backtesting with Kupiec POF test
- **Robust Data Handling**: Automatic data cleaning, missing data handling, and error recovery
- **Caching**: Local disk caching (Parquet) and in-memory TTL cache
- **Production Ready**: Comprehensive error handling, logging, and request tracking

## Supported Symbol Examples

- **Stocks**: `AAPL`, `MSFT`, `GOOGL`
- **ETFs**: `TLT`, `SPY`, `QQQ`
- **Indices**: `^GSPC` (S&P 500), `^DJI` (Dow Jones)
- **FX**: `EURUSD=X`, `GBPUSD=X`
- **Crypto**: `BTC-USD`, `ETH-USD`
- **Futures**: `CL=F` (Crude Oil), `GC=F` (Gold)

## Installation

### Prerequisites

- Python 3.11 or higher
- pip or conda

### Setup

1. Install dependencies:

```bash
cd backend
pip install -r requirements.txt
```

2. Run the server:

```bash
uvicorn app.main:app --reload --port 8000
```

The API will be available at `http://localhost:8000`

API documentation (Swagger UI) is available at `http://localhost:8000/docs`

## API Endpoints

### Market Data

- `POST /api/market/prices` - Fetch market prices for symbols

### Portfolio Management

- `POST /api/portfolio/normalize` - Normalize portfolio weights

### Risk Metrics

- `POST /api/risk/metrics` - Compute comprehensive risk metrics
- `POST /api/risk/var` - Compute Value at Risk (VaR) and Conditional VaR (CVaR)

### Stress Testing

- `POST /api/stress/run` - Run stress test scenarios

**How Stress Tests Work:**

Stress tests apply hypothetical percentage shocks to portfolio assets and calculate the impact:
- Each asset receives a shock (e.g., -10% = -0.10)
- P&L impact = Asset Weight × Shock  
- Portfolio P&L = Sum of all asset P&Ls

Example: Asset with 40% weight and -10% shock contributes -4% to portfolio P&L (0.40 × -0.10 = -0.04)

**Scenario Types:**

1. **Predefined (Quick)**: Uniform shocks (EQUITY_-5, EQUITY_-10, EQUITY_-20)
2. **Historical**: Approximations of crises (COVID_CRASH, FINANCIAL_CRISIS, etc.)
3. **Multi-Factor**: Asset-type specific shocks (STAGFLATION, RATE_SHOCK, etc.)
4. **Custom**: User-defined shocks per asset

**Important:** This is a simplified linear shock model. It does NOT:
- Use historical price data or correlations
- Replay actual historical events
- Consider dynamic portfolio rebalancing

### Backtesting

- `POST /api/backtest/var` - Backtest VaR model

### Health Check

- `GET /health` - Health check endpoint

## API Contracts

### Request/Response Conventions

- **Returns**: All returns are signed (positive = gain, negative = loss)
- **VaR/CVaR**: Returned as **positive loss fractions** (0.023 = 2.3% expected loss)
- **Stress P&L**: Returned as **fraction** (negative = loss)
- **Backtest Threshold**: `var_threshold` is **negative** (e.g., -0.023)

### Portfolio Rows

Portfolio rows accept both `symbol` and `ticker` (backward compatible):

```json
{
  "symbol": "AAPL",
  "weight": 0.4,
  "asset_type": "stock",
  "display_name": "Apple Inc."
}
```

### Market Prices Request

Accepts both `symbols` and `tickers`:

```json
{
  "symbols": ["AAPL", "TLT"],
  "start": "2023-01-01",
  "end": "2025-12-01"
}
```

## Example Requests

### 1. Fetch Market Prices

```bash
curl -X POST "http://localhost:8000/api/market/prices" \
  -H "Content-Type: application/json" \
  -d '{
    "symbols": ["AAPL", "TLT", "^GSPC"],
    "start": "2023-01-01",
    "end": "2024-12-01"
  }'
```

### 2. Compute Risk Metrics

```bash
curl -X POST "http://localhost:8000/api/risk/metrics" \
  -H "Content-Type: application/json" \
  -d '{
    "portfolio": [
      {"symbol": "AAPL", "weight": 0.4},
      {"symbol": "TLT", "weight": 0.6}
    ],
    "start": "2023-01-01",
    "end": "2024-12-01",
    "benchmark": "SPY",
    "rolling_windows": [30, 90, 252]
  }'
```

### 3. Compute VaR (Historical)

```bash
curl -X POST "http://localhost:8000/api/risk/var" \
  -H "Content-Type: application/json" \
  -d '{
    "portfolio": [
      {"symbol": "AAPL", "weight": 0.4},
      {"symbol": "TLT", "weight": 0.6}
    ],
    "start": "2023-01-01",
    "end": "2024-12-01",
    "method": "historical",
    "confidence": 0.95,
    "lookback": 250
  }'
```

### 4. Run Stress Test

Test how your portfolio would perform under hypothetical market shocks:

```bash
curl -X POST "http://localhost:8000/api/stress/run" \
  -H "Content-Type: application/json" \
  -d '{
    "portfolio": [
      {"symbol": "AAPL", "weight": 0.4},
      {"symbol": "TLT", "weight": 0.6}
    ],
    "start": "2023-01-01",
    "end": "2024-12-01",
    "scenario": "EQUITY_-10"
  }'
```

**Response:**
```json
{
  "scenario_name": "EQUITY_-10",
  "portfolio_pnl": -0.04,
  "by_asset": [
    {"symbol": "AAPL", "shock": -0.10, "pnl": -0.04},
    {"symbol": "TLT", "shock": -0.10, "pnl": -0.06}
  ]
}
```

**Available Scenarios:**
- Predefined: `EQUITY_-5`, `EQUITY_-10`, `EQUITY_-20`
- Historical: `COVID_CRASH`, `FINANCIAL_CRISIS`, `DOTCOM_BUBBLE`, `BLACK_MONDAY`
- Multi-Factor: `STAGFLATION`, `RATE_SHOCK`, `LIQUIDITY_CRISIS`
- Custom: `CUSTOM` (with custom shocks dictionary)

### 5. Backtest VaR

```bash
curl -X POST "http://localhost:8000/api/backtest/var" \
  -H "Content-Type: application/json" \
  -d '{
    "portfolio": [
      {"symbol": "AAPL", "weight": 0.4},
      {"symbol": "TLT", "weight": 0.6}
    ],
    "start": "2023-01-01",
    "end": "2024-12-01",
    "method": "historical",
    "confidence": 0.95,
    "lookback": 250,
    "backtest_days": 250
  }'
```

## Configuration

Configuration is managed via `app/core/config.py` using Pydantic settings. Key parameters:

- `DATA_DIR`: Data directory (default: `backend_data`)
- `RAW_DIR`: Raw data cache directory
- `PROCESSED_DIR`: Processed data cache directory
- `TRADING_DAYS_PER_YEAR`: Trading days per year (default: 252)
- `MIN_OBS`: Minimum observations required (default: 60)
- `MAX_FFILL_GAP`: Maximum forward-fill gap in trading days (default: 2)
- `DEFAULT_BACKTEST_LOOKBACK`: Default backtest lookback window (default: 250)
- `DEFAULT_MC_SIMS`: Default Monte Carlo simulations (default: 10000)
- `CACHE_TTL_SECONDS`: Cache TTL in seconds (default: 3600)

## Architecture

```
backend/
  app/
    main.py                 # FastAPI application
    api/                    # API routes
      routes_market.py
      routes_portfolio.py
      routes_risk.py
      routes_stress.py
      routes_backtest.py
    core/                   # Core configuration
      config.py
      logging.py
    models/                 # Pydantic schemas
      schemas.py
    services/               # Business logic
      data_service.py
      preprocessing_service.py
      portfolio_service.py
      returns_service.py
      risk_service.py
      var_service.py
      stress_service.py
      backtest_service.py
    utils/                  # Utilities
      cache.py
      dates.py
      math.py
```

## Data Flow

1. **Data Fetching**: `data_service.py` fetches prices from Yahoo Finance
2. **Preprocessing**: `preprocessing_service.py` cleans and validates data
3. **Returns Calculation**: `returns_service.py` computes log returns
4. **Portfolio Construction**: `portfolio_service.py` normalizes weights
5. **Risk Calculation**: `risk_service.py`, `var_service.py` compute metrics
6. **Caching**: Raw and processed data cached to Parquet files

## Error Handling

- **Bad Symbols**: Failed symbols are reported in `failed_symbols` list
- **Missing Data**: Missing data statistics reported in `missing_report`
- **Insufficient Data**: Symbols with < `MIN_OBS` observations are removed
- **Non-overlapping Calendars**: Outer join handles different trading calendars
- **Graceful Degradation**: Continues processing even if some symbols fail

## Limitations

- **Yahoo Finance Data Quality**: Depends on Yahoo Finance data availability and quality
- **Daily Granularity**: Only daily data supported (no intraday)
- **No Real-time Updates**: Data is fetched on-demand, not streamed
- **Single Currency**: No multi-currency support (assumes same currency for all instruments)

## Testing

Quick smoke tests using curl or HTTPie:

```bash
# Test market prices
http POST localhost:8000/api/market/prices \
  symbols:='["AAPL","TLT"]' \
  start="2023-01-01" \
  end="2024-12-01"

# Test risk metrics
http POST localhost:8000/api/risk/metrics \
  portfolio:='[{"symbol":"AAPL","weight":0.5},{"symbol":"TLT","weight":0.5}]' \
  start="2023-01-01" \
  end="2024-12-01"

# Test VaR
http POST localhost:8000/api/risk/var \
  portfolio:='[{"symbol":"AAPL","weight":1.0}]' \
  start="2023-01-01" \
  end="2024-12-01" \
  method="historical" \
  confidence:=0.95
```

## VaR / CVaR (Level 1 Upgrades)

- New request knobs: `return_type` (`simple`/`log`), `horizon_days` (>=1), `drift` (`ignore`/`include`), `parametric_dist` (`normal`/`student_t`), `hs_weighting` (`none`/`ewma` with `hs_lambda`), `rolling_window`, optional `portfolio_value` for currency output.
- Historical VaR supports EWMA weighting; Monte Carlo histograms use simulated returns.
- Parametric supports Student-t VaR/ES; metadata and warnings return diagnostics (effective sample, df, lambda, sims capped).
- Component VaR (parametric-normal) is returned when covariance is available.
- Responses add `var_amount`/`cvar_amount`, `histogram_realized`/`histogram_simulated`, `warnings`, and `metadata` while keeping legacy fields for compatibility.

## Development

### Running in Development Mode

```bash
uvicorn app.main:app --reload --port 8000
```

### Logging

Logging is configured in `app/core/logging.py`:
- Request IDs are generated for each request
- Logs include timestamps and module names
- Request IDs are included in response headers

### CORS

CORS is configured for local frontend development:
- `http://localhost:5173`
- `http://127.0.0.1:5173`

## License

This project is provided as-is for educational and research purposes.

