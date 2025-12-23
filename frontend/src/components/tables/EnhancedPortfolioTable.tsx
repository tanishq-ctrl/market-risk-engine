import { useState, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Slider } from "@/components/ui/slider"
import {
  Trash2,
  Plus,
  GripVertical,
  Search,
  DollarSign,
  TrendingUp,
  TrendingDown,
} from "lucide-react"
import type { PortfolioRow } from "@/lib/types"
import { cn } from "@/lib/utils"
import { formatPct, formatNum } from "@/lib/format"

interface EnhancedPortfolioTableProps {
  rows: PortfolioRow[]
  onChange: (rows: PortfolioRow[]) => void
  showSliders?: boolean
  showDetails?: boolean
}

// Asset class mapping (simplified - in production, use API lookup)
const ASSET_CLASS_MAP: Record<string, string> = {
  // Stocks
  AAPL: "Equity",
  MSFT: "Equity",
  GOOGL: "Equity",
  NVDA: "Equity",
  META: "Equity",
  AMZN: "Equity",
  TSLA: "Equity",
  SPY: "Equity ETF",
  QQQ: "Equity ETF",
  VOO: "Equity ETF",
  // Bonds
  AGG: "Bond ETF",
  BND: "Bond ETF",
  TLT: "Bond ETF",
  IEF: "Bond ETF",
  // Commodities
  GLD: "Gold ETF",
  SLV: "Silver ETF",
  DBC: "Commodity ETF",
  USO: "Oil ETF",
  // Other
  JNJ: "Equity",
  PG: "Equity",
  KO: "Equity",
  PEP: "Equity",
  WMT: "Equity",
}

// Sector mapping (simplified)
const SECTOR_MAP: Record<string, string> = {
  AAPL: "Technology",
  MSFT: "Technology",
  GOOGL: "Technology",
  NVDA: "Technology",
  META: "Technology",
  AMZN: "Consumer",
  TSLA: "Automotive",
  JNJ: "Healthcare",
  PG: "Consumer",
  KO: "Consumer",
  PEP: "Consumer",
  WMT: "Retail",
}

