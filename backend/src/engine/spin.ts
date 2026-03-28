import { randomItem } from "./utils.js"

export const ASSETS = ["BTC", "ETH", "SOL"] as const
export const DIRECTIONS = ["LONG", "SHORT"] as const
export const DISPLAY_LEVERAGES = [1500, 2000, 2500, 5000, 10000] as const
export const DURATIONS = [15, 20, 25, 30, 35, 40, 45] as const

export type SpinResult = {
  asset: (typeof ASSETS)[number]
  direction: (typeof DIRECTIONS)[number]
  displayLeverage: (typeof DISPLAY_LEVERAGES)[number]
  duration: (typeof DURATIONS)[number]
}

export function generateSpin(): SpinResult {
  return {
    asset: randomItem(ASSETS),
    direction: randomItem(DIRECTIONS),
    displayLeverage: randomItem(DISPLAY_LEVERAGES),
    duration: randomItem(DURATIONS),
  }
}
