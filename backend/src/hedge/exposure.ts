import { scanOpenPositionIds, readOpenState } from "../services/positionLifecycle.js"
import { config } from "../config.js"

/**
 * Calculates the house's net USD exposure per asset across all currently OPEN user positions.
 *
 * Convention:
 *   positive netUsd → users are net LONG that asset → house is net short → hedge with LONG
 *   negative netUsd → users are net SHORT that asset → house is net long → hedge with SHORT
 *
 * SOL is excluded — PancakeSwap perps does not list SOL.
 */
export async function calcNetExposure(): Promise<Record<string, number>> {
  const ids = await scanOpenPositionIds()
  const exposure: Record<string, number> = {}

  for (const id of ids) {
    const state = await readOpenState(id)
    if (!state) continue
    if (state.asset === "SOL") continue // not hedgeable on PancakeSwap perps

    const directionMultiplier = state.direction === "LONG" ? 1 : -1
    // Notional USD = credits × creditUsdRate × realLeverage
    const notionalUsd = state.stake * config.creditUsdRate * state.realLeverage
    exposure[state.asset] = (exposure[state.asset] ?? 0) + directionMultiplier * notionalUsd
  }

  return exposure
}
