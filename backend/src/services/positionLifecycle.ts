import type { AssetSymbol } from "../pyth/types.js"
import type { OpenPositionRedisState } from "../engine/types.js"
import { prisma } from "../lib/prisma.js"
import { getRedis, redisKeys, OPEN_TTL_BUFFER_SEC, PENDING_TTL_SEC } from "../lib/redis.js"
import { config } from "../config.js"
import { calcPnl } from "../engine/pnl.js"
import { getPriceForAsset } from "../pyth/prices.js"
import type { PriceStore } from "../pyth/prices.js"
import { wsBroadcast } from "../ws/registry.js"
import { reconcile } from "../hedge/hedgeManager.js"

// priceStore reference set by index.ts after initialisation
let _hedgePriceStore: PriceStore | null = null
export function setHedgePriceStore(store: PriceStore): void {
  _hedgePriceStore = store
}

function triggerHedgeReconcile(): void {
  if (!config.hedgeEnabled || !_hedgePriceStore) return
  void reconcile(_hedgePriceStore).catch(e => {
    console.error("[hedge] reconcile error:", e instanceof Error ? e.message : e)
  })
}

export async function persistOpenState(
  positionId: string,
  state: OpenPositionRedisState,
  durationSec: number
): Promise<void> {
  const redis = getRedis()
  const ttl = durationSec + OPEN_TTL_BUFFER_SEC
  const payload = JSON.stringify(state)
  await redis.setex(redisKeys.positionState(positionId), ttl, payload)
  await redis.setex(redisKeys.positionOpen(positionId), ttl, "1")
}

export async function readOpenState(positionId: string): Promise<OpenPositionRedisState | null> {
  const raw = await getRedis().get(redisKeys.positionState(positionId))
  if (!raw) return null
  try {
    return JSON.parse(raw) as OpenPositionRedisState
  } catch {
    return null
  }
}

export async function clearOpenKeys(positionId: string): Promise<void> {
  const redis = getRedis()
  await redis.del(redisKeys.positionState(positionId), redisKeys.positionOpen(positionId))
}

export async function setPendingRedis(positionId: string): Promise<void> {
  await getRedis().setex(redisKeys.pending(positionId), PENDING_TTL_SEC, "1")
}

export async function deletePendingRedis(positionId: string): Promise<void> {
  await getRedis().del(redisKeys.pending(positionId))
}

/** Confirm spin: OPEN position, lock entry, Redis state. */
export async function openPositionConfirmed(
  positionId: string,
  userId: string,
  entryPrice: number
): Promise<{ openedAt: Date; closesAt: Date } | null> {
  const row = await prisma.position.findFirst({
    where: { id: positionId, userId, status: "PENDING" },
  })
  if (!row) return null
  if (row.expiresAt && row.expiresAt < new Date()) return null

  const openedAt = new Date()
  const closesAt = new Date(openedAt.getTime() + row.duration * 1000)

  const state: OpenPositionRedisState = {
    userId,
    entryPrice,
    asset: row.asset as AssetSymbol,
    direction: row.direction as OpenPositionRedisState["direction"],
    displayLeverage: row.displayLeverage,
    realLeverage: row.realLeverage,
    duration: row.duration,
    stake: row.stake,
    openedAt: openedAt.toISOString(),
  }

  await prisma.position.update({
    where: { id: positionId },
    data: {
      status: "OPEN",
      entryPrice,
      openedAt,
    },
  })

  await deletePendingRedis(positionId)
  await persistOpenState(positionId, state, row.duration)

  triggerHedgeReconcile()

  return { openedAt, closesAt }
}

export async function expirePendingPositions(): Promise<void> {
  const now = new Date()
  const stale = await prisma.position.findMany({
    where: { status: "PENDING", expiresAt: { lt: now } },
  })
  for (const p of stale) {
    await prisma.$transaction([
      prisma.user.update({
        where: { id: p.userId },
        data: { balance: { increment: p.stake } },
      }),
      prisma.position.update({
        where: { id: p.id },
        data: { status: "CANCELLED", closedAt: now },
      }),
    ])
    await deletePendingRedis(p.id)
  }
}

type CloseReason = "EXPIRED" | "LIQUIDATED"

