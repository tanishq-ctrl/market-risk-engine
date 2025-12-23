import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { formatPct, formatPValue, formatSignedPct } from "@/lib/format"
import type { BacktestResponse } from "@/lib/types"

type Decision = "Accept" | "Review" | "Reject"

type BacktestingSummaryProps = {
  data?: BacktestResponse | null
  method: string
  confidence: number
  lookback: number
  backtestDays: number
  start: string
  end: string
  mcSims?: number
}

function computeDecision(data?: BacktestResponse | null, confidence?: number) {
  if (!data || !confidence) {
    return { decision: "Review" as Decision, reason: "No results available" }
  }

  const n = data.series?.dates?.length ?? 0
  const expected = (1 - confidence) * n
  const deviation = data.exceptions_count - expected
  const deviationPct = expected > 0 ? deviation / expected : 0

  // Base decision from Kupiec
  let decision: Decision
  let reason: string
  if (data.kupiec_pvalue === null || data.kupiec_pvalue === undefined) {
    decision = "Review"
    reason = "Insufficient/edge-case for statistical test"
  } else if (data.kupiec_pvalue < 0.05) {
    decision = "Reject"
    reason = "VaR coverage inconsistent at 5% level"
  } else {
    decision = "Accept"
    reason = "No evidence of miscalibration at 5% level"
  }

  // Deviation guardrail
  if (Math.abs(deviationPct) > 0.25 && decision === "Accept") {
    decision = "Review"
    reason = "Exception count deviates materially from expectation"
  }

  return {
    decision,
    reason,
    expected,
    deviation,
    deviationPct,
    n,
  }
}

function decisionBadge(decision: Decision) {
  const variant =
    decision === "Accept" ? "default" : decision === "Review" ? "secondary" : "destructive"
  return <Badge variant={variant}>{decision}</Badge>
}

function nextSteps(decision: Decision): string[] {
  if (decision === "Accept") {
    return [
      "Monitor periodically and compare methods",
      "Layer stress tests for tail scenarios",
      "Track regime shifts that may affect coverage",
    ]
  }
  if (decision === "Review") {
    return [
      "Extend backtest window to increase power",
      "Add independence tests (e.g., Christoffersen)",
      "Check for regime shifts or data quality gaps",
    ]
  }
  return [
    "Recalibrate VaR (heavier tails or historical variant)",
    "Reduce concentration in tail-heavy names",
    "Validate with stress and scenario analysis",
  ]
}

export function BacktestingSummaryCard({
  data,
  method,
  confidence,
  lookback,
  backtestDays,
  start,
  end,
  mcSims,
}: BacktestingSummaryProps) {
  const { decision, reason, expected = 0, deviation = 0, deviationPct = 0, n = 0 } =
    computeDecision(data, confidence)

  const exceptions = data?.exceptions_count ?? 0
  const exceptionsRate = data?.exceptions_rate ?? 0
  const kupiecP = data?.kupiec_pvalue
  const kupiecLR = data?.kupiec_lr

  const execParagraph =
    decision === "Reject"
      ? "Observed breaches are inconsistent with the stated confidence; coverage appears inadequate."
      : decision === "Review"
        ? "Results warrant closer review given limited test power, edge cases, or deviation from expected breaches."
        : "No statistical evidence of miscalibration at the chosen confidence, but continued monitoring is advised."

  const takeaway =
    decision === "Reject"
      ? "Action required: recalibrate or switch to a more conservative VaR approach."
      : decision === "Review"
        ? "Caution: results are inconclusive; strengthen the test and reassess."
        : "Coverage is acceptable; keep monitoring and complement with stress testing."

  const bullets = [
    `Method: ${method}${method === "monte_carlo" && mcSims ? ` (MC sims: ${mcSims})` : ""}`,
    `Confidence: ${formatPct(confidence)}`,
    `Window: lookback ${lookback}d, backtest ${backtestDays}d`,
    `Date range: ${start} to ${end}`,
    `Observations (N): ${n}`,
    `Exceptions: ${exceptions} (${formatPct(exceptionsRate)})`,
    `Expected exceptions: ${expected.toFixed(2)} (deviation: ${formatSignedPct(deviation)}; ${
      expected > 0 ? formatPct(deviationPct) : "n/a"
    })`,
    `Kupiec p-value: ${formatPValue(kupiecP)}${kupiecLR !== undefined && kupiecLR !== null ? `; LR: ${kupiecLR.toFixed(2)}` : ""}`,
  ]

  const actions = nextSteps(decision)

  return (
    <Card className="animate-fade-in">
      <CardHeader className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Backtesting Summary</CardTitle>
          {decisionBadge(decision)}
        </div>
        <p className="text-sm text-muted-foreground">{execParagraph}</p>
        <p className="text-sm font-medium">Key takeaway: {takeaway}</p>
      </CardHeader>
      <CardContent className="space-y-3">
        <ul className="list-disc list-inside space-y-1 text-sm">
          {bullets.map((b, idx) => (
            <li key={idx}>{b}</li>
          ))}
        </ul>
        <Separator />
        <div>
          <p className="text-sm font-semibold mb-1">Next steps</p>
          <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
            {actions.map((a, idx) => (
              <li key={idx}>{a}</li>
            ))}
          </ul>
          <p className="text-xs text-muted-foreground mt-2">Decision driver: {reason}.</p>
        </div>
      </CardContent>
    </Card>
  )
}

