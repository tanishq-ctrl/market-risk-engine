import { SectionCard } from "@/components/common/SectionCard"
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts"
import type { PortfolioRow } from "@/lib/types"

interface PortfolioPieChartProps {
  portfolio: PortfolioRow[]
  onSymbolClick?: (symbol: string) => void
}

const COLORS = [
  "hsl(var(--primary))",
  "hsl(var(--accent))",
  "hsl(var(--success))",
  "hsl(var(--warning))",
  "hsl(var(--info))",
  "#8b5cf6",
  "#ec4899",
  "#f59e0b",
  "#10b981",
  "#6366f1",
  "#f43f5e",
  "#14b8a6",
]

export function PortfolioPieChart({ portfolio, onSymbolClick }: PortfolioPieChartProps) {
  // Filter out positions with zero or negative weights for pie chart
  const data = portfolio
    .filter((p) => p.symbol && p.weight > 0)
    .map((p) => ({
      name: p.symbol,
      value: p.weight,
    }))

  if (data.length === 0) {
    return null
  }

  const totalWeight = data.reduce((sum, d) => sum + d.value, 0)

  return (
    <SectionCard
      title="Portfolio Composition"
      description="Visual breakdown of portfolio weights"
    >
      <ResponsiveContainer width="100%" height={350}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            labelLine={false}
            label={({ name, percent = 0 }) => `${name} ${(percent * 100).toFixed(1)}%`}
            outerRadius={120}
            innerRadius={60}
            fill="#8884d8"
            dataKey="value"
            onClick={(data) => {
              if (onSymbolClick && data.name) {
                onSymbolClick(data.name)
              }
            }}
            className="cursor-pointer"
          >
            {data.map((entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={COLORS[index % COLORS.length]}
                className="hover:opacity-80 transition-opacity"
              />
            ))}
          </Pie>
          <Tooltip
            formatter={(value: number | undefined) =>
              `${(((value ?? 0) / totalWeight) * 100).toFixed(2)}%`
            }
            contentStyle={{
              backgroundColor: "hsl(var(--background))",
              border: "1px solid hsl(var(--border))",
              borderRadius: "0.75rem",
              boxShadow: "0 10px 30px -5px rgba(0, 0, 0, 0.1)",
            }}
          />
          <Legend
            verticalAlign="bottom"
            height={36}
            wrapperStyle={{
              paddingTop: "20px",
            }}
          />
        </PieChart>
      </ResponsiveContainer>
      
      {/* Center text showing total */}
      <div className="text-center -mt-56 pointer-events-none">
        <div className="text-3xl font-bold text-gradient">{data.length}</div>
        <div className="text-sm text-muted-foreground">Positions</div>
      </div>
    </SectionCard>
  )
}

