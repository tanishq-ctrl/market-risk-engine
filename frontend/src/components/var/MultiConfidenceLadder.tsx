import { SectionCard } from "@/components/common/SectionCard"
import { formatPct } from "@/lib/format"
import { Badge } from "@/components/ui/badge"

interface MultiConfidenceLadderProps {
  returns: number[]
  method: "historical" | "parametric" | "monte_carlo"
}

const CONFIDENCE_LEVELS = [0.90, 0.95, 0.975, 0.99, 0.995]

export function MultiConfidenceLadder({ returns, method }: MultiConfidenceLadderProps) {
  if (!returns || returns.length === 0) {
    return null
  }

  const calculateVaR = (confidence: number): number => {
    const sortedReturns = [...returns].sort((a, b) => a - b)
    const index = Math.floor((1 - confidence) * sortedReturns.length)
    return Math.abs(sortedReturns[index] || 0)
  }

  const calculateCVaR = (confidence: number, varValue: number): number => {
    const tailReturns = returns.filter((r) => r < -varValue)
    if (tailReturns.length === 0) return varValue
    return Math.abs(tailReturns.reduce((sum, r) => sum + r, 0) / tailReturns.length)
  }

  const calculateParametricVaR = (confidence: number): number => {
    const mean = returns.reduce((sum, r) => sum + r, 0) / returns.length
    const variance = returns.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / returns.length
    const stdDev = Math.sqrt(variance)
    
    // Z-scores for confidence levels
    const zScores: Record<number, number> = {
      0.90: 1.282,
      0.95: 1.645,
      0.975: 1.96,
      0.99: 2.326,
      0.995: 2.576,
    }
    
    const zScore = zScores[confidence] || 1.645
    return Math.abs(mean - zScore * stdDev)
  }

  const results = CONFIDENCE_LEVELS.map((confidence) => {
    let var_val: number
    let cvar_val: number

    if (method === "parametric") {
      var_val = calculateParametricVaR(confidence)
      // CVaR for normal distribution
      const zScores: Record<number, number> = {
        0.90: 1.755,
        0.95: 2.063,
        0.975: 2.338,
        0.99: 2.665,
        0.995: 2.892,
      }
      const mean = returns.reduce((sum, r) => sum + r, 0) / returns.length
      const variance = returns.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / returns.length
      const stdDev = Math.sqrt(variance)
      const zScore = zScores[confidence] || 2.063
      cvar_val = Math.abs(mean - zScore * stdDev)
    } else {
      var_val = calculateVaR(confidence)
      cvar_val = calculateCVaR(confidence, var_val)
    }

    return {
      confidence,
      var: var_val,
      cvar: cvar_val,
      ratio: cvar_val / var_val,
    }
  })

  return (
    <SectionCard
      title="Multi-Confidence Risk Ladder"
      description="VaR and CVaR across confidence levels"
    >
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border">
              <th className="px-4 py-3 text-left text-sm font-semibold text-foreground">
                Confidence
              </th>
              <th className="px-4 py-3 text-right text-sm font-semibold text-foreground">
                VaR
              </th>
              <th className="px-4 py-3 text-right text-sm font-semibold text-foreground">
                CVaR
              </th>
              <th className="px-4 py-3 text-right text-sm font-semibold text-foreground">
                CVaR/VaR
              </th>
              <th className="px-4 py-3 text-center text-sm font-semibold text-foreground">
                Tail Risk
              </th>
            </tr>
          </thead>
          <tbody>
            {results.map((result, idx) => {
              const tailRiskLevel =
                result.ratio > 1.5 ? "high" : result.ratio > 1.3 ? "medium" : "low"
              
              return (
                <tr
                  key={result.confidence}
                  className={`border-b border-border/50 transition-colors hover:bg-accent/5 ${
                    idx % 2 === 0 ? "bg-muted/20" : ""
                  }`}
                >
                  <td className="px-4 py-3 text-left">
                    <Badge variant="outline" className="font-mono">
                      {formatPct(result.confidence)}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-destructive font-semibold">
                    {formatPct(result.var)}
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-destructive font-semibold">
                    {formatPct(result.cvar)}
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-muted-foreground">
                    {result.ratio.toFixed(2)}x
                  </td>
                  <td className="px-4 py-3 text-center">
                    <Badge
                      variant={
                        tailRiskLevel === "high"
                          ? "destructive"
                          : tailRiskLevel === "medium"
                          ? "default"
                          : "outline"
                      }
                      className="text-xs"
                    >
                      {tailRiskLevel.toUpperCase()}
                    </Badge>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <div className="mt-4 p-4 bg-muted/20 rounded-lg">
        <p className="text-sm text-muted-foreground">
          <strong>Note:</strong> CVaR/VaR ratio indicates tail risk severity. Higher ratios mean
          losses beyond VaR are significantly worse. Ratios {">"}1.5x suggest fat-tailed
          distributions.
        </p>
      </div>
    </SectionCard>
  )
}

