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
  ReferenceLine,
} from "recharts"
import { formatDate, formatChartDate, formatNum } from "@/lib/format"
import { ChartSkeleton } from "@/components/common/LoadingState"

interface RollingSharpeChartProps {
  dates: string[]
  sharpe30?: (number | null)[]
  sharpe90?: (number | null)[]
  sharpe252?: (number | null)[]
  title?: string
  isLoading?: boolean
}

export function RollingSharpeChart({
  dates,
  sharpe30,
  sharpe90,
  sharpe252,
  title = "Rolling Sharpe Ratio",
  isLoading,
}: RollingSharpeChartProps) {
  if (isLoading) {
    return <ChartSkeleton />
  }

  if (dates.length === 0) {
    return null
  }

  const data = dates.map((date, idx) => {
    const point: Record<string, string | number | null> = { date }
    if (sharpe30) point["30-day"] = sharpe30[idx]
    if (sharpe90) point["90-day"] = sharpe90[idx]
    if (sharpe252) point["252-day"] = sharpe252[idx]
    return point
  })

  const colors = {
    "30-day": "hsl(var(--accent))",
    "90-day": "hsl(var(--primary))",
    "252-day": "hsl(var(--success))",
  }

  return (
    <SectionCard title={title} description="Risk-adjusted returns over different time windows">
      <ResponsiveContainer width="100%" height={350}>
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
            tickFormatter={(value) => formatNum(value, 2)}
            className="text-xs"
            tick={{ fill: "hsl(var(--muted-foreground))" }}
          />
          <Tooltip
            labelFormatter={(value) => formatDate(value)}
            // Loosen types slightly for compatibility with Recharts' Formatter<ValueType, NameType>
            formatter={(value) =>
              value != null ? formatNum(value as number, 2) : "N/A"
            }
            contentStyle={{
              backgroundColor: "hsl(var(--background))",
              border: "1px solid hsl(var(--border))",
              borderRadius: "0.75rem",
              boxShadow: "0 10px 30px -5px rgba(0, 0, 0, 0.1)",
            }}
          />
          <Legend />
          <ReferenceLine 
            y={0} 
            stroke="hsl(var(--muted-foreground))" 
            strokeDasharray="3 3"
            label={{ value: "Break-even", position: "right", fill: "hsl(var(--muted-foreground))" }}
          />
          <ReferenceLine 
            y={1} 
            stroke="hsl(var(--success))" 
            strokeDasharray="3 3" 
            strokeOpacity={0.5}
            label={{ value: "Good (>1)", position: "right", fill: "hsl(var(--success))" }}
          />
          {sharpe30 && (
            <Line
              type="monotone"
              dataKey="30-day"
              stroke={colors["30-day"]}
              strokeWidth={2}
              dot={false}
              connectNulls
            />
          )}
          {sharpe90 && (
            <Line
              type="monotone"
              dataKey="90-day"
              stroke={colors["90-day"]}
              strokeWidth={2}
              dot={false}
              connectNulls
            />
          )}
          {sharpe252 && (
            <Line
              type="monotone"
              dataKey="252-day"
              stroke={colors["252-day"]}
              strokeWidth={3}
              dot={false}
              connectNulls
            />
          )}
        </LineChart>
      </ResponsiveContainer>
    </SectionCard>
  )
}

