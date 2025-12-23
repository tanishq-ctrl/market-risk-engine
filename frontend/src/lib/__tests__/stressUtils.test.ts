import { describe, it, expect } from "vitest"
import { getScenarioLabel, isUniformScenario } from "@/lib/stressUtils"

describe("getScenarioLabel", () => {
  it("maps equity scenarios", () => {
    expect(getScenarioLabel("EQUITY_-10")).toContain("Equity")
  })
  it("maps historical", () => {
    expect(getScenarioLabel("COVID_CRASH")).toContain("COVID")
  })
  it("maps multi-factor", () => {
    expect(getScenarioLabel("STAGFLATION")).toContain("Stagflation")
  })
  it("handles custom", () => {
    expect(getScenarioLabel("CUSTOM")).toBe("Custom")
  })
})

describe("isUniformScenario", () => {
  it("true for equity", () => {
    expect(isUniformScenario("EQUITY_-5")).toBe(true)
  })
  it("true for historical", () => {
    expect(isUniformScenario("COVID_CRASH")).toBe(true)
  })
  it("false for multifactor", () => {
    expect(isUniformScenario("STAGFLATION")).toBe(false)
  })
})


