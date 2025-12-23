import { SectionCard } from "@/components/common/SectionCard"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts"
import { formatPct } from "@/lib/format"
import { ChartSkeleton } from "@/components/common/LoadingState"

interface BarCardProps {
  data: Array<{ name: string; value: number }>
  title?: string
  isLoading?: boolean
  valueFormatter?: (value: number) => string
}

export function BarCard({
  data,
  title = "Bar Chart",
  isLoading,
  valueFormatter = (v) => formatPct(v),
}: BarCardProps) {
  if (isLoading) {
    return <ChartSkeleton />
  }

  if (data.length === 0) {
    return null
  }

  return (
    <SectionCard title={title}>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data} layout="vertical">
          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
          <XAxis type="number" tickFormatter={valueFormatter} className="text-xs" />
          <YAxis dataKey="name" type="category" width={100} className="text-xs" />
          <Tooltip
            formatter={(value: number) => valueFormatter(value)}
            contentStyle={{
              backgroundColor: "hsl(var(--background))",
              border: "1px solid hsl(var(--border))",
              borderRadius: "0.5rem",
            }}
          />
          <Bar dataKey="value" fill="#8884d8" />
        </BarChart>
      </ResponsiveContainer>
    </SectionCard>
  )
}

