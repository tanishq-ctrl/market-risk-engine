import { useState, useEffect } from "react"
import { useMutation } from "@tanstack/react-query"
import { PageHeader } from "@/components/common/PageHeader"
import { PriceMultiLineCard } from "@/components/charts/PriceMultiLineCard"
import { NormalizedReturnsChart } from "@/components/charts/NormalizedReturnsChart"
import { PriceStatsKpis } from "@/components/charts/PriceStatsKpis"
import { PriceStatsTable } from "@/components/charts/PriceStatsTable"
import { CorrelationHeatmap } from "@/components/charts/CorrelationHeatmap"
import { DateRangePicker } from "@/components/forms/DateRangePicker"
import { DataTable } from "@/components/tables/DataTable"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { marketPrices, marketCorrelation } from "@/lib/api"
import { useToast } from "@/components/ui/toast"
import { STORAGE_KEYS } from "@/lib/constants"
import { formatPct } from "@/lib/format"
import type { PricesResponse } from "@/lib/types"
import { TrendingUp, Network } from "lucide-react"

export function MarketData() {
  const { addToast } = useToast()
  const [start, setStart] = useState(() => {
    const stored = localStorage.getItem(STORAGE_KEYS.DATE_RANGE)
    if (stored) {
      const parsed = JSON.parse(stored)
      return parsed.start || "2023-01-01"
    }
    return "2023-01-01"
  })
  const [end, setEnd] = useState(() => {
    const stored = localStorage.getItem(STORAGE_KEYS.DATE_RANGE)
    if (stored) {
      const parsed = JSON.parse(stored)
      return parsed.end || new Date().toISOString().split("T")[0]
    }
    return new Date().toISOString().split("T")[0]
  })

  const [portfolio] = useState(() => {
    const stored = localStorage.getItem(STORAGE_KEYS.PORTFOLIO)
    return stored ? JSON.parse(stored) : []
  })

  const pricesMutation = useMutation({
    mutationFn: marketPrices,
    onSuccess: (data) => {
      if (data.failed_symbols && data.failed_symbols.length > 0) {
        addToast({
          title: "Some symbols failed",
          description: `Failed: ${data.failed_symbols.join(", ")}`,
          variant: "destructive",
        })
      }
    },
    onError: (error: any) => {
      addToast({
        title: "Error",
        description: error.message || "Failed to fetch prices",
        variant: "destructive",
      })
    },
  })

  const correlationMutation = useMutation({
    mutationFn: marketCorrelation,
    onError: (error: any) => {
      addToast({
        title: "Error",
        description: error.message || "Failed to fetch correlation",
        variant: "destructive",
      })
    },
  })

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.DATE_RANGE, JSON.stringify({ start, end }))
  }, [start, end])

  const symbols = portfolio.map((p: any) => p.symbol).filter(Boolean)

  const handleFetch = () => {
    if (symbols.length === 0) {
      addToast({
        title: "No symbols",
        description: "Please add symbols to your portfolio first",
        variant: "destructive",
      })
      return
    }
    pricesMutation.mutate({ symbols, start, end })
  }

  const handleFetchCorrelation = () => {
    if (symbols.length < 2) {
      addToast({
        title: "Need more symbols",
        description: "Correlation requires at least 2 symbols",
        variant: "destructive",
      })
      return
    }
    correlationMutation.mutate({ symbols, start, end })
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Market Data"
        subtitle="Fetch and visualize price data for your portfolio"
        actions={
          <div className="flex gap-2">
            <Button
              onClick={handleFetch}
              disabled={pricesMutation.isPending || symbols.length === 0}
            >
              <TrendingUp className="h-4 w-4 mr-2" />
              Fetch Prices
            </Button>
            <Button
              variant="outline"
              onClick={handleFetchCorrelation}
              disabled={correlationMutation.isPending || symbols.length < 2}
            >
              <Network className="h-4 w-4 mr-2" />
              Correlation
            </Button>
          </div>
        }
      />

      <DateRangePicker
        start={start}
        end={end}
        onStartChange={setStart}
        onEndChange={setEnd}
      />

      {pricesMutation.data && (
        <>
          {/* KPI Cards */}
          <PriceStatsKpis
            dates={pricesMutation.data.dates}
            prices={pricesMutation.data.prices}
          />

          {/* Price Chart with Moving Averages */}
          <PriceMultiLineCard
            dates={pricesMutation.data.dates}
            prices={pricesMutation.data.prices}
            isLoading={pricesMutation.isPending}
          />

          {/* Normalized Returns Chart */}
          <NormalizedReturnsChart
            dates={pricesMutation.data.dates}
            prices={pricesMutation.data.prices}
            isLoading={pricesMutation.isPending}
          />

          {/* Price Statistics Table */}
          <PriceStatsTable
            dates={pricesMutation.data.dates}
            prices={pricesMutation.data.prices}
          />

          {/* Failed Symbols */}
          {pricesMutation.data.failed_symbols &&
            pricesMutation.data.failed_symbols.length > 0 && (
              <div className="flex gap-2 flex-wrap items-center">
                <span className="text-sm font-medium text-muted-foreground">
                  Failed symbols:
                </span>
                {pricesMutation.data.failed_symbols.map((symbol) => (
                  <Badge key={symbol} variant="destructive">
                    {symbol}
                  </Badge>
                ))}
              </div>
            )}

          {/* Missing Data Report */}
          {pricesMutation.data.missing_report &&
            pricesMutation.data.missing_report.length > 0 && (
              <DataTable
                title="Missing Data Report"
                data={pricesMutation.data.missing_report}
                columns={[
                  { key: "symbol", header: "Symbol" },
                  {
                    key: "missing_pct",
                    header: "Missing %",
                    render: (row) => formatPct(row.missing_pct),
                  },
                  { key: "longest_gap", header: "Longest Gap (days)" },
                ]}
              />
            )}
        </>
      )}

      {/* Correlation Heatmap */}
      {correlationMutation.data && (
        <CorrelationHeatmap
          symbols={correlationMutation.data.correlation.symbols}
          data={correlationMutation.data.correlation.matrix}
        />
      )}
    </div>
  )
}

