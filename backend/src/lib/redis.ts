import Redis from "ioredis"
import { config } from "../config.js"

const globalForRedis = globalThis as unknown as { redis: Redis | undefined }

export function getRedis(): Redis {
  if (!globalForRedis.redis) {
    globalForRedis.redis = new Redis(config.redisUrl, {
      maxRetriesPerRequest: 3,
      lazyConnect: true,
    })
  }
  return globalForRedis.redis
}

export const redisKeys = {
  pending: (positionId: string) => `pending:${positionId}`,
  positionOpen: (positionId: string) => `positions:open:${positionId}`,
  positionState: (positionId: string) => `position:${positionId}`,
}

export const PENDING_TTL_SEC = 30
export const OPEN_TTL_BUFFER_SEC = 5
