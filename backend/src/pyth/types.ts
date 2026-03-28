export type AssetSymbol = "BTC" | "ETH" | "SOL"

export type PythPriceMessage = {
  type?: string
  price_feed?: {
    id?: string
    price?: {
      price?: string
      expo?: number
    }
  }
}
