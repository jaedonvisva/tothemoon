import { Hono } from "hono"
import { getStripe } from "../lib/stripe.js"
import { prisma } from "../lib/prisma.js"
import { config } from "../config.js"

/** Stripe webhook — raw body, no Privy auth. */
export const paymentsWebhookRoute = new Hono().post("/payments/webhook", async (c) => {
  const stripe = getStripe()
  if (!stripe || !config.stripeWebhookSecret) {
    return c.json({ received: false }, 503)
  }

  const signature = c.req.header("stripe-signature")
  const body = await c.req.text()

  let event: import("stripe").Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(body, signature ?? "", config.stripeWebhookSecret)
  } catch {
    return c.json({ error: "INVALID_SIGNATURE" }, 400)
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as import("stripe").Stripe.Checkout.Session
    const userId = session.client_reference_id
    const sessionId = session.id
    if (userId && sessionId) {
      const payment = await prisma.payment.findUnique({
        where: { stripeSessionId: sessionId },
      })
      if (payment && payment.status === "pending") {
        await prisma.$transaction([
          prisma.user.update({
            where: { id: userId },
            data: { balance: { increment: payment.credits } },
          }),
          prisma.payment.update({
            where: { stripeSessionId: sessionId },
            data: { status: "complete" },
          }),
        ])
      }
    }
  }

  return c.json({ received: true })
})
