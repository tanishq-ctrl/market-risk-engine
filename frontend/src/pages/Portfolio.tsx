import { useState, useEffect } from "react"
import { useMutation } from "@tanstack/react-query"
import { PageHeader } from "@/components/common/PageHeader"
import { EnhancedPortfolioTable } from "@/components/tables/EnhancedPortfolioTable"
import { PortfolioKpis } from "@/components/portfolio/PortfolioKpis"
import { PortfolioValidation } from "@/components/portfolio/PortfolioValidation"
import { QuickTemplates } from "@/components/portfolio/QuickTemplates"
import { PortfolioPieChart } from "@/components/charts/PortfolioPieChart"
import { WeightAdjustmentHelpers } from "@/components/portfolio/WeightAdjustmentHelpers"
import { PortfolioUpload } from "@/components/forms/PortfolioUpload"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { normalizePortfolio } from "@/lib/api"
import { useToast } from "@/components/ui/toast"
import { STORAGE_KEYS } from "@/lib/constants"
import type { PortfolioRow } from "@/lib/types"
import { Download } from "lucide-react"

export function Portfolio() {
  const { addToast } = useToast()
  const [portfolio, setPortfolio] = useState<PortfolioRow[]>(() => {
    const stored = localStorage.getItem(STORAGE_KEYS.PORTFOLIO)
    return stored ? JSON.parse(stored) : [{ symbol: "AAPL", weight: 1.0 }]
  })
  const [allowShorts, setAllowShorts] = useState(false)
  const [showSliders, setShowSliders] = useState(true)

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.PORTFOLIO, JSON.stringify(portfolio))
  }, [portfolio])

  const normalizeMutation = useMutation({
    mutationFn: normalizePortfolio,
    onSuccess: (data) => {
      setPortfolio(data.portfolio)
      addToast({
        title: "Weights normalized",
        description: `Sum was ${data.sum_before.toFixed(2)}, now normalized to 1.0`,
      })
    },
    onError: (error: any) => {
      addToast({
        title: "Error",
        description: error.message || "Failed to normalize portfolio",
        variant: "destructive",
      })
    },
  })

  const weightSum = portfolio.reduce((sum, row) => sum + row.weight, 0)
  const isNormalized = Math.abs(weightSum - 1.0) < 0.01

  const handleNormalize = () => {
    normalizeMutation.mutate({ portfolio })
  }

  const handleLoadTemplate = (templatePortfolio: PortfolioRow[]) => {
    setPortfolio(templatePortfolio)
    addToast({
      title: "Template Loaded",
      description: `Loaded ${templatePortfolio.length} positions`,
    })
  }

  const handleExportJson = () => {
    const dataStr = JSON.stringify(portfolio, null, 2)
    const dataUri = "data:application/json;charset=utf-8," + encodeURIComponent(dataStr)
    const exportFileDefaultName = `portfolio-${new Date().toISOString().split("T")[0]}.json`

    const linkElement = document.createElement("a")
    linkElement.setAttribute("href", dataUri)
    linkElement.setAttribute("download", exportFileDefaultName)
    linkElement.click()
  }

  const handleExportCsv = () => {
    const csv = [
      "symbol,weight",
      ...portfolio.map((p) => `${p.symbol},${p.weight}`),
    ].join("\n")

    const dataUri = "data:text/csv;charset=utf-8," + encodeURIComponent(csv)
    const exportFileDefaultName = `portfolio-${new Date().toISOString().split("T")[0]}.csv`

    const linkElement = document.createElement("a")
    linkElement.setAttribute("href", dataUri)
    linkElement.setAttribute("download", exportFileDefaultName)
    linkElement.click()
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Portfolio"
        subtitle="Build and manage your portfolio of instruments"
        actions={
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportCsv}
              disabled={portfolio.length === 0}
            >
              <Download className="h-4 w-4 mr-2" />
              CSV
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportJson}
              disabled={portfolio.length === 0}
            >
              <Download className="h-4 w-4 mr-2" />
              JSON
            </Button>
            <Button
              onClick={handleNormalize}
              disabled={normalizeMutation.isPending || isNormalized}
              title={isNormalized ? "Weights already sum to ~1.0" : undefined}
            >
              Normalize Weights
            </Button>
          </div>
        }
      />

      {/* KPIs */}
      <PortfolioKpis portfolio={portfolio} />

      {/* Quick Templates */}
      <QuickTemplates onLoadTemplate={handleLoadTemplate} />

      {/* Weight Adjustment Helpers */}
      <WeightAdjustmentHelpers portfolio={portfolio} onAdjust={setPortfolio} />

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Enhanced Portfolio Table */}
          <EnhancedPortfolioTable
            rows={portfolio}
            onChange={setPortfolio}
            showSliders={showSliders}
            showDetails={true}
          />

          {/* Controls */}
          <div className="flex flex-wrap items-center gap-4">
            <PortfolioUpload onUpload={setPortfolio} />
            
            <div className="flex items-center gap-2">
              <Switch id="allow-shorts" checked={allowShorts} onCheckedChange={setAllowShorts} />
              <Label htmlFor="allow-shorts" className="cursor-pointer">
                Allow shorts
              </Label>
            </div>

            <div className="flex items-center gap-2">
              <Switch id="show-sliders" checked={showSliders} onCheckedChange={setShowSliders} />
              <Label htmlFor="show-sliders" className="cursor-pointer">
                Weight sliders
              </Label>
            </div>
          </div>

          {/* Validation Messages */}
          <PortfolioValidation portfolio={portfolio} allowShorts={allowShorts} />
        </div>

        {/* Pie Chart */}
        <div>
          <PortfolioPieChart
            portfolio={portfolio}
            onSymbolClick={(symbol) => {
              console.log("Clicked symbol:", symbol)
              // Could scroll to or highlight the symbol in the table
            }}
          />
        </div>
      </div>
    </div>
  )
}

