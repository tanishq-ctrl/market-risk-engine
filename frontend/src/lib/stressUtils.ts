import {
  PREDEFINED_SCENARIOS,
  HISTORICAL_SCENARIOS,
  MULTI_FACTOR_SCENARIOS,
  HISTORICAL_UNIFORM_SHOCKS,
} from "@/lib/constants"

const scenarioLabelLookup = [
  ...PREDEFINED_SCENARIOS,
  ...HISTORICAL_SCENARIOS,
  ...MULTI_FACTOR_SCENARIOS,
]

export function getScenarioLabel(scenarioKey: string): string {
  const found = scenarioLabelLookup.find((s: any) => s.value === scenarioKey)
  if (found) return found.label
  if (scenarioKey === "CUSTOM") return "Custom"
  if (scenarioKey?.startsWith("EQUITY_")) return scenarioKey.replace("EQUITY_", "Equity ")
  return scenarioKey
}

export function isUniformScenario(key: string | undefined | null): boolean {
  if (!key) return false
  if (key.startsWith("EQUITY_")) return true
  if (HISTORICAL_UNIFORM_SHOCKS[key] !== undefined) return true
  return false
}


