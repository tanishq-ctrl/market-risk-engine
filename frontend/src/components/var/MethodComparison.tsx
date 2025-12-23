import { SectionCard } from "@/components/common/SectionCard"
import { formatPct } from "@/lib/format"
import { Badge } from "@/components/ui/badge"
import { AlertTriangle, CheckCircle, AlertCircle } from "lucide-react"
import type { VaRResponse } from "@/lib/types"

interface MethodComparisonProps {
  results: {
    historical?: VaRResponse
    parametric?: VaRResponse
    monte_carlo?: VaRResponse
  }
}

export function MethodComparison({ results }: MethodComparisonProps) {
  const methods = Object.keys(results).filter((k) => results[k as keyof typeof results])

  if (methods.length < 2) {
    return null
  }

  const methodLabels: Record<string, string> = {
    historical: "Historical",
    parametric: "Parametric",
    monte_carlo: "Monte Carlo",
  }

  // Calculate statistics
  const varValues = methods.map((m) => results[m as keyof typeof results]!.var)
  const cvarValues = methods.map((m) => results[m as keyof typeof results]!.cvar)

  const meanVar = varValues.reduce((sum, v) => sum + v, 0) / varValues.length
  const meanCVar = cvarValues.reduce((sum, v) => sum + v, 0) / cvarValues.length

  const maxVarSpread = Math.max(...varValues) - Math.min(...varValues)
  const varSpreadPct = (maxVarSpread / meanVar) * 100

  // Determine agreement level
  const agreementLevel =
    varSpreadPct < 10 ? "strong" : varSpreadPct < 25 ? "moderate" : "weak"

  const agreementVariant =
    agreementLevel === "strong"
      ? "success"
      : agreementLevel === "moderate"
      ? "default"
      : "destructive"

  const AgreeIcon =
    agreementLevel === "strong"
      ? CheckCircle
      : agreementLevel === "moderate"
      ? AlertCircle
      : AlertTriangle

  return (
    <SectionCard
      title="Method Comparison"
      description="Compare VaR estimates across different methodologies"
    >
      <div className="space-y-6">
        {/* Summary Card */}
        <div className="p-4 bg-muted/20 rounded-lg border border-border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-foreground">Method Agreement</p>
              <p className="text-xs text-muted-foreground mt-1">
                VaR spread: {formatPct(maxVarSpread)} ({varSpreadPct.toFixed(1)}% of mean)
              </p>
            </div>
            <Badge variant={agreementVariant} className="flex items-center gap-1">
              <AgreeIcon className="h-3 w-3" />
              {agreementLevel.toUpperCase()}
            </Badge>
          </div>
        </div>

        {/* Comparison Table */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                <th className="px-4 py-3 text-left text-sm font-semibold text-foreground">
                  Method
                </th>
                <th className="px-4 py-3 text-right text-sm font-semibold text-foreground">
                  VaR
                </th>
                <th className="px-4 py-3 text-right text-sm font-semibold text-foreground">
                  vs Mean
                </th>
                <th className="px-4 py-3 text-right text-sm font-semibold text-foreground">
                  CVaR
                </th>
                <th className="px-4 py-3 text-right text-sm font-semibold text-foreground">
                  vs Mean
                </th>
                <th className="px-4 py-3 text-center text-sm font-semibold text-foreground">
                  CVaR/VaR
                </th>
              </tr>
            </thead>
            <tbody>
              {methods.map((method, idx) => {
                const result = results[method as keyof typeof results]!
                const varDiff = ((result.var - meanVar) / meanVar) * 100
                const cvarDiff = ((result.cvar - meanCVar) / meanCVar) * 100
                const ratio = result.cvar / result.var

                return (
                  <tr
                    key={method}
                    className={`border-b border-border/50 transition-colors hover:bg-accent/5 ${
                      idx % 2 === 0 ? "bg-muted/20" : ""
                    }`}
                  >
                    <td className="px-4 py-3 text-left">
                      <span className="font-semibold text-foreground">
                        {methodLabels[method]}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-destructive font-semibold">
                      {formatPct(result.var)}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-sm">
                      <span
                        className={
                          Math.abs(varDiff) < 5
                            ? "text-success"
                            : Math.abs(varDiff) < 15
                            ? "text-warning"
                            : "text-destructive"
                        }
                      >
                        {varDiff > 0 ? "+" : ""}
                        {varDiff.toFixed(1)}%
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-destructive font-semibold">
                      {formatPct(result.cvar)}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-sm">
                      <span
                        className={
                          Math.abs(cvarDiff) < 5
                            ? "text-success"
                            : Math.abs(cvarDiff) < 15
                            ? "text-warning"
                            : "text-destructive"
                        }
                      >
                        {cvarDiff > 0 ? "+" : ""}
                        {cvarDiff.toFixed(1)}%
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center font-mono text-muted-foreground">
                      {ratio.toFixed(2)}x
                    </td>
                  </tr>
                )
              })}
              
              {/* Mean Row */}
              <tr className="bg-primary/5 border-t-2 border-primary/20 font-semibold">
                <td className="px-4 py-3 text-left text-foreground">Mean</td>
                <td className="px-4 py-3 text-right font-mono text-primary">
                  {formatPct(meanVar)}
                </td>
                <td className="px-4 py-3 text-right text-muted-foreground">—</td>
                <td className="px-4 py-3 text-right font-mono text-primary">
                  {formatPct(meanCVar)}
                </td>
                <td className="px-4 py-3 text-right text-muted-foreground">—</td>
                <td className="px-4 py-3 text-center font-mono text-muted-foreground">
                  {(meanCVar / meanVar).toFixed(2)}x
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Recommendations */}
        <div className="p-4 bg-muted/20 rounded-lg space-y-2">
          <p className="text-sm font-semibold text-foreground">Recommendations:</p>
          <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
            {agreementLevel === "strong" && (
              <li>Methods agree well. Results are robust across methodologies.</li>
            )}
            {agreementLevel === "moderate" && (
              <li>Moderate disagreement. Consider distribution characteristics and data quality.</li>
            )}
            {agreementLevel === "weak" && (
              <>
                <li className="text-warning">
                  Significant disagreement between methods. Use with caution.
                </li>
                <li className="text-warning">
                  Historical may be better for non-normal distributions. Parametric assumes normality.
                </li>
              </>
            )}
            <li>
              Use the <strong>mean VaR</strong> as a conservative estimate, or take the{" "}
              <strong>maximum</strong> for safety.
            </li>
          </ul>
        </div>
      </div>
    </SectionCard>
  )
}

