import type { AssetSymbol } from "./types.js"

export type PriceStore = {
  BTC: number | null
  ETH: number | null
  SOL: number | null
  lastUpdated: number | null
  connected: boolean
}

export function createPriceStore(): PriceStore {
  return {
    BTC: null,
    ETH: null,
    SOL: null,
    lastUpdated: null,
    connected: false,
  }
}

/** Simulated mid prices when disconnected (USD). */
const SIM_BASE: Record<AssetSymbol, number> = {
  BTC: 95000,
  ETH: 3400,
  SOL: 180,
}

export function getSimulatedPrice(store: PriceStore, asset: AssetSymbol, now: number): number {
  const seed = Math.floor(now / 200)
  const wobble = Math.sin(seed * 0.13 + (asset === "BTC" ? 1 : asset === "ETH" ? 2 : 3)) * 0.002
  const last = store[asset]
  const base = last ?? SIM_BASE[asset]
  return base * (1 + wobble)
}

export function getPriceForAsset(
  store: PriceStore,
  asset: AssetSymbol,
  now: number
): number | null {
  if (store.connected) {
    const p = store[asset]
    return p
  }
  return getSimulatedPrice(store, asset, now)
}
