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
  onCollapse?: () => void
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
        <nav className="flex flex-col gap-2 p-4">
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
                    <Icon className={cn(
                      "h-5 w-5 relative z-10 transition-transform group-hover:scale-110",
                      isActive && "drop-shadow-lg"
                    )} />
                    {!collapsed && (
                      <span className="relative z-10 font-semibold">{item.label}</span>
                    )}
                  </>
                )}
              </NavLink>
            )
          })}
        </nav>
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

