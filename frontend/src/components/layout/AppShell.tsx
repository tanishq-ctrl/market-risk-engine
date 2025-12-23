import { Outlet } from "react-router-dom"
import { Topbar } from "./Topbar"
import { SidebarNav } from "./SidebarNav"
import { useState } from "react"
import { cn } from "@/lib/utils"

export function AppShell() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)

  return (
    <div className="min-h-screen bg-background relative">
      {/* Decorative background elements */}
      <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-accent/5 rounded-full blur-3xl" />
      </div>
      
      <Topbar />
      <div className="flex">
        <SidebarNav
          collapsed={sidebarCollapsed}
          onCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
        />
        <main
          className={cn(
            "flex-1 transition-all pt-16 lg:pt-0 min-h-screen",
            sidebarCollapsed ? "lg:ml-16" : "lg:ml-64"
          )}
        >
          <div className="max-w-7xl mx-auto px-6 py-8 space-y-8">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}

