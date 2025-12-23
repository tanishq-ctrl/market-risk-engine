import { useState, useEffect, useMemo, useCallback } from "react"
import { useMutation } from "@tanstack/react-query"
import { PageHeader } from "@/components/common/PageHeader"
import { KpiCard } from "@/components/common/KpiCard"
import { RollingLineCard } from "@/components/charts/RollingLineCard"
import { DataTable } from "@/components/tables/DataTable"
import { DateRangePicker } from "@/components/forms/DateRangePicker"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { backtestVar } from "@/lib/api"
import { useToast } from "@/components/ui/toast"
import { STORAGE_KEYS, VAR_METHODS, CONFIDENCE_LEVELS } from "@/lib/constants"
import { formatPct, formatPValue, formatSignedPct } from "@/lib/format"
import { History, CheckCircle2, XCircle, Download, ClipboardList } from "lucide-react"
import type { BacktestResponse } from "@/lib/types"
import { BacktestingSummaryCard } from "@/components/var/BacktestingSummaryCard"

export function Backtesting() {
  const { addToast } = useToast()
  const MIN_LOOKBACK = 60
  const MAX_LOOKBACK = 2000
  const MIN_BACKTEST = 30
  const MAX_BACKTEST = 2000
  const MIN_MC_SIMS = 5000
  const MAX_MC_SIMS = 200000

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
  const [lookback, setLookback] = useState(250)
  const [backtestDays, setBacktestDays] = useState(250)
  const [mcSims, setMcSims] = useState(10000)
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
  const [availableDays, setAvailableDays] = useState<number | null>(null)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [runStatus, setRunStatus] = useState<"idle" | "running" | "success" | "error">("idle")
  const [lastError, setLastError] = useState<string | null>(null)
  const [lastRunInfo, setLastRunInfo] = useState<{ timestamp: string; params: any } | null>(null)

  const backtestMutation = useMutation({
    mutationFn: backtestVar,
    onSuccess: (resp: BacktestResponse, vars) => {
      setAvailableDays(resp.available_days ?? null)
      setRunStatus("success")
      setLastRunInfo({
        timestamp: new Date().toISOString(),
        params: vars,
      })
    },
    onError: (error: any) => {
      setRunStatus("error")
      setLastError(error.message || "Failed to run backtest")
      addToast({
        title: "Error",
        description: error.message || "Failed to run backtest",
        variant: "destructive",
      })
    },
  })

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.METHOD, method)
    localStorage.setItem(STORAGE_KEYS.CONFIDENCE, confidence.toString())
  }, [method, confidence])

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
    setLastError(null)
    const isValid = validate()
    if (portfolio.length === 0) {
      const msg = "Please create a portfolio first."
      setLastError(msg)
      addToast({ title: "No portfolio", description: msg, variant: "destructive" })
      return
    }
    if (!isValid) {
      setLastError("Please fix validation errors before running.")
      return
    }
    setRunStatus("running")
    backtestMutation.mutate({
      portfolio,
      start,
      end,
      method,
      confidence,
      lookback,
      backtest_days: backtestDays,
      mc_sims: method === "monte_carlo" ? mcSims : undefined,
    })
  }

  const data = backtestMutation.data
  const breachesCount = data?.exceptions_count ?? 0
  const exceptionMarkers = data?.series.exceptions ?? []
  useEffect(() => {
    if (data?.available_days !== undefined) {
      setAvailableDays(data.available_days)
    }
  }, [data])

  useEffect(() => {
    validate()
  }, [method, availableDays])

  const hasErrors = useMemo(() => Object.keys(errors).length > 0, [errors])
  const isPending = backtestMutation.isPending
  const runDisabled = isPending || hasErrors || portfolio.length === 0
  const validate = useCallback(
    (draft?: Partial<{ lookback: number; backtestDays: number; mcSims: number; start: string; end: string }>) => {
      const nextLookback = draft?.lookback ?? lookback
      const nextBacktest = draft?.backtestDays ?? backtestDays
      const nextMcSims = draft?.mcSims ?? mcSims
      const nextStart = draft?.start ?? start
      const nextEnd = draft?.end ?? end
      const nextErrors: Record<string, string> = {}

      if (nextLookback < MIN_LOOKBACK || nextLookback > MAX_LOOKBACK) {
        nextErrors.lookback = `Lookback must be between ${MIN_LOOKBACK} and ${MAX_LOOKBACK} days`
      }
      if (nextBacktest < MIN_BACKTEST || nextBacktest > MAX_BACKTEST) {
        nextErrors.backtest = `Backtest days must be between ${MIN_BACKTEST} and ${MAX_BACKTEST}`
      }
      if (method === "monte_carlo") {
        if (nextMcSims < MIN_MC_SIMS || nextMcSims > MAX_MC_SIMS) {
          nextErrors.mcSims = `Monte Carlo sims must be between ${MIN_MC_SIMS} and ${MAX_MC_SIMS}`
        }
      }
      if (new Date(nextStart) >= new Date(nextEnd)) {
        nextErrors.dates = "Start date must be before end date"
      }
      if (availableDays !== null && nextLookback + nextBacktest > availableDays) {
        nextErrors.horizon = `Lookback + backtest days (${nextLookback + nextBacktest}) exceed available data (${availableDays})`
      }
      setErrors(nextErrors)
      return Object.keys(nextErrors).length === 0
    },
    [lookback, backtestDays, mcSims, start, end, availableDays, method]
  )

  const getInterpretation = () => {
    if (!data) return null
    const expectedExceptions = (1 - confidence) * data.series.dates.length
    const tolerance = 0.1

    const isWithinTolerance =
      expectedExceptions <= 0
        ? data.exceptions_count === 0
        : Math.abs(data.exceptions_count - expectedExceptions) / expectedExceptions < tolerance

    const hasGoodPValue = data.kupiec_pvalue !== null && data.kupiec_pvalue > 0.05

    if (isWithinTolerance && hasGoodPValue) {
      return {
        status: "pass",
        message: "Backtest passed: exceptions are within expected range and p-value is acceptable.",
        icon: CheckCircle2,
      }
    } else {
      return {
        status: "review",
        message: "Backtest requires review: exceptions or p-value outside acceptable range.",
        icon: XCircle,
      }
    }
  }

  const interpretation = data ? getInterpretation() : null

  const exportExceptionsCsv = useCallback(() => {
    if (!data?.exceptions_table || data.exceptions_table.length === 0) return
    const header = ["date", "realized", "var_threshold"]
    const rows = data.exceptions_table.map((r) => [
      `"${r.date}"`,
      `"${r.realized}"`,
      `"${r.var_threshold}"`,
    ])
    const csv = [header.join(","), ...rows.map((r) => r.join(","))].join("\n")
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = "backtest_exceptions.csv"
    link.click()
    URL.revokeObjectURL(url)
  }, [data])

  const exportJsonReport = useCallback(() => {
    if (!data) return
    const payload = {
      ...data,
      last_run: lastRunInfo?.timestamp,
      params: lastRunInfo?.params,
    }
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = "backtest_report.json"
    link.click()
    URL.revokeObjectURL(url)
  }, [data, lastRunInfo])

  const copySummary = useCallback(async () => {
    if (!data) return
    const expected = (1 - confidence) * data.series.dates.length
    const deviation =
      expected > 0 ? ((data.exceptions_count - expected) / expected) * 100 : 0
    const summary = [
      `Backtest summary (${new Date().toISOString()})`,
      `Method: ${method}`,
      `Confidence: ${confidence}`,
      `Lookback: ${lookback}`,
      `Backtest days: ${backtestDays}`,
      `Exceptions: ${data.exceptions_count}`,
      `Expected exceptions: ${expected.toFixed(2)}`,
      `Deviation: ${deviation.toFixed(2)}%`,
      `Kupiec LR: ${data.kupiec_lr ?? "n/a"}`,
      `Kupiec p-value: ${formatPValue(data.kupiec_pvalue)}`,
    ].join("\n")
    try {
      await navigator.clipboard.writeText(summary)
      addToast({ title: "Copied", description: "Backtest summary copied" })
    } catch {
      addToast({ title: "Copy failed", description: "Unable to copy summary", variant: "destructive" })
    }
  }, [data, confidence, method, lookback, backtestDays, addToast])

  const resetDefaults = useCallback(() => {
    setMethod("historical")
    setConfidence(0.95)
    setLookback(250)
    setBacktestDays(250)
    setMcSims(10000)
    setErrors({})
    setLastError(null)
  }, [])

  return (
    <div className="space-y-6">
      <PageHeader
        title="Backtesting"
        subtitle="Validate VaR model accuracy with historical data"
        actions={
          <div className="flex gap-2">
            <Button variant="outline" onClick={resetDefaults}>
              Reset to defaults
            </Button>
            <Button onClick={handleRun} disabled={runDisabled}>
              <History className="h-4 w-4 mr-2" />
              {isPending ? "Running..." : "Run"}
            </Button>
          </div>
        }
      />

      <div className="p-3 rounded-md border bg-muted/50 flex items-center justify-between">
        <div className="text-sm">
          <strong>Status:</strong>{" "}
          {runStatus === "running"
            ? "Running..."
            : runStatus === "success"
              ? "Completed"
              : runStatus === "error"
                ? "Failed"
                : "Idle"}
          {lastRunInfo && (
            <span className="text-muted-foreground ml-2">
              Last run: {new Date(lastRunInfo.timestamp).toLocaleString()}
            </span>
          )}
        </div>
        {availableDays !== null && (
          <div className="text-xs text-muted-foreground">
            Available history: {availableDays} days
          </div>
        )}
      </div>

      {lastError && (
        <Alert variant="destructive">
          <AlertDescription>{lastError}</AlertDescription>
        </Alert>
      )}

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
              onStartChange={(v) => {
                setStart(v)
                validate({ start: v })
              }}
              onEndChange={(v) => {
                setEnd(v)
                validate({ end: v })
              }}
            />
            {(errors.dates || errors.horizon) && (
              <p className="text-xs text-destructive">{errors.dates || errors.horizon}</p>
            )}
            <div className="space-y-2">
              <Label htmlFor="confidence">Confidence Level</Label>
              <Select
                value={confidence.toString()}
                onValueChange={(val) => setConfidence(parseFloat(val))}
              >
                <SelectTrigger id="confidence">
                  <SelectValue placeholder="Select confidence" />
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
              <Label htmlFor="lookback">Lookback Window</Label>
              <Input
                id="lookback"
                type="number"
                min={MIN_LOOKBACK}
                max={MAX_LOOKBACK}
                step={10}
                inputMode="numeric"
                value={lookback}
                onChange={(e) => {
                  const next = parseInt(e.target.value) || MIN_LOOKBACK
                  setLookback(next)
                  validate({ lookback: next })
                }}
              />
              {errors.lookback && <p className="text-xs text-destructive">{errors.lookback}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="backtest-days">Backtest Days</Label>
              <Input
                id="backtest-days"
                type="number"
                min={MIN_BACKTEST}
                max={MAX_BACKTEST}
                step={10}
                inputMode="numeric"
                value={backtestDays}
                onChange={(e) => {
                  const next = parseInt(e.target.value) || MIN_BACKTEST
                  setBacktestDays(next)
                  validate({ backtestDays: next })
                }}
              />
              {errors.backtest && <p className="text-xs text-destructive">{errors.backtest}</p>}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="parametric" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <DateRangePicker
              start={start}
              end={end}
              onStartChange={(v) => {
                setStart(v)
                validate({ start: v })
              }}
              onEndChange={(v) => {
                setEnd(v)
                validate({ end: v })
              }}
            />
            {(errors.dates || errors.horizon) && (
              <p className="text-xs text-destructive">{errors.dates || errors.horizon}</p>
            )}
            <div className="space-y-2">
              <Label htmlFor="confidence-param">Confidence Level</Label>
              <Select
                value={confidence.toString()}
                onValueChange={(val) => setConfidence(parseFloat(val))}
              >
                <SelectTrigger id="confidence-param">
                  <SelectValue placeholder="Select confidence" />
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
              <Label htmlFor="backtest-days-param">Backtest Days</Label>
              <Input
                id="backtest-days-param"
                type="number"
                min={MIN_BACKTEST}
                max={MAX_BACKTEST}
                step={10}
                inputMode="numeric"
                value={backtestDays}
                onChange={(e) => {
                  const next = parseInt(e.target.value) || MIN_BACKTEST
                  setBacktestDays(next)
                  validate({ backtestDays: next })
                }}
              />
              {errors.backtest && <p className="text-xs text-destructive">{errors.backtest}</p>}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="monte_carlo" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <DateRangePicker
              start={start}
              end={end}
              onStartChange={(v) => {
                setStart(v)
                validate({ start: v })
              }}
              onEndChange={(v) => {
                setEnd(v)
                validate({ end: v })
              }}
            />
            {(errors.dates || errors.horizon) && (
              <p className="text-xs text-destructive">{errors.dates || errors.horizon}</p>
            )}
            <div className="space-y-2">
              <Label htmlFor="confidence-mc">Confidence Level</Label>
              <Select
                value={confidence.toString()}
                onValueChange={(val) => setConfidence(parseFloat(val))}
              >
                <SelectTrigger id="confidence-mc">
                  <SelectValue placeholder="Select confidence" />
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
                min={MIN_MC_SIMS}
                max={MAX_MC_SIMS}
                step={1000}
                inputMode="numeric"
                value={mcSims}
                onChange={(e) => {
                  const next = parseInt(e.target.value) || MIN_MC_SIMS
                  setMcSims(next)
                  validate({ mcSims: next })
                }}
              />
              {errors.mcSims && <p className="text-xs text-destructive">{errors.mcSims}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="backtest-days-mc">Backtest Days</Label>
              <Input
                id="backtest-days-mc"
                type="number"
                min={MIN_BACKTEST}
                max={MAX_BACKTEST}
                step={10}
                inputMode="numeric"
                value={backtestDays}
                onChange={(e) => {
                  const next = parseInt(e.target.value) || MIN_BACKTEST
                  setBacktestDays(next)
                  validate({ backtestDays: next })
                }}
              />
              {errors.backtest && <p className="text-xs text-destructive">{errors.backtest}</p>}
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {(data || isPending) && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <KpiCard
              title="Exceptions Count"
              value={isPending ? "…" : data?.exceptions_count ?? "—"}
            />
            <KpiCard
              title="Exception Rate"
              value={isPending ? "…" : data ? formatPct(data.exceptions_rate) : "—"}
            />
            <KpiCard
              title="Kupiec P-value"
              value={isPending ? "…" : data ? formatPValue(data.kupiec_pvalue) : "—"}
            />
            <KpiCard
              title="Kupiec LR"
              value={
                isPending
                  ? "…"
                  : data?.kupiec_lr !== null && data?.kupiec_lr !== undefined
                    ? Number.isFinite(data.kupiec_lr)
                      ? data.kupiec_lr.toFixed(2)
                      : "—"
                    : "—"
              }
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 border rounded-lg bg-card space-y-2">
              <p className="text-sm font-semibold">Model validation</p>
              <p className="text-sm text-muted-foreground">
                Expected exceptions: {isPending || !data ? "…" : ((1 - confidence) * data.series.dates.length).toFixed(2)}
              </p>
              <p className="text-sm text-muted-foreground">
                Actual exceptions: {isPending || !data ? "…" : data.exceptions_count}
              </p>
              <p className="text-sm text-muted-foreground">
                Deviation:{" "}
                {isPending || !data
                  ? "…"
                  : (() => {
                      const expected = (1 - confidence) * data.series.dates.length
                      if (expected <= 0) return "n/a"
                      const dev = ((data.exceptions_count - expected) / expected) * 100
                      return `${dev.toFixed(2)}%`
                    })()}
              </p>
              <p className="text-sm text-muted-foreground">
                Decision:{" "}
                {interpretation
                  ? interpretation.status === "pass"
                    ? "Accept"
                    : "Review"
                  : "—"}
              </p>
              <p className="text-xs text-muted-foreground italic">Kupiec tests unconditional coverage only.</p>
            </div>
            <div className="p-4 border rounded-lg bg-card flex gap-2 flex-wrap">
              <Button variant="outline" size="sm" onClick={exportExceptionsCsv} disabled={!data?.exceptions_table?.length}>
                <Download className="h-4 w-4 mr-2" />
                Export CSV
              </Button>
              <Button variant="outline" size="sm" onClick={exportJsonReport} disabled={!data}>
                <Download className="h-4 w-4 mr-2" />
                Export JSON
              </Button>
              <Button variant="outline" size="sm" onClick={copySummary} disabled={!data}>
                <ClipboardList className="h-4 w-4 mr-2" />
                Copy summary
              </Button>
            </div>
          </div>

          <BacktestingSummaryCard
            data={data}
            method={method}
            confidence={confidence}
            lookback={lookback}
            backtestDays={backtestDays}
            start={start}
            end={end}
            mcSims={method === "monte_carlo" ? mcSims : undefined}
          />

          <RollingLineCard
            dates={data?.series.dates || []}
            series={{
              "Realized": data?.series.realized || [],
              "VaR Threshold": data?.series.var_threshold || [],
            }}
            title="Realized Returns vs VaR Threshold"
            yAxisFormatter={(v) => formatSignedPct(v)}
            isLoading={isPending}
            exceptionMarkers={exceptionMarkers}
            breachesCount={breachesCount}
          />

          {data?.exceptions_table && data.exceptions_table.length > 0 && (
            <DataTable
              title="Exceptions"
              data={data.exceptions_table}
              columns={[
                { key: "date", header: "Date" },
                {
                  key: "realized",
                  header: "Realized",
                  render: (row) => formatSignedPct(row.realized),
                },
                {
                  key: "var_threshold",
                  header: "VaR Threshold",
                  render: (row) => formatSignedPct(row.var_threshold),
                },
              ]}
            />
          )}
        </>
      )}
    </div>
  )
}

