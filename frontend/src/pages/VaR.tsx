import { useState, useEffect } from "react"
import { useMutation } from "@tanstack/react-query"
import { PageHeader } from "@/components/common/PageHeader"
import { KpiCard } from "@/components/common/KpiCard"
import { TailRiskMetrics } from "@/components/var/TailRiskMetrics"
import { MultiConfidenceLadder } from "@/components/var/MultiConfidenceLadder"
import { MethodComparison } from "@/components/var/MethodComparison"
import { EnhancedHistogram } from "@/components/var/EnhancedHistogram"
import { RollingLineCard } from "@/components/charts/RollingLineCard"
import { DateRangePicker } from "@/components/forms/DateRangePicker"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { riskVar } from "@/lib/api"
import { useToast } from "@/components/ui/toast"
import {
  STORAGE_KEYS,
  VAR_METHODS,
  CONFIDENCE_LEVELS,
  RETURN_TYPES,
  HORIZON_OPTIONS,
  DRIFT_OPTIONS,
  PARAMETRIC_DISTS,
  HS_WEIGHTING_OPTIONS,
} from "@/lib/constants"
import { formatPct } from "@/lib/format"
import { AlertTriangle, GitCompare } from "lucide-react"
import type { VaRResponse } from "@/lib/types"

export function VaR() {
  const { addToast } = useToast()
  const [method, setMethod] = useState<"historical" | "parametric" | "monte_carlo">(
    () => {
      const stored = localStorage.getItem(STORAGE_KEYS.METHOD)
      return (stored as any) || "historical"
    }
  )
  const [confidence, setConfidence] = useState(() => {
    const stored = localStorage.getItem(STORAGE_KEYS.CONFIDENCE)
    return stored ? parseFloat(stored) : 0.95
  })
  const [returnType, setReturnType] = useState<"simple" | "log">(() => {
    const stored = localStorage.getItem(STORAGE_KEYS.RETURN_TYPE)
    return stored === "log" ? "log" : "simple"
  })
  const [horizonDays, setHorizonDays] = useState(() => {
    const stored = localStorage.getItem(STORAGE_KEYS.HORIZON_DAYS)
    return stored ? parseInt(stored) || 1 : 1
  })
  const [drift, setDrift] = useState<"include" | "ignore">(() => {
    const stored = localStorage.getItem(STORAGE_KEYS.DRIFT)
    return stored === "include" ? "include" : "ignore"
  })
  const [parametricDist, setParametricDist] = useState<"normal" | "student_t">(() => {
    const stored = localStorage.getItem(STORAGE_KEYS.PARAM_DIST)
    return stored === "student_t" ? "student_t" : "normal"
  })
  const [hsWeighting, setHsWeighting] = useState<"none" | "ewma">(() => {
    const stored = localStorage.getItem(STORAGE_KEYS.HS_WEIGHTING)
    return stored === "ewma" ? "ewma" : "none"
  })
  const [hsLambda, setHsLambda] = useState(() => {
    const stored = localStorage.getItem(STORAGE_KEYS.HS_LAMBDA)
    return stored ? parseFloat(stored) || 0.94 : 0.94
  })
  const [lookback, setLookback] = useState(250)
  const [mcSims, setMcSims] = useState(10000)
  const [rollingWindow, setRollingWindow] = useState(() => {
    const stored = localStorage.getItem(STORAGE_KEYS.ROLLING_WINDOW)
    return stored ? parseInt(stored) || 250 : 250
  })
  const [portfolioValue, setPortfolioValue] = useState<number | null>(() => {
    const stored = localStorage.getItem(STORAGE_KEYS.PORTFOLIO_VALUE)
    const parsed = stored ? parseFloat(stored) : NaN
    return isNaN(parsed) ? null : parsed
  })
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

  const [portfolio, setPortfolio] = useState(() => {
    const stored = localStorage.getItem(STORAGE_KEYS.PORTFOLIO)
    return stored ? JSON.parse(stored) : []
  })

  const [compareMode, setCompareMode] = useState(false)
  const [methodResults, setMethodResults] = useState<{
    historical?: VaRResponse
    parametric?: VaRResponse
    monte_carlo?: VaRResponse
  }>({})

  const formatAmount = (val?: number | null) =>
    val === null || val === undefined
      ? null
      : val.toLocaleString(undefined, { style: "currency", currency: "USD", maximumFractionDigits: 0 })

  const varMutation = useMutation({
    mutationFn: riskVar,
    onSuccess: (data) => {
      setMethodResults((prev) => ({
        ...prev,
        [data.method]: data,
      }))
    },
    onError: (error: any) => {
      addToast({
        title: "Error",
        description: error.message || "Failed to compute VaR",
        variant: "destructive",
      })
    },
  })

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.METHOD, method)
    localStorage.setItem(STORAGE_KEYS.CONFIDENCE, confidence.toString())
  }, [method, confidence])

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.RETURN_TYPE, returnType)
    localStorage.setItem(STORAGE_KEYS.HORIZON_DAYS, horizonDays.toString())
    localStorage.setItem(STORAGE_KEYS.DRIFT, drift)
    localStorage.setItem(STORAGE_KEYS.PARAM_DIST, parametricDist)
    localStorage.setItem(STORAGE_KEYS.HS_WEIGHTING, hsWeighting)
    localStorage.setItem(STORAGE_KEYS.HS_LAMBDA, hsLambda.toString())
    localStorage.setItem(STORAGE_KEYS.ROLLING_WINDOW, rollingWindow.toString())
    if (portfolioValue !== null && !isNaN(portfolioValue)) {
      localStorage.setItem(STORAGE_KEYS.PORTFOLIO_VALUE, portfolioValue.toString())
    } else {
      localStorage.removeItem(STORAGE_KEYS.PORTFOLIO_VALUE)
    }
  }, [returnType, horizonDays, drift, parametricDist, hsWeighting, hsLambda, rollingWindow, portfolioValue])

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.DATE_RANGE, JSON.stringify({ start, end }))
  }, [start, end])

  // Keep portfolio reactive to storage and tab focus
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

  const handleRun = () => {
    if (portfolio.length === 0) {
      addToast({
        title: "No portfolio",
        description: "Please create a portfolio first",
        variant: "destructive",
      })
      return
    }
    varMutation.mutate({
      portfolio,
      start,
      end,
      method,
      confidence,
      lookback: method === "historical" ? lookback : null,
      mc_sims: method === "monte_carlo" ? mcSims : undefined,
      return_type: returnType,
      horizon_days: horizonDays,
      drift,
      parametric_dist: parametricDist,
      hs_weighting: hsWeighting,
      hs_lambda: hsLambda,
      rolling_window: rollingWindow,
      portfolio_value: portfolioValue ?? undefined,
    })
  }

  const handleCompareAll = async () => {
    if (portfolio.length === 0) {
      addToast({
        title: "No portfolio",
        description: "Please create a portfolio first",
        variant: "destructive",
      })
      return
    }

    // Run all three methods
    const methods: Array<"historical" | "parametric" | "monte_carlo"> = [
      "historical",
      "parametric",
      "monte_carlo",
    ]

    for (const m of methods) {
      try {
        const result = await riskVar({
          portfolio,
          start,
          end,
          method: m,
          confidence,
          lookback: m === "historical" ? lookback : null,
          mc_sims: m === "monte_carlo" ? mcSims : undefined,
          return_type: returnType,
          horizon_days: horizonDays,
          drift,
          parametric_dist: parametricDist,
          hs_weighting: hsWeighting,
          hs_lambda: hsLambda,
          rolling_window: rollingWindow,
          portfolio_value: portfolioValue ?? undefined,
        })
        setMethodResults((prev) => ({ ...prev, [m]: result }))
      } catch (error: any) {
        addToast({
          title: `Error (${m})`,
          description: error.message || `Failed to compute ${m} VaR`,
          variant: "destructive",
        })
      }
    }
  }

  const data = methodResults[method] || varMutation.data
  const histogram = data?.histogram_simulated || data?.histogram_realized || data?.histogram
  const varAmount = formatAmount(data?.var_amount)
  const cvarAmount = formatAmount(data?.cvar_amount)

  const methodologyText = {
    historical: `Historical VaR uses past returns to estimate losses. ${
      hsWeighting === "ewma" ? `EWMA weighting (λ=${hsLambda.toFixed(2)}) emphasizes recent moves. ` : ""
    }${horizonDays > 1 ? "Returns are aggregated to the selected horizon." : ""}`.trim(),
    parametric: `${
      parametricDist === "student_t"
        ? "Parametric VaR uses a Student-t fit (fatter tails) on the aggregated returns."
        : "Parametric VaR assumes a normal fit on the aggregated returns."
    } ${drift === "include" ? "Empirical drift is included. " : ""}${
      horizonDays > 1 ? "Horizon handled via aggregated returns (no extra sqrt(h) scaling)." : ""
    }`.trim(),
    monte_carlo: `Monte Carlo VaR simulates a multivariate normal on asset returns${
      returnType === "log" ? " in log space" : ""
    } and scales mean/cov to the horizon (${horizonDays}d). ${
      horizonDays > 1 ? "Horizon uses mvn scaling (approximate, path simulation not used)." : ""
    }`.trim(),
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="VaR / CVaR"
        subtitle="Value at Risk and Conditional Value at Risk calculations"
        actions={
          <div className="flex gap-2 items-center">
            <div className="flex items-center gap-2 mr-2">
              <Switch
                id="compare-mode"
                checked={compareMode}
                onCheckedChange={(checked) => setCompareMode(!!checked)}
              />
              <Label htmlFor="compare-mode" className="cursor-pointer text-sm">
                Compare Mode
              </Label>
            </div>
            {compareMode ? (
              <Button onClick={handleCompareAll} disabled={varMutation.isPending}>
                <GitCompare className="h-4 w-4 mr-2" />
                Compare All Methods
              </Button>
            ) : (
              <Button onClick={handleRun} disabled={varMutation.isPending}>
                <AlertTriangle className="h-4 w-4 mr-2" />
                Run
              </Button>
            )}
          </div>
        }
      />

      <Tabs value={method} onValueChange={(v) => setMethod(v as any)}>
        <TabsList>
          {VAR_METHODS.map((m) => (
            <TabsTrigger key={m.value} value={m.value}>
              {m.label}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="historical" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <DateRangePicker
              start={start}
              end={end}
              onStartChange={setStart}
              onEndChange={setEnd}
            />
            <div className="space-y-2">
              <Label htmlFor="confidence">Confidence Level</Label>
              <Select id="confidence" value={confidence.toString()} onValueChange={(val) => setConfidence(parseFloat(val))}>
                <SelectTrigger id="confidence-trigger">
                  <SelectValue placeholder="Confidence" />
                </SelectTrigger>
                <SelectContent>
                  {CONFIDENCE_LEVELS.map((c) => (
                    <SelectItem key={c.value} value={c.value.toString()}>
                      {c.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="return-type">Return Type</Label>
              <Select id="return-type" value={returnType} onValueChange={(val) => setReturnType(val as "simple" | "log")}>
                <SelectTrigger id="return-type-trigger">
                  <SelectValue placeholder="Return type" />
                </SelectTrigger>
                <SelectContent>
                  {RETURN_TYPES.map((r) => (
                    <SelectItem key={r.value} value={r.value}>
                      {r.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="horizon">Horizon (days)</Label>
              <Select id="horizon" value={horizonDays.toString()} onValueChange={(val) => setHorizonDays(parseInt(val) || 1)}>
                <SelectTrigger id="horizon-trigger">
                  <SelectValue placeholder="Horizon" />
                </SelectTrigger>
                <SelectContent>
                  {HORIZON_OPTIONS.map((h) => (
                    <SelectItem key={h} value={h.toString()}>
                      {h}d
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="lookback">Lookback Window</Label>
              <Input
                id="lookback"
                type="number"
                value={lookback}
                onChange={(e) => setLookback(parseInt(e.target.value) || 250)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="portfolio-value">Portfolio Value (optional)</Label>
              <Input
                id="portfolio-value"
                type="number"
                value={portfolioValue ?? ""}
                onChange={(e) => setPortfolioValue(e.target.value === "" ? null : parseFloat(e.target.value))}
                placeholder="e.g. 1,000,000"
              />
            </div>
          </div>

          <Accordion type="single" collapsible>
            <AccordionItem value="historical-advanced">
              <AccordionTrigger>Historical Advanced</AccordionTrigger>
              <AccordionContent className="space-y-4">
                <div className="flex items-center gap-3">
                  <Switch
                    id="hs-weighting"
                    checked={hsWeighting === "ewma"}
                    onCheckedChange={(checked) => setHsWeighting(checked ? "ewma" : "none")}
                  />
                  <Label htmlFor="hs-weighting" className="cursor-pointer">
                    EWMA Weighting
                  </Label>
                </div>
                {hsWeighting === "ewma" && (
                  <div className="space-y-2">
                    <Label htmlFor="hs-lambda">Lambda (λ)</Label>
                    <Input
                      id="hs-lambda"
                      type="number"
                      step="0.01"
                      min={0.01}
                      max={0.999}
                      value={hsLambda}
                      onChange={(e) => setHsLambda(parseFloat(e.target.value) || 0.94)}
                    />
                  </div>
                )}
                <div className="space-y-2">
                  <Label htmlFor="rolling-window">Rolling Window</Label>
                  <Input
                    id="rolling-window"
                    type="number"
                    value={rollingWindow}
                    onChange={(e) => setRollingWindow(parseInt(e.target.value) || 250)}
                  />
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </TabsContent>

        <TabsContent value="parametric" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <DateRangePicker
              start={start}
              end={end}
              onStartChange={setStart}
              onEndChange={setEnd}
            />
            <div className="space-y-2">
              <Label htmlFor="confidence-param">Confidence Level</Label>
              <Select id="confidence-param" value={confidence.toString()} onValueChange={(val) => setConfidence(parseFloat(val))}>
                <SelectTrigger id="confidence-param-trigger">
                  <SelectValue placeholder="Confidence" />
                </SelectTrigger>
                <SelectContent>
                  {CONFIDENCE_LEVELS.map((c) => (
                    <SelectItem key={c.value} value={c.value.toString()}>
                      {c.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="param-dist">Distribution</Label>
              <Select id="param-dist" value={parametricDist} onValueChange={(val) => setParametricDist(val as "normal" | "student_t")}>
                <SelectTrigger id="param-dist-trigger">
                  <SelectValue placeholder="Distribution" />
                </SelectTrigger>
                <SelectContent>
                  {PARAMETRIC_DISTS.map((p) => (
                    <SelectItem key={p.value} value={p.value}>
                      {p.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="return-type-param">Return Type</Label>
              <Select
                id="return-type-param"
                value={returnType}
                onValueChange={(val) => setReturnType(val as "simple" | "log")}
              >
                <SelectTrigger id="return-type-param-trigger">
                  <SelectValue placeholder="Return type" />
                </SelectTrigger>
                <SelectContent>
                  {RETURN_TYPES.map((r) => (
                    <SelectItem key={r.value} value={r.value}>
                      {r.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="horizon-param">Horizon (days)</Label>
              <Select
                id="horizon-param"
                value={horizonDays.toString()}
                onValueChange={(val) => setHorizonDays(parseInt(val) || 1)}
              >
                <SelectTrigger id="horizon-param-trigger">
                  <SelectValue placeholder="Horizon" />
                </SelectTrigger>
                <SelectContent>
                  {HORIZON_OPTIONS.map((h) => (
                    <SelectItem key={h} value={h.toString()}>
                      {h}d
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="portfolio-value-param">Portfolio Value (optional)</Label>
              <Input
                id="portfolio-value-param"
                type="number"
                value={portfolioValue ?? ""}
                onChange={(e) => setPortfolioValue(e.target.value === "" ? null : parseFloat(e.target.value))}
                placeholder="e.g. 1,000,000"
              />
            </div>
          </div>

          <Accordion type="single" collapsible>
            <AccordionItem value="parametric-advanced">
              <AccordionTrigger>Parametric Advanced</AccordionTrigger>
              <AccordionContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="drift-mode">Drift</Label>
                  <Select id="drift-mode" value={drift} onValueChange={(val) => setDrift(val as "include" | "ignore")}>
                    <SelectTrigger id="drift-mode-trigger">
                      <SelectValue placeholder="Drift" />
                    </SelectTrigger>
                    <SelectContent>
                      {DRIFT_OPTIONS.map((d) => (
                        <SelectItem key={d.value} value={d.value}>
                          {d.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="rolling-window-param">Rolling Window</Label>
                  <Input
                    id="rolling-window-param"
                    type="number"
                    value={rollingWindow}
                    onChange={(e) => setRollingWindow(parseInt(e.target.value) || 250)}
                  />
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </TabsContent>

        <TabsContent value="monte_carlo" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <DateRangePicker
              start={start}
              end={end}
              onStartChange={setStart}
              onEndChange={setEnd}
            />
            <div className="space-y-2">
              <Label htmlFor="confidence-mc">Confidence Level</Label>
              <Select id="confidence-mc" value={confidence.toString()} onValueChange={(val) => setConfidence(parseFloat(val))}>
                <SelectTrigger id="confidence-mc-trigger">
                  <SelectValue placeholder="Confidence" />
                </SelectTrigger>
                <SelectContent>
                  {CONFIDENCE_LEVELS.map((c) => (
                    <SelectItem key={c.value} value={c.value.toString()}>
                      {c.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="mc-sims">Monte Carlo Simulations</Label>
              <Input
                id="mc-sims"
                type="number"
                value={mcSims}
                onChange={(e) => setMcSims(parseInt(e.target.value) || 10000)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="return-type-mc">Return Type</Label>
              <Select id="return-type-mc" value={returnType} onValueChange={(val) => setReturnType(val as "simple" | "log")}>
                <SelectTrigger id="return-type-mc-trigger">
                  <SelectValue placeholder="Return type" />
                </SelectTrigger>
                <SelectContent>
                  {RETURN_TYPES.map((r) => (
                    <SelectItem key={r.value} value={r.value}>
                      {r.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="horizon-mc">Horizon (days)</Label>
              <Select id="horizon-mc" value={horizonDays.toString()} onValueChange={(val) => setHorizonDays(parseInt(val) || 1)}>
                <SelectTrigger id="horizon-mc-trigger">
                  <SelectValue placeholder="Horizon" />
                </SelectTrigger>
                <SelectContent>
                  {HORIZON_OPTIONS.map((h) => (
                    <SelectItem key={h} value={h.toString()}>
                      {h}d
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="portfolio-value-mc">Portfolio Value (optional)</Label>
              <Input
                id="portfolio-value-mc"
                type="number"
                value={portfolioValue ?? ""}
                onChange={(e) => setPortfolioValue(e.target.value === "" ? null : parseFloat(e.target.value))}
                placeholder="e.g. 1,000,000"
              />
            </div>
          </div>

          <Accordion type="single" collapsible>
            <AccordionItem value="mc-advanced">
              <AccordionTrigger>Monte Carlo Advanced</AccordionTrigger>
              <AccordionContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="drift-mc">Drift</Label>
                  <Select id="drift-mc" value={drift} onValueChange={(val) => setDrift(val as "include" | "ignore")}>
                    <SelectTrigger id="drift-mc-trigger">
                      <SelectValue placeholder="Drift" />
                    </SelectTrigger>
                    <SelectContent>
                      {DRIFT_OPTIONS.map((d) => (
                        <SelectItem key={d.value} value={d.value}>
                          {d.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </TabsContent>
      </Tabs>

      {/* Method Comparison Mode */}
      {compareMode && Object.keys(methodResults).length > 1 && (
        <MethodComparison results={methodResults} />
      )}

      {data && (
        <>
          {/* Tail Risk Metrics */}
          {data.returns && data.returns.length > 0 && (
            <TailRiskMetrics
              returns={data.returns}
              varValue={data.var}
              cvarValue={data.cvar}
            />
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <KpiCard
              title={`VaR (${formatPct(confidence)})`}
              value={formatPct(data.var)}
              subtitle={varAmount ? `Positive loss fraction • ${varAmount}` : "Positive loss fraction"}
              variant="destructive"
            />
            <KpiCard
              title={`CVaR (${formatPct(confidence)})`}
              value={formatPct(data.cvar)}
              subtitle={
                cvarAmount ? `Expected tail loss • ${cvarAmount}` : "Conditional VaR (expected loss beyond VaR)"
              }
              variant="destructive"
            />
          </div>

          {data.warnings && data.warnings.length > 0 && (
            <Alert variant="destructive">
              <AlertTitle>Warnings</AlertTitle>
              <AlertDescription>
                <ul className="list-disc list-inside space-y-1">
                  {data.warnings.map((w, idx) => (
                    <li key={idx}>{w}</li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          )}

          {data.metadata && (
            <div className="flex flex-wrap gap-2">
              {data.metadata.return_type && <Badge variant="outline">Returns: {data.metadata.return_type}</Badge>}
              {data.metadata.horizon_days && <Badge variant="outline">Horizon: {data.metadata.horizon_days}d</Badge>}
              {data.metadata.parametric_dist && (
                <Badge variant="outline">Dist: {data.metadata.parametric_dist}</Badge>
              )}
              {data.metadata.hs_weighting && (
                <Badge variant="outline">
                  HS: {data.metadata.hs_weighting}
                  {data.metadata.hs_weighting === "ewma" && data.metadata.hs_lambda
                    ? ` (λ=${data.metadata.hs_lambda})`
                    : ""}
                </Badge>
              )}
              {data.metadata.effective_n && <Badge variant="outline">N={data.metadata.effective_n}</Badge>}
            </div>
          )}

          {/* Multi-Confidence Ladder */}
          {data.returns && data.returns.length > 0 && (
            <MultiConfidenceLadder returns={data.returns} method={data.method as any} />
          )}

          {/* Enhanced Histogram */}
          {histogram && data.returns && (
            <EnhancedHistogram
              bins={histogram.bins}
              counts={histogram.counts}
              varValue={data.var}
              cvarValue={data.cvar}
              confidence={confidence}
              returns={data.returns}
            />
          )}

          {/* Rolling VaR Chart */}
          {data.rolling && (
            <RollingLineCard
              dates={data.rolling.dates}
              series={{
                VaR: data.rolling.var_series,
                Realized: data.rolling.realized || [],
              }}
              title="Rolling VaR vs Realized Returns"
              yAxisFormatter={(v) => formatPct(Math.abs(v))}
            />
          )}

          <Accordion type="single" collapsible defaultValue="methodology">
            <AccordionItem value="methodology">
              <AccordionTrigger>Methodology & Interpretation</AccordionTrigger>
              <AccordionContent>
                <div className="space-y-3 text-sm text-muted-foreground">
                  <div>
                    <strong className="text-foreground">{VAR_METHODS.find((m) => m.value === method)?.label}:</strong>
                    <p className="mt-1">{methodologyText[method]}</p>
                  </div>

                  <div>
                    <strong className="text-foreground">Interpretation:</strong>
                    <ul className="list-disc list-inside mt-1 space-y-1">
                      <li>
                        VaR ({formatPct(confidence)}): There is a {formatPct(1 - confidence)} chance
                        of losing more than {formatPct(data.var)} in a single day
                      </li>
                      <li>
                        CVaR ({formatPct(confidence)}): When losses exceed VaR, the average loss is{" "}
                        {formatPct(data.cvar)}
                      </li>
                      <li>VaR and CVaR are shown as positive loss fractions</li>
                      <li>Realized returns are signed (positive = gain, negative = loss)</li>
                    </ul>
                  </div>

                  {compareMode && (
                    <div className="p-3 bg-info/10 border border-info/20 rounded-md">
                      <strong className="text-info">Compare Mode Tips:</strong>
                      <ul className="list-disc list-inside mt-1 space-y-1">
                        <li>Strong agreement ({"<"}10% spread) indicates robust estimates</li>
                        <li>
                          If methods disagree significantly, consider distribution characteristics
                        </li>
                        <li>Use the mean or maximum VaR for conservative risk management</li>
                      </ul>
                    </div>
                  )}
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </>
      )}
    </div>
  )
}

