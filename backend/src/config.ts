function num(env: string | undefined, fallback: number): number {
  if (env === undefined || env === "") return fallback
  const n = Number(env)
  return Number.isFinite(n) ? n : fallback
}

export const config = {
  port: num(process.env.PORT, 3001),
  nodeEnv: process.env.NODE_ENV ?? "development",
  databaseUrl: process.env.DATABASE_URL ?? "",
  redisUrl: process.env.REDIS_URL ?? "redis://localhost:6379",
  privyAppId: process.env.PRIVY_APP_ID ?? "",
  privyAppSecret: process.env.PRIVY_APP_SECRET ?? "",
  stripeSecretKey: process.env.STRIPE_SECRET_KEY ?? "",
  stripeWebhookSecret: process.env.STRIPE_WEBHOOK_SECRET ?? "",
  stripePriceId10: process.env.STRIPE_PRICE_ID_10 ?? "",
  stripePriceId25: process.env.STRIPE_PRICE_ID_25 ?? "",
  stripePriceId50: process.env.STRIPE_PRICE_ID_50 ?? "",
  frontendUrl: process.env.FRONTEND_URL ?? "http://localhost:3000",
  pythWsUrl: process.env.PYTH_WS_URL ?? "wss://hermes.pyth.network/ws",
  startingBalance: num(process.env.STARTING_BALANCE, 1000),
  realMaxLeverage: num(process.env.REAL_MAX_LEVERAGE, 50),
  pendingConfirmSeconds: 30,
}
