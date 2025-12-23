import { Moon, Sun, User, Github, Linkedin } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useTheme } from "@/app/providers"

export function Topbar() {
  const { theme, toggleTheme } = useTheme()

  return (
    <div className="sticky top-0 z-50 border-b bg-background/80 backdrop-blur-xl supports-[backdrop-filter]:bg-background/60 shadow-sm">
      <div className="flex h-16 items-center px-6">
        <div className="flex items-center gap-4 flex-1">
          <h2 className="text-xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            Market Risk Engine
          </h2>
          <Badge 
            variant="outline" 
            className="bg-primary/10 text-primary border-primary/20 font-medium"
          >
            Local
          </Badge>
        </div>
        <div className="flex items-center gap-4">
          <div className="hidden md:flex flex-col items-end gap-1 text-xs text-muted-foreground">
            <div className="flex items-center gap-2">
              <span className="uppercase tracking-wide text-[11px] text-muted-foreground/80">
                Built by
              </span>
              <span className="font-semibold text-foreground">Tanishq Prabhu</span>
              <div className="flex items-center gap-2">
                <a
                  href="https://github.com/tanishq-ctrl/market-risk-engine"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center justify-center h-8 w-8 rounded-full border border-border bg-muted/60 text-foreground hover:bg-muted/80 hover:border-primary/50 transition-colors"
                  aria-label="GitHub repository - Market Risk Engine"
                >
                  <Github className="h-4 w-4" />
                </a>
                <a
                  href="https://www.linkedin.com/in/tanishq-prabhu-b71467166/"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center justify-center h-8 w-8 rounded-full border border-border bg-muted/60 text-foreground hover:bg-accent/15 hover:border-accent/50 transition-colors"
                  aria-label="LinkedIn - Tanishq Prabhu"
                >
                  <Linkedin className="h-4 w-4" />
                </a>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-muted-foreground/80">
                If this engine is helpful, please consider leaving a star on the GitHub repo.
              </span>
              <a
                href="https://github.com/tanishq-ctrl/market-risk-engine"
                target="_blank"
                rel="noreferrer"
                className="rounded-full border border-primary/40 bg-primary/5 px-3 py-1 text-[11px] font-medium text-primary hover:bg-primary/10 hover:border-primary/60 transition-colors"
              >
                ⭐ Star the project
              </a>
              <a
                href="https://github.com/sponsors/tanishq-ctrl"
                target="_blank"
                rel="noreferrer"
                className="rounded-full border border-amber-400/40 bg-amber-400/5 px-3 py-1 text-[11px] font-medium text-amber-500 hover:bg-amber-400/10 hover:border-amber-400/60 transition-colors"
              >
                ❤️ Support development
              </a>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleTheme}
            aria-label="Toggle theme"
            className="hover:bg-primary/10 hover:text-primary transition-all"
          >
            {theme === "dark" ? (
              <Sun className="h-5 w-5" />
            ) : (
              <Moon className="h-5 w-5" />
            )}
          </Button>
          <div className="h-8 w-8 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center cursor-pointer hover:shadow-glow transition-shadow">
            <User className="h-4 w-4 text-white" />
          </div>
        </div>
      </div>
    </div>
  )
}

