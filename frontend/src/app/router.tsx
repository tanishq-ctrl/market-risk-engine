import { createHashRouter } from "react-router-dom"
import { AppShell } from "@/components/layout/AppShell"
import { Portfolio } from "@/pages/Portfolio"
import { MarketData } from "@/pages/MarketData"
import { RiskMetrics } from "@/pages/RiskMetrics"
import { VaR } from "@/pages/VaR"
import { StressTests } from "@/pages/StressTests"
import { Backtesting } from "@/pages/Backtesting"
import { Export } from "@/pages/Export"

// Use hash-based routing to work reliably on GitHub Pages and other static hosts
export const router = createHashRouter(
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
  ]
)

