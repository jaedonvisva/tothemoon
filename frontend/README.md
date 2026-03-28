# Moonshot frontend (Next.js)

## Path A: Privy + Bun API

The **game API** uses **Privy** (`NEXT_PUBLIC_PRIVY_APP_ID`) and the Bun backend (`NEXT_PUBLIC_API_URL`).  
**Supabase Auth is not used** for those calls. Supabase in this repo is optional (e.g. `todos` demo on `/` and/or hosting Postgres via the backend’s `DATABASE_URL`).

## Setup

```bash
cp .env.example .env.local
```

Fill in:

| Variable | Purpose |
|----------|---------|
| `NEXT_PUBLIC_API_URL` | Bun API, e.g. `http://localhost:3001` |
| `NEXT_PUBLIC_PRIVY_APP_ID` | Same app id as backend `PRIVY_APP_ID` |
| `NEXT_PUBLIC_SUPABASE_*` | Only if you use the home-page Supabase demo |

Privy dashboard: add **allowed origin** `http://localhost:3000` (and production URL later).

```bash
npm install
npm run dev
```

- **/** — Supabase `todos` demo (optional)
- **/game** — Moonshot API smoke test (balance, spin, WebSocket). This route **skips** Supabase middleware so session refresh does not apply there.

## Production

- Set `NEXT_PUBLIC_API_URL` to your **public HTTPS** API URL (WebSocket will use `wss:`).
- Redeploy backend with `FRONTEND_URL` matching this Next app’s origin (Stripe redirects).
- Register Stripe webhook: `POST /payments/webhook` on the API host (see [backend README](../backend/README.md)).

## Learn More

- [Next.js Documentation](https://nextjs.org/docs)
- [Privy React](https://docs.privy.io)
