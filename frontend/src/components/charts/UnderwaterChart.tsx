import { SectionCard } from "@/components/common/SectionCard"
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts"
import { formatDate, formatChartDate, formatPct } from "@/lib/format"
import { ChartSkeleton } from "@/components/common/LoadingState"

interface UnderwaterChartProps {
  dates: string[]
  drawdown: number[]
  title?: string
  isLoading?: boolean
}

export function UnderwaterChart({
  dates,
  drawdown,
  title = "Drawdown (Underwater Chart)",
  isLoading,
}: UnderwaterChartProps) {
  if (isLoading) {
    return <ChartSkeleton />
  }

  if (dates.length === 0 || drawdown.length === 0) {
    return null
  }

  const data = dates.map((date, idx) => ({
    date,
    drawdown: drawdown[idx] * 100, // Convert to percentage
  }))

  // Find max drawdown for annotation
  const maxDrawdown = Math.min(...drawdown) * 100
  const maxDrawdownIndex = drawdown.indexOf(Math.min(...drawdown))
  const maxDrawdownDate = dates[maxDrawdownIndex]

  return (
    <SectionCard 
      title={title} 
      description={`Maximum drawdown: ${formatPct(Math.abs(maxDrawdown / 100))} on ${formatDate(maxDrawdownDate)}`}
    >
      <ResponsiveContainer width="100%" height={350}>
        <AreaChart data={data}>
          <defs>
            <linearGradient id="drawdownGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="hsl(var(--destructive))" stopOpacity={0.6} />
              <stop offset="95%" stopColor="hsl(var(--destructive))" stopOpacity={0.1} />
            </linearGradient>
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
            tickFormatter={(value) => `${value.toFixed(0)}%`}
            className="text-xs"
            tick={{ fill: "hsl(var(--muted-foreground))" }}
            domain={[maxDrawdown * 1.2, 0]}
          />
          <Tooltip
            labelFormatter={(value) => formatDate(value)}
            formatter={(value: number) => [`${value.toFixed(2)}%`, "Drawdown"]}
            contentStyle={{
              backgroundColor: "hsl(var(--background))",
              border: "1px solid hsl(var(--border))",
              borderRadius: "0.75rem",
              boxShadow: "0 10px 30px -5px rgba(0, 0, 0, 0.1)",
            }}
          />
          <ReferenceLine 
            y={0} 
            stroke="hsl(var(--muted-foreground))" 
            strokeWidth={2}
            label={{ value: "Peak", position: "right", fill: "hsl(var(--muted-foreground))" }}
          />
          <Area
            type="monotone"
            dataKey="drawdown"
            stroke="hsl(var(--destructive))"
            strokeWidth={2}
            fill="url(#drawdownGradient)"
            fillOpacity={1}
          />
        </AreaChart>
      </ResponsiveContainer>
    </SectionCard>
  )
}

