import type { LucideProps } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"

interface EmptyStateProps {
  icon?: React.ComponentType<LucideProps>
  title: string
  description?: string
  actionLabel?: string
  onAction?: () => void
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  actionLabel,
  onAction,
}: EmptyStateProps) {
  return (
    <Card>
      <CardContent className="flex flex-col items-center justify-center py-12">
        {Icon && <Icon className="h-12 w-12 text-muted-foreground mb-4" />}
        <h3 className="text-base font-semibold mb-1">{title}</h3>
        {description && (
          <p className="text-sm text-muted-foreground text-center mb-4 max-w-sm">
            {description}
          </p>
        )}
        {actionLabel && onAction && (
          <Button onClick={onAction} variant="outline">
            {actionLabel}
          </Button>
        )}
      </CardContent>
    </Card>
  )
}

