import { Hono } from "hono"
import { prisma } from "../lib/prisma.js"
import type { AuthVars } from "../middleware/auth.js"

export const historyRoutes = new Hono<{ Variables: AuthVars }>().get("/history", async (c) => {
  const userId = c.get("userId")
  const trades = await prisma.position.findMany({
    where: {
      userId,
      status: { in: ["CLOSED_WIN", "CLOSED_LOSS", "LIQUIDATED"] },
    },
    orderBy: { closedAt: "desc" },
    take: 200,
  })

  const totalTrades = trades.length
  const wins = trades.filter((t) => t.status === "CLOSED_WIN").length
  const winRate = totalTrades ? wins / totalTrades : 0
  const totalPnlUsd = trades.reduce((s, t) => s + (t.displayPnlUsd ?? 0), 0)

  return c.json({
    trades: trades.map((t) => ({
      id: t.id,
      asset: t.asset,
      direction: t.direction,
      displayLeverage: t.displayLeverage,
      stake: t.stake,
      displayPnlUsd: t.displayPnlUsd ?? 0,
      displayPnlPct: t.displayPnlPct ?? 0,
      status: t.status,
      duration: t.duration,
      closedAt: t.closedAt?.toISOString() ?? null,
    })),
    stats: {
      totalTrades,
      winRate,
      totalPnlUsd,
    },
  })
})