export function EnhancedPortfolioTable({
  rows,
  onChange,
  showSliders = true,
  showDetails = true,
}: EnhancedPortfolioTableProps) {
  const [searchTerm, setSearchTerm] = useState("")
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null)

  const updateRow = (index: number, field: keyof PortfolioRow, value: string | number) => {
    const newRows = [...rows]
    newRows[index] = { ...newRows[index], [field]: value }
    onChange(newRows)
  }

  const updateWeight = (index: number, weight: number) => {
    updateRow(index, "weight", weight)
  }

  const addRow = () => {
    onChange([...rows, { symbol: "", weight: 0 }])
  }

  const removeRow = (index: number) => {
    if (rows.length > 1) {
      onChange(rows.filter((_, i) => i !== index))
    }
  }

  // Drag and drop handlers
  const handleDragStart = (index: number) => {
    setDraggedIndex(index)
  }

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault()
    if (draggedIndex === null || draggedIndex === index) return

    const newRows = [...rows]
    const draggedRow = newRows[draggedIndex]
    newRows.splice(draggedIndex, 1)
    newRows.splice(index, 0, draggedRow)

    onChange(newRows)
    setDraggedIndex(index)
  }

  const handleDragEnd = () => {
    setDraggedIndex(null)
  }

  // Filter rows based on search
  const filteredRows = useMemo(() => {
    if (!searchTerm) return rows.map((row, index) => ({ row, index }))
    
    const term = searchTerm.toLowerCase()
    return rows
      .map((row, index) => ({ row, index }))
      .filter(({ row }) => row.symbol.toLowerCase().includes(term))
  }, [rows, searchTerm])

  // Get weight color based on value
  const getWeightColor = (weight: number) => {
    const absWeight = Math.abs(weight)
    if (absWeight >= 0.3) return "text-success font-semibold"
    if (absWeight >= 0.15) return "text-warning font-medium"
    if (absWeight > 0) return "text-muted-foreground"
    return "text-muted-foreground/50"
  }

  // Get weight badge variant
  const getWeightBadge = (weight: number) => {
    const absWeight = Math.abs(weight)
    if (absWeight >= 0.3) return { label: "Large", variant: "default" as const }
    if (absWeight >= 0.15) return { label: "Medium", variant: "secondary" as const }
    if (absWeight > 0.05) return { label: "Small", variant: "outline" as const }
    return { label: "Minimal", variant: "outline" as const }
  }

  return (
    <div className="space-y-4">
      {/* Search bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search symbols..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      <div className="rounded-md border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead className="w-[40px]"></TableHead>
              <TableHead className="w-[150px]">Symbol</TableHead>
              <TableHead className="w-[200px]">Weight</TableHead>
              <TableHead className="w-[100px]">%</TableHead>
              {showDetails && (
                <>
                  <TableHead className="w-[120px]">Asset Class</TableHead>
                  <TableHead className="w-[120px]">Sector</TableHead>
                  <TableHead className="w-[100px]">Size</TableHead>
                </>
              )}
              <TableHead className="w-[80px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredRows.length === 0 && (
              <TableRow>
                <TableCell colSpan={showDetails ? 8 : 5} className="text-center text-muted-foreground py-8">
                  No positions found
                </TableCell>
              </TableRow>
            )}
            {filteredRows.map(({ row, index }) => {
              const assetClass = ASSET_CLASS_MAP[row.symbol] || "Unknown"
              const sector = SECTOR_MAP[row.symbol] || "—"
              const weightBadge = getWeightBadge(row.weight)

              return (
                <TableRow
                  key={index}
                  draggable
                  onDragStart={() => handleDragStart(index)}
                  onDragOver={(e) => handleDragOver(e, index)}
                  onDragEnd={handleDragEnd}
                  className={cn(
                    "cursor-move transition-all hover:bg-accent/50",
                    draggedIndex === index && "opacity-50",
                    !row.symbol && "bg-muted/20"
                  )}
                >
                  <TableCell className="cursor-grab active:cursor-grabbing">
                    <GripVertical className="h-4 w-4 text-muted-foreground" />
                  </TableCell>

                  <TableCell>
                    <Input
                      value={row.symbol}
                      onChange={(e) => updateRow(index, "symbol", e.target.value.toUpperCase())}
                      placeholder="AAPL"
                      className={cn(
                        "w-full font-semibold border-transparent hover:border-border focus:border-primary transition-colors",
                        row.symbol && "text-foreground"
                      )}
                    />
                  </TableCell>

                  <TableCell>
                    {showSliders && row.symbol ? (
                      <div className="flex items-center gap-3">
                        <Slider
                          value={[row.weight * 100]}
                          onValueChange={([value]) => updateWeight(index, value / 100)}
                          max={100}
                          step={1}
                          className="flex-1"
                        />
                        <span className="text-xs text-muted-foreground w-12 text-right">
                          {(row.weight * 100).toFixed(0)}%
                        </span>
                      </div>
                    ) : (
                      <Input
                        type="number"
                        step="0.01"
                        value={row.weight}
                        onChange={(e) => updateRow(index, "weight", parseFloat(e.target.value) || 0)}
                        placeholder="0.5"
                        className="w-full border-transparent hover:border-border focus:border-primary transition-colors"
                      />
                    )}
                  </TableCell>

                  <TableCell>
                    <div className="flex items-center gap-1">
                      {row.weight >= 0 ? (
                        <TrendingUp className="h-3 w-3 text-success" />
                      ) : (
                        <TrendingDown className="h-3 w-3 text-destructive" />
                      )}
                      <span className={cn("text-sm", getWeightColor(row.weight))}>
                        {formatPct(row.weight)}
                      </span>
                    </div>
                  </TableCell>

                  {showDetails && (
                    <>
                      <TableCell>
                        <Badge variant="outline" className="text-xs">
                          {assetClass}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-muted-foreground">{sector}</span>
                      </TableCell>
                      <TableCell>
                        <Badge variant={weightBadge.variant} className="text-xs">
                          {weightBadge.label}
                        </Badge>
                      </TableCell>
                    </>
                  )}

                  <TableCell>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removeRow(index)}
                      disabled={rows.length === 1}
                      className="hover:bg-destructive/10 hover:text-destructive transition-colors"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-between">
        <Button onClick={addRow} variant="outline" size="sm" className="group">
          <Plus className="h-4 w-4 mr-2 group-hover:scale-110 transition-transform" />
          Add Position
        </Button>
        
        {searchTerm && (
          <p className="text-sm text-muted-foreground">
            Showing {filteredRows.length} of {rows.length} positions
          </p>
        )}
      </div>
    </div>
  )
}

