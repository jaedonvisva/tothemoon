/**
 * Moonshot Bun API — uses Privy access token (Bearer / WebSocket ?token=).
 * Supabase is not used for these calls; keep identities separate.
 */

export function getMoonshotApiBase(): string {
  const base = process.env.NEXT_PUBLIC_API_URL?.trim()
  if (!base) {
    throw new Error("NEXT_PUBLIC_API_URL is not set (e.g. http://localhost:3001)")
  }
  return base.replace(/\/$/, "")
}

export function getMoonshotWsBase(): string {
  const http = getMoonshotApiBase()
  if (http.startsWith("https://")) {
    return `wss://${http.slice("https://".length)}`
  }
  if (http.startsWith("http://")) {
    return `ws://${http.slice("http://".length)}`
  }
  throw new Error("NEXT_PUBLIC_API_URL must start with http:// or https://")
}

export async function moonshotFetch(
  path: string,
  init: {
    getAccessToken: () => Promise<string | null | undefined>
    method?: string
    body?: Record<string, unknown>
  }
): Promise<Response> {
  const token = await init.getAccessToken()
  if (!token) {
    throw new Error("Sign in with Privy to call the Moonshot API")
  }
  const url = `${getMoonshotApiBase()}${path.startsWith("/") ? path : `/${path}`}`
  const headers: Record<string, string> = {
    Authorization: `Bearer ${token}`,
  }
  let body: string | undefined
  if (init.body !== undefined) {
    headers["Content-Type"] = "application/json"
    body = JSON.stringify(init.body)
  }
  return fetch(url, {
    method: init.method ?? "GET",
    headers,
    body,
  })
}

export type MoonshotWsHandlers = {
  onTick?: (data: Record<string, unknown>) => void
  onResult?: (data: Record<string, unknown>) => void
  onError?: (e: Event) => void
  onClose?: () => void
}

/** WebSocket auth: pass the same Privy access token as query param `token`. */
export function openMoonshotPositionSocket(
  positionId: string,
  token: string,
  handlers: MoonshotWsHandlers
): WebSocket {
  const wsBase = getMoonshotWsBase()
  const url = `${wsBase}/ws/position/${encodeURIComponent(positionId)}?token=${encodeURIComponent(token)}`
  const ws = new WebSocket(url)
  ws.onmessage = (ev) => {
    try {
      const data = JSON.parse(String(ev.data)) as Record<string, unknown>
      if (data.type === "tick") handlers.onTick?.(data)
      if (data.type === "result") handlers.onResult?.(data)
    } catch {
      /* ignore */
    }
  }
  ws.onerror = (e) => handlers.onError?.(e)
  ws.onclose = () => handlers.onClose?.()
  return ws
}
