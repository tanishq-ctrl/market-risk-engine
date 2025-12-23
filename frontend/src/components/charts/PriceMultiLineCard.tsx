import { useState } from "react"
import { SectionCard } from "@/components/common/SectionCard"
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts"
import { formatDate, formatChartDate } from "@/lib/format"
import { ChartSkeleton } from "@/components/common/LoadingState"
import { Button } from "@/components/ui/button"
import { TrendingUp } from "lucide-react"

interface PriceMultiLineCardProps {
  dates: string[]
  prices: Record<string, (number | null)[]>
  title?: string
  isLoading?: boolean
}

// Calculate simple moving average
const calculateSMA = (data: (number | null)[], window: number): (number | null)[] => {
  const result: (number | null)[] = []
  for (let i = 0; i < data.length; i++) {
    if (i < window - 1) {
      result.push(null)
    } else {
      const slice = data.slice(i - window + 1, i + 1).filter((v) => v !== null) as number[]
      if (slice.length === window) {
        result.push(slice.reduce((a, b) => a + b, 0) / window)
      } else {
        result.push(null)
      }
    }
  }
  return result
}

export function PriceMultiLineCard({
  dates,
  prices,
  title = "Price Chart",
  isLoading,
}: PriceMultiLineCardProps) {
  const [showMA, setShowMA] = useState(false)

  if (isLoading) {
    return <ChartSkeleton />
  }

  if (dates.length === 0 || Object.keys(prices).length === 0) {
    return null
  }

  const symbols = Object.keys(prices)

  // Calculate moving averages for first symbol only (to avoid clutter)
  const primarySymbol = symbols[0]
  const ma20 = showMA ? calculateSMA(prices[primarySymbol], 20) : []
  const ma50 = showMA ? calculateSMA(prices[primarySymbol], 50) : []

  const data = dates.map((date, idx) => {
    const point: Record<string, string | number | null> = { date }
    symbols.forEach((symbol) => {
      const value = prices[symbol]?.[idx]
      if (value !== null && value !== undefined) {
        point[symbol] = value
      }
    })
    
    if (showMA) {
      point[`${primarySymbol}_MA20`] = ma20[idx]
      point[`${primarySymbol}_MA50`] = ma50[idx]
    }
    
    return point
  })

  const colors = [
    "hsl(var(--primary))",
    "hsl(var(--accent))",
    "hsl(var(--success))",
    "hsl(var(--warning))",
    "hsl(var(--info))",
    "#8b5cf6",
    "#ec4899",
  ]

  return (
    <SectionCard
      title={title}
      description={showMA ? `Showing 20-day and 50-day moving averages for ${primarySymbol}` : undefined}
      actions={
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowMA(!showMA)}
        >
          <TrendingUp className="h-4 w-4 mr-2" />
          {showMA ? "Hide" : "Show"} MAs
        </Button>
      }
    >
      <ResponsiveContainer width="100%" height={400}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" opacity={0.3} />
          <XAxis
            dataKey="date"
            tickFormatter={(value) => formatChartDate(value, dates)}
            className="text-xs"
            tick={{ fill: "hsl(var(--muted-foreground))" }}
            minTickGap={50}
            interval="preserveStartEnd"
          />
          <YAxis
            className="text-xs"
            tick={{ fill: "hsl(var(--muted-foreground))" }}
          />
          <Tooltip
            labelFormatter={(value) => formatDate(value)}
            formatter={(value: number | undefined) => (value ?? 0).toFixed(2)}
            contentStyle={{
              backgroundColor: "hsl(var(--background))",
              border: "1px solid hsl(var(--border))",
              borderRadius: "0.75rem",
              boxShadow: "0 10px 30px -5px rgba(0, 0, 0, 0.1)",
            }}
          />
          <Legend />
          {symbols.map((symbol, idx) => (
            <Line
              key={symbol}
              type="monotone"
              dataKey={symbol}
              stroke={colors[idx % colors.length]}
              strokeWidth={2}
              dot={false}
              connectNulls
              name={symbol}
            />
          ))}
          {showMA && (
            <>
              <Line
                type="monotone"
                dataKey={`${primarySymbol}_MA20`}
                stroke="hsl(var(--info))"
                strokeWidth={1.5}
                strokeDasharray="5 5"
                dot={false}
                connectNulls
                name="MA20"
              />
              <Line
                type="monotone"
                dataKey={`${primarySymbol}_MA50`}
                stroke="hsl(var(--warning))"
                strokeWidth={1.5}
                strokeDasharray="5 5"
                dot={false}
                connectNulls
                name="MA50"
              />
            </>
          )}
        </LineChart>
      </ResponsiveContainer>
    </SectionCard>
  )
}

