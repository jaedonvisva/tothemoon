import { config } from "../config.js"
import type { AssetSymbol } from "./types.js"
import type { PriceStore } from "./prices.js"

export const FEED_IDS: Record<AssetSymbol, string> = {
  BTC: "e62df6c8b4a85fe1a67db44dc12de5db330f7ac66b72dc658afedf0f4a415b43",
  ETH: "ff61491a931112ddf1bd8147cd1b641375f79f5825126d665480874634fd0ace",
  SOL: "ef0d8b6fda2ceba41da15d4095d1da392a0d2f8ed0c6c7bc0f4cfac8c280b56d",
}

const ID_TO_ASSET = new Map<string, AssetSymbol>(
  (Object.entries(FEED_IDS) as [AssetSymbol, string][]).map(([a, id]) => [id, a])
)

function parsePrice(priceStr: string, expo: number): number {
  return Number(priceStr) * 10 ** expo
}

export class PythClient {
  private ws: WebSocket | null = null
  private reconnectAttempt = 0
  private running = false
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null

  constructor(private readonly store: PriceStore) {}

  start(): void {
    this.running = true
    this.connect()
  }

  stop(): void {
    this.running = false
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer)
      this.reconnectTimer = null
    }
    this.ws?.close()
    this.ws = null
    this.store.connected = false
  }

  private backoffMs(): number {
    const base = 1000 * 2 ** Math.min(this.reconnectAttempt, 6)
    const jitter = Math.random() * 400
    return Math.min(base + jitter, 60_000)
  }

  private connect(): void {
    if (!this.running) return
    try {
      const ws = new WebSocket(config.pythWsUrl)
      this.ws = ws

      ws.addEventListener("open", () => {
        this.reconnectAttempt = 0
        this.store.connected = true
        const msg = {
          ids: Object.values(FEED_IDS),
          type: "subscribe",
          verbose: true,
        }
        ws.send(JSON.stringify(msg))
      })

      ws.addEventListener("message", (ev) => {
        try {
          const data = JSON.parse(String(ev.data)) as {
            type?: string
            price_feed?: { id?: string; price?: { price?: string; expo?: number } }
          }
          if (data.type !== "price_update" || !data.price_feed?.id) return
          const asset = ID_TO_ASSET.get(data.price_feed.id)
          if (!asset || !data.price_feed.price) return
          const { price: priceStr, expo } = data.price_feed.price
          if (priceStr === undefined || expo === undefined) return
          this.store[asset] = parsePrice(String(priceStr), expo)
          this.store.lastUpdated = Date.now()
        } catch {
          /* ignore malformed */
        }
      })

      ws.addEventListener("close", () => {
        this.store.connected = false
        this.scheduleReconnect()
      })

      ws.addEventListener("error", () => {
        this.store.connected = false
        ws.close()
      })
    } catch {
      this.store.connected = false
      this.scheduleReconnect()
    }
  }

  private scheduleReconnect(): void {
    if (!this.running) return
    if (this.reconnectTimer) return
    this.reconnectAttempt += 1
    const delay = this.backoffMs()
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null
      this.connect()
    }, delay)
  }
}
