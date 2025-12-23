import { SectionCard } from "@/components/common/SectionCard"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, ReferenceLine } from "recharts"
import { formatSignedPct } from "@/lib/format"

interface TornadoDiagramProps {
  data: Array<{
    symbol: string
    pnl: number
  }>
}

export function TornadoDiagram({ data }: TornadoDiagramProps) {
  if (!data || data.length === 0) {
    return null
  }

  // Sort by absolute impact (largest first)
  const sorted = [...data].sort((a, b) => Math.abs(b.pnl) - Math.abs(a.pnl))

  return (
    <SectionCard
      title="Tornado Diagram"
      description="Assets ranked by sensitivity (absolute impact magnitude)"
    >
      <ResponsiveContainer width="100%" height={Math.max(300, sorted.length * 40)}>
        <BarChart
          data={sorted}
          layout="vertical"
          margin={{ top: 5, right: 30, left: 100, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" opacity={0.3} />
          <XAxis
            type="number"
            tickFormatter={(value) => formatSignedPct(value)}
            className="text-xs"
            tick={{ fill: "hsl(var(--muted-foreground))" }}
          />
          <YAxis
            type="category"
            dataKey="symbol"
            className="text-xs"
            tick={{ fill: "hsl(var(--muted-foreground))" }}
            width={90}
          />
          <Tooltip
            formatter={(value: number | undefined) => formatSignedPct(value ?? 0)}
            contentStyle={{
              backgroundColor: "hsl(var(--background))",
              border: "1px solid hsl(var(--border))",
              borderRadius: "0.75rem",
              boxShadow: "0 10px 30px -5px rgba(0, 0, 0, 0.1)",
            }}
          />
          <ReferenceLine x={0} stroke="hsl(var(--muted-foreground))" strokeWidth={2} />
          <Bar dataKey="pnl" radius={[0, 4, 4, 0]}>
            {sorted.map((entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={entry.pnl >= 0 ? "hsl(var(--success))" : "hsl(var(--destructive))"}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>

      <div className="mt-4 p-4 bg-muted/20 rounded-lg text-sm">
        <p className="text-muted-foreground">
          <strong>Most Sensitive:</strong> {sorted[0].symbol} (
          {formatSignedPct(sorted[0].pnl)} impact)
        </p>
        <p className="text-xs text-muted-foreground mt-2">
          * Positions are ranked by absolute impact magnitude, showing which assets contribute most
          to portfolio volatility under stress
        </p>
      </div>
    </SectionCard>
  )
}

