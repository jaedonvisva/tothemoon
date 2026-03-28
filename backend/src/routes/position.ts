import { Hono } from "hono"
import { prisma } from "../lib/prisma.js"
import { ErrorCodes, jsonError } from "../lib/errors.js"
import { calcPnl, displayLiquidationThreshold } from "../engine/pnl.js"
import { config } from "../config.js"
import { readOpenState } from "../services/positionLifecycle.js"
import { getPriceForAsset } from "../pyth/prices.js"
import type { PriceStore } from "../pyth/prices.js"
import type { AssetSymbol } from "../pyth/types.js"
import type { AuthVars } from "../middleware/auth.js"

export function createPositionRoutes(priceStore: PriceStore) {
  return new Hono<{ Variables: AuthVars }>().get("/position/:positionId", async (c) => {
    const userId = c.get("userId")
    const positionId = c.req.param("positionId")

    const row = await prisma.position.findFirst({
      where: { id: positionId, userId },
    })

    if (!row) {
      return jsonError(c, ErrorCodes.POSITION_NOT_FOUND, "Invalid position ID", 404)
    }

    const displayLiq = displayLiquidationThreshold(row.displayLeverage, config.realMaxLeverage)

    if (row.status !== "OPEN" || row.entryPrice == null) {
      return c.json({
        positionId: row.id,
        status: row.status,
        asset: row.asset,
        direction: row.direction,
        displayLeverage: row.displayLeverage,
        entryPrice: row.entryPrice,
        currentPrice: row.closePrice ?? row.entryPrice,
        displayPnlPct: row.displayPnlPct ?? 0,
        displayPnlUsd: row.displayPnlUsd ?? 0,
        timeRemaining: 0,
        liquidationThreshold: displayLiq,
      })
    }

    const now = Date.now()
    const state = await readOpenState(positionId)
    const currentPrice =
      getPriceForAsset(priceStore, row.asset as AssetSymbol, now) ?? row.entryPrice

    const openedAt = state?.openedAt
      ? Date.parse(state.openedAt)
      : row.openedAt?.getTime() ?? now
    const endMs = openedAt + row.duration * 1000
    const timeRemaining = Math.max(0, Math.ceil((endMs - now) / 1000))

    const { displayPnlPct, displayPnlUsd } = calcPnl(
      row.entryPrice,
      currentPrice,
      row.direction as "LONG" | "SHORT",
      row.displayLeverage,
      row.stake,
      config.realMaxLeverage
    )

    return c.json({
      positionId: row.id,
      status: row.status,
      asset: row.asset,
      direction: row.direction,
      displayLeverage: row.displayLeverage,
      entryPrice: row.entryPrice,
      currentPrice,
      displayPnlPct,
      displayPnlUsd,
      timeRemaining,
      liquidationThreshold: displayLiq,
    })
  })
}
