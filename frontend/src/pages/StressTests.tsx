import { useState, useEffect, useMemo, useCallback } from "react"
import { useMutation } from "@tanstack/react-query"
import { PageHeader } from "@/components/common/PageHeader"
import { KpiCard } from "@/components/common/KpiCard"
import { WaterfallChart } from "@/components/stress/WaterfallChart"
import { StressHeatmap } from "@/components/stress/StressHeatmap"
import { SensitivityAnalysis } from "@/components/stress/SensitivityAnalysis"
import { ScenarioComparison } from "@/components/stress/ScenarioComparison"
import { TornadoDiagram } from "@/components/stress/TornadoDiagram"
import { SeverityIndicator, TrafficLight } from "@/components/stress/SeverityIndicator"
import { BarCard } from "@/components/charts/BarCard"
import { DataTable } from "@/components/tables/DataTable"
import { ScenarioBuilder } from "@/components/forms/ScenarioBuilder"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { stressRun } from "@/lib/api"
import { useToast } from "@/components/ui/toast"
import { STORAGE_KEYS, PREDEFINED_SCENARIOS, HISTORICAL_SCENARIOS, MULTI_FACTOR_SCENARIOS, HISTORICAL_UNIFORM_SHOCKS } from "@/lib/constants"
import { formatSignedPct } from "@/lib/format"
import { TestTube, GitCompare, History, Zap } from "lucide-react"
import type { StressResponse } from "@/lib/types"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { getScenarioLabel, isUniformScenario } from "@/lib/stressUtils"

