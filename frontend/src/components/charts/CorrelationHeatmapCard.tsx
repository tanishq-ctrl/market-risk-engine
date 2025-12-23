import React from "react"
import { SectionCard } from "@/components/common/SectionCard"
import { formatNum } from "@/lib/format"
import { ChartSkeleton } from "@/components/common/LoadingState"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"

interface CorrelationHeatmapCardProps {
  symbols: string[]
  matrix: number[][]
  title?: string
  isLoading?: boolean
}

export function CorrelationHeatmapCard({
  symbols,
  matrix,
  title = "Correlation Matrix",
  isLoading,
}: CorrelationHeatmapCardProps) {
  if (isLoading) {
    return <ChartSkeleton />
  }

  if (symbols.length === 0 || matrix.length === 0) {
    return null
  }

  const getColor = (value: number) => {
    const intensity = Math.abs(value)
    const hue = value >= 0 ? 200 : 0
    const saturation = 70
    const lightness = 50 + intensity * 30
    return `hsl(${hue}, ${saturation}%, ${lightness}%)`
  }

  return (
    <SectionCard title={title}>
      <div className="overflow-x-auto">
        <div className="inline-block min-w-full">
          <div className="grid gap-1" style={{ gridTemplateColumns: `repeat(${symbols.length + 1}, minmax(80px, 1fr))` }}>
            {/* Header row */}
            <div className="text-xs font-medium text-muted-foreground p-2"></div>
            {symbols.map((symbol) => (
              <div
                key={symbol}
                className="text-xs font-medium text-muted-foreground p-2 text-center truncate"
                title={symbol}
              >
                {symbol}
              </div>
            ))}

            {/* Data rows */}
            {symbols.map((rowSymbol, rowIdx) => (
              <React.Fragment key={rowSymbol}>
                <div
                  className="text-xs font-medium text-muted-foreground p-2 text-right truncate"
                  title={rowSymbol}
                >
                  {rowSymbol}
                </div>
                {symbols.map((colSymbol, colIdx) => {
                  const value = matrix[rowIdx]?.[colIdx] ?? 0
                  return (
                    <Tooltip key={`${rowIdx}-${colIdx}`}>
                      <TooltipTrigger asChild>
                        <div
                          className={cn(
                            "p-2 text-xs text-center rounded transition-opacity hover:opacity-80 cursor-pointer",
                            "flex items-center justify-center"
                          )}
                          style={{
                            backgroundColor: getColor(value),
                            color: Math.abs(value) > 0.5 ? "white" : "inherit",
                          }}
                        >
                          {formatNum(value, 2)}
                        </div>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>
                          {rowSymbol} vs {colSymbol}: {formatNum(value, 3)}
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  )
                })}
              </React.Fragment>
            ))}
          </div>
        </div>
      </div>
    </SectionCard>
  )
}

