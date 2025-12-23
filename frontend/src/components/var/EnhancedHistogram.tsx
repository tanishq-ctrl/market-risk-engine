import { useState } from "react"
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
  Area,
  ComposedChart,
} from "recharts"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Slider } from "@/components/ui/slider"
import { formatPct } from "@/lib/format"

interface EnhancedHistogramProps {
  bins: number[]
  counts: number[]
  varValue: number
  cvarValue: number
  confidence: number
  returns?: number[]
}

export function EnhancedHistogram({
  bins,
  counts,
  varValue,
  cvarValue,
  confidence: initialConfidence,
  returns = [],
}: EnhancedHistogramProps) {
  const [showNormal, setShowNormal] = useState(false)
  const [showPercentiles, setShowPercentiles] = useState(true)
  const [confidence, setConfidence] = useState(initialConfidence * 100)

  // Calculate VaR for current confidence level
  const currentConfidence = confidence / 100
  const calculateCurrentVaR = (): number => {
    if (!returns || returns.length === 0) return varValue
    
    const sortedReturns = [...returns].sort((a, b) => a - b)
    const index = Math.floor((1 - currentConfidence) * sortedReturns.length)
    return Math.abs(sortedReturns[index] || varValue)
  }

  const currentVaR = calculateCurrentVaR()

  // Prepare histogram data
  const histogramData = bins.map((bin, idx) => ({
    bin: bin * 100, // Convert to percentage
    count: counts[idx],
    isTail: bin < -currentVaR, // Tail region
    isCVaRTail: bin < -cvarValue, // CVaR tail region
  }))

  // Calculate normal distribution overlay
  const mean = returns.length > 0
    ? returns.reduce((sum, r) => sum + r, 0) / returns.length
    : 0
  const variance = returns.length > 0
    ? returns.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / returns.length
    : 0
  const stdDev = Math.sqrt(variance)

  const normalDist = histogramData.map((point) => {
    const x = point.bin / 100
    if (stdDev === 0 || variance === 0) {
      return { ...point, normal: 0 }
    }
    const exponent = -Math.pow(x - mean, 2) / (2 * variance)
    const normalValue = (1 / (stdDev * Math.sqrt(2 * Math.PI))) * Math.exp(exponent)
    // Scale to match histogram
    const totalCount = counts.reduce((sum, c) => sum + c, 0)
    const binWidth = bins.length > 1 ? bins[1] - bins[0] : 0.01
    return {
      ...point,
      normal: normalValue * totalCount * binWidth * 100,
    }
  })

  // Calculate percentiles
  const sortedReturns = returns.length > 0 ? [...returns].sort((a, b) => a - b) : []
  const percentiles = [0.01, 0.05, 0.10, 0.25, 0.50, 0.75, 0.90, 0.95, 0.99].map((p) => {
    const idx = Math.floor(p * sortedReturns.length)
    return {
      percentile: p,
      value: sortedReturns[idx] || 0,
    }
  })

  return (
    <SectionCard
      title="Return Distribution Analysis"
      description="Histogram with VaR/CVaR thresholds and interactive features"
    >
      <div className="space-y-6">
        {/* Controls */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-muted/20 rounded-lg">
          <div className="space-y-2">
            <Label>Confidence Level: {confidence.toFixed(1)}%</Label>
            <Slider
              value={[confidence]}
              onValueChange={([value]) => setConfidence(value)}
              min={85}
              max={99.9}
              step={0.1}
              className="flex-1"
            />
            <p className="text-xs text-muted-foreground">
              VaR: {formatPct(currentVaR)}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Switch
              id="show-normal"
              checked={showNormal}
              onCheckedChange={(checked) => setShowNormal(!!checked)}
            />
            <Label htmlFor="show-normal" className="cursor-pointer">
              Show Normal Distribution
            </Label>
          </div>

          <div className="flex items-center gap-2">
            <Switch
              id="show-percentiles"
              checked={showPercentiles}
              onCheckedChange={(checked) => setShowPercentiles(!!checked)}
            />
            <Label htmlFor="show-percentiles" className="cursor-pointer">
              Show Percentile Lines
            </Label>
          </div>
        </div>

        {/* Chart */}
        <ResponsiveContainer width="100%" height={400}>
          <ComposedChart data={normalDist}>
            <defs>
              <linearGradient id="tailGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(var(--destructive))" stopOpacity={0.8} />
                <stop offset="95%" stopColor="hsl(var(--destructive))" stopOpacity={0.3} />
              </linearGradient>
              <linearGradient id="cvarGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(var(--destructive))" stopOpacity={1} />
                <stop offset="95%" stopColor="hsl(var(--destructive))" stopOpacity={0.5} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" opacity={0.3} />
            <XAxis
              dataKey="bin"
              tickFormatter={(value) => `${value.toFixed(1)}%`}
              className="text-xs"
              tick={{ fill: "hsl(var(--muted-foreground))" }}
              label={{
                value: "Returns (%)",
                position: "insideBottom",
                offset: -5,
                style: { fill: "hsl(var(--muted-foreground))" },
              }}
            />
            <YAxis
              className="text-xs"
              tick={{ fill: "hsl(var(--muted-foreground))" }}
              label={{
                value: "Frequency",
                angle: -90,
                position: "insideLeft",
                style: { fill: "hsl(var(--muted-foreground))" },
              }}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "hsl(var(--background))",
                border: "1px solid hsl(var(--border))",
                borderRadius: "0.75rem",
                boxShadow: "0 10px 30px -5px rgba(0, 0, 0, 0.1)",
              }}
              formatter={(value: number | undefined, name: string) => {
                const v = value ?? 0
                if (name === "normal") return [v.toFixed(0), "Normal Dist"]
                return [v, "Count"]
              }}
              labelFormatter={(value) => `Return: ${value.toFixed(2)}%`}
            />

            {/* Histogram bars with gradient for tail */}
            <Bar
              dataKey="count"
              fill="hsl(var(--primary))"
              opacity={0.8}
              shape={(props: any) => {
                const { fill, x, y, width, height, isTail, isCVaRTail } = props
                const barFill = isCVaRTail
                  ? "url(#cvarGradient)"
                  : isTail
                  ? "url(#tailGradient)"
                  : fill
                return <rect x={x} y={y} width={width} height={height} fill={barFill} />
              }}
            />

            {/* Normal distribution overlay */}
            {showNormal && (
              <Area
                type="monotone"
                dataKey="normal"
                stroke="hsl(var(--accent))"
                strokeWidth={2}
                fill="hsl(var(--accent))"
                fillOpacity={0.1}
                dot={false}
              />
            )}

            {/* VaR line */}
            <ReferenceLine
              x={-currentVaR * 100}
              stroke="hsl(var(--destructive))"
              strokeWidth={3}
              strokeDasharray="5 5"
              label={{
                value: `VaR (${confidence.toFixed(1)}%)`,
                position: "top",
                fill: "hsl(var(--destructive))",
                fontSize: 12,
                fontWeight: "bold",
              }}
            />

            {/* CVaR line */}
            <ReferenceLine
              x={-cvarValue * 100}
              stroke="hsl(var(--destructive))"
              strokeWidth={2}
              strokeDasharray="3 3"
              label={{
                value: "CVaR",
                position: "top",
                fill: "hsl(var(--destructive))",
                fontSize: 11,
              }}
            />

            {/* Mean line */}
            <ReferenceLine
              x={mean * 100}
              stroke="hsl(var(--foreground))"
              strokeWidth={2}
              strokeDasharray="5 5"
              label={{
                value: "Mean",
                position: "top",
                fill: "hsl(var(--foreground))",
                fontSize: 11,
              }}
            />

            {/* Percentile lines */}
            {showPercentiles &&
              [0.05, 0.95].map((p) => {
                const percentile = percentiles.find((perc) => perc.percentile === p)
                if (!percentile) return null
                return (
                  <ReferenceLine
                    key={p}
                    x={percentile.value * 100}
                    stroke="hsl(var(--muted-foreground))"
                    strokeWidth={1}
                    strokeDasharray="2 2"
                    opacity={0.5}
                    label={{
                      value: `${(p * 100).toFixed(0)}%`,
                      position: p < 0.5 ? "bottom" : "top",
                      fill: "hsl(var(--muted-foreground))",
                      fontSize: 9,
                    }}
                  />
                )
              })}
          </ComposedChart>
        </ResponsiveContainer>

        {/* Legend */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-primary rounded"></div>
            <span className="text-muted-foreground">Normal Region</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-gradient-to-b from-destructive/80 to-destructive/30 rounded"></div>
            <span className="text-muted-foreground">VaR Tail (Loss ≥ VaR)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-gradient-to-b from-destructive to-destructive/50 rounded"></div>
            <span className="text-muted-foreground">CVaR Tail (Extreme)</span>
          </div>
          {showNormal && (
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 border-2 border-accent rounded"></div>
              <span className="text-muted-foreground">Normal Dist</span>
            </div>
          )}
        </div>

        {/* Info */}
        <div className="p-4 bg-muted/20 rounded-lg text-sm text-muted-foreground space-y-2">
          <p>
            <strong>Interactive Features:</strong>
          </p>
          <ul className="list-disc list-inside space-y-1 ml-2">
            <li>Drag the confidence slider to see VaR at different levels</li>
            <li>Toggle normal distribution to check for normality assumptions</li>
            <li>CVaR region shows where expected tail losses occur</li>
            <li>If actual distribution differs significantly from normal, parametric VaR may be unreliable</li>
          </ul>
        </div>
      </div>
    </SectionCard>
  )
}

