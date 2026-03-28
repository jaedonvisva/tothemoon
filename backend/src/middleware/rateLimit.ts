import { createMiddleware } from "hono/factory"
import type { AuthVars } from "./auth.js"

const WINDOW_MS = 60_000
const MAX_PER_WINDOW = 120

const buckets = new Map<string, { count: number; reset: number }>()

export const rateLimitMiddleware = createMiddleware<{ Variables: AuthVars }>(async (c, next) => {
  const userId = c.get("userId")
  const now = Date.now()
  let b = buckets.get(userId)
  if (!b || now > b.reset) {
    b = { count: 0, reset: now + WINDOW_MS }
    buckets.set(userId, b)
  }
  b.count += 1
  if (b.count > MAX_PER_WINDOW) {
    return c.json({ error: "RATE_LIMITED", message: "Too many requests" }, 429)
  }
  await next()
})
