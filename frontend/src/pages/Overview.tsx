import { useState } from "react"
import { PageHeader } from "@/components/common/PageHeader"
import { KpiCard } from "@/components/common/KpiCard"
import { ReturnsAreaCard } from "@/components/charts/ReturnsAreaCard"
import { CorrelationHeatmapCard } from "@/components/charts/CorrelationHeatmapCard"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { STORAGE_KEYS } from "@/lib/constants"
import { formatPct } from "@/lib/format"
import { Activity, TrendingDown, AlertTriangle } from "lucide-react"

export function Overview() {
  const [portfolio] = useState(() => {
    const stored = localStorage.getItem(STORAGE_KEYS.PORTFOLIO)
    return stored ? JSON.parse(stored) : []
  })

  // In a real app, these would come from cached query results
  // For now, this is a placeholder structure
  const hasData = portfolio.length > 0

  return (
    <div className="space-y-6">
      <PageHeader
        title="Overview"
        subtitle="Executive summary of your portfolio risk metrics"
      />

      {hasData ? (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <KpiCard
              title="Annualized Volatility"
              value="--"
              icon={Activity}
              subtitle="Run Risk Metrics to compute"
            />
            <KpiCard
              title="VaR (95%)"
              value="--"
              icon={AlertTriangle}
              subtitle="Run VaR calculation to compute"
            />
            <KpiCard
              title="Max Drawdown"
              value="--"
              icon={TrendingDown}
              subtitle="Run Risk Metrics to compute"
            />
            <KpiCard
              title="Beta"
              value="--"
              subtitle="Run Risk Metrics to compute"
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Last Run Metadata</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Run calculations from the respective pages to see results here.
                </p>
              </CardContent>
            </Card>
          </div>
        </>
      ) : (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">
              Create a portfolio to get started. Go to the Portfolio page to add instruments.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

