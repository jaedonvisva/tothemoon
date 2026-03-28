import type { PriceStore } from "../pyth/prices.js"
import { reconcile } from "./hedgeManager.js"
import { config } from "../config.js"

const HEDGE_TICK_MS = 30_000 // 30 seconds

export function startHedgeTicker(priceStore: PriceStore): ReturnType<typeof setInterval> {
  return setInterval(() => {
    void runHedgeTick(priceStore)
  }, HEDGE_TICK_MS)
}

async function runHedgeTick(priceStore: PriceStore): Promise<void> {
  if (!config.hedgeEnabled) return
  try {
    await reconcile(priceStore)
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    console.error("[hedge] ticker error:", msg)
  }
}
