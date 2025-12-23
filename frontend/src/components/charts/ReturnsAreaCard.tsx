import { SectionCard } from "@/components/common/SectionCard"
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts"
import { formatDate, formatChartDate, formatSignedPct } from "@/lib/format"
import { ChartSkeleton } from "@/components/common/LoadingState"

interface ReturnsAreaCardProps {
  dates: string[]
  returns: number[]
  title?: string
  isLoading?: boolean
}

export function ReturnsAreaCard({
  dates,
  returns,
  title = "Returns",
  isLoading,
}: ReturnsAreaCardProps) {
  if (isLoading) {
    return <ChartSkeleton />
  }

  if (dates.length === 0 || returns.length === 0) {
    return null
  }

  const data = dates.map((date, idx) => ({
    date,
    return: returns[idx],
  }))

  return (
    <SectionCard title={title}>
      <ResponsiveContainer width="100%" height={300}>
        <AreaChart data={data}>
          <defs>
            <linearGradient id="colorReturn" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#8884d8" stopOpacity={0.8} />
              <stop offset="95%" stopColor="#8884d8" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
          <XAxis
            dataKey="date"
            tickFormatter={(value) => formatChartDate(value, dates)}
            className="text-xs"
            minTickGap={50}
            interval="preserveStartEnd"
          />
          <YAxis
            tickFormatter={(value) => formatSignedPct(value)}
            className="text-xs"
          />
          <Tooltip
            labelFormatter={(value) => formatDate(value)}
            formatter={(value: number) => formatSignedPct(value)}
            contentStyle={{
              backgroundColor: "hsl(var(--background))",
              border: "1px solid hsl(var(--border))",
              borderRadius: "0.5rem",
            }}
          />
          <Area
            type="monotone"
            dataKey="return"
            stroke="#8884d8"
            fillOpacity={1}
            fill="url(#colorReturn)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </SectionCard>
  )
}

