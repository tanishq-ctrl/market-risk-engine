import { NavLink } from "react-router-dom"
import { Briefcase, TrendingUp, BarChart3, AlertTriangle, TestTube, History, Download, Menu, X } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { useState } from "react"

const navItems = [
  { path: "/portfolio", label: "Portfolio", icon: Briefcase },
  { path: "/market-data", label: "Market Data", icon: TrendingUp },
  { path: "/risk-metrics", label: "Risk Metrics", icon: BarChart3 },
  { path: "/var", label: "VaR / CVaR", icon: AlertTriangle },
  { path: "/stress-tests", label: "Stress Tests", icon: TestTube },
  { path: "/backtesting", label: "Backtesting", icon: History },
  { path: "/export", label: "Export", icon: Download },
]

interface SidebarNavProps {
  collapsed?: boolean
}

export function SidebarNav({ collapsed = false }: SidebarNavProps) {
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <>
      {/* Mobile menu button */}
      <div className="lg:hidden fixed top-14 left-0 right-0 z-40 border-b bg-background px-4 py-2">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setMobileOpen(!mobileOpen)}
        >
          {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </Button>
      </div>

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed left-0 top-16 z-30 h-[calc(100vh-4rem)] border-r bg-background/50 backdrop-blur-xl transition-all",
          collapsed ? "w-16" : "w-64",
          "lg:block",
          mobileOpen ? "block" : "hidden"
        )}
      >
        <div className="flex h-full flex-col justify-between">
          <nav className="flex flex-col gap-2 p-4 pb-6">
            {navItems.map((item) => {
              const Icon = item.icon
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  onClick={() => setMobileOpen(false)}
                  className={({ isActive }) =>
                    cn(
                      "group flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-all duration-200 relative overflow-hidden",
                      isActive
                        ? "bg-gradient-to-r from-primary to-accent text-primary-foreground shadow-lg scale-105"
                        : "text-muted-foreground hover:text-foreground hover:bg-accent/50 hover:scale-102"
                    )
                  }
                >
                  {({ isActive }) => (
                    <>
                      {isActive && (
                        <span className="absolute inset-0 bg-gradient-to-r from-primary/20 to-accent/20 blur-xl" />
                      )}
                      <Icon
                        className={cn(
                          "h-5 w-5 relative z-10 transition-transform group-hover:scale-110",
                          isActive && "drop-shadow-lg"
                        )}
                      />
                      {!collapsed && (
                        <span className="relative z-10 font-semibold">
                          {item.label}
                        </span>
                      )}
                    </>
                  )}
                </NavLink>
              )
            })}
          </nav>

          {!collapsed && (
            <div className="border-t border-border/60 px-4 py-4 text-xs text-muted-foreground/90 space-y-2">
              <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-primary/80">
                Support this engine
              </div>
              <p className="text-[11px] leading-snug">
                If the Market Risk Engine is helpful in your work or learning, a star or small sponsorship
                helps keep the scenarios, analytics, and docs evolving.
              </p>
              <div className="flex flex-wrap gap-2">
                <Button
                  asChild
                  size="sm"
                  className="h-8 px-3 text-[11px] bg-primary/90 text-primary-foreground hover:bg-primary"
                >
                  <a
                    href="https://github.com/tanishq-ctrl/market-risk-engine"
                    target="_blank"
                    rel="noreferrer"
                  >
                    ⭐ Star on GitHub
                  </a>
                </Button>
                <Button
                  asChild
                  size="sm"
                  variant="outline"
                  className="h-8 px-3 text-[11px] border-amber-400/70 text-amber-400 hover:bg-amber-400/10 hover:border-amber-400"
                >
                  <a
                    href="https://github.com/sponsors/tanishq-ctrl"
                    target="_blank"
                    rel="noreferrer"
                  >
                    💛 Sponsor development
                  </a>
                </Button>
              </div>
            </div>
          )}
        </div>
      </aside>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/50 z-20"
          onClick={() => setMobileOpen(false)}
        />
      )}
    </>
  )
}

