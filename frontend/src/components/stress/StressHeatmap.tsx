import { SectionCard } from "@/components/common/SectionCard"
import { formatSignedPct } from "@/lib/format"

interface StressHeatmapProps {
  scenarios: Array<{
    name: string
    results: Array<{ symbol: string; pnl: number }>
  }>
  symbols: string[]
}

export function StressHeatmap({ scenarios, symbols }: StressHeatmapProps) {
  if (scenarios.length === 0 || symbols.length === 0) {
    return null
  }

  // Build matrix: symbols × scenarios
  const matrix: number[][] = symbols.map((symbol) =>
    scenarios.map((scenario) => {
      const result = scenario.results.find((r) => r.symbol === symbol)
      return result?.pnl || 0
    })
  )

  // Get color based on P&L value
  const getColor = (value: number) => {
    const intensity = Math.min(Math.abs(value) * 100, 100)
    if (value >= 0) {
      return `rgba(34, 197, 94, ${intensity / 100})` // green
    } else {
      return `rgba(239, 68, 68, ${intensity / 100})` // red
    }
  }

  // Get text color for contrast
  const getTextColor = (value: number) => {
    const absValue = Math.abs(value)
    return absValue > 0.15 ? "white" : "hsl(var(--foreground))"
  }

  return (
    <SectionCard
      title="Stress Test Heatmap"
      description="Visual impact grid showing P&L across scenarios and assets"
    >
      <div className="overflow-x-auto">
        <div className="inline-block min-w-full align-middle">
          <table className="min-w-full divide-y divide-border">
            <thead>
              <tr>
                <th className="sticky left-0 z-10 bg-background px-3 py-2 text-left text-xs font-semibold text-muted-foreground">
                  Asset
                </th>
                {scenarios.map((scenario) => (
                  <th
                    key={scenario.name}
                    className="px-3 py-2 text-center text-xs font-semibold text-muted-foreground min-w-[100px]"
                  >
                    {scenario.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {symbols.map((symbol, rowIdx) => (
                <tr key={symbol}>
                  <td className="sticky left-0 z-10 bg-background px-3 py-2 text-sm font-semibold text-foreground">
                    {symbol}
                  </td>
                  {scenarios.map((_, colIdx) => {
                    const value = matrix[rowIdx][colIdx]
                    return (
                      <td
                        key={`${symbol}-${colIdx}`}
                        className="px-3 py-2 text-center text-sm font-mono transition-all hover:scale-110 hover:shadow-lg cursor-pointer"
                        style={{
                          backgroundColor: getColor(value),
                          color: getTextColor(value),
                        }}
                        title={`${symbol} in ${scenarios[colIdx].name}: ${formatSignedPct(value)}`}
                      >
                        {formatSignedPct(value)}
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="mt-4 flex items-center justify-center gap-6 text-xs text-muted-foreground">
        <div className="flex items-center gap-2">
          <div className="h-4 w-8 bg-gradient-to-r from-red-500/30 to-red-500"></div>
          <span>Large Loss</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-4 w-8 bg-gray-200 dark:bg-gray-700"></div>
          <span>Neutral</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-4 w-8 bg-gradient-to-r from-green-500/30 to-green-500"></div>
          <span>Large Gain</span>
        </div>
      </div>
    </SectionCard>
  )
}

