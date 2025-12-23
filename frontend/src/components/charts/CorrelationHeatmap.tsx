import { SectionCard } from "@/components/common/SectionCard"

interface CorrelationHeatmapProps {
  symbols: string[]
  data: number[][]
}

export function CorrelationHeatmap({ symbols, data }: CorrelationHeatmapProps) {
  if (!symbols || symbols.length === 0 || !data || data.length === 0) {
    return null
  }

  // Get color based on correlation value
  const getColor = (value: number) => {
    // Scale from -1 (red) to 0 (white) to 1 (green)
    if (value >= 0) {
      const intensity = Math.floor(value * 255)
      return `rgb(${255 - intensity}, 255, ${255 - intensity})`
    } else {
      const intensity = Math.floor(Math.abs(value) * 255)
      return `rgb(255, ${255 - intensity}, ${255 - intensity})`
    }
  }

  // Get text color for contrast
  const getTextColor = (value: number) => {
    const absValue = Math.abs(value)
    return absValue > 0.5 ? "white" : "hsl(var(--foreground))"
  }

  return (
    <SectionCard
      title="Correlation Matrix"
      description="Correlation between symbol returns (daily basis)"
    >
      <div className="overflow-x-auto">
        <div className="inline-block min-w-full align-middle">
          <table className="min-w-full divide-y divide-border">
            <thead>
              <tr>
                <th className="sticky left-0 z-10 bg-background px-3 py-2 text-left text-xs font-semibold text-muted-foreground">
                  Symbol
                </th>
                {symbols.map((symbol) => (
                  <th
                    key={symbol}
                    className="px-3 py-2 text-center text-xs font-semibold text-muted-foreground"
                  >
                    {symbol}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {symbols.map((rowSymbol, rowIdx) => (
                <tr key={rowSymbol}>
                  <td className="sticky left-0 z-10 bg-background px-3 py-2 text-sm font-semibold text-foreground">
                    {rowSymbol}
                  </td>
                  {symbols.map((colSymbol, colIdx) => {
                    const value = data[rowIdx][colIdx]
                    return (
                      <td
                        key={`${rowSymbol}-${colSymbol}`}
                        className="px-3 py-2 text-center text-sm transition-all hover:scale-110 hover:shadow-lg"
                        style={{
                          backgroundColor: getColor(value),
                          color: getTextColor(value),
                        }}
                        title={`${rowSymbol} vs ${colSymbol}: ${value.toFixed(3)}`}
                      >
                        {value.toFixed(2)}
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
          <div className="h-4 w-8" style={{ backgroundColor: "rgb(255, 100, 100)" }} />
          <span>-1.0 (Negative)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-4 w-8" style={{ backgroundColor: "rgb(255, 255, 255)" }} />
          <span>0.0 (No correlation)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-4 w-8" style={{ backgroundColor: "rgb(100, 255, 100)" }} />
          <span>+1.0 (Positive)</span>
        </div>
      </div>
    </SectionCard>
  )
}

