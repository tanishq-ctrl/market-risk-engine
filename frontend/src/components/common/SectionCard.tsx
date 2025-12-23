import { ReactNode } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"

interface SectionCardProps {
  title: string
  description?: string
  children: ReactNode
  controls?: ReactNode
  actions?: ReactNode
  className?: string
}

export function SectionCard({
  title,
  description,
  children,
  controls,
  actions,
  className,
}: SectionCardProps) {
  return (
    <Card className={cn("animate-fade-in", className)}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <span className="w-1 h-6 bg-gradient-to-b from-primary to-accent rounded-full"></span>
              {title}
            </CardTitle>
            {description && (
              <p className="text-sm text-muted-foreground mt-2 ml-3">{description}</p>
            )}
          </div>
          {(controls || actions) && <div>{controls || actions}</div>}
        </div>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  )
}

