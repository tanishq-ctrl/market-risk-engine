<div align="center">

<h2>💹 Market Risk Engine</h2>

<p>
  End-to-end <strong>Market Risk Engine</strong> with a FastAPI backend and a modern React/TypeScript frontend.<br />
  Built to feel like a <strong>real risk desk</strong>: VaR, CVaR, stress testing, rich analytics, and VaR backtesting.
</p>

<!-- Badges -->
<p>
  <a href="https://tanishq-ctrl.github.io/market-risk-engine/">
    <img src="https://img.shields.io/badge/Live_Demo-Fintech_Dashboard-4ade80?style=for-the-badge&logo=vercel&logoColor=white" alt="Live Demo" />
  </a>
  <img src="https://img.shields.io/badge/Backend-FastAPI-22c55e?style=for-the-badge&logo=fastapi&logoColor=white" alt="FastAPI" />
  <img src="https://img.shields.io/badge/Frontend-React_19-38bdf8?style=for-the-badge&logo=react&logoColor=white" alt="React" />
  <img src="https://img.shields.io/badge/Risk-VaR_·_CVaR_·_Stress_Tests-f97316?style=for-the-badge" alt="Risk Features" />
</p>

<!-- CTA buttons -->
<p>
  <a href="https://tanishq-ctrl.github.io/market-risk-engine/" target="_blank">
    <img src="https://img.shields.io/badge/▶️%20Try%20the%20Engine-0f172a?style=for-the-badge&labelColor=22c55e&color=0f172a" alt="Try the Engine" />
  </a>
  <a href="https://github.com/tanishq-ctrl/market-risk-engine" target="_blank">
    <img src="https://img.shields.io/badge/⭐%20Star%20on%20GitHub-020617?style=for-the-badge&logo=github&logoColor=white" alt="Star on GitHub" />
  </a>
</p>

<sub><em>Best experienced on desktop for the full multi-panel analytics layout.</em></sub>

</div>

---

> Designed as a realistic, production-style risk stack: data ingestion, cleaning, portfolio construction, risk analytics, visualization, and export – all in one repo.

Premium, end-to-end **Market Risk Engine** with:

- A **FastAPI** service for high-performance risk calculations.
- A **React 19 + Vite** SPA with a fintech-inspired dark theme.
- Integrated **Google Sheets opt-in** and deploy-ready configs (Railway + GitHub Pages).

---

### Table of Contents

