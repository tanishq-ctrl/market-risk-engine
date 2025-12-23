import { useRef } from "react"
import { Button } from "@/components/ui/button"
import { Upload } from "lucide-react"
import type { PortfolioRow } from "@/lib/types"
import { useToast } from "@/components/ui/toast"

interface PortfolioUploadProps {
  onUpload: (portfolio: PortfolioRow[]) => void
}

export function PortfolioUpload({ onUpload }: PortfolioUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { addToast } = useToast()

  const handleFile = (file: File) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const text = (e.target?.result as string) || ""
        const rawLines = text.split(/\r?\n/).filter((line) => line.trim().length > 0)

        if (rawLines.length === 0) {
          addToast({
            title: "Invalid file",
            description: "The CSV appears to be empty.",
            variant: "destructive",
          })
          return
        }

        const portfolio: PortfolioRow[] = []

        for (let index = 0; index < rawLines.length; index++) {
          const raw = rawLines[index]
          const line = raw.trim()

          // Detect delimiter: prefer comma, fall back to semicolon
          const delimiter = line.includes(",") ? "," : line.includes(";") ? ";" : null
          if (!delimiter) {
            // Single-column line – skip unless it looks like JSON
            continue
          }

          const [symbolRaw, weightRaw] = line.split(delimiter)
          const symbol = symbolRaw?.trim()
          const weightStr = weightRaw?.trim()

          // Skip header row like: symbol,weight
          if (
            index === 0 &&
            symbol &&
            weightStr &&
            /symbol|ticker/i.test(symbol) &&
            /weight/i.test(weightStr)
          ) {
            continue
          }

          if (!symbol || !weightStr) continue

          // Allow things like "0.25", "25%", " 0.25 " etc.
          const numericPart = weightStr.replace("%", "").trim()
          const parsed = parseFloat(numericPart)
          if (Number.isNaN(parsed)) continue

          // If user uses percentages (25 instead of 0.25), keep as-is;
          // normalization happens server-side or via the Normalize button.
          portfolio.push({
            symbol: symbol.toUpperCase(),
            weight: parsed,
          })
        }

        if (portfolio.length > 0) {
          onUpload(portfolio)
          addToast({
            title: "Portfolio uploaded",
            description: `Loaded ${portfolio.length} positions`,
          })
        } else {
          addToast({
            title: "Invalid file",
            description:
              "Could not parse portfolio from CSV. Expected format: symbol,weight (e.g. AAPL,0.4).",
            variant: "destructive",
          })
        }
      } catch {
        addToast({
          title: "Error",
          description: "Failed to parse CSV file",
          variant: "destructive",
        })
      }
    }
    reader.readAsText(file)
  }

  return (
    <div>
      <input
        ref={fileInputRef}
        type="file"
        accept=".csv,text/csv"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) handleFile(file)
        }}
      />
      <Button
        variant="outline"
        onClick={() => fileInputRef.current?.click()}
        type="button"
      >
        <Upload className="h-4 w-4 mr-2" />
        Upload CSV
      </Button>
    </div>
  )
}