export function StressTests() {
  const { addToast } = useToast()
  const [scenarioType, setScenarioType] = useState<"predefined" | "historical" | "multifactor" | "custom">("predefined")
  const [predefinedScenario, setPredefinedScenario] = useState("EQUITY_-10")
  const [historicalScenario, setHistoricalScenario] = useState("COVID_CRASH")
  const [multiFactorScenario, setMultiFactorScenario] = useState("STAGFLATION")
  const [customShocks, setCustomShocks] = useState<Record<string, number>>({})
  const [compareMode, setCompareMode] = useState(false)
  const [scenarioResults, setScenarioResults] = useState<Array<StressResponse & { scenarioName: string; scenarioKey?: string | null }>>([])
  const [lastScenarioKey, setLastScenarioKey] = useState<string>("")
  
  // Advanced mode state
  const [advancedMode, setAdvancedMode] = useState(false)
  const [stressMode, setStressMode] = useState<"return_shock" | "duration_rate_shock">("return_shock")
  
  // Note: Date range is stored but NOT used in stress tests
  // Stress tests apply hypothetical shocks, not historical analysis
  const [start] = useState(() => {
    const stored = localStorage.getItem(STORAGE_KEYS.DATE_RANGE)
    return stored ? JSON.parse(stored).start || "2023-01-01" : "2023-01-01"
  })
  const [end] = useState(() => {
    const stored = localStorage.getItem(STORAGE_KEYS.DATE_RANGE)
    return stored
      ? JSON.parse(stored).end || new Date().toISOString().split("T")[0]
      : new Date().toISOString().split("T")[0]
  })

  const [portfolio, setPortfolio] = useState(() => {
    const stored = localStorage.getItem(STORAGE_KEYS.PORTFOLIO)
    return stored ? JSON.parse(stored) : []
  })

  const stressMutation = useMutation({
    mutationFn: stressRun,
    onSuccess: (data, variables) => {
      if (compareMode) {
        const label = getScenarioLabel(variables.scenario)
        setScenarioResults((prev) => [
          ...prev,
          { ...data, scenarioName: label, scenarioKey: variables.scenario },
        ])
      }
    },
    onError: (error: any) => {
      addToast({
        title: "Error",
        description: error.message || "Failed to run stress test",
        variant: "destructive",
      })
    },
  })

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

    let scenario: string
    let shocks: Record<string, number> | undefined

    switch (scenarioType) {
      case "predefined":
        scenario = predefinedScenario
        break
      case "historical":
        scenario = historicalScenario
        break
      case "multifactor":
        scenario = multiFactorScenario
        break
      case "custom":
        scenario = "CUSTOM"
        const normalizedShocks = Object.fromEntries(
          Object.entries(customShocks).map(([k, v]) => [k.trim().toUpperCase(), v])
        )
        shocks = normalizedShocks
        // Validate custom shocks cover all symbols
        const missing = portfolio
          .map((p: any) => p.symbol)
          .map((s: string) => s.toUpperCase())
          .filter((s: string) => shocks?.[s] === undefined || !Number.isFinite(shocks?.[s]))
        if (missing.length > 0) {
          addToast({
            title: "Missing shocks",
            description: `Provide shocks for: ${missing.join(", ")}`,
            variant: "destructive",
          })
          return
        }
        break
      default:
        scenario = predefinedScenario
    }

    if (!compareMode) {
      setScenarioResults([]) // Clear previous results in single mode
    }

    setLastScenarioKey(scenario)
    stressMutation.mutate({
      portfolio,
      start,
      end,
      scenario,
      shocks,
      stress_mode: advancedMode ? stressMode : undefined,
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

    setScenarioResults([])

    // Run all predefined scenarios
    for (const s of PREDEFINED_SCENARIOS) {
      try {
        const result = await stressRun({
          portfolio,
          start,
          end,
          scenario: s.value,
          stress_mode: advancedMode ? stressMode : undefined,
        })
        setScenarioResults((prev) => [...prev, { ...result, scenarioName: s.label, scenarioKey: s.value }])
      } catch (error: any) {
        console.error(`Failed to run ${s.label}:`, error)
      }
    }
  }

  const isUniformScenario = useCallback(
    (key: string | undefined | null) => {
      if (!key) return false
      if (key.startsWith("EQUITY_")) return true
      if (HISTORICAL_UNIFORM_SHOCKS[key] !== undefined) return true
      return false
    },
    []
  )

  const getBaseShock = useCallback(
    (key: string | undefined | null) => {
      if (!key) return 0
      if (key.startsWith("EQUITY_")) {
        const pct = parseFloat(key.replace("EQUITY_", ""))
        return isFinite(pct) ? pct / 100 : 0
      }
      if (HISTORICAL_UNIFORM_SHOCKS[key] !== undefined) {
        return HISTORICAL_UNIFORM_SHOCKS[key]
      }
      return 0
    },
    []
  )

  // Generate sensitivity data - only for uniform scenarios
  const generateSensitivityData = (baseShock: number, basePnL: number) => {
    if (!isFinite(baseShock) || baseShock === 0) return []
    const data = []
    for (let shock = 0; shock >= -0.40; shock -= 0.05) {
      const pnl = (basePnL / baseShock) * shock
      data.push({ shock, pnl })
    }
    return data
  }

  const data = stressMutation.data
  const scenarioKey = data?.scenario_key || lastScenarioKey
  const uniformScenario = isUniformScenario(scenarioKey || "")
  const baseShock = getBaseShock(scenarioKey || "")

  const weightsSum = useMemo(
    () => portfolio.reduce((acc: number, row: any) => acc + (row.weight ?? 0), 0),
    [portfolio]
  )
  const hasShorts = useMemo(
    () => portfolio.some((row: any) => typeof row.weight === "number" && row.weight < 0),
    [portfolio]
  )

  return (
    <div className="space-y-6">
      <PageHeader
        title="Stress Tests"
        subtitle="Apply hypothetical shocks to your portfolio and measure impact"
        actions={
          <div className="flex gap-2 items-center">
            <Badge variant="outline" className="text-xs">
              {scenarioResults.length > 0 ? `${scenarioResults.length} Results` : "Ready"}
            </Badge>
            <div className="flex items-center gap-2">
              <Switch
                id="compare-mode"
                checked={compareMode}
                onCheckedChange={(v) => {
                  setCompareMode(v)
                  if (!v) {
                    setScenarioResults([])
                    stressMutation.reset()
                  }
                }}
              />
              <Label htmlFor="compare-mode" className="text-sm">Compare mode</Label>
            </div>
            {compareMode && (
              <>
                <Button variant="secondary" onClick={() => { setScenarioResults([]); stressMutation.reset(); }}>
                  Clear results
                </Button>
                <Button onClick={handleCompareAll} disabled={stressMutation.isPending}>
                  <GitCompare className="h-4 w-4 mr-2" />
                  Compare All
                </Button>
              </>
            )}
            <Button onClick={handleRun} disabled={stressMutation.isPending}>
              <TestTube className="h-4 w-4 mr-2" />
              {compareMode ? "Run & Add" : "Run Test"}
            </Button>
          </div>
        }
      />

      {/* Advanced Mode Controls */}
      <div className="p-4 rounded-lg border border-border bg-card space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Switch
              id="advanced-mode"
              checked={advancedMode}
              onCheckedChange={setAdvancedMode}
            />
            <Label htmlFor="advanced-mode" className="cursor-pointer font-semibold">
              Advanced Stress Testing
            </Label>
          </div>
        </div>
        
        {advancedMode && (
          <div className="space-y-3 pt-2 border-t">
            <div className="space-y-2">
              <Label htmlFor="stress-mode">Stress Mode</Label>
              <Select value={stressMode} onValueChange={(v) => setStressMode(v as any)}>
                <SelectTrigger id="stress-mode">
                  <SelectValue placeholder="Select mode" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="return_shock">Return Shock (Default)</SelectItem>
                  <SelectItem value="duration_rate_shock">Duration/Rate Shock (Bonds)</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                {stressMode === "return_shock" ? (
                  "Linear model: P&L = weight × shock. Standard approach for all asset types."
                ) : (
                  "Bonds use duration approximation if provided (ΔP/P ≈ -Duration × Δy). Requires duration or DV01 in portfolio. Falls back to return shock if unavailable."
                )}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Info Banner */}
      <div className="p-4 rounded-lg border border-blue-200 bg-blue-50 dark:bg-blue-950/20 dark:border-blue-900">
        <div className="flex gap-3">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-blue-600 dark:text-blue-400" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="flex-1">
            <h3 className="text-sm font-semibold text-blue-900 dark:text-blue-200">How Stress Tests Work</h3>
            <p className="text-sm text-blue-800 dark:text-blue-300 mt-1">
              Stress tests apply <strong>hypothetical percentage shocks</strong> to each asset in your portfolio. 
              For example, a -10% shock on a 40% position results in a -4% portfolio loss (0.40 × -0.10 = -0.04).
            </p>
            <p className="text-sm text-blue-800 dark:text-blue-300 mt-2">
              <strong>Multi-factor scenarios</strong> apply different shocks based on asset type (stocks, bonds, commodities). 
              <strong>Historical scenarios</strong> use shocks approximating past crises but don't replay actual historical data.
            </p>
          </div>
        </div>
      </div>

      {/* Weight warnings */}
      {(Math.abs(weightsSum - 1) > 0.01 || hasShorts) && (
        <Alert className="bg-amber-50 dark:bg-amber-950/30">
          <AlertDescription className="text-sm">
            {Math.abs(weightsSum - 1) > 0.01 && (
              <span className="block">Weights do not sum to 100%; portfolio P&L reflects net exposure.</span>
            )}
            {hasShorts && <span className="block">Short positions detected; shocks apply linearly to signed weights.</span>}
          </AlertDescription>
        </Alert>
      )}

      {/* Removed DateRangePicker - not used for stress tests */}

      <Tabs value={scenarioType} onValueChange={(v) => setScenarioType(v as any)}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="predefined">
            <Zap className="h-4 w-4 mr-2" />
            Quick
          </TabsTrigger>
          <TabsTrigger value="historical">
            <History className="h-4 w-4 mr-2" />
            Historical
          </TabsTrigger>
          <TabsTrigger value="multifactor">
            <GitCompare className="h-4 w-4 mr-2" />
            Multi-Factor
          </TabsTrigger>
          <TabsTrigger value="custom">
            <TestTube className="h-4 w-4 mr-2" />
            Custom
          </TabsTrigger>
        </TabsList>

        <TabsContent value="predefined" className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="scenario">Scenario</Label>
            <Select value={predefinedScenario} onValueChange={setPredefinedScenario}>
              <SelectTrigger id="scenario">
                <SelectValue placeholder="Select scenario" />
              </SelectTrigger>
              <SelectContent>
                {PREDEFINED_SCENARIOS.map((s) => (
                  <SelectItem key={s.value} value={s.value}>
                    {s.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="p-3 bg-muted/20 rounded-lg">
            <p className="text-sm text-muted-foreground">
              {PREDEFINED_SCENARIOS.find((s) => s.value === predefinedScenario)?.description}
            </p>
              <p className="text-xs text-muted-foreground mt-2 italic">
                Applies uniform shock to all assets in the portfolio
              </p>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="historical" className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="historical">Historical Crisis</Label>
            <Select value={historicalScenario} onValueChange={setHistoricalScenario}>
              <SelectTrigger id="historical">
                <SelectValue placeholder="Select historical scenario" />
              </SelectTrigger>
              <SelectContent>
                {HISTORICAL_SCENARIOS.map((s) => (
                  <SelectItem key={s.value} value={s.value}>
                    {s.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {HISTORICAL_SCENARIOS.find((s) => s.value === historicalScenario) && (
              <div className="p-3 bg-muted/20 rounded-lg space-y-2">
                <p className="text-sm text-muted-foreground">
                  {HISTORICAL_SCENARIOS.find((s) => s.value === historicalScenario)?.description}
                </p>
                <p className="text-xs text-muted-foreground italic">
                  Note: This applies a uniform shock approximating the historical event. 
                  It does not replay actual historical price movements.
                </p>
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="multifactor" className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="multifactor">Multi-Factor Scenario</Label>
            <Select value={multiFactorScenario} onValueChange={setMultiFactorScenario}>
              <SelectTrigger id="multifactor">
                <SelectValue placeholder="Select multi-factor scenario" />
              </SelectTrigger>
              <SelectContent>
                {MULTI_FACTOR_SCENARIOS.map((s) => (
                  <SelectItem key={s.value} value={s.value}>
                    {s.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {MULTI_FACTOR_SCENARIOS.find((s) => s.value === multiFactorScenario) && (
              <div className="p-3 bg-muted/20 rounded-lg space-y-2">
                <p className="text-sm text-muted-foreground">
                  {MULTI_FACTOR_SCENARIOS.find((s) => s.value === multiFactorScenario)?.description}
                </p>
                <div className="text-xs">
                  <strong>Asset-Specific Shocks:</strong>
                  <ul className="list-disc list-inside mt-1">
                    {MULTI_FACTOR_SCENARIOS.find((s) => s.value === multiFactorScenario)?.factors.map(
                      (f) => (
                        <li key={f.name}>
                          {f.name}: {formatSignedPct(f.shock)}
                        </li>
                      )
                    )}
                  </ul>
                </div>
                <p className="text-xs text-muted-foreground italic mt-2">
                  Different shocks are applied based on asset type (stocks, bonds, commodities).
                  Assets are classified by symbol (e.g., TLT = bond, GLD = commodity).
                </p>
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="custom" className="space-y-4">
          <div className="p-3 bg-muted/20 rounded-lg mb-4">
            <p className="text-sm text-muted-foreground">
              Define custom shocks for each asset in your portfolio. 
              Enter percentage changes as decimals (e.g., -0.15 for -15%).
            </p>
          </div>
          <ScenarioBuilder
            portfolio={portfolio}
            shocks={customShocks}
            onChange={setCustomShocks}
          />
        </TabsContent>
      </Tabs>

      {/* Scenario Comparison (if multiple results) */}
      {compareMode && scenarioResults.length > 1 && (
        <ScenarioComparison
          scenarios={scenarioResults.map((r) => ({
            name: r.scenarioName || r.scenario_name,
            pnl: r.portfolio_pnl,
            severity: r.portfolio_pnl <= -0.20 ? "extreme" : r.portfolio_pnl <= -0.10 ? "high" : r.portfolio_pnl <= -0.05 ? "medium" : "low",
          }))}
        />
      )}

      {/* Heatmap (if multiple results) */}
      {compareMode && scenarioResults.length > 1 && (
        <StressHeatmap
          scenarios={scenarioResults.map((r) => ({
            name: r.scenarioName || r.scenario_name,
            results: r.by_asset,
          }))}
          symbols={[...new Set(scenarioResults.flatMap((r) => r.by_asset.map((a) => a.symbol)))]}
        />
      )}

      {data && (
        <>
          {/* KPI with Severity Indicators */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <KpiCard
              title="Portfolio P&L"
              value={formatSignedPct(data.portfolio_pnl)}
              subtitle={data.scenario_name}
            />
            <div className="p-6 rounded-lg border border-border bg-card space-y-2">
              <p className="text-sm font-medium text-muted-foreground">Severity Assessment</p>
              <SeverityIndicator pnl={data.portfolio_pnl} />
              <TrafficLight pnl={data.portfolio_pnl} />
            </div>
            <div className="p-6 rounded-lg border border-border bg-card space-y-2">
              <p className="text-sm font-medium text-muted-foreground">Scenario Type</p>
              <Badge variant="outline" className="text-sm">
                {scenarioType.toUpperCase()}
              </Badge>
              <p className="text-xs text-muted-foreground mt-2">
                {data.by_asset.length} assets analyzed
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <KpiCard
              title="Net Exposure"
              value={
                data.net_exposure !== undefined && data.net_exposure !== null
                  ? formatSignedPct(data.net_exposure)
                  : "—"
              }
            />
            <KpiCard
              title="Gross Exposure"
              value={
                data.gross_exposure !== undefined && data.gross_exposure !== null
                  ? formatSignedPct(data.gross_exposure)
                  : "—"
              }
            />
            <KpiCard
              title="Missing Shocks"
              value={data.missing_shocks && data.missing_shocks.length > 0 ? data.missing_shocks.length : 0}
              subtitle={
                data.missing_shocks && data.missing_shocks.length > 0
                  ? data.missing_shocks.join(", ")
                  : "All shocks provided"
              }
            />
          </div>

          {data.missing_shocks && data.missing_shocks.length > 0 && (
            <Alert variant="destructive">
              <AlertDescription>
                Missing shocks for: {data.missing_shocks.join(", ")}. Custom scenarios require shocks for all symbols.
              </AlertDescription>
            </Alert>
          )}

          {/* Explanation of Results */}
          <div className="p-4 rounded-lg border border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-900">
            <div className="flex gap-3">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-amber-600 dark:text-amber-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="flex-1">
                <h3 className="text-sm font-semibold text-amber-900 dark:text-amber-200">Understanding Your Results</h3>
                <p className="text-sm text-amber-800 dark:text-amber-300 mt-1">
                  The P&L shown is calculated as: <code className="px-1 py-0.5 rounded bg-amber-100 dark:bg-amber-900">Sum(Asset Weight × Shock)</code>
                </p>
                <p className="text-sm text-amber-800 dark:text-amber-300 mt-1">
                  Example: If AAPL has 40% weight and receives -10% shock → contributes -4% to portfolio P&L
                </p>
              </div>
            </div>
          </div>

          {/* Waterfall Chart */}
          <WaterfallChart data={data.by_asset} totalPnL={data.portfolio_pnl} />

          {/* Sensitivity Analysis - only for uniform scenarios */}
          {uniformScenario && data.portfolio_pnl !== undefined && baseShock !== 0 && (
            <div className="space-y-2">
              <SensitivityAnalysis
                baseShock={baseShock}
                basePnL={data.portfolio_pnl}
                sensitivityData={generateSensitivityData(baseShock, data.portfolio_pnl)}
              />
              <p className="text-xs text-muted-foreground italic px-4">
                Sensitivity chart assumes a uniform shock across all assets and linear scaling of P&L.
              </p>
            </div>
          )}

          {/* Tornado Diagram */}
          <TornadoDiagram data={data.by_asset} />

          {/* Top Loss Contributors */}
          {data.top_loss_contributors && data.top_loss_contributors.length > 0 && (
            <DataTable
              title="Top Loss Contributors"
              data={data.top_loss_contributors}
              columns={[
                { key: "symbol", header: "Symbol" },
                {
                  key: "shock",
                  header: "Shock",
                  render: (row) => <span className="font-mono">{formatSignedPct(row.shock)}</span>,
                },
                {
                  key: "pnl",
                  header: "P&L",
                  render: (row) => (
                    <span
                      className={`font-mono font-semibold ${
                        row.pnl >= 0 ? "text-success" : "text-destructive"
                      }`}
                    >
                      {formatSignedPct(row.pnl)}
                    </span>
                  ),
                },
              ]}
            />
          )}

          {/* Detailed Tables */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <DataTable
              title="Impact by Asset"
              data={data.by_asset}
              columns={[
                { key: "symbol", header: "Symbol" },
                {
                  key: "shock",
                  header: "Shock",
                  render: (row) => (
                    <span className="font-mono">{formatSignedPct(row.shock)}</span>
                  ),
                },
                {
                  key: "pnl",
                  header: "P&L",
                  render: (row) => (
                    <span
                      className={`font-mono font-semibold ${
                        row.pnl >= 0 ? "text-success" : "text-destructive"
                      }`}
                    >
                      {formatSignedPct(row.pnl)}
                    </span>
                  ),
                },
              ]}
            />
            <BarCard
              data={data.by_asset.map((a) => ({
                name: a.symbol,
                value: a.pnl,
              }))}
              title="P&L Distribution"
              valueFormatter={(v) => formatSignedPct(v)}
            />
          </div>
        </>
      )}
    </div>
  )
}