- [System Overview](#system-overview)
- [Core Capabilities](#core-capabilities)
  - [Risk & Performance Analytics](#risk--performance-analytics)
  - [VaR / CVaR](#var--cvar)
  - [Stress Testing](#stress-testing)
  - [VaR Backtesting](#var-backtesting)
- [Frontend Experience](#frontend-experience)
- [Backend API Reference](#backend-api-reference)
- [Frontend Pages Reference](#frontend-pages-reference)
- [Methods & Assumptions](#methods--assumptions)
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

The frontend is a single-page app that exposes the full engine via a clean, **trading-terminal style** UI:

| Area          | What you see                                                                                 | Why it matters                              |
| ------------- | -------------------------------------------------------------------------------------------- | ------------------------------------------- |
| **Portfolio** | Editable table, CSV/JSON upload, quick templates, long/short weights, basic sanity checks   | Build realistic books in seconds            |
| **Market Data** | Price & normalized return charts, stats KPIs, missing-data matrix, correlation heatmap   | Understand return drivers & data quality    |
| **Risk Metrics** | Vol/Sharpe/Sortino, drawdowns, risk contributions, benchmark analytics                  | Decompose and attribute portfolio risk      |
| **VaR / CVaR** | Historical / Parametric / MC methods, tails, rolling VaR                                   | Compare methodologies and tail behavior     |
| **Stress Tests** | Quick, historical, and multi-factor scenarios, bond duration mode, tornado/waterfall   | Answer “what if?” across regimes            |
| **Backtesting** | Exception paths, Kupiec tests, realized vs VaR                                            | Validate if your VaR is doing its job       |
| **Export**      | JSON snapshot of config + results, CSV exports                                            | Share and document your risk runs           |

> 🌓 The UI ships with a **dark, fintech-inspired theme** and responsive layout so it feels at home on large monitors and still works on laptops.

---

## 🚀 Getting Started

### 1️⃣ Clone the Repository

```bash
git clone <this-repo-url>   # replace with your repo URL
cd "untitled folder 3"    # or your chosen project directory
```

### 2️⃣ Backend (FastAPI)

#### 📦 Prerequisites
- Python 3.11+

#### ⚙️ Install & Run

```bash
cd backend
pip install -r requirements.txt

# Start the API server
uvicorn app.main:app --reload --port 8000
```

- API base URL: `http://localhost:8000`
- Swagger UI: `http://localhost:8000/docs`

For more backend details and curl examples, see `backend/README.md`.

### 3️⃣ Frontend (React + Vite)

#### 📦 Prerequisites
- Node.js 18+ and npm

#### ⚙️ Install & Run

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

## 🧪 Running Tests

### 🐍 Backend

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

### ⚛️ Frontend

```bash
cd frontend
npm test
```

---

## ⚙️ Configuration

### 🛠 Backend Config Highlights

Defined in `backend/app/core/config.py` and environment variables:

- `DATA_DIR`, `RAW_DIR`, `PROCESSED_DIR` – data/cache directories
- `TRADING_DAYS_PER_YEAR` – annualization convention (default: 252)
- `MIN_OBS`, `MAX_FFILL_GAP` – data quality thresholds
- `DEFAULT_BACKTEST_LOOKBACK`, `DEFAULT_MC_SIMS` – reasonable risk defaults
- `CACHE_TTL_SECONDS` – in-memory cache TTL

### 💻 Frontend Config Highlights

- `.env` / `.env.local`:
  - `VITE_API_URL` – backend base URL
- `localStorage`:
  - Portfolio, date ranges
  - VaR method & confidence, risk settings
  - Theme (light/dark)

---

## 🪜 Typical Workflow

1. **Build a portfolio** on the Portfolio page (or upload CSV/JSON)
2. **Inspect market data** for your symbols (prices, stats, correlation)
3. **Run risk metrics** to understand vol, drawdown, beta, correlations, contributions
4. **Estimate VaR/CVaR** for tail risk under different methods and horizons
5. **Apply stress tests** (equity, historical, multi-factor, or custom), optionally enabling advanced bond mode
6. **Backtest VaR** to validate model performance with Kupiec tests and exception analysis
7. **Export** a JSON snapshot for documentation or offline analysis

---

## Backend API Reference

The FastAPI backend exposes the following REST endpoints (all under `/api` prefix):

| Endpoint | Method | Description | Request Body |
|----------|--------|-------------|--------------|
| `/api/market/prices` | POST | Fetch historical prices for symbols | `symbols[]`, `start`, `end` |
| `/api/market/correlation` | POST | Compute correlation matrix | `symbols[]`, `start`, `end` |
| `/api/portfolio/normalize` | POST | Normalize portfolio weights | `portfolio[]` |
| `/api/risk/metrics` | POST | Compute comprehensive risk metrics | `portfolio[]`, `start`, `end`, `benchmark_symbol?`, `risk_free_rate?` |
| `/api/risk/var` | POST | Calculate VaR/CVaR | `portfolio[]`, `method`, `confidence`, `start`, `end`, `lookback?`, `horizon_days?`, `return_type?`, `drift?`, `parametric_dist?`, `hs_weighting?`, `mc_sims?` |
| `/api/stress/run` | POST | Run stress test scenario | `portfolio[]`, `scenario`, `shocks?` (for CUSTOM), `stress_mode?` |
| `/api/backtest/var` | POST | Backtest VaR model | `portfolio[]`, `method`, `confidence`, `lookback`, `backtest_days`, `start`, `end`, `mc_sims?` |
| `/api/optin` | POST | Record opt-in (name/email) | `name`, `email` |
| `/health` | GET | Health check | - |
| `/` | GET | API info | - |
| `/docs` | GET | Swagger UI | - |

**Note**: All endpoints return JSON. See `http://localhost:8000/docs` for interactive API documentation.

---

## Frontend Pages Reference

The React SPA includes the following main pages (accessible via hash routing):

| Page | Route | Purpose | Key Features |
|------|-------|---------|--------------|
| **Portfolio** | `/#/portfolio` | Build and manage portfolios | Editable table, CSV/JSON upload, quick templates, weight normalization, pie chart |
| **Market Data** | `/#/market-data` | Inspect price data and quality | Price charts, normalized returns, stats KPIs, missing data matrix, correlation heatmap |
| **Risk Metrics** | `/#/risk-metrics` | Comprehensive risk analytics | Volatility, Sharpe/Sortino, drawdowns, correlation matrix, risk contributions, benchmark analytics, rolling metrics |
| **VaR / CVaR** | `/#/var` | Value at Risk estimation | Historical/Parametric/Monte Carlo methods, tail diagnostics, rolling VaR, multi-confidence ladder, method comparison |
| **Stress Tests** | `/#/stress-tests` | Scenario-based stress testing | Quick equity, historical crises, multi-factor, custom scenarios, duration/rate shock mode, waterfall/tornado charts |
| **Backtesting** | `/#/backtesting` | VaR model validation | Rolling backtest, Kupiec POF test, exception analysis, realized vs VaR charts, CSV/JSON export |
| **Export** | `/#/export` | Export configuration and results | JSON snapshot, CSV exports, selectable sections, markdown/JSON preview |

**Note**: Portfolio data, date ranges, and VaR settings are persisted in `localStorage` for convenience.

---

## Methods & Assumptions

### VaR Calculation Methods

#### Historical VaR
- **Method**: Percentile-based on historical returns
- **Assumptions**:
  - Past returns are representative of future risk
  - Equal weighting (default) or EWMA weighting (optional)
  - No distributional assumptions
- **Limitations**: Requires sufficient historical data; may underestimate tail risk in calm periods

#### Parametric VaR
- **Methods**: Normal distribution or Student-t distribution
- **Assumptions**:
  - Returns follow specified distribution (Normal or Student-t)
  - Constant volatility (no GARCH effects)
  - For Student-t: degrees of freedom estimated from data
- **Limitations**: May underestimate tail risk if returns are non-normal; assumes stationarity

#### Monte Carlo VaR
- **Method**: Multivariate normal simulation
- **Assumptions**:
  - Asset returns follow multivariate normal distribution
  - Covariance matrix is stable
  - Horizon scaling via `sqrt(horizon_days)` approximation for variance
- **Limitations**: 
  - Multivariate normal may not capture tail dependencies
  - Simulations capped at 10,000 for performance
  - Requires asset-level returns (not just portfolio returns)

### Risk Metrics Assumptions

- **Annualization**: Uses 252 trading days per year (configurable)
- **Return Types**: Supports both simple and log returns (log returns default for risk metrics)
- **Benchmark Analytics**: Requires benchmark symbol to be in portfolio or fetched separately
- **Risk Contributions**: Based on sample covariance matrix; assumes linear portfolio structure

### Stress Testing Assumptions

- **Return Shock Mode** (default): Linear model `P&L = weight × shock`; no correlation effects
- **Duration/Rate Shock Mode** (advanced): 
  - Bond price impact approximated via `ΔP/P ≈ -duration × Δy` (where Δy in decimal)
  - Falls back to return shock if duration/DV01 not provided
- **Historical Scenarios**: Uniform shocks (approximations); not actual historical replay
- **Multi-Factor Scenarios**: Asset type inferred from symbol (e.g., TLT=bond, GLD=commodity)

### Data & Preprocessing Assumptions

- **Data Source**: Yahoo Finance via `yfinance` (daily bars)
- **Missing Data**: Forward-fills gaps up to 2 trading days; symbols with excessive gaps are filtered
- **Minimum Observations**: Requires ≥60 observations for reliable metrics (configurable)
- **Symbol Format**: 
  - US stocks: plain symbol (e.g., `AAPL`)
  - NSE stocks: append `.NS` (e.g., `RELIANCE.NS`)
  - Indices: use `^` prefix (e.g., `^NSEI` for NIFTY 50)

### Backtesting Assumptions

- **Rolling Window**: Uses expanding window (all prior data up to each test date)
- **Exception Definition**: Realized return < -VaR threshold
- **Kupiec Test**: Assumes exceptions follow binomial distribution; requires sufficient backtest days for statistical power

### General Limitations

- **No Real-Time Data**: All data is historical (end-of-day)
- **No Options/Derivatives**: Only handles stocks, ETFs, indices
- **No Transaction Costs**: All calculations assume frictionless trading
- **No Liquidity Risk**: Assumes all positions can be liquidated instantly
- **Single Currency**: No explicit FX risk handling (assumes USD or local currency)
- **Static Portfolio**: No rebalancing logic; portfolio weights assumed constant over time

---

## Design Principles

- **Realistic, not toy**: Implements commonly used techniques in professional risk management (vol/drawdown, Sharpe/Sortino, VaR variants, EWMA, Kupiec).
- **Safe defaults**: Caps Monte Carlo simulations, warns on small samples, and handles missing/failed symbols gracefully.
- **Transparent**: Rich metadata and warnings in API responses make it clear how numbers are computed and when they may be unstable.
- **Extensible**: Clear layering between routes, services, and schemas so new models/scenarios can be added with minimal friction.

---

## 📄 License

This project is provided **as-is** for educational and research purposes.

---

### Author

<div align="left">

**Tanishq Prabhu**  

<a href="https://www.linkedin.com/in/tanishq-prabhu-b71467166/" target="_blank">
  <img src="https://img.shields.io/badge/Connect-LinkedIn-0a66c2?style=for-the-badge&logo=linkedin&logoColor=white" alt="LinkedIn - Tanishq Prabhu" />
</a>

</div>

© 2025 Tanishq Prabhu. All rights reserved.

