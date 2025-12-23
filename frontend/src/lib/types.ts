export type PortfolioRow = {
  symbol: string;
  weight: number;
  asset_type?: string;
  display_name?: string;
  price_field?: "Adj Close" | "Close";
  // Optional fields for advanced stress testing
  duration?: number;
  dv01?: number;
  currency?: string;
  price?: number;
  quantity?: number;
};

export type MissingReportRow = {
  symbol: string;
  missing_pct: number;
  longest_gap: number;
};

export type PricesResponse = {
  dates: string[];
  prices: Record<string, (number | null)[]>;
  missing_report?: MissingReportRow[];
  failed_symbols?: string[];
};

export type RiskMetricsResponse = {
  summary: {
    ann_vol: number;
    ann_return: number;
    max_drawdown: number;
    beta: number | null;
    dd_duration_days: number;
    sharpe_ratio: number | null;
    sortino_ratio: number | null;
  };
  rolling_vol?: {
    dates: string[];
    vol_30?: (number | null)[];
    vol_90?: (number | null)[];
    vol_252?: (number | null)[];
  };
  correlation?: {
    symbols: string[];
    matrix: number[][];
  };
  contributions?: Array<{
    symbol: string;
    weight: number;
    mctr: number;
    cctr: number;
    pct_cctr?: number;
  }>;
  cumulative_returns?: {
    dates: string[];
    portfolio: number[];
    benchmark?: (number | null)[];
  };
  drawdown_series?: {
    dates: string[];
    portfolio: number[];
    benchmark?: (number | null)[];
  };
  rolling_sharpe?: {
    dates: string[];
    sharpe_30?: (number | null)[];
    sharpe_90?: (number | null)[];
    sharpe_252?: (number | null)[];
  };
  stats?: {
    skew?: number | null;
    kurtosis?: number | null;
    best_day?: number | null;
    worst_day?: number | null;
    hit_ratio?: number | null;
    downside_dev_ann?: number | null;
    calmar_ratio?: number | null;
  };
  benchmark?: {
    beta?: number | null;
    alpha_ann?: number | null;
    r2?: number | null;
    corr?: number | null;
    tracking_error_ann?: number | null;
    information_ratio?: number | null;
  };
  metadata?: {
    annualization_days?: number;
    return_type?: string;
    effective_days?: number;
    symbols?: string[];
    benchmark_symbol?: string | null;
    risk_free_rate?: number;
  };
  warnings?: string[];
};

export type VaRResponse = {
  method: "historical" | "parametric" | "monte_carlo";
  confidence: number;
  var: number; // positive loss fraction
  cvar: number; // positive loss fraction
  var_amount?: number | null;
  cvar_amount?: number | null;
  histogram?: {
    bins: number[];
    counts: number[];
  };
  histogram_realized?: {
    bins: number[];
    counts: number[];
  };
  histogram_simulated?: {
    bins: number[];
    counts: number[];
  };
  rolling?: {
    dates: string[];
    var_series: number[];
    realized: number[];
  };
  returns?: number[]; // portfolio returns for analysis
  warnings?: string[];
  metadata?: {
    effective_n?: number;
    horizon_days?: number;
    return_type?: string;
    drift?: string;
    hs_weighting?: string;
    hs_lambda?: number;
    parametric_dist?: string;
    df?: number;
    mu?: number;
    sigma?: number;
    seed?: number;
    mc_sims?: number;
    covariance_method?: string;
  };
  contributions_var?: Array<{
    symbol: string;
    weight: number;
    marginal_var: number;
    component_var: number;
  }>;
};

export type StressResponse = {
  scenario_name: string;
  scenario_key?: string | null;
  portfolio_pnl: number; // negative = loss
  by_asset: Array<{
    symbol: string;
    shock: number;
    pnl: number;
    asset_type?: string; // Optional: asset type used
    shock_type?: string; // Optional: "return" or "rate_bps"
    rate_bps_applied?: number; // Optional: rate shock in bps if applicable
  }>;
  net_exposure?: number | null;
  gross_exposure?: number | null;
  weights_sum?: number | null;
  top_loss_contributors?: Array<{
    symbol: string;
    shock: number;
    pnl: number;
  }> | null;
  missing_shocks?: string[] | null;
};

export type BacktestResponse = {
  exceptions_count: number;
  exceptions_rate: number;
  kupiec_lr?: number | null;
  kupiec_pvalue?: number | null;
  available_days: number;
  series: {
    dates: string[];
    realized: number[];
    var_threshold: number[];
    exceptions: boolean[];
  };
  exceptions_table: Array<{
    date: string;
    realized: number;
    var_threshold: number;
  }>;
};

export type NormalizePortfolioResponse = {
  portfolio: PortfolioRow[];
  was_normalized: boolean;
  sum_before: number;
};

