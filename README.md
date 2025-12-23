## Market Risk Engine

Premium, end-to-end **Market Risk Engine** with a FastAPI backend and a modern React/TypeScript frontend. It supports **VaR, CVaR, stress testing, risk analytics, and VaR backtesting** for portfolios built from any Yahoo Finance symbol.

> Designed as a realistic, production-style risk stack: data ingestion, cleaning, portfolio construction, risk analytics, visualization, and export – all in one repo.

---

### Table of Contents

- [System Overview](#system-overview)
- [Core Capabilities](#core-capabilities)
  - [Risk & Performance Analytics](#risk--performance-analytics)
  - [VaR / CVaR](#var--cvar)
  - [Stress Testing](#stress-testing)
  - [VaR Backtesting](#var-backtesting)
- [Frontend Experience](#frontend-experience)
- [Getting Started](#getting-started)
- [Running Tests](#running-tests)
- [Configuration](#configuration)
- [Typical Workflow](#typical-workflow)
- [Design Principles](#design-principles)
- [License](#license)

---

## System Overview

- **Backend** (`backend/`): FastAPI service providing market data, risk metrics, VaR/CVaR, stress tests, and VaR backtesting
- **Frontend** (`frontend/`): Fintech-style dashboard (React + TypeScript + Vite + Tailwind + shadcn/ui) for interactive exploration
- **Data Source**: Yahoo Finance via `yfinance` (daily bars, broad symbol coverage)

### High-Level Architecture

```text
project-root/
  backend/            FastAPI backend (Python)
    app/
      api/            ── REST endpoints (market, portfolio, risk, stress, backtest)
      core/           ── config + logging
      models/         ── Pydantic schemas (requests/responses)
      services/       ── risk, VaR, stress, data, backtest business logic
      utils/          ── caching, date & math helpers
    backend_data/     ── raw & processed Parquet caches
    tests/            ── pytest suites (risk, VaR, stress)

  frontend/           React 19 + TypeScript + Vite SPA
    src/
      app/            ── router, query client, providers
      pages/          ── Portfolio, MarketData, RiskMetrics, VaR, StressTests, Backtesting, Export, Overview
      components/     ── layout, charts, tables, forms, UI
      lib/            ── typed API client, types, validators, utils, constants
```

For deeper detail:
- **Backend**: see `backend/README.md`
- **Frontend**: see `frontend/README.md`

---

## Core Capabilities

### Risk & Performance Analytics

- **Annualized return & volatility**
- **Drawdown profile**: max drawdown & drawdown duration
- **Sharpe & Sortino ratios**
- **Tail / distribution metrics**: skew, kurtosis, hit ratio, downside deviation, Calmar ratio
- **Correlation matrix** across assets
- **Benchmark analytics**: beta, alpha, R², tracking error, information ratio
- **Rolling analytics**: rolling volatility and rolling Sharpe
- **Risk contributions**: MCTR/CCTR and % contribution to total risk

### VaR / CVaR

- **Methods**:
  - **Historical** (equal-weighted or EWMA)
  - **Parametric** (Normal or Student-t)
  - **Monte Carlo** (multivariate normal, capped simulations)
- **Controls**:
  - **Confidence level** and **lookback window**
  - **Return type**: `return_type` (`simple` or `log`)
  - **Horizon**: `horizon_days` (≥ 1)
  - **Drift handling**: `drift` (`ignore` / `include`)
  - **Historical weighting**: `hs_weighting` (`none` / `ewma`) with `hs_lambda`
  - **Distribution**: `parametric_dist` (`normal` / `student_t`)
  - **Simulation controls**: `mc_sims`, `rolling_window`
  - **Currency scaling**: optional `portfolio_value` for currency VaR/CVaR
- **Outputs**:
  - VaR/CVaR as **positive loss fractions**
  - Histograms (realized & simulated), rolling VaR vs realized returns
  - Component VaR (when covariance is available)
  - Rich `metadata` and `warnings` for diagnostics

### Stress Testing

- **Scenario types**:
  - **Quick equity**: `EQUITY_-5`, `EQUITY_-10`, `EQUITY_-20`
  - **Historical crises**: `COVID_CRASH`, `FINANCIAL_CRISIS`, `DOTCOM_BUBBLE`, `BLACK_MONDAY`, `TAPER_TANTRUM`, `EUROPEAN_DEBT`, `FLASH_CRASH` (multi-asset aware)
  - **Multi-factor**: `STAGFLATION`, `RATE_SHOCK`, `LIQUIDITY_CRISIS`, `CORRELATION_BREAKDOWN`
  - **Custom**: user-defined symbol shocks (case-insensitive)
- **Modes**:
  - **Return shock** (default): linear model, P&L = weight × shock
  - **Duration/rate shock** (advanced, optional): for bonds, rate shocks in bps → price impact via duration / DV01 approximation
- **Outputs**:
  - Portfolio P&L and by-asset P&L
  - Net / gross exposure, top loss contributors
  - Optional transparency fields per asset: `asset_type`, `shock_type`, `rate_bps_applied`

### VaR Backtesting

- **Rolling VaR backtesting** with:
  - `lookback`, `backtest_days`, `confidence`, `method`, `mc_sims`
- **Validation**:
  - Kupiec Proportion-of-Failures (POF) test (LR & p-value)
  - Exception series and exception table

---

## Frontend Experience

The frontend is a single-page app that exposes the full engine via a clean, “risk desk” style UI:

- **Portfolio**: create/edit portfolios, upload/download CSV/JSON, quick templates, sliders
- **Market Data**: price and normalized return charts, stats KPIs, missing-data table, correlation heatmap
- **Risk Metrics**: KPI cards, rolling vol & Sharpe, correlation matrix, risk contributions (table + bar chart), benchmark analytics
- **VaR / CVaR**: method tabs, advanced controls, tail diagnostics, rolling VaR vs realized
- **Stress Tests**:
  - Scenario tabs (Quick, Historical, Multi-Factor, Custom)
  - Advanced toggle for duration/rate shocks
  - Visuals: waterfall, tornado chart, heatmaps, severity indicators, sensitivity analysis
- **Backtesting**: exception diagnostics, Kupiec stats, realized vs VaR chart, CSV/JSON export
- **Export**: JSON snapshot of configuration and key results
- **UX**: dark mode, responsive layout, type-safe API integration

---

## Getting Started

### 1. Clone the Repository

```bash
git clone <this-repo-url>   # replace with your repo URL
cd "untitled folder 3"    # or your chosen project directory
```

### 2. Backend (FastAPI)

#### Prerequisites
- Python 3.11+

#### Install & Run

```bash
cd backend
pip install -r requirements.txt

# Start the API server
uvicorn app.main:app --reload --port 8000
```

- API base URL: `http://localhost:8000`
- Swagger UI: `http://localhost:8000/docs`

For more backend details and curl examples, see `backend/README.md`.

### 3. Frontend (React + Vite)

#### Prerequisites
- Node.js 18+ and npm

#### Install & Run

```bash
cd ../frontend
npm install

# Optional: configure backend URL
cp .env.example .env
# then edit .env and set:
# VITE_API_URL=http://localhost:8000

npm run dev
```

- App URL: `http://localhost:5173`

For more frontend details, see `frontend/README.md`.

---

## Running Tests

### Backend

```bash
cd backend
pytest -v

# Focused suites
pytest tests/test_risk_service.py -v
pytest tests/test_var_service.py -v
pytest tests/test_stress_service.py tests/test_stress_service_advanced.py -v
```

You can also run the high-level stress verification script:

```bash
python verify_stress_upgrade.py
```

### Frontend

```bash
cd frontend
npm test
```

---

## Configuration

### Backend Config Highlights

Defined in `backend/app/core/config.py` and environment variables:

- `DATA_DIR`, `RAW_DIR`, `PROCESSED_DIR` – data/cache directories
- `TRADING_DAYS_PER_YEAR` – annualization convention (default: 252)
- `MIN_OBS`, `MAX_FFILL_GAP` – data quality thresholds
- `DEFAULT_BACKTEST_LOOKBACK`, `DEFAULT_MC_SIMS` – reasonable risk defaults
- `CACHE_TTL_SECONDS` – in-memory cache TTL

### Frontend Config Highlights

- `.env` / `.env.local`:
  - `VITE_API_URL` – backend base URL
- `localStorage`:
  - Portfolio, date ranges
  - VaR method & confidence, risk settings
  - Theme (light/dark)

---

## Typical Workflow

1. **Build a portfolio** on the Portfolio page (or upload CSV/JSON)
2. **Inspect market data** for your symbols (prices, stats, correlation)
3. **Run risk metrics** to understand vol, drawdown, beta, correlations, contributions
4. **Estimate VaR/CVaR** for tail risk under different methods and horizons
5. **Apply stress tests** (equity, historical, multi-factor, or custom), optionally enabling advanced bond mode
6. **Backtest VaR** to validate model performance with Kupiec tests and exception analysis
7. **Export** a JSON snapshot for documentation or offline analysis

---

## Design Principles

- **Realistic, not toy**: Implements commonly used techniques in professional risk management (vol/drawdown, Sharpe/Sortino, VaR variants, EWMA, Kupiec).
- **Safe defaults**: Caps Monte Carlo simulations, warns on small samples, and handles missing/failed symbols gracefully.
- **Transparent**: Rich metadata and warnings in API responses make it clear how numbers are computed and when they may be unstable.
- **Extensible**: Clear layering between routes, services, and schemas so new models/scenarios can be added with minimal friction.

---

## License

This project is provided **as-is** for educational and research purposes.


