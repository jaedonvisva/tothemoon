import { Hono } from "hono"
import { prisma } from "../lib/prisma.js"
import type { AuthVars } from "../middleware/auth.js"

export const balanceRoutes = new Hono<{ Variables: AuthVars }>().get("/balance", async (c) => {
  const userId = c.get("userId")
  const user = await prisma.user.findUnique({ where: { id: userId } })
  return c.json({ balance: user?.balance ?? 0 })
})
