import { createBrowserRouter } from "react-router-dom"
import { AppShell } from "@/components/layout/AppShell"
import { Portfolio } from "@/pages/Portfolio"
import { MarketData } from "@/pages/MarketData"
import { RiskMetrics } from "@/pages/RiskMetrics"
import { VaR } from "@/pages/VaR"
import { StressTests } from "@/pages/StressTests"
import { Backtesting } from "@/pages/Backtesting"
import { Export } from "@/pages/Export"

export const router = createBrowserRouter(
  [
    {
      path: "/",
      element: <AppShell />,
      children: [
        { index: true, element: <Portfolio /> },
        { path: "portfolio", element: <Portfolio /> },
        { path: "market-data", element: <MarketData /> },
        { path: "risk-metrics", element: <RiskMetrics /> },
        { path: "var", element: <VaR /> },
        { path: "stress-tests", element: <StressTests /> },
        { path: "backtesting", element: <Backtesting /> },
        { path: "export", element: <Export /> },
      ],
    },
  ],
  {
    // Use Vite's BASE_URL ("/" locally, "/market-risk-engine/" on GitHub Pages)
    basename: import.meta.env.BASE_URL,
  }
)

