import { SectionCard } from "@/components/common/SectionCard"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts"
import { formatPct } from "@/lib/format"
import { ChartSkeleton } from "@/components/common/LoadingState"

interface HistogramCardProps {
  bins: number[]
  counts: number[]
  varValue?: number
  title?: string
  isLoading?: boolean
}

export function HistogramCard({
  bins,
  counts,
  varValue,
  title = "Returns Distribution",
  isLoading,
}: HistogramCardProps) {
  if (isLoading) {
    return <ChartSkeleton />
  }

  if (bins.length === 0 || counts.length === 0) {
    return null
  }

  const data = bins.map((bin, idx) => ({
    bin: bin,
    count: counts[idx],
  }))

  return (
    <SectionCard title={title}>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
          <XAxis
            dataKey="bin"
            tickFormatter={(value) => formatPct(value)}
            className="text-xs"
          />
          <YAxis className="text-xs" />
          <Tooltip
            formatter={(value: number | undefined, name: string) => {
              if (name === "bin") return formatPct(value ?? 0)
              return value ?? 0
            }}
            contentStyle={{
              backgroundColor: "hsl(var(--background))",
              border: "1px solid hsl(var(--border))",
              borderRadius: "0.5rem",
            }}
          />
          <Bar dataKey="count" fill="#8884d8" />
          {varValue !== undefined && (
            <ReferenceLine
              x={-varValue}
              stroke="#ef4444"
              strokeDasharray="5 5"
              label={{ value: "VaR", position: "top" }}
            />
          )}
        </BarChart>
      </ResponsiveContainer>
    </SectionCard>
  )
}

