import type { AssetSymbol } from "../pyth/types.js"

export type Direction = "LONG" | "SHORT"

export type OpenPositionRedisState = {
  userId: string
  entryPrice: number
  asset: AssetSymbol
  direction: Direction
  displayLeverage: number
  realLeverage: number
  duration: number
  stake: number
  openedAt: string
}
