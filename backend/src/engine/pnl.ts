export function calcDisplayScalar(displayLeverage: number, realMaxLeverage: number): number {
  return displayLeverage / realMaxLeverage
}

export function calcLiquidationThreshold(realLeverage: number): number {
  return -(1 / realLeverage)
}

export function calcPnl(
  entryPrice: number,
  currentPrice: number,
  direction: "LONG" | "SHORT",
  displayLeverage: number,
  stake: number,
  realMaxLeverage: number
): {
  realPnlPct: number
  displayPnlPct: number
  displayPnlUsd: number
  liquidated: boolean
} {
  const priceChangePct = (currentPrice - entryPrice) / entryPrice
  const directionalPct = direction === "LONG" ? priceChangePct : -priceChangePct

  const realPnlPct = directionalPct * realMaxLeverage
  const scalar = calcDisplayScalar(displayLeverage, realMaxLeverage)
  const displayPnlPctRaw = realPnlPct * scalar

  const liqThreshold = calcLiquidationThreshold(realMaxLeverage)
  const liquidated = realPnlPct <= liqThreshold

  const cappedPct = Math.max(-1, Math.min(10, displayPnlPctRaw))
  const displayPnlUsd = cappedPct * stake

  return { realPnlPct, displayPnlPct: cappedPct, displayPnlUsd, liquidated }
}

export function displayLiquidationThreshold(displayLeverage: number, realMaxLeverage: number): number {
  return calcLiquidationThreshold(realMaxLeverage) * calcDisplayScalar(displayLeverage, realMaxLeverage)
}
