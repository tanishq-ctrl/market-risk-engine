import { SectionCard } from "@/components/common/SectionCard"
import { formatSignedPct } from "@/lib/format"
import { Badge } from "@/components/ui/badge"
import { AlertTriangle, TrendingDown, TrendingUp } from "lucide-react"

interface ScenarioResult {
  name: string
  pnl: number
  severity?: "low" | "medium" | "high" | "extreme"
}

interface ScenarioComparisonProps {
  scenarios: ScenarioResult[]
}

export function ScenarioComparison({ scenarios }: ScenarioComparisonProps) {
  if (scenarios.length === 0) {
    return null
  }

  // Sort by P&L (worst first)
  const sorted = [...scenarios].sort((a, b) => a.pnl - b.pnl)

  const getSeverityVariant = (severity?: string) => {
    switch (severity) {
      case "extreme":
        return "destructive"
      case "high":
        return "destructive"
      case "medium":
        return "default"
      case "low":
        return "outline"
      default:
        return "outline"
    }
  }

  const getSeverityColor = (pnl: number) => {
    if (pnl <= -0.20) return "text-destructive"
    if (pnl <= -0.10) return "text-warning"
    if (pnl < 0) return "text-muted-foreground"
    return "text-success"
  }

  return (
    <SectionCard
      title="Scenario Comparison"
      description="Side-by-side comparison of multiple stress scenarios"
    >
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border">
              <th className="px-4 py-3 text-left text-sm font-semibold text-foreground">
                Rank
              </th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-foreground">
                Scenario
              </th>
              <th className="px-4 py-3 text-right text-sm font-semibold text-foreground">
                Portfolio P&L
              </th>
              <th className="px-4 py-3 text-center text-sm font-semibold text-foreground">
                Severity
              </th>
              <th className="px-4 py-3 text-center text-sm font-semibold text-foreground">
                Impact
              </th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((scenario, idx) => (
              <tr
                key={scenario.name}
                className={`border-b border-border/50 transition-colors hover:bg-accent/5 ${
                  idx % 2 === 0 ? "bg-muted/20" : ""
                }`}
              >
                <td className="px-4 py-3 text-left">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-muted-foreground">
                      #{idx + 1}
                    </span>
                    {idx === 0 && (
                      <AlertTriangle className="h-4 w-4 text-destructive" />
                    )}
                  </div>
                </td>
                <td className="px-4 py-3 text-left">
                  <span className="font-medium text-foreground">{scenario.name}</span>
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="flex items-center justify-end gap-2">
                    {scenario.pnl < 0 ? (
                      <TrendingDown className="h-4 w-4 text-destructive" />
                    ) : (
                      <TrendingUp className="h-4 w-4 text-success" />
                    )}
                    <span
                      className={`font-mono font-semibold ${getSeverityColor(scenario.pnl)}`}
                    >
                      {formatSignedPct(scenario.pnl)}
                    </span>
                  </div>
                </td>
                <td className="px-4 py-3 text-center">
                  {scenario.severity && (
                    <Badge variant={getSeverityVariant(scenario.severity)} className="text-xs">
                      {scenario.severity.toUpperCase()}
                    </Badge>
                  )}
                </td>
                <td className="px-4 py-3 text-center">
                  <div className="flex items-center justify-center">
                    <div className="w-full max-w-[100px] h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className={`h-full transition-all ${
                          scenario.pnl < -0.20
                            ? "bg-destructive"
                            : scenario.pnl < -0.10
                            ? "bg-warning"
                            : scenario.pnl < 0
                            ? "bg-muted-foreground"
                            : "bg-success"
                        }`}
                        style={{
                          width: `${Math.min(Math.abs(scenario.pnl) * 100, 100)}%`,
                        }}
                      />
                    </div>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-4 p-4 bg-muted/20 rounded-lg">
        <p className="text-sm text-muted-foreground">
          <strong>Worst Case:</strong> {sorted[0].name} with {formatSignedPct(sorted[0].pnl)} loss
          {sorted.length > 1 && (
            <>
              {" | "}
              <strong>Best Case:</strong> {sorted[sorted.length - 1].name} with{" "}
              {formatSignedPct(sorted[sorted.length - 1].pnl)}
            </>
          )}
        </p>
      </div>
    </SectionCard>
  )
}

