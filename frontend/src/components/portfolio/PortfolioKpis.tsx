import { KpiCard } from "@/components/common/KpiCard"
import { formatPct, formatNum } from "@/lib/format"
import { Briefcase, Target, TrendingUp, Layers } from "lucide-react"
import type { PortfolioRow } from "@/lib/types"

interface PortfolioKpisProps {
  portfolio: PortfolioRow[]
}

export function PortfolioKpis({ portfolio }: PortfolioKpisProps) {
  const totalPositions = portfolio.filter((p) => p.symbol).length
  const weightSum = portfolio.reduce((sum, row) => sum + row.weight, 0)
  const isNormalized = Math.abs(weightSum - 1.0) < 0.01

  // Calculate largest position
  const largestWeight = Math.max(...portfolio.map((p) => Math.abs(p.weight)))
  const largestPosition = portfolio.find((p) => Math.abs(p.weight) === largestWeight)

  // Calculate diversification score (Herfindahl Index inverse)
  // Higher = more diversified, max = number of positions (equal weight)
  const sumSquaredWeights = portfolio.reduce((sum, row) => sum + row.weight ** 2, 0)
  const diversificationScore = sumSquaredWeights > 0 ? 1 / sumSquaredWeights : 0

  // Check if shorts exist
  const hasShorts = portfolio.some((p) => p.weight < 0)
  const longExposure = portfolio
    .filter((p) => p.weight > 0)
    .reduce((sum, row) => sum + row.weight, 0)
  const shortExposure = Math.abs(
    portfolio.filter((p) => p.weight < 0).reduce((sum, row) => sum + row.weight, 0)
  )

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <KpiCard
        title="Total Positions"
        value={totalPositions.toString()}
        subtitle={hasShorts ? `Long: ${longExposure.toFixed(2)} | Short: ${shortExposure.toFixed(2)}` : `Active positions`}
        icon={Briefcase}
        variant="default"
      />

      <KpiCard
        title="Weight Sum"
        value={formatPct(weightSum)}
        subtitle={isNormalized ? "Normalized ✓" : "Needs normalization"}
        icon={Target}
        variant={isNormalized ? "success" : "warning"}
      />

      <KpiCard
        title="Largest Position"
        value={formatPct(largestWeight)}
        subtitle={largestPosition?.symbol || "—"}
        icon={TrendingUp}
        variant={largestWeight > 0.5 ? "warning" : "default"}
      />

      <KpiCard
        title="Diversification"
        value={diversificationScore.toFixed(2)}
        subtitle={`Effective: ${diversificationScore.toFixed(1)} positions`}
        icon={Layers}
        variant="default"
      />
    </div>
  )
}

