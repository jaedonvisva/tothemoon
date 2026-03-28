/**
 * Position lifecycle (authoritative logic in `services/positionLifecycle.ts`):
 * PENDING → user spun, stake held, must confirm within 30s or CANCELLED + refund
 * OPEN → confirmed, entry locked, ticker monitors until EXPIRED or LIQUIDATED
 * CLOSED_WIN | CLOSED_LOSS | LIQUIDATED | CANCELLED → terminal
 */
export type { OpenPositionRedisState } from "./types.js"
