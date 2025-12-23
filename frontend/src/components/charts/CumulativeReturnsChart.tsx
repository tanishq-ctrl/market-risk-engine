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
import { formatDate, formatChartDate } from "@/lib/format"
import { ChartSkeleton } from "@/components/common/LoadingState"

interface CumulativeReturnsChartProps {
  dates: string[]
  portfolio: number[]
  benchmark?: (number | null)[]
  title?: string
  isLoading?: boolean
}

export function CumulativeReturnsChart({
  dates,
  portfolio,
  benchmark,
  title = "Cumulative Returns",
  isLoading,
}: CumulativeReturnsChartProps) {
  if (isLoading) {
    return <ChartSkeleton />
  }

  if (dates.length === 0 || portfolio.length === 0) {
    return null
  }

  const data = dates.map((date, idx) => {
    const point: Record<string, string | number> = {
      date,
      Portfolio: ((portfolio[idx] - 1) * 100), // Convert to percentage
    }
    if (benchmark && benchmark[idx] !== null && benchmark[idx] !== undefined) {
      point.Benchmark = ((benchmark[idx]! - 1) * 100)
    }
    return point
  })

  return (
    <SectionCard title={title} description="Compound growth over time">
      <ResponsiveContainer width="100%" height={400}>
        <LineChart data={data}>
          <defs>
            <linearGradient id="portfolioGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
              <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
            </linearGradient>
            {benchmark && (
              <linearGradient id="benchmarkGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(var(--muted-foreground))" stopOpacity={0.2} />
                <stop offset="95%" stopColor="hsl(var(--muted-foreground))" stopOpacity={0} />
              </linearGradient>
            )}
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
          />
          <Tooltip
            labelFormatter={(value) => formatDate(value)}
            formatter={(value: number | undefined) => `${(value ?? 0).toFixed(2)}%`}
            contentStyle={{
              backgroundColor: "hsl(var(--background))",
              border: "1px solid hsl(var(--border))",
              borderRadius: "0.75rem",
              boxShadow: "0 10px 30px -5px rgba(0, 0, 0, 0.1)",
            }}
          />
          <Legend />
          <ReferenceLine y={0} stroke="hsl(var(--muted-foreground))" strokeDasharray="3 3" />
          <Line
            type="monotone"
            dataKey="Portfolio"
            stroke="hsl(var(--primary))"
            strokeWidth={3}
            dot={false}
            fill="url(#portfolioGradient)"
            activeDot={{ r: 6, fill: "hsl(var(--primary))" }}
          />
          {benchmark && (
            <Line
              type="monotone"
              dataKey="Benchmark"
              stroke="hsl(var(--muted-foreground))"
              strokeWidth={2}
              strokeDasharray="5 5"
              dot={false}
              fill="url(#benchmarkGradient)"
            />
          )}
        </LineChart>
      </ResponsiveContainer>
    </SectionCard>
  )
}

