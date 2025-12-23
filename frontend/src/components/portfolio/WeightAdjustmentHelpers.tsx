import { Button } from "@/components/ui/button"
import { SectionCard } from "@/components/common/SectionCard"
import { Equal, TrendingUp, TrendingDown, RotateCcw } from "lucide-react"
import type { PortfolioRow } from "@/lib/types"

interface WeightAdjustmentHelpersProps {
  portfolio: PortfolioRow[]
  onAdjust: (newPortfolio: PortfolioRow[]) => void
}

export function WeightAdjustmentHelpers({
  portfolio,
  onAdjust,
}: WeightAdjustmentHelpersProps) {
  const handleEqualWeight = () => {
    const validPositions = portfolio.filter((p) => p.symbol)
    if (validPositions.length === 0) return

    const equalWeight = 1.0 / validPositions.length
    const newPortfolio = portfolio.map((p) =>
      p.symbol ? { ...p, weight: equalWeight } : p
    )
    onAdjust(newPortfolio)
  }

  const handleScaleWeights = (factor: number) => {
    const newPortfolio = portfolio.map((p) => ({
      ...p,
      weight: p.weight * factor,
    }))
    onAdjust(newPortfolio)
  }

  const handleResetWeights = () => {
    const newPortfolio = portfolio.map((p, idx) => ({
      ...p,
      weight: idx === 0 ? 1.0 : 0,
    }))
    onAdjust(newPortfolio)
  }

  return (
    <SectionCard
      title="Quick Adjustments"
      description="Quickly modify portfolio weights"
    >
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Button
          variant="outline"
          className="flex-col h-auto py-4 hover:border-primary hover:bg-primary/5"
          onClick={handleEqualWeight}
        >
          <Equal className="h-5 w-5 mb-2 text-primary" />
          <span className="text-sm font-semibold">Equal Weight</span>
          <span className="text-xs text-muted-foreground mt-1">
            Distribute evenly
          </span>
        </Button>

        <Button
          variant="outline"
          className="flex-col h-auto py-4 hover:border-success hover:bg-success/5"
          onClick={() => handleScaleWeights(1.1)}
        >
          <TrendingUp className="h-5 w-5 mb-2 text-success" />
          <span className="text-sm font-semibold">Scale +10%</span>
          <span className="text-xs text-muted-foreground mt-1">
            Increase all
          </span>
        </Button>

        <Button
          variant="outline"
          className="flex-col h-auto py-4 hover:border-warning hover:bg-warning/5"
          onClick={() => handleScaleWeights(0.9)}
        >
          <TrendingDown className="h-5 w-5 mb-2 text-warning" />
          <span className="text-sm font-semibold">Scale -10%</span>
          <span className="text-xs text-muted-foreground mt-1">
            Decrease all
          </span>
        </Button>

        <Button
          variant="outline"
          className="flex-col h-auto py-4 hover:border-destructive hover:bg-destructive/5"
          onClick={handleResetWeights}
        >
          <RotateCcw className="h-5 w-5 mb-2 text-destructive" />
          <span className="text-sm font-semibold">Reset</span>
          <span className="text-xs text-muted-foreground mt-1">
            First = 100%
          </span>
        </Button>
      </div>
    </SectionCard>
  )
}

