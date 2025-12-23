import { Badge } from "@/components/ui/badge"
import { AlertTriangle, AlertCircle, Info, CheckCircle } from "lucide-react"

interface SeverityIndicatorProps {
  pnl: number
  showIcon?: boolean
  showBadge?: boolean
}

export function SeverityIndicator({ pnl, showIcon = true, showBadge = true }: SeverityIndicatorProps) {
  const getSeverity = () => {
    if (pnl <= -0.20) return { level: "extreme", label: "EXTREME", variant: "destructive" as const, Icon: AlertTriangle }
    if (pnl <= -0.10) return { level: "high", label: "HIGH", variant: "destructive" as const, Icon: AlertCircle }
    if (pnl <= -0.05) return { level: "medium", label: "MEDIUM", variant: "default" as const, Icon: Info }
    if (pnl < 0) return { level: "low", label: "LOW", variant: "outline" as const, Icon: Info }
    return { level: "positive", label: "POSITIVE", variant: "outline" as const, Icon: CheckCircle }
  }

  const severity = getSeverity()
  const Icon = severity.Icon

  return (
    <div className="flex items-center gap-2">
      {showIcon && <Icon className={`h-4 w-4 ${severity.level === "extreme" || severity.level === "high" ? "text-destructive" : severity.level === "medium" ? "text-warning" : "text-muted-foreground"}`} />}
      {showBadge && (
        <Badge variant={severity.variant} className="text-xs">
          {severity.label}
        </Badge>
      )}
    </div>
  )
}

// Traffic Light Component
export function TrafficLight({ pnl }: { pnl: number }) {
  const getColor = () => {
    if (pnl <= -0.20) return "bg-red-500"
    if (pnl <= -0.10) return "bg-yellow-500"
    return "bg-green-500"
  }

  return (
    <div className="flex items-center gap-1">
      <div className={`w-3 h-3 rounded-full ${pnl <= -0.20 ? "bg-red-500" : "bg-gray-300 dark:bg-gray-700"}`} />
      <div className={`w-3 h-3 rounded-full ${pnl > -0.20 && pnl <= -0.10 ? "bg-yellow-500" : "bg-gray-300 dark:bg-gray-700"}`} />
      <div className={`w-3 h-3 rounded-full ${pnl > -0.10 ? "bg-green-500" : "bg-gray-300 dark:bg-gray-700"}`} />
    </div>
  )
}

