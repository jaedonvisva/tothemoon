import { Hono } from "hono"
import { zValidator } from "@hono/zod-validator"
import { z } from "zod"
import { getStripe, packCredits, packToPriceEnv } from "../lib/stripe.js"
import { prisma } from "../lib/prisma.js"
import { config } from "../config.js"
import { ErrorCodes, jsonError } from "../lib/errors.js"
import type { AuthVars } from "../middleware/auth.js"

const checkoutSchema = z.object({
  pack: z.enum(["10", "25", "50"]),
})

export const paymentsRoutes = new Hono<{ Variables: AuthVars }>()
  .post("/payments/checkout", zValidator("json", checkoutSchema), async (c) => {
    const stripe = getStripe()
    if (!stripe) {
      return jsonError(c, ErrorCodes.PAYMENTS_UNAVAILABLE, "Stripe not configured", 503)
    }

    const userId = c.get("userId")
    const { pack } = c.req.valid("json")
    const priceKey = packToPriceEnv[pack]
    const priceId = config[priceKey]
    if (!priceId) {
      return jsonError(c, ErrorCodes.PAYMENTS_UNAVAILABLE, "Stripe price not configured", 503)
    }

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${config.frontendUrl}/payments/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${config.frontendUrl}/payments/cancel`,
      client_reference_id: userId,
    })

    if (!session.url) {
      return jsonError(c, ErrorCodes.PAYMENTS_UNAVAILABLE, "Could not create checkout session", 503)
    }

    await prisma.payment.create({
      data: {
        userId,
        stripeSessionId: session.id,
        amountUsd: pack === "10" ? 10 : pack === "25" ? 25 : 50,
        credits: packCredits[pack],
        status: "pending",
      },
    })

    return c.json({ url: session.url })
  })
