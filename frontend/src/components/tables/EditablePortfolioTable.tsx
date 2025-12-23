import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Trash2, Plus } from "lucide-react"
import type { PortfolioRow } from "@/lib/types"
import { cn } from "@/lib/utils"

interface EditablePortfolioTableProps {
  rows: PortfolioRow[]
  onChange: (rows: PortfolioRow[]) => void
  onRemove?: (index: number) => void
}

export function EditablePortfolioTable({
  rows,
  onChange,
  onRemove,
}: EditablePortfolioTableProps) {
  const updateRow = (index: number, field: keyof PortfolioRow, value: string | number) => {
    const newRows = [...rows]
    newRows[index] = { ...newRows[index], [field]: value }
    onChange(newRows)
  }

  const addRow = () => {
    onChange([...rows, { symbol: "", weight: 0 }])
  }

  const removeRow = (index: number) => {
    if (onRemove) {
      onRemove(index)
    } else {
      onChange(rows.filter((_, i) => i !== index))
    }
  }

  return (
    <div className="space-y-4">
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[200px]">Symbol</TableHead>
              <TableHead className="w-[150px]">Weight</TableHead>
              <TableHead className="w-[100px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row, index) => (
              <TableRow key={index}>
                <TableCell>
                  <Input
                    value={row.symbol}
                    onChange={(e) => updateRow(index, "symbol", e.target.value.toUpperCase())}
                    placeholder="AAPL"
                    className="w-full"
                  />
                </TableCell>
                <TableCell>
                  <Input
                    type="number"
                    step="0.01"
                    value={row.weight}
                    onChange={(e) =>
                      updateRow(index, "weight", parseFloat(e.target.value) || 0)
                    }
                    placeholder="0.5"
                    className="w-full"
                  />
                </TableCell>
                <TableCell>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removeRow(index)}
                    disabled={rows.length === 1}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <Button onClick={addRow} variant="outline" size="sm">
        <Plus className="h-4 w-4 mr-2" />
        Add Row
      </Button>
    </div>
  )
}

