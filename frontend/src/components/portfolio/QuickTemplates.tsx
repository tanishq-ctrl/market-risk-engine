import { Button } from "@/components/ui/button"
import { SectionCard } from "@/components/common/SectionCard"
import { Zap, TrendingUp, DollarSign, Shield, Equal } from "lucide-react"
import type { PortfolioRow } from "@/lib/types"

interface QuickTemplatesProps {
  onLoadTemplate: (portfolio: PortfolioRow[]) => void
}

interface Template {
  name: string
  description: string
  icon: any
  portfolio: PortfolioRow[]
}

const TEMPLATES: Template[] = [
  {
    name: "60/40 Classic",
    description: "60% stocks, 40% bonds",
    icon: Shield,
    portfolio: [
      { symbol: "SPY", weight: 0.6 },
      { symbol: "AGG", weight: 0.4 },
    ],
  },
  {
    name: "Tech Growth",
    description: "Tech giants equal weight",
    icon: TrendingUp,
    portfolio: [
      { symbol: "AAPL", weight: 0.2 },
      { symbol: "MSFT", weight: 0.2 },
      { symbol: "GOOGL", weight: 0.2 },
      { symbol: "NVDA", weight: 0.2 },
      { symbol: "META", weight: 0.2 },
    ],
  },
  {
    name: "Dividend Growth",
    description: "High-quality dividend payers",
    icon: DollarSign,
    portfolio: [
      { symbol: "JNJ", weight: 0.2 },
      { symbol: "PG", weight: 0.2 },
      { symbol: "KO", weight: 0.2 },
      { symbol: "PEP", weight: 0.2 },
      { symbol: "WMT", weight: 0.2 },
    ],
  },
  {
    name: "All Weather",
    description: "Diversified across assets",
    icon: Shield,
    portfolio: [
      { symbol: "SPY", weight: 0.3 },
      { symbol: "TLT", weight: 0.4 },
      { symbol: "IEF", weight: 0.15 },
      { symbol: "GLD", weight: 0.075 },
      { symbol: "DBC", weight: 0.075 },
    ],
  },
  {
    name: "S&P 500",
    description: "Pure equity exposure",
    icon: TrendingUp,
    portfolio: [{ symbol: "SPY", weight: 1.0 }],
  },
]

export function QuickTemplates({ onLoadTemplate }: QuickTemplatesProps) {
  return (
    <SectionCard
      title="Quick Templates"
      description="Load pre-built portfolios to get started quickly"
    >
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3">
        {TEMPLATES.map((template) => {
          const Icon = template.icon
          return (
            <Button
              key={template.name}
              variant="outline"
              className="h-auto flex-col items-start p-4 hover:border-primary hover:bg-primary/5 transition-all group"
              onClick={() => onLoadTemplate(template.portfolio)}
            >
              <div className="flex items-center gap-2 mb-2">
                <Icon className="h-4 w-4 text-primary group-hover:scale-110 transition-transform" />
                <span className="font-semibold text-sm">{template.name}</span>
              </div>
              <p className="text-xs text-muted-foreground text-left">
                {template.description}
              </p>
              <p className="text-xs text-muted-foreground mt-2">
                {template.portfolio.length} position{template.portfolio.length !== 1 ? "s" : ""}
              </p>
            </Button>
          )
        })}
      </div>
    </SectionCard>
  )
}

