import { useState } from "react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type { PortfolioRow } from "@/lib/types"

interface ScenarioBuilderProps {
  portfolio: PortfolioRow[]
  shocks: Record<string, number>
  onChange: (shocks: Record<string, number>) => void
}

export function ScenarioBuilder({ portfolio, shocks, onChange }: ScenarioBuilderProps) {
  const [localShocks, setLocalShocks] = useState<Record<string, number>>(shocks)

  const updateShock = (symbol: string, value: number) => {
    const updated = { ...localShocks, [symbol]: value }
    setLocalShocks(updated)
    onChange(updated)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base font-semibold">Custom Shocks</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {portfolio.map((row) => (
            <div key={row.symbol} className="flex items-center gap-4">
              <Label className="w-24">{row.symbol}</Label>
              <div className="flex items-center gap-2 flex-1">
                <Input
                  type="number"
                  step="0.1"
                  value={localShocks[row.symbol] ?? 0}
                  onChange={(e) =>
                    updateShock(row.symbol, parseFloat(e.target.value) || 0)
                  }
                  placeholder="0"
                  className="flex-1"
                />
                <span className="text-sm text-muted-foreground">%</span>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

