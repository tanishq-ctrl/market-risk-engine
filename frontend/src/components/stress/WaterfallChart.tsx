import { SectionCard } from "@/components/common/SectionCard"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, ReferenceLine } from "recharts"
import { formatSignedPct } from "@/lib/format"

interface WaterfallData {
  name: string
  value: number
  isTotal?: boolean
}

interface WaterfallChartProps {
  data: Array<{ symbol: string; pnl: number }>
  totalPnL: number
}

export function WaterfallChart({ data, totalPnL }: WaterfallChartProps) {
  // Build waterfall data with cumulative values
  const waterfallData: WaterfallData[] = [
    { name: "Start", value: 0, isTotal: true },
  ]

  let cumulative = 0
  data.forEach((item) => {
    const start = cumulative
    cumulative += item.pnl
    waterfallData.push({
      name: item.symbol,
      value: item.pnl,
      isTotal: false,
    })
  })

  waterfallData.push({
    name: "Total",
    value: totalPnL,
    isTotal: true,
  })

  // Calculate positions for stacked effect
  const chartData = waterfallData.map((item, idx) => {
    if (item.isTotal) {
      return {
        ...item,
        start: 0,
        end: idx === 0 ? 0 : totalPnL,
        displayValue: idx === 0 ? 0 : totalPnL,
      }
    }

    // Calculate cumulative position
    const prevCumulative = waterfallData
      .slice(1, idx)
      .filter((d) => !d.isTotal)
      .reduce((sum, d) => sum + d.value, 0)

    return {
      ...item,
      start: prevCumulative,
      end: prevCumulative + item.value,
      displayValue: item.value,
    }
  })

  return (
    <SectionCard
      title="Contribution Waterfall"
      description="Sequential breakdown showing how each asset contributes to total P&L"
    >
      <ResponsiveContainer width="100%" height={400}>
        <BarChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" opacity={0.3} />
          <XAxis
            dataKey="name"
            className="text-xs"
            tick={{ fill: "hsl(var(--muted-foreground))" }}
            angle={-45}
            textAnchor="end"
            height={80}
          />
          <YAxis
            tickFormatter={(value) => formatSignedPct(value)}
            className="text-xs"
            tick={{ fill: "hsl(var(--muted-foreground))" }}
          />
          <Tooltip
            formatter={(value: number) => formatSignedPct(value)}
            contentStyle={{
              backgroundColor: "hsl(var(--background))",
              border: "1px solid hsl(var(--border))",
              borderRadius: "0.75rem",
              boxShadow: "0 10px 30px -5px rgba(0, 0, 0, 0.1)",
            }}
          />
          <ReferenceLine y={0} stroke="hsl(var(--muted-foreground))" strokeWidth={2} />
          <Bar dataKey="displayValue" radius={[4, 4, 0, 0]}>
            {chartData.map((entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={
                  entry.isTotal
                    ? "hsl(var(--primary))"
                    : entry.displayValue >= 0
                    ? "hsl(var(--success))"
                    : "hsl(var(--destructive))"
                }
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>

      <div className="mt-4 flex items-center justify-center gap-6 text-xs">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-success rounded"></div>
          <span className="text-muted-foreground">Gain</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-destructive rounded"></div>
          <span className="text-muted-foreground">Loss</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-primary rounded"></div>
          <span className="text-muted-foreground">Total</span>
        </div>
      </div>
    </SectionCard>
  )
}

