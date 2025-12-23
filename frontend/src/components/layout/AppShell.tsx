import { Outlet } from "react-router-dom"
import { Topbar } from "./Topbar"
import { SidebarNav } from "./SidebarNav"
import { useEffect, useState } from "react"
import { cn } from "@/lib/utils"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { optIn } from "@/lib/api"
import { useToast } from "@/components/ui/toast"

export function AppShell() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [showOptIn, setShowOptIn] = useState(false)
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const { addToast } = useToast()

  useEffect(() => {
    const dismissed = localStorage.getItem("market-risk-optin-dismissed")
    if (!dismissed) {
      // Slight delay so the shell renders first
      const timer = setTimeout(() => setShowOptIn(true), 800)
      return () => clearTimeout(timer)
    }
  }, [])

  const handleSubmitOptIn = async (e: React.FormEvent) => {
    e.preventDefault()
    const trimmedName = name.trim()
    const trimmedEmail = email.trim()

    const payload = {
      name: trimmedName || "Anonymous",
      email: trimmedEmail,
      capturedAt: new Date().toISOString(),
    }

    // Store locally for your own reference
    localStorage.setItem("market-risk-optin", JSON.stringify(payload))
    localStorage.setItem("market-risk-optin-dismissed", "true")

    try {
      const res = await optIn({ name: payload.name, email: payload.email })
      addToast({
        title: res.success ? "Thanks for subscribing" : "Saved locally",
        description: res.message,
      })
    } catch (error: any) {
      addToast({
        title: "Saved locally",
        description: "We could not reach the opt-in service, but you can continue using the app.",
      })
    }

    setShowOptIn(false)
  }

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

      {/* Opt-in modal (one-time, theme-aware) */}
      <Dialog open={showOptIn} onOpenChange={setShowOptIn}>
        <DialogContent className="border border-primary/10 bg-gradient-to-b from-background to-background/95 shadow-2xl">
          <DialogHeader>
            <DialogTitle className="flex flex-col gap-1">
              <span className="text-sm font-medium uppercase tracking-[0.18em] text-primary/80">
                Market Risk Engine
              </span>
              <span className="text-xl font-semibold">
                Stay in the loop as the engine evolves
              </span>
            </DialogTitle>
            <DialogDescription>
              Share your name and email if you’d like occasional updates about new scenarios,
              analytics, and deployment links. No spam, just product updates.
            </DialogDescription>
          </DialogHeader>
          <form className="space-y-4 mt-2" onSubmit={handleSubmitOptIn}>
            <div className="space-y-1.5">
              <label htmlFor="optin-name" className="text-sm font-medium">
                Name
              </label>
              <Input
                id="optin-name"
                placeholder="Jane Doe"
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoComplete="name"
              />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="optin-email" className="text-sm font-medium">
                Email
              </label>
              <Input
                id="optin-email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                required
              />
            </div>
            <div className="flex flex-col sm:flex-row gap-3 pt-4 justify-end items-center">
              <Button type="submit" disabled={!email.trim()}>
                Keep me updated
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}

