import { KpiCard } from "@/components/common/KpiCard"
import { formatPct } from "@/lib/format"
import { TrendingDown, TrendingUp, Activity, AlertTriangle, Target } from "lucide-react"

interface TailRiskMetricsProps {
  returns: number[]
  varValue: number
  cvarValue: number
}

export function TailRiskMetrics({ returns, varValue, cvarValue }: TailRiskMetricsProps) {
  if (!returns || returns.length === 0) {
    return null
  }

  // Calculate statistics
  const mean = returns.reduce((sum, r) => sum + r, 0) / returns.length
  
  // Skewness
  const variance = returns.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / returns.length
  const stdDev = Math.sqrt(variance)
  const skewness =
    returns.reduce((sum, r) => sum + Math.pow((r - mean) / stdDev, 3), 0) / returns.length

  // Kurtosis (excess kurtosis)
  const kurtosis =
    returns.reduce((sum, r) => sum + Math.pow((r - mean) / stdDev, 4), 0) / returns.length - 3

  // Worst and Best days
  const worstDay = Math.min(...returns)
  const bestDay = Math.max(...returns)

  // Tail Ratio (95th percentile of gains / 95th percentile of losses)
  const sortedReturns = [...returns].sort((a, b) => a - b)
  const idx5 = Math.floor(sortedReturns.length * 0.05)
  const idx95 = Math.floor(sortedReturns.length * 0.95)
  const lossPercentile = Math.abs(sortedReturns[idx5])
  const gainPercentile = sortedReturns[idx95]
  const tailRatio = gainPercentile / lossPercentile

  // Beyond VaR (average of tail returns)
  const tailReturns = returns.filter((r) => r < -varValue)
  const beyondVar = tailReturns.length > 0
    ? Math.abs(tailReturns.reduce((sum, r) => sum + r, 0) / tailReturns.length)
    : cvarValue

  // Determine skewness variant
  const skewnessVariant = skewness < -0.5 ? "destructive" : skewness > 0.5 ? "success" : "default"
  
  // Determine kurtosis variant (fat tails if > 1)
  const kurtosisVariant = kurtosis > 3 ? "destructive" : kurtosis > 1 ? "warning" : "default"

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
      <KpiCard
        title="Skewness"
        value={skewness.toFixed(3)}
        subtitle={
          skewness < -0.5
            ? "Negative skew (left tail)"
            : skewness > 0.5
            ? "Positive skew (right tail)"
            : "Symmetric"
        }
        icon={Activity}
        variant={skewnessVariant}
      />

      <KpiCard
        title="Kurtosis"
        value={kurtosis.toFixed(2)}
        subtitle={kurtosis > 1 ? "Fat tails" : "Normal tails"}
        icon={AlertTriangle}
        variant={kurtosisVariant}
      />

      <KpiCard
        title="Worst Day"
        value={formatPct(worstDay)}
        subtitle="Maximum historical loss"
        icon={TrendingDown}
        variant="destructive"
      />

      <KpiCard
        title="Best Day"
        value={formatPct(bestDay)}
        subtitle="Maximum historical gain"
        icon={TrendingUp}
        variant="success"
      />

      <KpiCard
        title="Tail Ratio"
        value={tailRatio.toFixed(2)}
        subtitle="Upside vs Downside (>1 = good)"
        icon={Target}
        variant={tailRatio > 1 ? "success" : "warning"}
      />

      <KpiCard
        title="Beyond VaR"
        value={formatPct(beyondVar)}
        subtitle="Avg when VaR breached"
        icon={AlertTriangle}
        variant="warning"
      />
    </div>
  )
}

