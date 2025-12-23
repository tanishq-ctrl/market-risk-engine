import { SectionCard } from "@/components/common/SectionCard"
import {
  LineChart,
  Line,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts"
import { formatDate, formatChartDate, formatPct } from "@/lib/format"
import { ChartSkeleton } from "@/components/common/LoadingState"

interface RollingLineCardProps {
  dates: string[]
  series: Record<string, (number | null)[]>
  title?: string
  isLoading?: boolean
  yAxisFormatter?: (value: number) => string
  exceptionMarkers?: boolean[]
  breachesCount?: number
}

export function RollingLineCard({
  dates,
  series,
  title = "Rolling Metrics",
  isLoading,
  yAxisFormatter = (v) => formatPct(v),
  exceptionMarkers,
  breachesCount,
}: RollingLineCardProps) {
  if (isLoading) {
    return <ChartSkeleton />
  }

  if (dates.length === 0 || Object.keys(series).length === 0) {
    return null
  }

  const hasExceptions = !!exceptionMarkers?.length

  const data = dates.map((date, idx) => {
    const point: Record<string, string | number | null> = { date }
    Object.keys(series).forEach((key) => {
      point[key] = series[key]?.[idx] ?? null
    })
    if (hasExceptions && exceptionMarkers?.[idx]) {
      const realized = series["Realized"]?.[idx]
      point["Exception"] = realized ?? null
    } else {
      point["Exception"] = null
    }
    return point
  })

  const colors = ["#8884d8", "#82ca9d", "#ffc658"]

  return (
    <SectionCard
      title={title}
      description={
        hasExceptions && breachesCount !== undefined
          ? `Breaches: ${breachesCount}`
          : undefined
      }
    >
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
          <XAxis
            dataKey="date"
            tickFormatter={(value) => formatChartDate(value, dates)}
            className="text-xs"
            minTickGap={50}
            interval="preserveStartEnd"
          />
          <YAxis tickFormatter={yAxisFormatter} className="text-xs" />
          <Tooltip
            labelFormatter={(value) => formatDate(value)}
            formatter={(value: number | undefined) => yAxisFormatter(value ?? 0)}
            contentStyle={{
              backgroundColor: "hsl(var(--background))",
              border: "1px solid hsl(var(--border))",
              borderRadius: "0.5rem",
            }}
          />
          <Legend />
          {Object.keys(series).map((key, idx) => (
            <Line
              key={key}
              type="monotone"
              dataKey={key}
              stroke={colors[idx % colors.length]}
              strokeWidth={2}
              dot={false}
              connectNulls
            />
          ))}
          {hasExceptions && (
            <Scatter
              name="Exceptions"
              dataKey="Exception"
              fill="#ef4444"
              shape="circle"
              legendType="circle"
            />
          )}
        </LineChart>
      </ResponsiveContainer>
    </SectionCard>
  )
}

