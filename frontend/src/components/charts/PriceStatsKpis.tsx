import { KpiCard } from "@/components/common/KpiCard"
import { formatPct } from "@/lib/format"
import { TrendingUp, TrendingDown, Activity, DollarSign } from "lucide-react"

interface PriceStatsKpisProps {
  prices: Record<string, (number | null)[]>
}

export function PriceStatsKpis({ prices }: PriceStatsKpisProps) {
  const symbols = Object.keys(prices)

  // Calculate aggregate statistics
  let totalPositive = 0
  let totalNegative = 0
  let avgChange = 0
  let avgVolatility = 0

  symbols.forEach((symbol) => {
    const priceArray = prices[symbol].filter((p) => p !== null) as number[]
    if (priceArray.length < 2) return

    const startPrice = priceArray[0]
    const endPrice = priceArray[priceArray.length - 1]
    const changePct = ((endPrice - startPrice) / startPrice) * 100

    if (changePct > 0) totalPositive++
    else if (changePct < 0) totalNegative++

    avgChange += changePct

    // Calculate volatility
    const returns: number[] = []
    for (let i = 1; i < priceArray.length; i++) {
      returns.push((priceArray[i] - priceArray[i - 1]) / priceArray[i - 1])
    }
    const variance =
      returns.reduce((sum, r) => {
        const mean = returns.reduce((a, b) => a + b, 0) / returns.length
        return sum + Math.pow(r - mean, 2)
      }, 0) / returns.length
    avgVolatility += Math.sqrt(variance * 252) * 100
  })

  avgChange = symbols.length > 0 ? avgChange / symbols.length : 0
  avgVolatility = symbols.length > 0 ? avgVolatility / symbols.length : 0

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <KpiCard
        title="Total Symbols"
        value={symbols.length.toString()}
        icon={DollarSign}
        variant="default"
      />
      <KpiCard
        title="Avg Period Change"
        value={formatPct(avgChange / 100)}
        subtitle={avgChange >= 0 ? "Portfolio gaining" : "Portfolio declining"}
        icon={avgChange >= 0 ? TrendingUp : TrendingDown}
        variant={avgChange >= 0 ? "success" : "destructive"}
      />
      <KpiCard
        title="Winners / Losers"
        value={`${totalPositive} / ${totalNegative}`}
        subtitle={`${totalPositive} symbols up, ${totalNegative} down`}
        icon={Activity}
        variant="default"
      />
      <KpiCard
        title="Avg Volatility"
        value={formatPct(avgVolatility / 100)}
        subtitle="Annualized"
        icon={Activity}
        variant="warning"
      />
    </div>
  )
}

