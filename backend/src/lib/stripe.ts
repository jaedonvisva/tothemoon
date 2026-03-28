import Stripe from "stripe"
import { config } from "../config.js"

let stripeInstance: Stripe | null = null

export function getStripe(): Stripe | null {
  if (!config.stripeSecretKey) return null
  if (!stripeInstance) {
    stripeInstance = new Stripe(config.stripeSecretKey)
  }
  return stripeInstance
}

export const packToPriceEnv: Record<string, keyof Pick<typeof config, "stripePriceId10" | "stripePriceId25" | "stripePriceId50">> =
  {
    "10": "stripePriceId10",
    "25": "stripePriceId25",
    "50": "stripePriceId50",
  }

/** Credits granted per pack (after bonus). */
export const packCredits: Record<string, number> = {
  "10": 10,
  "25": 30,
  "50": 75,
}
