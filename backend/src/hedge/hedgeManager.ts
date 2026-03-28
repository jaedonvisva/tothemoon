import { getRedis } from "../lib/redis.js"
import { config } from "../config.js"
import { calcNetExposure } from "./exposure.js"
import { openHedgePosition, closeHedgePosition } from "./aster.js"
import type { HedgeAsset } from "./aster.js"
import type { PriceStore } from "../pyth/prices.js"
import { getPriceForAsset } from "../pyth/prices.js"
import type { AssetSymbol } from "../pyth/types.js"

const HEDGE_KEY = (asset: string) => `hedge:position:${asset}`

interface HedgeState {
  direction: "LONG" | "SHORT"
  notionalUsd: number
  sizeCoin: number
  entryPrice: number
  asset: string
  openedAt: string
}

async function getHedgeState(asset: string): Promise<HedgeState | null> {
  const raw = await getRedis().get(HEDGE_KEY(asset))
  if (!raw) return null
  try { return JSON.parse(raw) as HedgeState } catch { return null }
}

async function saveHedgeState(asset: string, state: HedgeState): Promise<void> {
  await getRedis().set(HEDGE_KEY(asset), JSON.stringify(state))
}

async function clearHedgeState(asset: string): Promise<void> {
  await getRedis().del(HEDGE_KEY(asset))
}

/**
 * Reconcile: compare net user exposure vs current hedge position and rebalance if needed.
 * Called every 30 seconds by hedgeTicker, and after every position open/close.
 *
 * Rebalances when:
 *   - Direction flipped
 *   - Size drifted >20% from target
 *   - Exposure dropped below hedgeMinSizeUsd
 */
export async function reconcile(priceStore: PriceStore): Promise<void> {
  const exposure = await calcNetExposure()
  const now = Date.now()

  for (const [asset, netUsd] of Object.entries(exposure)) {
    const price = getPriceForAsset(priceStore, asset as AssetSymbol, now)
    if (!price) {
      console.warn(`[hedge] no price for ${asset}, skipping reconcile`)
      continue
    }

    const existing = await getHedgeState(asset)
    const absExposure = Math.abs(netUsd)

    // Exposure too small — close any existing hedge
    if (absExposure < config.hedgeMinSizeUsd) {
      if (existing) {
        await closeHedgePosition(asset as HedgeAsset, existing.direction)
        await clearHedgeState(asset)
        console.log(`[hedge] closed ${asset} hedge (exposure $${absExposure.toFixed(2)} below threshold)`)
      }
      continue
    }

    const targetDirection = netUsd > 0 ? "LONG" : "SHORT"
    const sizeDrift = existing ? Math.abs(existing.notionalUsd - absExposure) / absExposure : 1
    const needsReset = !existing || existing.direction !== targetDirection || sizeDrift > 0.20

    if (!needsReset) continue

    // Close existing position before opening new one
    if (existing) {
      console.log(`[hedge] rebalancing ${asset}: dir=${existing.direction}→${targetDirection} drift=${(sizeDrift * 100).toFixed(0)}%`)
      await closeHedgePosition(asset as HedgeAsset, existing.direction)
      await clearHedgeState(asset)
    }

    const result = await openHedgePosition(asset as HedgeAsset, targetDirection, absExposure, price)

    const hedgeState: HedgeState = {
      direction: targetDirection,
      notionalUsd: absExposure,
      sizeCoin: result.sizeCoin,
      entryPrice: result.entryPrice,
      asset,
      openedAt: new Date().toISOString(),
    }
    await saveHedgeState(asset, hedgeState)
  }

  // Close hedges for assets that no longer have any user exposure
  for (const asset of ["BTC", "ETH", "SOL"]) {
    if (exposure[asset] !== undefined) continue
    const existing = await getHedgeState(asset)
    if (existing) {
      await closeHedgePosition(asset as HedgeAsset, existing.direction)
      await clearHedgeState(asset)
      console.log(`[hedge] closed ${asset} hedge (no open user positions)`)
    }
  }
}
