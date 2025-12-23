import { useState, useEffect } from "react"
import { useMutation } from "@tanstack/react-query"
import { PageHeader } from "@/components/common/PageHeader"
import { KpiCard } from "@/components/common/KpiCard"
import { CorrelationHeatmapCard } from "@/components/charts/CorrelationHeatmapCard"
import { RollingLineCard } from "@/components/charts/RollingLineCard"
import { BarCard } from "@/components/charts/BarCard"
import { CumulativeReturnsChart } from "@/components/charts/CumulativeReturnsChart"
import { UnderwaterChart } from "@/components/charts/UnderwaterChart"
import { RollingSharpeChart } from "@/components/charts/RollingSharpeChart"
import { DataTable } from "@/components/tables/DataTable"
import { DateRangePicker } from "@/components/forms/DateRangePicker"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { riskMetrics } from "@/lib/api"
import { useToast } from "@/components/ui/toast"
import { STORAGE_KEYS, ROLLING_WINDOWS, RETURN_TYPES } from "@/lib/constants"
import { formatPct, formatNum, formatSignedPct } from "@/lib/format"
import { TrendingDown, TrendingUp, BarChart3, Activity, Zap, AlertTriangle, Info } from "lucide-react"

export function RiskMetrics() {
  const { addToast } = useToast()
  const [start, setStart] = useState(() => {
    const stored = localStorage.getItem(STORAGE_KEYS.DATE_RANGE)
    return stored ? JSON.parse(stored).start || "2023-01-01" : "2023-01-01"
  })
  const [end, setEnd] = useState(() => {
    const stored = localStorage.getItem(STORAGE_KEYS.DATE_RANGE)
    return stored
      ? JSON.parse(stored).end || new Date().toISOString().split("T")[0]
      : new Date().toISOString().split("T")[0]
  })
  const [benchmark, setBenchmark] = useState(() => {
    const stored = localStorage.getItem(STORAGE_KEYS.BENCHMARK_SYMBOL)
    return stored || "SPY"
  })
  const [showRolling, setShowRolling] = useState(true)
  const [returnType, setReturnType] = useState<"simple" | "log">(() => {
    const stored = localStorage.getItem(STORAGE_KEYS.RETURN_TYPE)
    return stored === "simple" ? "simple" : "log"
  })
  const [riskFreeRate, setRiskFreeRate] = useState(() => {
    const stored = localStorage.getItem(STORAGE_KEYS.RISK_FREE_RATE)
    return stored ? parseFloat(stored) || 0 : 0
  })
  const [annualizationDays, setAnnualizationDays] = useState(() => {
    const stored = localStorage.getItem(STORAGE_KEYS.ANNUALIZATION_DAYS)
    return stored ? parseInt(stored) || 252 : 252
  })
  const [includeBenchmark, setIncludeBenchmark] = useState(() => {
    const stored = localStorage.getItem(STORAGE_KEYS.INCLUDE_BENCHMARK)
    return stored !== "false"
  })

  const [portfolio, setPortfolio] = useState(() => {
    const stored = localStorage.getItem(STORAGE_KEYS.PORTFOLIO)
    return stored ? JSON.parse(stored) : []
  })

  // Reactive portfolio loading (storage + tab visibility)
  useEffect(() => {
    const loadPortfolio = () => {
      const stored = localStorage.getItem(STORAGE_KEYS.PORTFOLIO)
      setPortfolio(stored ? JSON.parse(stored) : [])
    }
    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEYS.PORTFOLIO) loadPortfolio()
    }
    const onVisibility = () => {
      if (document.visibilityState === "visible") loadPortfolio()
    }
    window.addEventListener("storage", onStorage)
    document.addEventListener("visibilitychange", onVisibility)
    return () => {
      window.removeEventListener("storage", onStorage)
      document.removeEventListener("visibilitychange", onVisibility)
    }
  }, [])

  // Persist settings
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.DATE_RANGE, JSON.stringify({ start, end }))
  }, [start, end])

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.BENCHMARK_SYMBOL, benchmark)
    localStorage.setItem(STORAGE_KEYS.RETURN_TYPE, returnType)
    localStorage.setItem(STORAGE_KEYS.RISK_FREE_RATE, riskFreeRate.toString())
    localStorage.setItem(STORAGE_KEYS.ANNUALIZATION_DAYS, annualizationDays.toString())
    localStorage.setItem(STORAGE_KEYS.INCLUDE_BENCHMARK, includeBenchmark.toString())
  }, [benchmark, returnType, riskFreeRate, annualizationDays, includeBenchmark])

  const metricsMutation = useMutation({
    mutationFn: riskMetrics,
    onError: (error: any) => {
      addToast({
        title: "Error",
        description: error.message || "Failed to compute risk metrics",
        variant: "destructive",
      })
    },
  })

  const handleRun = () => {
    if (portfolio.length === 0) {
      addToast({
        title: "No portfolio",
        description: "Please create a portfolio first",
        variant: "destructive",
      })
      return
    }
    metricsMutation.mutate({
      portfolio,
      start,
      end,
      benchmark: includeBenchmark ? benchmark : undefined,
      rolling_windows: showRolling ? [...ROLLING_WINDOWS] : undefined,
      return_type: returnType,
      risk_free_rate: riskFreeRate / 100, // convert % to decimal
      annualization_days: annualizationDays,
      include_benchmark: includeBenchmark,
    })
  }

  const data = metricsMutation.data

  return (
    <div className="space-y-6">
      <PageHeader
        title="Risk Metrics"
        subtitle="Comprehensive risk analysis for your portfolio"
        actions={
          <Button onClick={handleRun} disabled={metricsMutation.isPending}>
            <BarChart3 className="h-4 w-4 mr-2" />
            Run
          </Button>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <DateRangePicker
          start={start}
          end={end}
          onStartChange={setStart}
          onEndChange={setEnd}
        />
        <div className="space-y-2">
          <Label htmlFor="benchmark">Benchmark</Label>
          <div className="flex gap-2 items-center">
            <Input
              id="benchmark"
              value={benchmark}
              onChange={(e) => setBenchmark(e.target.value)}
              placeholder="SPY"
              disabled={!includeBenchmark}
              className="flex-1"
            />
            <div className="flex items-center gap-2">
              <Switch
                id="include-benchmark"
                checked={includeBenchmark}
                onCheckedChange={setIncludeBenchmark}
              />
              <Label htmlFor="include-benchmark" className="text-sm">Enable</Label>
            </div>
          </div>
        </div>
      </div>

      {/* Advanced Controls */}
      <Accordion type="single">
        <AccordionItem value="advanced">
          <AccordionTrigger value="advanced">Advanced Settings</AccordionTrigger>
          <AccordionContent value="advanced">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 pt-2">
              <div className="space-y-2">
                <Label>Return Type</Label>
                <Select value={returnType} onValueChange={(v) => setReturnType(v as "simple" | "log")}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select return type" />
                  </SelectTrigger>
                  <SelectContent>
                    {RETURN_TYPES.map((t) => (
                      <SelectItem key={t.value} value={t.value}>
                        {t.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="risk-free-rate">Risk-Free Rate (%)</Label>
                <Input
                  id="risk-free-rate"
                  type="number"
                  step="0.1"
                  value={riskFreeRate}
                  onChange={(e) => setRiskFreeRate(parseFloat(e.target.value) || 0)}
                  placeholder="4.5"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ann-days">Annualization Days</Label>
                <Input
                  id="ann-days"
                  type="number"
                  value={annualizationDays}
                  onChange={(e) => setAnnualizationDays(parseInt(e.target.value) || 252)}
                />
              </div>
              <div className="flex items-center gap-2 pt-6">
                <Switch
                  id="rolling"
                  checked={showRolling}
                  onCheckedChange={setShowRolling}
                />
                <Label htmlFor="rolling">Show rolling metrics</Label>
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      {/* Warnings */}
      {data?.warnings && data.warnings.length > 0 && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Warnings</AlertTitle>
          <AlertDescription>
            <ul className="list-disc list-inside mt-1">
              {data.warnings.map((w, i) => (
                <li key={i}>{w}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      {/* Metadata Badges */}
      {data?.metadata && (
        <div className="flex flex-wrap gap-2">
          <Badge variant="outline">
            <Info className="h-3 w-3 mr-1" />
            {data.metadata.effective_days} days
          </Badge>
          {data.metadata.benchmark_symbol && (
            <Badge variant="secondary">
              Benchmark: {data.metadata.benchmark_symbol}
            </Badge>
          )}
        </div>
      )}

      {data && (
        <>
          {/* Primary KPIs */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <KpiCard
              title="Annualized Return"
              value={formatSignedPct(data.summary.ann_return)}
              subtitle="Compound annual growth"
              icon={TrendingUp}
            />
            <KpiCard
              title="Annualized Volatility"
              value={formatPct(data.summary.ann_vol)}
              subtitle="Standard deviation"
              icon={Activity}
            />
            <KpiCard
              title="Sharpe Ratio"
              value={data.summary.sharpe_ratio != null ? formatNum(data.summary.sharpe_ratio, 2) : "N/A"}
              subtitle={
                data.metadata?.risk_free_rate && data.metadata.risk_free_rate > 0
                  ? `Rf: ${formatPct(data.metadata.risk_free_rate)}`
                  : "Risk-adjusted return"
              }
              icon={Zap}
            />
            <KpiCard
              title="Sortino Ratio"
              value={data.summary.sortino_ratio != null ? formatNum(data.summary.sortino_ratio, 2) : "N/A"}
              subtitle="Downside risk-adjusted"
              icon={Zap}
            />
            <KpiCard
              title="Max Drawdown"
              value={formatPct(data.summary.max_drawdown)}
              subtitle={`${data.summary.dd_duration_days || 0} days duration`}
              icon={TrendingDown}
            />
            <KpiCard
              title="Beta"
              value={data.summary.beta != null ? formatNum(data.summary.beta, 2) : "N/A"}
              subtitle={includeBenchmark ? `vs ${benchmark}` : "Benchmark disabled"}
            />
          </div>

          {/* Additional Stats */}
          {data.stats && (
            <Accordion type="single" defaultValue="stats">
              <AccordionItem value="stats">
                <AccordionTrigger value="stats">Additional Statistics</AccordionTrigger>
                <AccordionContent value="stats">
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 pt-2">
                    <KpiCard
                      title="Hit Ratio"
                      value={data.stats.hit_ratio != null ? formatPct(data.stats.hit_ratio) : "N/A"}
                      subtitle="% positive days"
                    />
                    <KpiCard
                      title="Best Day"
                      value={data.stats.best_day != null ? formatSignedPct(data.stats.best_day) : "N/A"}
                      subtitle="Maximum daily return"
                    />
                    <KpiCard
                      title="Worst Day"
                      value={data.stats.worst_day != null ? formatSignedPct(data.stats.worst_day) : "N/A"}
                      subtitle="Minimum daily return"
                    />
                    <KpiCard
                      title="Skew"
                      value={data.stats.skew != null ? formatNum(data.stats.skew, 2) : "N/A"}
                      subtitle="Return asymmetry"
                    />
                    <KpiCard
                      title="Kurtosis"
                      value={data.stats.kurtosis != null ? formatNum(data.stats.kurtosis, 2) : "N/A"}
                      subtitle="Excess (tail risk)"
                    />
                    <KpiCard
                      title="Downside Dev"
                      value={data.stats.downside_dev_ann != null ? formatPct(data.stats.downside_dev_ann) : "N/A"}
                      subtitle="Annualized"
                    />
                    <KpiCard
                      title="Calmar Ratio"
                      value={data.stats.calmar_ratio != null ? formatNum(data.stats.calmar_ratio, 2) : "N/A"}
                      subtitle="Return / MaxDD"
                    />
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          )}

          {/* Benchmark Analytics */}
          {data.benchmark && includeBenchmark && (
            <Accordion type="single" defaultValue="benchmark">
              <AccordionItem value="benchmark">
                <AccordionTrigger value="benchmark">Benchmark Analytics ({benchmark})</AccordionTrigger>
                <AccordionContent value="benchmark">
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 pt-2">
                    <KpiCard
                      title="Alpha (ann)"
                      value={data.benchmark.alpha_ann != null ? formatSignedPct(data.benchmark.alpha_ann) : "N/A"}
                      subtitle="Excess return"
                    />
                    <KpiCard
                      title="R²"
                      value={data.benchmark.r2 != null ? formatPct(data.benchmark.r2) : "N/A"}
                      subtitle="Explained variance"
                    />
                    <KpiCard
                      title="Correlation"
                      value={data.benchmark.corr != null ? formatNum(data.benchmark.corr, 2) : "N/A"}
                      subtitle="vs benchmark"
                    />
                    <KpiCard
                      title="Tracking Error"
                      value={data.benchmark.tracking_error_ann != null ? formatPct(data.benchmark.tracking_error_ann) : "N/A"}
                      subtitle="Annualized"
                    />
                    <KpiCard
                      title="Info Ratio"
                      value={data.benchmark.information_ratio != null ? formatNum(data.benchmark.information_ratio, 2) : "N/A"}
                      subtitle="Active return / TE"
                    />
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          )}

          {data.cumulative_returns && (
            <CumulativeReturnsChart
              dates={data.cumulative_returns.dates}
              portfolio={data.cumulative_returns.portfolio}
              benchmark={data.cumulative_returns.benchmark}
            />
          )}

          {data.drawdown_series && (
            <UnderwaterChart
              dates={data.drawdown_series.dates}
              drawdown={data.drawdown_series.portfolio}
            />
          )}

          {showRolling && data.rolling_sharpe && (
            <RollingSharpeChart
              dates={data.rolling_sharpe.dates}
              sharpe30={data.rolling_sharpe.sharpe_30}
              sharpe90={data.rolling_sharpe.sharpe_90}
              sharpe252={data.rolling_sharpe.sharpe_252}
            />
          )}

          {data.correlation && (
            <CorrelationHeatmapCard
              symbols={data.correlation.symbols}
              matrix={data.correlation.matrix}
            />
          )}

          {data.contributions && data.contributions.length > 0 && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <DataTable
                title="Risk Contributions"
                description="Annualized MCTR/CCTR; % sums to ~100%"
                data={data.contributions}
                columns={[
                  { key: "symbol", header: "Symbol" },
                  {
                    key: "weight",
                    header: "Weight",
                    render: (row) => formatPct(row.weight),
                  },
                  {
                    key: "mctr",
                    header: "MCTR",
                    render: (row) => formatPct(row.mctr),
                  },
                  {
                    key: "cctr",
                    header: "CCTR",
                    render: (row) => formatPct(row.cctr),
                  },
                  {
                    key: "pct_cctr",
                    header: "% Risk",
                    render: (row) => row.pct_cctr != null ? formatPct(row.pct_cctr) : "—",
                  },
                ]}
              />
              {data.contributions.every((c) => typeof c.pct_cctr === "number") ? (
                <BarCard
                  data={data.contributions.map((c) => ({
                    name: c.symbol,
                    value: c.pct_cctr as number,
                  }))}
                  title="% Contribution to Risk"
                  valueFormatter={(v) => formatPct(v)}
                />
              ) : (
                <BarCard
                  data={data.contributions.map((c) => ({
                    name: c.symbol,
                    value: c.cctr,
                  }))}
                  title="Component Contribution to Risk"
                  valueFormatter={(v) => formatNum(v, 4)}
                />
              )}
            </div>
          )}

          {showRolling && data.rolling_vol && (
            <RollingLineCard
              dates={data.rolling_vol.dates}
              series={{
                "30d": data.rolling_vol.vol_30 || [],
                "90d": data.rolling_vol.vol_90 || [],
                "252d": data.rolling_vol.vol_252 || [],
              }}
              title="Rolling Volatility"
            />
          )}
        </>
      )}
    </div>
  )
}
