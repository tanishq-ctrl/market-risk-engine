import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { AlertCircle, AlertTriangle, CheckCircle } from "lucide-react"
import type { PortfolioRow } from "@/lib/types"

interface PortfolioValidationProps {
  portfolio: PortfolioRow[]
  allowShorts: boolean
}

interface ValidationIssue {
  type: "error" | "warning" | "info"
  title: string
  message: string
}

export function PortfolioValidation({ portfolio, allowShorts }: PortfolioValidationProps) {
  const issues: ValidationIssue[] = []

  // Check for duplicates
  const symbols = portfolio.map((p) => p.symbol.toUpperCase()).filter(Boolean)
  const duplicates = symbols.filter((s, idx) => symbols.indexOf(s) !== idx)
  if (duplicates.length > 0) {
    issues.push({
      type: "error",
      title: "Duplicate Symbols",
      message: `Found duplicate symbols: ${[...new Set(duplicates)].join(", ")}. This may cause incorrect calculations.`,
    })
  }

  // Check for empty symbols
  const emptySymbols = portfolio.filter((p) => !p.symbol || p.symbol.trim() === "")
  if (emptySymbols.length > 0) {
    issues.push({
      type: "warning",
      title: "Empty Symbols",
      message: `${emptySymbols.length} position(s) have no symbol. Remove them or add symbols.`,
    })
  }

  // Check for negative weights if shorts not allowed
  if (!allowShorts) {
    const negativeWeights = portfolio.filter((p) => p.weight < 0)
    if (negativeWeights.length > 0) {
      issues.push({
        type: "error",
        title: "Negative Weights Detected",
        message: `Found ${negativeWeights.length} position(s) with negative weights. Enable "Allow shorts" or adjust weights.`,
      })
    }
  }

  // Check for over-concentration
  const maxWeight = Math.max(...portfolio.map((p) => Math.abs(p.weight)))
  if (maxWeight > 0.5) {
    const concentratedPosition = portfolio.find((p) => Math.abs(p.weight) === maxWeight)
    issues.push({
      type: "warning",
      title: "High Concentration",
      message: `Position ${concentratedPosition?.symbol} represents ${(maxWeight * 100).toFixed(1)}% of portfolio. Consider diversifying.`,
    })
  }

  // Check weight sum
  const weightSum = portfolio.reduce((sum, row) => sum + row.weight, 0)
  const isNormalized = Math.abs(weightSum - 1.0) < 0.01
  if (!isNormalized) {
    issues.push({
      type: "warning",
      title: "Weights Not Normalized",
      message: `Weight sum is ${(weightSum * 100).toFixed(2)}%. Click "Normalize Weights" to adjust to 100%.`,
    })
  }

  // Check for zero weights
  const zeroWeights = portfolio.filter((p) => p.symbol && p.weight === 0)
  if (zeroWeights.length > 0) {
    issues.push({
      type: "info",
      title: "Zero Weight Positions",
      message: `${zeroWeights.length} position(s) have zero weight and won't affect portfolio calculations.`,
    })
  }

  // All good!
  if (issues.length === 0) {
    return (
      <Alert className="border-success/50 bg-success/10">
        <CheckCircle className="h-4 w-4 text-success" />
        <AlertTitle>Portfolio Valid</AlertTitle>
        <AlertDescription>
          All checks passed. Your portfolio is ready for analysis.
        </AlertDescription>
      </Alert>
    )
  }

  return (
    <div className="space-y-3">
      {issues.map((issue, idx) => (
        <Alert
          key={idx}
          variant={issue.type === "error" ? "destructive" : "default"}
          className={
            issue.type === "warning"
              ? "border-warning/50 bg-warning/10"
              : issue.type === "info"
              ? "border-info/50 bg-info/10"
              : ""
          }
        >
          {issue.type === "error" ? (
            <AlertCircle className="h-4 w-4" />
          ) : issue.type === "warning" ? (
            <AlertTriangle className="h-4 w-4 text-warning" />
          ) : (
            <AlertCircle className="h-4 w-4 text-info" />
          )}
          <AlertTitle>{issue.title}</AlertTitle>
          <AlertDescription>{issue.message}</AlertDescription>
        </Alert>
      ))}
    </div>
  )
}

