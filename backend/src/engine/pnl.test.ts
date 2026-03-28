import { describe, expect, test } from "bun:test"
import { calcLiquidationThreshold, calcPnl, calcDisplayScalar, displayLiquidationThreshold } from "./pnl.js"

describe("pnl", () => {
  const realMax = 50

  test("liquidation threshold", () => {
    expect(calcLiquidationThreshold(50)).toBeCloseTo(-0.02)
  })

  test("display scalar", () => {
    expect(calcDisplayScalar(2500, 50)).toBe(50)
  })

  test("display liq at 2500 display", () => {
    expect(displayLiquidationThreshold(2500, 50)).toBeCloseTo(-1)
  })

  test("long profit when price up", () => {
    const r = calcPnl(100, 101, "LONG", 2500, 25, realMax)
    expect(r.realPnlPct).toBeGreaterThan(0)
    expect(r.liquidated).toBe(false)
  })

  test("caps display pct", () => {
    const r = calcPnl(100, 200, "LONG", 10000, 10, realMax)
    expect(r.displayPnlPct).toBeLessThanOrEqual(10)
  })
})