export async function closePositionFromTicker(
  positionId: string,
  closePrice: number,
  reason: CloseReason
): Promise<void> {
  const row = await prisma.position.findUnique({ where: { id: positionId } })
  if (!row || row.status !== "OPEN") return

  const state = await readOpenState(positionId)
  if (!state) {
    if (row.entryPrice == null) return
    await reconcileOrphanOpen(row, closePrice, reason)
    return
  }

  const { realPnlPct, displayPnlPct, displayPnlUsd, liquidated } = calcPnl(
    state.entryPrice,
    closePrice,
    state.direction,
    state.displayLeverage,
    state.stake,
    config.realMaxLeverage
  )

  const isLiq = reason === "LIQUIDATED" || liquidated
  const finalStatus = isLiq
    ? "LIQUIDATED"
    : displayPnlUsd > 0
      ? "CLOSED_WIN"
      : "CLOSED_LOSS"

  const balanceDelta = isLiq ? 0 : state.stake + displayPnlUsd

  const user = await prisma.user.findUnique({ where: { id: state.userId } })
  const newBalance = (user?.balance ?? 0) + balanceDelta

  await prisma.$transaction([
    prisma.user.update({
      where: { id: state.userId },
      data: { balance: { increment: balanceDelta } },
    }),
    prisma.position.update({
      where: { id: positionId },
      data: {
        status: finalStatus,
        closePrice,
        closedAt: new Date(),
        realPnlPct,
        displayPnlPct,
        displayPnlUsd,
        liquidated: isLiq,
      },
    }),
  ])

  await clearOpenKeys(positionId)

  wsBroadcast(positionId, {
    type: "result",
    status: finalStatus,
    closePrice,
    displayPnlPct,
    displayPnlUsd: isLiq ? -state.stake : displayPnlUsd,
    newBalance,
  })

  triggerHedgeReconcile()
}

async function reconcileOrphanOpen(
  row: {
    id: string
    userId: string
    stake: number
    entryPrice: number | null
    asset: string
    direction: string
    displayLeverage: number
    realLeverage: number
  },
  closePrice: number,
  reason: CloseReason
): Promise<void> {
  const entry = row.entryPrice
  if (entry == null) return

  const { realPnlPct, displayPnlPct, displayPnlUsd, liquidated } = calcPnl(
    entry,
    closePrice,
    row.direction as "LONG" | "SHORT",
    row.displayLeverage,
    row.stake,
    config.realMaxLeverage
  )

  const isLiq = reason === "LIQUIDATED" || liquidated
  const finalStatus = isLiq
    ? "LIQUIDATED"
    : displayPnlUsd > 0
      ? "CLOSED_WIN"
      : "CLOSED_LOSS"
  const balanceDelta = isLiq ? 0 : row.stake + displayPnlUsd

  const user = await prisma.user.findUnique({ where: { id: row.userId } })
  const newBalance = (user?.balance ?? 0) + balanceDelta

  await prisma.$transaction([
    prisma.user.update({
      where: { id: row.userId },
      data: { balance: { increment: balanceDelta } },
    }),
    prisma.position.update({
      where: { id: row.id },
      data: {
        status: finalStatus,
        closePrice,
        closedAt: new Date(),
        realPnlPct,
        displayPnlPct,
        displayPnlUsd,
        liquidated: isLiq,
      },
    }),
  ])

  await clearOpenKeys(row.id)

  wsBroadcast(row.id, {
    type: "result",
    status: finalStatus,
    closePrice,
    displayPnlPct,
    displayPnlUsd: isLiq ? -row.stake : displayPnlUsd,
    newBalance,
  })
}

export async function scanOpenPositionIds(): Promise<string[]> {
  const redis = getRedis()
  const ids: string[] = []
  let cursor = "0"
  do {
    const [next, keys] = await redis.scan(cursor, "MATCH", "positions:open:*", "COUNT", 128)
    cursor = next
    for (const k of keys) {
      const id = k.startsWith("positions:open:") ? k.slice("positions:open:".length) : k
      if (id) ids.push(id)
    }
  } while (cursor !== "0")
  return ids
}

export function tickOpenPosition(
  _positionId: string,
  state: OpenPositionRedisState,
  currentPrice: number,
  now: number
): { shouldClose: false; tick: object } | { shouldClose: true; reason: CloseReason } {
  const openedMs = Date.parse(state.openedAt)
  const endMs = openedMs + state.duration * 1000

  const { realPnlPct, displayPnlPct, displayPnlUsd, liquidated } = calcPnl(
    state.entryPrice,
    currentPrice,
    state.direction,
    state.displayLeverage,
    state.stake,
    config.realMaxLeverage
  )

  const liqThreshold = -1 / config.realMaxLeverage
  if (realPnlPct <= liqThreshold || liquidated) {
    return { shouldClose: true, reason: "LIQUIDATED" }
  }

  if (now >= endMs) {
    return { shouldClose: true, reason: "EXPIRED" }
  }

  const timeRemaining = Math.max(0, (endMs - now) / 1000)

  return {
    shouldClose: false,
    tick: {
      type: "tick",
      currentPrice,
      displayPnlPct,
      displayPnlUsd,
      timeRemaining,
    },
  }
}

export function resolveCurrentPrice(
  priceStore: PriceStore,
  asset: string,
  now: number
): number | null {
  const sym = asset as AssetSymbol
  return getPriceForAsset(priceStore, sym, now)
}
