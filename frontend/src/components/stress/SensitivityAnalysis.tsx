import { SectionCard } from "@/components/common/SectionCard"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, Area, ComposedChart } from "recharts"
import { formatPct, formatSignedPct } from "@/lib/format"

interface SensitivityAnalysisProps {
  baseShock: number
  basePnL: number
  sensitivityData: Array<{
    shock: number
    pnl: number
  }>
}

export function SensitivityAnalysis({ baseShock, basePnL, sensitivityData }: SensitivityAnalysisProps) {
  if (!sensitivityData || sensitivityData.length === 0) {
    return null
  }

  // Find critical thresholds
  const threshold10 = sensitivityData.find((d) => d.pnl <= -0.10)
  const threshold20 = sensitivityData.find((d) => d.pnl <= -0.20)

  return (
    <SectionCard
      title="Sensitivity Analysis"
      description="How portfolio P&L changes with different shock magnitudes"
    >
      <ResponsiveContainer width="100%" height={400}>
        <ComposedChart data={sensitivityData}>
          <defs>
            <linearGradient id="pnlGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="hsl(var(--success))" stopOpacity={0.3} />
              <stop offset="50%" stopColor="hsl(var(--muted))" stopOpacity={0.1} />
              <stop offset="100%" stopColor="hsl(var(--destructive))" stopOpacity={0.3} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" opacity={0.3} />
          <XAxis
            dataKey="shock"
            tickFormatter={(value) => formatPct(value)}
            className="text-xs"
            tick={{ fill: "hsl(var(--muted-foreground))" }}
            label={{
              value: "Shock Magnitude",
              position: "insideBottom",
              offset: -5,
              style: { fill: "hsl(var(--muted-foreground))" },
            }}
          />
          <YAxis
            tickFormatter={(value) => formatSignedPct(value)}
            className="text-xs"
            tick={{ fill: "hsl(var(--muted-foreground))" }}
            label={{
              value: "Portfolio P&L",
              angle: -90,
              position: "insideLeft",
              style: { fill: "hsl(var(--muted-foreground))" },
            }}
          />
          <Tooltip
            formatter={(value: number) => formatSignedPct(value)}
            labelFormatter={(value) => `Shock: ${formatPct(value)}`}
            contentStyle={{
              backgroundColor: "hsl(var(--background))",
              border: "1px solid hsl(var(--border))",
              borderRadius: "0.75rem",
              boxShadow: "0 10px 30px -5px rgba(0, 0, 0, 0.1)",
            }}
          />

          {/* Critical threshold lines */}
          <ReferenceLine
            y={-0.10}
            stroke="hsl(var(--warning))"
            strokeDasharray="5 5"
            strokeWidth={2}
            label={{
              value: "-10% Loss",
              position: "right",
              fill: "hsl(var(--warning))",
              fontSize: 11,
            }}
          />
          <ReferenceLine
            y={-0.20}
            stroke="hsl(var(--destructive))"
            strokeDasharray="5 5"
            strokeWidth={2}
            label={{
              value: "-20% Loss",
              position: "right",
              fill: "hsl(var(--destructive))",
              fontSize: 11,
            }}
          />
          <ReferenceLine
            y={0}
            stroke="hsl(var(--muted-foreground))"
            strokeWidth={2}
          />

          {/* Current scenario marker */}
          <ReferenceLine
            x={baseShock}
            stroke="hsl(var(--primary))"
            strokeWidth={3}
            strokeDasharray="3 3"
            label={{
              value: "Current",
              position: "top",
              fill: "hsl(var(--primary))",
              fontSize: 12,
              fontWeight: "bold",
            }}
          />

          <Area
            type="monotone"
            dataKey="pnl"
            stroke="none"
            fill="url(#pnlGradient)"
            fillOpacity={0.6}
          />
          <Line
            type="monotone"
            dataKey="pnl"
            stroke="hsl(var(--primary))"
            strokeWidth={3}
            dot={{ fill: "hsl(var(--primary))", r: 4 }}
            activeDot={{ r: 6 }}
          />
        </ComposedChart>
      </ResponsiveContainer>

      <div className="mt-4 p-4 bg-muted/20 rounded-lg grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
        <div>
          <p className="text-muted-foreground">Current Shock</p>
          <p className="font-semibold">{formatPct(baseShock)}</p>
        </div>
        <div>
          <p className="text-muted-foreground">Current P&L</p>
          <p className="font-semibold text-destructive">{formatSignedPct(basePnL)}</p>
        </div>
        {threshold10 && (
          <div>
            <p className="text-muted-foreground">-10% Loss at</p>
            <p className="font-semibold text-warning">{formatPct(threshold10.shock)} shock</p>
          </div>
        )}
        {threshold20 && (
          <div>
            <p className="text-muted-foreground">-20% Loss at</p>
            <p className="font-semibold text-destructive">{formatPct(threshold20.shock)} shock</p>
          </div>
        )}
      </div>
    </SectionCard>
  )
}

