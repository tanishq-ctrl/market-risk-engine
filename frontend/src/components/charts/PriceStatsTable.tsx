import { SectionCard } from "@/components/common/SectionCard"
import { DataTable } from "@/components/tables/DataTable"
import { formatNum, formatPct } from "@/lib/format"
import { ArrowUp, ArrowDown } from "lucide-react"

interface PriceStatsTableProps {
  prices: Record<string, (number | null)[]>
}

export function PriceStatsTable({ prices }: PriceStatsTableProps) {
  const symbols = Object.keys(prices)

  const stats = symbols.map((symbol) => {
    const priceArray = prices[symbol].filter((p) => p !== null) as number[]
    
    if (priceArray.length === 0) {
      return {
        symbol,
        startPrice: null,
        endPrice: null,
        change: null,
        changePct: null,
        high: null,
        low: null,
        avgPrice: null,
        volatility: null,
      }
    }

    const startPrice = priceArray[0]
    const endPrice = priceArray[priceArray.length - 1]
    const change = endPrice - startPrice
    const changePct = (change / startPrice) * 100

    const high = Math.max(...priceArray)
    const low = Math.min(...priceArray)
    const avgPrice = priceArray.reduce((a, b) => a + b, 0) / priceArray.length

    // Calculate daily returns for volatility
    const returns: number[] = []
    for (let i = 1; i < priceArray.length; i++) {
      returns.push((priceArray[i] - priceArray[i - 1]) / priceArray[i - 1])
    }

    // Annualized volatility (assuming 252 trading days)
    const variance = returns.reduce((sum, r) => {
      const mean = returns.reduce((a, b) => a + b, 0) / returns.length
      return sum + Math.pow(r - mean, 2)
    }, 0) / returns.length
    const volatility = Math.sqrt(variance * 252) * 100

    return {
      symbol,
      startPrice,
      endPrice,
      change,
      changePct,
      high,
      low,
      avgPrice,
      volatility,
    }
  })

  return (
    <SectionCard title="Price Statistics" description="Comprehensive statistics for each symbol">
      <DataTable
        data={stats}
        columns={[
          {
            key: "symbol",
            header: "Symbol",
            render: (row) => (
              <span className="font-semibold text-foreground">{row.symbol}</span>
            ),
          },
          {
            key: "startPrice",
            header: "Start",
            render: (row) => (row.startPrice ? formatNum(row.startPrice) : "—"),
          },
          {
            key: "endPrice",
            header: "End",
            render: (row) => (row.endPrice ? formatNum(row.endPrice) : "—"),
          },
          {
            key: "change",
            header: "Change",
            render: (row) => {
              if (row.change === null) return "—"
              const isPositive = row.change >= 0
              return (
                <span className={isPositive ? "text-success" : "text-destructive"}>
                  {isPositive ? "+" : ""}
                  {formatNum(row.change)}
                </span>
              )
            },
          },
          {
            key: "changePct",
            header: "Change %",
            render: (row) => {
              if (row.changePct === null) return "—"
              const isPositive = row.changePct >= 0
              return (
                <div className="flex items-center gap-1">
                  {isPositive ? (
                    <ArrowUp className="h-3 w-3 text-success" />
                  ) : (
                    <ArrowDown className="h-3 w-3 text-destructive" />
                  )}
                  <span className={isPositive ? "text-success" : "text-destructive"}>
                    {isPositive ? "+" : ""}
                    {formatPct(row.changePct / 100)}
                  </span>
                </div>
              )
            },
          },
          {
            key: "high",
            header: "High",
            render: (row) => (row.high ? formatNum(row.high) : "—"),
          },
          {
            key: "low",
            header: "Low",
            render: (row) => (row.low ? formatNum(row.low) : "—"),
          },
          {
            key: "avgPrice",
            header: "Average",
            render: (row) => (row.avgPrice ? formatNum(row.avgPrice) : "—"),
          },
          {
            key: "volatility",
            header: "Volatility (Ann.)",
            render: (row) => (row.volatility ? formatPct(row.volatility / 100) : "—"),
          },
        ]}
      />
    </SectionCard>
  )
}

