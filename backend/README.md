# Moonshot backend (Bun + Hono)

Gamified trading API: spin → confirm → live Pyth prices, Redis-backed open positions, Postgres history, **Privy** auth, Stripe top-ups.

## Requirements

- [Bun](https://bun.sh) 1.x
- PostgreSQL (e.g. **Supabase** — use as DB host only; app auth is Privy)
- Redis

## Supabase Postgres + Prisma

1. Supabase → **Project Settings → Database** → copy the **direct** Postgres URI (host `db.<project>.supabase.co`, port **5432**). Add `?sslmode=require` if connections fail.
2. Set **`DATABASE_URL`** in `.env` (see [`.env.example`](.env.example)). One variable is enough for this schema; use a direct connection (not the transaction pooler) so `prisma migrate deploy` works reliably.
3. Run migrations:

```bash
npx prisma migrate deploy
npx prisma generate
```

4. In Supabase **Table Editor**, confirm tables **`User`**, **`Position`**, **`Payment`** exist after migrate.

## Local Postgres + Redis (optional)

**Using Supabase for Postgres?** You do **not** need Docker for the database—only a **`REDIS_URL`**.

### Redis without Docker (macOS)

```bash
brew install redis
brew services start redis
# In .env:
REDIS_URL="redis://localhost:6379"
```

Or use a free **[Upstash](https://upstash.com)** Redis URL and paste it into **`REDIS_URL`**.

### Docker Compose (only if Docker is installed)

If `docker: command not found`, install **[Docker Desktop](https://www.docker.com/products/docker-desktop/)** (or another Docker engine), then:

```bash
docker compose up -d
# Postgres + Redis on localhost — set DATABASE_URL to postgresql://moonshot:moonshot@localhost:5432/moonshot
# and REDIS_URL to redis://localhost:6379
```

If you see **`unknown shorthand flag: 'd' in -d`**, the Compose **V2 plugin** is missing or `docker` is not Docker Engine. Try:

1. **Docker Desktop (Mac):** open the app, wait until it says “running”, then run `docker compose version`. If that fails, reinstall/enable Compose from Docker Desktop settings.
2. **Legacy CLI (hyphen):** `docker-compose up -d` — install with `brew install docker-compose` if needed.
3. **Skip Docker:** use Supabase for Postgres and **Homebrew or Upstash** for Redis (see above)—no compose required.

## Redis + Privy

1. Set **`REDIS_URL`** (Homebrew/Upstash local Redis, Docker compose, Railway, etc.—see above).
2. [Privy dashboard](https://dashboard.privy.io) → your app → copy **`PRIVY_APP_ID`** and **`PRIVY_APP_SECRET`** into `.env`.
3. In Privy → **App settings → Allowed domains / origins**, add your frontend origin (e.g. `http://localhost:3000` and production URL).

## Setup

```bash
cp .env.example .env
# Fill DATABASE_URL, REDIS_URL, PRIVY_*, optional STRIPE_*

bun install
npx prisma migrate deploy
npx prisma generate
```

## Run

```bash
bun run dev
```

Default API URL in `.env.example` is **`http://localhost:3001`** (`PORT=3001`) so Next.js can use **3000**. Override with `PORT`.

## API (see repo root `moonshot-backend-plan.md`)

| Method | Path | Auth |
|--------|------|------|
| GET | `/`, `/health` | No |
| POST | `/payments/webhook` | Stripe signature |
| POST | `/spin` | Bearer |
| POST | `/confirm/:positionId` | Bearer |
| GET | `/position/:positionId` | Bearer |
| WS | `/ws/position/:positionId?token=...` | Query token |
| GET | `/balance` | Bearer |
| GET | `/history` | Bearer |
| POST | `/payments/checkout` | Bearer |

## Stripe (production)

1. Set `STRIPE_SECRET_KEY`, price IDs, and `STRIPE_WEBHOOK_SECRET`.
2. Point Stripe webhook to **`https://<your-api-host>/payments/webhook`** (events: `checkout.session.completed`).
3. Set **`FRONTEND_URL`** to your Next.js origin (success/cancel redirects).

## Scripts

- `bun run dev` — hot reload
- `bun run start` — production-style start
- `bun test` — engine unit tests
- `npx prisma migrate dev` — create migrations in development

## Deploy checklist

- Bun API + **Redis** + Postgres (**Supabase `DATABASE_URL`**).
- CI: set `DATABASE_URL` when running `prisma migrate deploy`.
- Privy allowed origins = production frontend URL.
- Frontend `NEXT_PUBLIC_API_URL` = public API HTTPS URL.

## Legacy Python prototype

The previous FastAPI implementation lives in `_legacy_python/` for reference only.
