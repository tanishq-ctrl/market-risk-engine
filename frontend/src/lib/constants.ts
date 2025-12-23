export const STORAGE_KEYS = {
  PORTFOLIO: "market-risk-portfolio",
  DATE_RANGE: "market-risk-date-range",
  METHOD: "market-risk-method",
  CONFIDENCE: "market-risk-confidence",
  RETURN_TYPE: "market-risk-return-type",
  HORIZON_DAYS: "market-risk-horizon-days",
  DRIFT: "market-risk-drift",
  PARAM_DIST: "market-risk-parametric-dist",
  HS_WEIGHTING: "market-risk-hs-weighting",
  HS_LAMBDA: "market-risk-hs-lambda",
  ROLLING_WINDOW: "market-risk-rolling-window",
  PORTFOLIO_VALUE: "market-risk-portfolio-value",
  RISK_FREE_RATE: "market-risk-risk-free-rate",
  ANNUALIZATION_DAYS: "market-risk-annualization-days",
  INCLUDE_BENCHMARK: "market-risk-include-benchmark",
  BENCHMARK_SYMBOL: "market-risk-benchmark-symbol",
  THEME: "market-risk-theme",
} as const;

export const PREDEFINED_SCENARIOS = [
  { value: "EQUITY_-5", label: "Equity -5%", description: "Mild market correction" },
  { value: "EQUITY_-10", label: "Equity -10%", description: "Standard correction" },
  { value: "EQUITY_-20", label: "Equity -20%", description: "Bear market entry" },
] as const;

export const HISTORICAL_SCENARIOS = [
  {
    value: "COVID_CRASH",
    label: "COVID-19 Crash (Mar 2020)",
    description: "S&P 500 -34% peak-to-trough",
    severity: "extreme",
    shocks: { equity: -0.34, volatility: 2.5 },
  },
  {
    value: "FINANCIAL_CRISIS",
    label: "2008 Financial Crisis",
    description: "Lehman collapse, S&P -57%",
    severity: "extreme",
    shocks: { equity: -0.50, credit: -0.40, volatility: 3.0 },
  },
  {
    value: "DOTCOM_BUBBLE",
    label: "Dot-com Crash (2000-2002)",
    description: "Tech bubble burst, Nasdaq -78%",
    severity: "extreme",
    shocks: { tech: -0.60, equity: -0.30 },
  },
  {
    value: "BLACK_MONDAY",
    label: "Black Monday (1987)",
    description: "Single-day crash -22.6%",
    severity: "extreme",
    shocks: { equity: -0.226, volatility: 4.0 },
  },
  {
    value: "TAPER_TANTRUM",
    label: "Taper Tantrum (2013)",
    description: "Fed taper fears, bonds -5%",
    severity: "medium",
    shocks: { bonds: -0.05, equity: -0.06 },
  },
  {
    value: "EUROPEAN_DEBT",
    label: "European Debt Crisis (2011)",
    description: "Sovereign debt concerns",
    severity: "high",
    shocks: { equity: -0.19, credit: -0.15 },
  },
  {
    value: "FLASH_CRASH",
    label: "Flash Crash (2010)",
    description: "Intraday crash -9% in minutes",
    severity: "high",
    shocks: { equity: -0.09, volatility: 5.0 },
  },
] as const;

// Uniform shocks (align with backend HISTORICAL_SCENARIOS)
export const HISTORICAL_UNIFORM_SHOCKS: Record<string, number> = {
  COVID_CRASH: -0.34,
  FINANCIAL_CRISIS: -0.50,
  DOTCOM_BUBBLE: -0.30,
  BLACK_MONDAY: -0.226,
  TAPER_TANTRUM: -0.06,
  EUROPEAN_DEBT: -0.19,
  FLASH_CRASH: -0.09,
};

export const MULTI_FACTOR_SCENARIOS = [
  {
    value: "STAGFLATION",
    label: "Stagflation Scenario",
    description: "High inflation + slow growth",
    factors: [
      { name: "Equities", shock: -0.15 },
      { name: "Bonds", shock: -0.10 },
      { name: "Commodities", shock: 0.20 },
    ],
  },
  {
    value: "RATE_SHOCK",
    label: "Rate Shock",
    description: "Central bank hawkish surprise",
    factors: [
      { name: "Equities", shock: -0.12 },
      { name: "Bonds", shock: -0.08 },
      { name: "Growth Stocks", shock: -0.20 },
    ],
  },
  {
    value: "LIQUIDITY_CRISIS",
    label: "Liquidity Crisis",
    description: "Market liquidity freeze",
    factors: [
      { name: "Equities", shock: -0.25 },
      { name: "Bonds", shock: -0.05 },
      { name: "Credit", shock: -0.35 },
    ],
  },
  {
    value: "CORRELATION_BREAKDOWN",
    label: "Correlation Breakdown",
    description: "All assets move together",
    factors: [
      { name: "Equities", shock: -0.20 },
      { name: "Bonds", shock: -0.15 },
    ],
  },
] as const;

export const CONFIDENCE_LEVELS = [
  { value: 0.95, label: "95%" },
  { value: 0.975, label: "97.5%" },
  { value: 0.99, label: "99%" },
  { value: 0.995, label: "99.5%" },
] as const;

export const VAR_METHODS = [
  { value: "historical", label: "Historical" },
  { value: "parametric", label: "Parametric" },
  { value: "monte_carlo", label: "Monte Carlo" },
] as const;

export const RETURN_TYPES = [
  { value: "simple", label: "Simple" },
  { value: "log", label: "Log" },
] as const;

export const DRIFT_OPTIONS = [
  { value: "ignore", label: "Ignore drift" },
  { value: "include", label: "Include drift" },
] as const;

export const PARAMETRIC_DISTS = [
  { value: "normal", label: "Normal" },
  { value: "student_t", label: "Student-t" },
] as const;

export const HS_WEIGHTING_OPTIONS = [
  { value: "none", label: "Equal-weighted" },
  { value: "ewma", label: "EWMA (λ)" },
] as const;

export const HORIZON_OPTIONS = [1, 5, 10] as const;

export const ROLLING_WINDOWS = [30, 90, 252] as const;

