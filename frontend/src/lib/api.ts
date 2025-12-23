import axios from "axios";
import type { AxiosInstance } from "axios";
import type {
  PortfolioRow,
  PricesResponse,
  RiskMetricsResponse,
  VaRResponse,
  StressResponse,
  BacktestResponse,
  NormalizePortfolioResponse,
} from "./types";
import { backtestResponseSchema } from "./validators";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

const api: AxiosInstance = axios.create({
  baseURL: API_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

async function post<TReq, TRes>(
  url: string,
  payload: TReq
): Promise<TRes> {
  const response = await api.post<TRes>(url, payload);
  return response.data;
}

export const marketPrices = async (params: {
  symbols: string[];
  start: string;
  end: string;
}): Promise<PricesResponse> => {
  return post<typeof params, PricesResponse>("/api/market/prices", params);
};

export const marketCorrelation = async (params: {
  symbols: string[];
  start: string;
  end: string;
}): Promise<{ correlation: { symbols: string[]; matrix: number[][] } }> => {
  return post<typeof params, { correlation: { symbols: string[]; matrix: number[][] } }>(
    "/api/market/correlation",
    params
  );
};

export const normalizePortfolio = async (params: {
  portfolio: PortfolioRow[];
}): Promise<NormalizePortfolioResponse> => {
  return post<typeof params, NormalizePortfolioResponse>(
    "/api/portfolio/normalize",
    params
  );
};

export type RiskMetricsRequestPayload = {
  portfolio: PortfolioRow[];
  start: string;
  end: string;
  benchmark?: string;
  rolling_windows?: number[];
  return_type?: "simple" | "log";
  risk_free_rate?: number;
  annualization_days?: number;
  include_benchmark?: boolean;
};

export const riskMetrics = async (params: RiskMetricsRequestPayload): Promise<RiskMetricsResponse> => {
  return post<RiskMetricsRequestPayload, RiskMetricsResponse>("/api/risk/metrics", params);
};

export type VaRRequestPayload = {
  portfolio: PortfolioRow[];
  start: string;
  end: string;
  method: "historical" | "parametric" | "monte_carlo";
  confidence: number;
  lookback?: number | null;
  mc_sims?: number;
  seed?: number;
  return_type?: "simple" | "log";
  horizon_days?: number;
  drift?: "include" | "ignore";
  parametric_dist?: "normal" | "student_t";
  hs_weighting?: "none" | "ewma";
  hs_lambda?: number;
  rolling_window?: number;
  portfolio_value?: number | null;
};

export const riskVar = async (params: VaRRequestPayload): Promise<VaRResponse> => {
  return post<VaRRequestPayload, VaRResponse>("/api/risk/var", params);
};

export const stressRun = async (params: {
  portfolio: PortfolioRow[];
  start: string;
  end: string;
  scenario: string;
  shocks?: Record<string, number>;
  stress_mode?: "return_shock" | "duration_rate_shock";
}): Promise<StressResponse> => {
  return post<typeof params, StressResponse>("/api/stress/run", params);
};

export const backtestVar = async (params: {
  portfolio: PortfolioRow[];
  start: string;
  end: string;
  method: "historical" | "parametric" | "monte_carlo";
  confidence: number;
  lookback: number;
  backtest_days: number;
  mc_sims?: number;
  seed?: number;
  return_type?: "simple" | "log";
}): Promise<BacktestResponse> => {
  const res = await post<typeof params, BacktestResponse>("/api/backtest/var", params);
  const parsed = backtestResponseSchema.safeParse(res);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    const message = first ? `${first.path.join(".")}: ${first.message}` : "Invalid backtest response";
    throw new Error(message);
  }
  return parsed.data;
};

