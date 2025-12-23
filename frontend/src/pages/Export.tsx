import { useMemo, useState } from "react"
import { PageHeader } from "@/components/common/PageHeader"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { STORAGE_KEYS } from "@/lib/constants"
import { Download, Copy, FileText, FileJson } from "lucide-react"
import { useToast } from "@/components/ui/toast"

export function Export() {
  const { addToast } = useToast()
  const [prettyJson, setPrettyJson] = useState(true)
  const [filterText, setFilterText] = useState("")

  // Section toggles
  const [includePortfolio, setIncludePortfolio] = useState(true)
  const [includeDateRange, setIncludeDateRange] = useState(true)
  const [includeVarConfig, setIncludeVarConfig] = useState(true)

  // Basic metadata / version (could be wired to env or package.json later)
  const APP_VERSION = "0.1.0"

  const gatherRawSnapshot = () => {
    const portfolio = localStorage.getItem(STORAGE_KEYS.PORTFOLIO)
    const dateRange = localStorage.getItem(STORAGE_KEYS.DATE_RANGE)
    const method = localStorage.getItem(STORAGE_KEYS.METHOD)
    const confidence = localStorage.getItem(STORAGE_KEYS.CONFIDENCE)

    const data = {
      portfolio: portfolio ? JSON.parse(portfolio) : null,
      dateRange: dateRange ? JSON.parse(dateRange) : null,
      method: method || null,
      confidence: confidence ? parseFloat(confidence) : null,
      appVersion: APP_VERSION,
      exportedAt: new Date().toISOString(),
      summary: "Market Risk Engine Export",
    }

    return data
  }

  const buildSelectedExport = useMemo(() => {
    const raw = gatherRawSnapshot()

    const payload: any = {
      summary: raw.summary,
      exportedAt: raw.exportedAt,
      appVersion: raw.appVersion,
    }

    if (includePortfolio) {
      payload.portfolio = raw.portfolio
    }
    if (includeDateRange) {
      payload.dateRange = raw.dateRange
    }
    if (includeVarConfig) {
      payload.method = raw.method
      payload.confidence = raw.confidence
    }

    return { raw, payload }
  }, [includePortfolio, includeDateRange, includeVarConfig])

  const jsonString = useMemo(() => {
    const spacing = prettyJson ? 2 : 0
    return JSON.stringify(buildSelectedExport.payload, null, spacing)
  }, [buildSelectedExport.payload, prettyJson])

  const escapedJsonWithHighlight = useMemo(() => {
    const escapeHtml = (str: string) =>
      str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")

    const escaped = escapeHtml(jsonString)
    if (!filterText.trim()) return escaped

    const safeFilter = filterText.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
    const regex = new RegExp(safeFilter, "gi")
    return escaped.replace(regex, (match) => `<mark>${match}</mark>`)
  }, [jsonString, filterText])

  const handleDownload = () => {
    const { payload } = buildSelectedExport
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: "application/json",
    })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `market-risk-export-${new Date().toISOString().split("T")[0]}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    addToast({
      title: "Export downloaded",
      description: "JSON file has been downloaded",
    })
  }

  const handleDownloadCsv = () => {
    const { raw } = buildSelectedExport
    const portfolio = raw.portfolio as Array<{ symbol: string; weight: number }> | null
    if (!portfolio || portfolio.length === 0) {
      addToast({
        title: "No portfolio",
        description: "There is no portfolio in local storage to export as CSV.",
        variant: "destructive",
      })
      return
    }

    const csv = [
      "symbol,weight",
      ...portfolio.map((p) => `${p.symbol},${p.weight}`),
    ].join("\n")

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `portfolio-${new Date().toISOString().split("T")[0]}.csv`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)

    addToast({
      title: "Portfolio CSV downloaded",
      description: `Exported ${portfolio.length} rows`,
    })
  }

  const handleCopy = () => {
    const { payload } = buildSelectedExport
    navigator.clipboard.writeText(JSON.stringify(payload, null, 2))
    addToast({
      title: "Copied to clipboard",
      description: "Export data has been copied",
    })
  }

  const handleCopyMarkdownSummary = () => {
    const { raw } = buildSelectedExport
    const portfolio = (raw.portfolio as Array<{ symbol: string; weight: number }>) || []
    const dateRange = raw.dateRange as { start?: string; end?: string } | null

    const lines: string[] = []
    lines.push("# Market Risk Engine Snapshot")
    lines.push("")
    lines.push(`- Exported at: ${raw.exportedAt}`)
    if (dateRange?.start && dateRange?.end) {
      lines.push(`- Date range: ${dateRange.start} → ${dateRange.end}`)
    }
    if (raw.method) {
      lines.push(`- VaR method: \`${raw.method}\``)
    }
    if (raw.confidence) {
      lines.push(`- VaR confidence: ${(raw.confidence * 100).toFixed(2)}%`)
    }
    lines.push(`- Positions: ${portfolio.length}`)
    if (portfolio.length > 0) {
      lines.push("")
      lines.push("## Portfolio")
      lines.push("")
      lines.push("| Symbol | Weight |")
      lines.push("|--------|--------|")
      for (const row of portfolio) {
        lines.push(`| ${row.symbol} | ${row.weight} |`)
      }
    }

    const markdown = lines.join("\n")
    navigator.clipboard.writeText(markdown)
    addToast({
      title: "Markdown copied",
      description: "Snapshot summary copied to clipboard",
    })
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Export"
        subtitle="Download or copy your portfolio and analysis results"
        actions={
          <div className="flex gap-2">
            <Button onClick={handleCopyMarkdownSummary} variant="outline" size="sm">
              <FileText className="h-4 w-4 mr-2" />
              Copy Markdown
            </Button>
            <Button onClick={handleCopy} variant="outline" size="sm">
              <Copy className="h-4 w-4 mr-2" />
              Copy JSON
            </Button>
            <Button onClick={handleDownloadCsv} variant="outline" size="sm">
              <FileText className="h-4 w-4 mr-2" />
              CSV
            </Button>
            <Button onClick={handleDownload} size="sm">
              <Download className="h-4 w-4 mr-2" />
              Download JSON
            </Button>
          </div>
        }
      />

      {/* Snapshot Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Snapshot Summary</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 text-sm">
          <div>
            <div className="text-xs uppercase text-muted-foreground">Exported at</div>
            <div className="font-mono">
              {new Date(buildSelectedExport.raw.exportedAt).toLocaleString()}
            </div>
          </div>
          <div>
            <div className="text-xs uppercase text-muted-foreground">App version</div>
            <div className="font-mono">{buildSelectedExport.raw.appVersion}</div>
          </div>
          <div>
            <div className="text-xs uppercase text-muted-foreground">Portfolio positions</div>
            <div className="font-mono">
              {Array.isArray(buildSelectedExport.raw.portfolio)
                ? buildSelectedExport.raw.portfolio.length
                : 0}
            </div>
          </div>
          <div>
            <div className="text-xs uppercase text-muted-foreground">VaR config</div>
            <div className="font-mono">
              {buildSelectedExport.raw.method
                ? `${buildSelectedExport.raw.method} @ ${
                    buildSelectedExport.raw.confidence
                      ? (buildSelectedExport.raw.confidence * 100).toFixed(1) + "%"
                      : "—"
                  }`
                : "—"}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Section selection */}
      <Card>
        <CardHeader>
          <CardTitle>Export Options</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-4 text-sm">
          <label className="inline-flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              className="h-3 w-3"
              checked={includePortfolio}
              onChange={(e) => setIncludePortfolio(e.target.checked)}
            />
            <span>Include portfolio</span>
          </label>
          <label className="inline-flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              className="h-3 w-3"
              checked={includeDateRange}
              onChange={(e) => setIncludeDateRange(e.target.checked)}
            />
            <span>Include date range</span>
          </label>
          <label className="inline-flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              className="h-3 w-3"
              checked={includeVarConfig}
              onChange={(e) => setIncludeVarConfig(e.target.checked)}
            />
            <span>Include VaR config</span>
          </label>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between gap-4">
            <span>Export Data (JSON)</span>
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <label className="inline-flex items-center gap-1 cursor-pointer">
                <input
                  type="checkbox"
                  className="h-3 w-3"
                  checked={prettyJson}
                  onChange={(e) => setPrettyJson(e.target.checked)}
                />
                <span>Pretty</span>
              </label>
              <input
                type="text"
                placeholder="Filter preview…"
                className="h-7 rounded border px-2 text-xs bg-background"
                value={filterText}
                onChange={(e) => setFilterText(e.target.value)}
              />
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <pre
            className="bg-muted p-4 rounded-md overflow-auto text-xs whitespace-pre"
            dangerouslySetInnerHTML={{ __html: escapedJsonWithHighlight }}
          />
        </CardContent>
      </Card>
    </div>
  )
}

