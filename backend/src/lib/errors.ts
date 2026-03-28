import type { Context } from "hono"
import type { ContentfulStatusCode } from "hono/utils/http-status"

export const ErrorCodes = {
  INSUFFICIENT_BALANCE: "INSUFFICIENT_BALANCE",
  POSITION_NOT_FOUND: "POSITION_NOT_FOUND",
  POSITION_NOT_PENDING: "POSITION_NOT_PENDING",
  PRICE_UNAVAILABLE: "PRICE_UNAVAILABLE",
  UNAUTHORIZED: "UNAUTHORIZED",
  INVALID_STAKE: "INVALID_STAKE",
  INVALID_PACK: "INVALID_PACK",
  PAYMENTS_UNAVAILABLE: "PAYMENTS_UNAVAILABLE",
} as const

export function jsonError(
  c: Context,
  code: string,
  message: string,
  status: ContentfulStatusCode
) {
  return c.json({ error: code, message }, status)
}
