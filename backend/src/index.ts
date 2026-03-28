import { Hono } from "hono"
import { cors } from "hono/cors"
import { upgradeWebSocket, websocket } from "hono/bun"
import { createPriceStore } from "./pyth/prices.js"
import { PythClient } from "./pyth/client.js"
import { startPositionTicker } from "./jobs/positionTicker.js"
import { authMiddleware, getPrivy, type AuthVars } from "./middleware/auth.js"
import { rateLimitMiddleware } from "./middleware/rateLimit.js"
import { spinRoutes } from "./routes/spin.js"
import { createConfirmRoutes } from "./routes/confirm.js"
import { createPositionRoutes } from "./routes/position.js"
import { balanceRoutes } from "./routes/balance.js"
import { historyRoutes } from "./routes/history.js"
import { paymentsRoutes } from "./routes/payments.js"
import { paymentsWebhookRoute } from "./routes/paymentsWebhook.js"
import { prisma } from "./lib/prisma.js"
import { ErrorCodes, jsonError } from "./lib/errors.js"
import { wsSubscribe } from "./ws/registry.js"
import { config } from "./config.js"
import { getRedis } from "./lib/redis.js"
import { scanOpenPositionIds } from "./services/positionLifecycle.js"

export const priceStore = createPriceStore()
const pythClient = new PythClient(priceStore)

type Bindings = { server: Bun.Server<undefined> }

const app = new Hono<{ Bindings: Bindings; Variables: AuthVars }>()

app.use("/*", cors({ origin: "*" }))

app.get("/", (c) =>
  c.json({
    message: "Moonshot Trading API",
    status: "online",
    price_feed_connected: priceStore.connected,
  })
)

app.get("/health", async (c) => {
  let redisOk = true
  try {
    await getRedis().ping()
  } catch {
    redisOk = false
  }
  let activePositions = 0
  if (config.databaseUrl) {
    try {
      activePositions = (await scanOpenPositionIds()).length
    } catch {
      activePositions = 0
    }
  }
  return c.json({
    status: redisOk ? "healthy" : "degraded",
    price_feed_connected: priceStore.connected,
    redis_ok: redisOk,
    active_positions: activePositions,
  })
})

app.route("/", paymentsWebhookRoute)

const authed = new Hono<{ Bindings: Bindings; Variables: AuthVars }>()
authed.use("*", authMiddleware)
authed.use("*", rateLimitMiddleware)

authed.route("/", spinRoutes)
authed.route("/", createConfirmRoutes(priceStore))
authed.route("/", createPositionRoutes(priceStore))
authed.route("/", balanceRoutes)
authed.route("/", historyRoutes)
authed.route("/", paymentsRoutes)

app.route("/", authed)

app.get(
  "/ws/position/:positionId",
  async (c, next) => {
    const upgrade = c.req.header("upgrade")
    if (!upgrade || upgrade.toLowerCase() !== "websocket") {
      return c.json({ error: "EXPECTED_WEBSOCKET", message: "WebSocket upgrade required" }, 426)
    }
    const token = c.req.query("token")
    if (!token) {
      return jsonError(c, ErrorCodes.UNAUTHORIZED, "Missing token query param", 401)
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
      const positionId = c.req.param("positionId")
      const row = await prisma.position.findFirst({
        where: { id: positionId, userId },
      })
      if (!row) {
        return jsonError(c, ErrorCodes.POSITION_NOT_FOUND, "Invalid position ID", 404)
      }
      if (row.status !== "OPEN") {
        return jsonError(
          c,
          ErrorCodes.POSITION_NOT_PENDING,
          "Position is not open for streaming",
          409
        )
      }
      c.set("userId", userId)
      c.set("wsPositionId", positionId)
      await next()
    } catch {
      return jsonError(c, ErrorCodes.UNAUTHORIZED, "Invalid token", 401)
    }
  },
  upgradeWebSocket((c) => {
    const positionId = c.get("wsPositionId") ?? c.req.param("positionId")
    let unsub: (() => void) | null = null
    return {
      onOpen(_e, ws) {
        unsub = wsSubscribe(positionId, ws)
      },
      onClose() {
        unsub?.()
      },
    }
  })
)

pythClient.start()
startPositionTicker(priceStore)

if (!config.databaseUrl) {
  console.warn("DATABASE_URL is not set; authenticated routes and Prisma will fail until it is configured.")
}

const port = config.port

const server = Bun.serve({
  port,
  fetch(req, server) {
    return app.fetch(req, { server })
  },
  websocket,
})

console.log(`Moonshot API listening on http://localhost:${port}`)

export default server
