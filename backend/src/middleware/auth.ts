import { createMiddleware } from "hono/factory"
import { PrivyClient } from "@privy-io/server-auth"
import { config } from "../config.js"
import { prisma } from "../lib/prisma.js"
import { ErrorCodes, jsonError } from "../lib/errors.js"

export type AuthVars = { userId: string; wsPositionId?: string }

let privyClient: PrivyClient | null = null

export function getPrivy(): PrivyClient | null {
  if (!config.privyAppId || !config.privyAppSecret) return null
  if (!privyClient) privyClient = new PrivyClient(config.privyAppId, config.privyAppSecret)
  return privyClient
}

export const authMiddleware = createMiddleware<{ Variables: AuthVars }>(async (c, next) => {
  const auth = c.req.header("authorization")
  const token = auth?.startsWith("Bearer ") ? auth.slice(7).trim() : null
  if (!token) {
    return jsonError(c, ErrorCodes.UNAUTHORIZED, "Missing bearer token", 401)
  }

  const client = getPrivy()
  if (!client) {
    return jsonError(c, ErrorCodes.UNAUTHORIZED, "Auth not configured", 401)
  }

  try {
    const claims = await client.verifyAuthToken(token)
    const userId = claims.userId
    if (!userId) {
      return jsonError(c, ErrorCodes.UNAUTHORIZED, "Invalid token", 401)
    }

    await prisma.user.upsert({
      where: { id: userId },
      create: { id: userId, balance: config.startingBalance },
      update: {},
    })

    c.set("userId", userId)
    await next()
  } catch {
    return jsonError(c, ErrorCodes.UNAUTHORIZED, "Invalid token", 401)
  }
})
