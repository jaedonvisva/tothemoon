import { Hono } from "hono"
import { zValidator } from "@hono/zod-validator"
import { z } from "zod"
import { generateSpin } from "../engine/spin.js"
import { prisma } from "../lib/prisma.js"
import { ErrorCodes, jsonError } from "../lib/errors.js"
import { setPendingRedis } from "../services/positionLifecycle.js"
import { config } from "../config.js"
import type { AuthVars } from "../middleware/auth.js"

const bodySchema = z.object({
  stake: z.number(),
})

export const spinRoutes = new Hono<{ Variables: AuthVars }>().post(
  "/spin",
  zValidator("json", bodySchema),
  async (c) => {
    const userId = c.get("userId")
    const { stake } = c.req.valid("json")

    if (!Number.isFinite(stake) || stake <= 0) {
      return jsonError(c, ErrorCodes.INVALID_STAKE, "Stake must be a positive number", 400)
    }

    const spin = generateSpin()
    const expiresAt = new Date(Date.now() + config.pendingConfirmSeconds * 1000)

    const user = await prisma.user.findUnique({ where: { id: userId } })
    if (!user || user.balance < stake) {
      return jsonError(
        c,
        ErrorCodes.INSUFFICIENT_BALANCE,
        "Balance too low to place this stake",
        400
      )
    }

    const position = await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: userId },
        data: { balance: { decrement: stake } },
      })
      return tx.position.create({
        data: {
          userId,
          asset: spin.asset,
          direction: spin.direction,
          displayLeverage: spin.displayLeverage,
          realLeverage: config.realMaxLeverage,
          duration: spin.duration,
          stake,
          status: "PENDING",
          expiresAt,
        },
      })
    })

    await setPendingRedis(position.id)

    return c.json({
      positionId: position.id,
      asset: spin.asset,
      direction: spin.direction,
      displayLeverage: spin.displayLeverage,
      duration: spin.duration,
      stake,
      expiresAt: expiresAt.toISOString(),
    })
  }
)
