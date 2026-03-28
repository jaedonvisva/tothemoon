import { Hono } from "hono"
import { prisma } from "../lib/prisma.js"
import { ErrorCodes, jsonError } from "../lib/errors.js"
import { calcLiquidationThreshold, displayLiquidationThreshold } from "../engine/pnl.js"
import { openPositionConfirmed } from "../services/positionLifecycle.js"
import { config } from "../config.js"
import type { AuthVars } from "../middleware/auth.js"
import type { AssetSymbol } from "../pyth/types.js"
import type { PriceStore } from "../pyth/prices.js"
import { getSimulatedPrice } from "../pyth/prices.js"

function requirePriceWhenConnected(store: PriceStore, asset: string): number | null {
  const sym = asset as AssetSymbol
  if (store.connected) {
    const p = store[sym]
    return p ?? null
  }
  // disconnected: simulation still returns a number from caller
  return store[sym] ?? null
}

export function createConfirmRoutes(priceStore: PriceStore) {
  return new Hono<{ Variables: AuthVars }>().post("/confirm/:positionId", async (c) => {
    const userId = c.get("userId")
    const positionId = c.req.param("positionId")

    const row = await prisma.position.findFirst({
      where: { id: positionId, userId },
    })

    if (!row) {
      return jsonError(c, ErrorCodes.POSITION_NOT_FOUND, "Invalid position ID", 404)
    }

    if (row.status !== "PENDING") {
      return jsonError(
        c,
        ErrorCodes.POSITION_NOT_PENDING,
        "Already confirmed or expired",
        409
      )
    }

    if (row.expiresAt && row.expiresAt < new Date()) {
      return jsonError(
        c,
        ErrorCodes.POSITION_NOT_PENDING,
        "Already confirmed or expired",
        409
      )
    }

    let entryPrice = requirePriceWhenConnected(priceStore, row.asset)
    if (entryPrice == null && !priceStore.connected) {
      entryPrice = getSimulatedPrice(priceStore, row.asset as AssetSymbol, Date.now())
    }

    if (entryPrice == null) {
      return jsonError(
        c,
        ErrorCodes.PRICE_UNAVAILABLE,
        "Price feed unavailable for this asset",
        503
      )
    }

    const opened = await openPositionConfirmed(positionId, userId, entryPrice)
    if (!opened) {
      return jsonError(
        c,
        ErrorCodes.POSITION_NOT_PENDING,
        "Already confirmed or expired",
        409
      )
    }

    const liq = calcLiquidationThreshold(config.realMaxLeverage)
    const displayLiq = displayLiquidationThreshold(row.displayLeverage, config.realMaxLeverage)

    return c.json({
      positionId,
      entryPrice,
      openedAt: opened.openedAt.toISOString(),
      closesAt: opened.closesAt.toISOString(),
      liquidationThreshold: liq,
      displayLiqThreshold: displayLiq,
    })
  })
}
