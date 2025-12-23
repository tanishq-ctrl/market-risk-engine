import { SectionCard } from "@/components/common/SectionCard"
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  ReferenceLine,
} from "recharts"
import { formatDate, formatChartDate } from "@/lib/format"
import { ChartSkeleton } from "@/components/common/LoadingState"

interface NormalizedReturnsChartProps {
  dates: string[]
  prices: Record<string, (number | null)[]>
  isLoading?: boolean
}

const CHART_COLORS = [
  "hsl(var(--primary))",
  "hsl(var(--accent))",
  "hsl(var(--success))",
  "hsl(var(--warning))",
  "hsl(var(--info))",
  "#8b5cf6",
  "#ec4899",
  "#f59e0b",
  "#10b981",
  "#6366f1",
]

export function NormalizedReturnsChart({
  dates,
  prices,
  isLoading,
}: NormalizedReturnsChartProps) {
  if (isLoading) {
    return <ChartSkeleton />
  }

  if (!dates || dates.length === 0) {
    return null
  }

  const symbols = Object.keys(prices)

  // Normalize each symbol to 100 at start
  const data = dates.map((date, idx) => {
    const point: Record<string, string | number | null> = { date }
    symbols.forEach((symbol) => {
      const priceArray = prices[symbol]
      if (!priceArray || priceArray.length === 0) return

      // Find first non-null price as base
      const basePrice = priceArray.find((p) => p !== null)
      if (!basePrice) return

      const currentPrice = priceArray[idx]
      if (currentPrice !== null && basePrice !== null) {
        point[symbol] = (currentPrice / basePrice) * 100
      } else {
        point[symbol] = null
      }
    })
    return point
  })

  return (
    <SectionCard
      title="Normalized Returns"
      description="All symbols normalized to 100 at start date for easy comparison"
    >
      <ResponsiveContainer width="100%" height={400}>
        <LineChart data={data}>
          <defs>
            {symbols.map((symbol, idx) => (
              <linearGradient
                key={symbol}
                id={`gradient-${symbol}`}
                x1="0"
                y1="0"
                x2="0"
                y2="1"
              >
                <stop
                  offset="5%"
                  stopColor={CHART_COLORS[idx % CHART_COLORS.length]}
                  stopOpacity={0.3}
                />
                <stop
                  offset="95%"
                  stopColor={CHART_COLORS[idx % CHART_COLORS.length]}
                  stopOpacity={0}
                />
              </linearGradient>
            ))}
          </defs>
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
            label={{
              value: "Indexed (Start = 100)",
              angle: -90,
              position: "insideLeft",
              style: { fill: "hsl(var(--muted-foreground))" },
            }}
          />
          <Tooltip
            labelFormatter={(value) => formatDate(value)}
            formatter={(value: number) => value.toFixed(2)}
            contentStyle={{
              backgroundColor: "hsl(var(--background))",
              border: "1px solid hsl(var(--border))",
              borderRadius: "0.75rem",
              boxShadow: "0 10px 30px -5px rgba(0, 0, 0, 0.1)",
            }}
          />
          <Legend
            wrapperStyle={{
              paddingTop: "20px",
            }}
          />
          <ReferenceLine
            y={100}
            stroke="hsl(var(--muted-foreground))"
            strokeDasharray="5 5"
            strokeWidth={2}
            label={{ value: "Start", position: "right", fill: "hsl(var(--muted-foreground))" }}
          />
          {symbols.map((symbol, idx) => (
            <Line
              key={symbol}
              type="monotone"
              dataKey={symbol}
              stroke={CHART_COLORS[idx % CHART_COLORS.length]}
              strokeWidth={2}
              dot={false}
              connectNulls
              name={symbol}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </SectionCard>
  )
}

