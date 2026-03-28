import type { PriceStore } from "../pyth/prices.js"
import {
  closePositionFromTicker,
  expirePendingPositions,
  readOpenState,
  resolveCurrentPrice,
  scanOpenPositionIds,
  tickOpenPosition,
} from "../services/positionLifecycle.js"
import { wsBroadcast } from "../ws/registry.js"
import { config } from "../config.js"

const TICK_MS = 200

export function startPositionTicker(priceStore: PriceStore): ReturnType<typeof setInterval> {
  return setInterval(() => {
    void runTick(priceStore)
  }, TICK_MS)
}

async function runTick(priceStore: PriceStore): Promise<void> {
  if (!config.databaseUrl) return
  try {
    await expirePendingPositions()
    const now = Date.now()
    const ids = await scanOpenPositionIds()
    for (const id of ids) {
      const state = await readOpenState(id)
      if (!state) continue
      const price = resolveCurrentPrice(priceStore, state.asset, now)
      if (price == null) continue
      const out = tickOpenPosition(id, state, price, now)
      if (out.shouldClose) {
        await closePositionFromTicker(id, price, out.reason)
      } else {
        wsBroadcast(id, out.tick)
      }
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    console.error("positionTicker error:", msg)
  }
}
