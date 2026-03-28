/**
 * Hyperliquid perps integration — replaces the old ApolloX/PancakeSwap implementation.
 *
 * Hyperliquid uses its own L1. No gas fees. Same ETH private key works.
 * Fund via: https://app.hyperliquid.xyz (deposit USDC)
 *
 * Asset indices: BTC=0, ETH=1, SOL=4
 * Max leverage:  BTC=40x, ETH=25x, SOL=20x
 * Min notional:  ~$10.25 USDC per position
 * Orders:        IOC limit orders simulate market orders (price 1% slippage)
 */

import { HttpTransport, InfoClient, ExchangeClient } from "@nktkas/hyperliquid"
import { privateKeyToAccount } from "viem/accounts"
import { config } from "../config.js"

export type HedgeAsset = "BTC" | "ETH" | "SOL"
export type HedgeDirection = "LONG" | "SHORT"

export interface OpenHedgeResult {
  asset: HedgeAsset
  direction: HedgeDirection
  notionalUsd: number
  marginUsd: number
  sizeCoin: number   // base asset units actually opened (from position, or estimated)
  entryPrice: number
}

/** Hyperliquid asset index for each supported asset. */
const ASSET_INDEX: Record<HedgeAsset, number> = {
  BTC: 0,
  ETH: 1,
  SOL: 4,
}

/** Max leverage per asset (Hyperliquid limits). */
export const MAX_LEVERAGE: Record<HedgeAsset, number> = {
  BTC: 40,
  ETH: 25,
  SOL: 20,
}

function getWallet() {
  if (!config.hedgeWalletPrivateKey) throw new Error("HEDGE_WALLET_PRIVATE_KEY not set in .env")
  return privateKeyToAccount(config.hedgeWalletPrivateKey as `0x${string}`)
}

function getClients() {
  const transport = new HttpTransport()
  const wallet = getWallet()
  const exchange = new ExchangeClient({ transport, wallet })
  const info = new InfoClient({ transport })
  return { exchange, info, wallet }
}

/**
 * Open a market perp position on Hyperliquid via IOC limit order.
 * Price is set 1% above (LONG) or below (SHORT) mid to ensure fill.
 */
export async function openHedgePosition(
  asset: HedgeAsset,
  direction: HedgeDirection,
  notionalUsd: number,
  currentAssetPrice: number
): Promise<OpenHedgeResult> {
  const { exchange } = getClients()

  const assetIdx = ASSET_INDEX[asset]
  const isBuy = direction === "LONG"
  const leverage = Math.min(config.hedgeLeverage, MAX_LEVERAGE[asset])
  const marginUsd = notionalUsd / leverage

  // Size in base asset units
  const sizeCoin = notionalUsd / currentAssetPrice

  // Slippage: LONG buys at 1% above market, SHORT sells at 1% below
  const slippage = isBuy ? 1.01 : 0.99
  const limitPrice = currentAssetPrice * slippage

  // Hyperliquid prices/sizes as strings with appropriate decimal precision
  const priceStr = limitPrice.toFixed(asset === "BTC" ? 1 : asset === "ETH" ? 2 : 4)
  const sizeStr = sizeCoin.toFixed(asset === "BTC" ? 6 : asset === "ETH" ? 4 : 2)

  console.log(`[hedge] opening ${direction} ${asset}: notional=$${notionalUsd.toFixed(2)} margin=$${marginUsd.toFixed(2)} size=${sizeStr} price=${priceStr}`)

  const result = await exchange.order({
    orders: [{
      a: assetIdx,
      b: isBuy,
      p: priceStr,
      s: sizeStr,
      r: false,
      t: { limit: { tif: "Ioc" } },
    }],
    grouping: "na",
  })

  console.log(`[hedge] order result: ${JSON.stringify(result)}`)

  const filled = (result as any)?.response?.data?.statuses?.[0]
  const filledSize = filled?.filled?.totalSz ? Number(filled.filled.totalSz) : Number(sizeStr)
  const filledPrice = filled?.filled?.avgPx ? Number(filled.filled.avgPx) : limitPrice

  return {
    asset,
    direction,
    notionalUsd,
    marginUsd,
    sizeCoin: filledSize,
    entryPrice: filledPrice,
  }
}

/**
 * Close the hedge position for an asset by placing a reduce-only IOC order
 * in the opposite direction for the current open size.
 */
export async function closeHedgePosition(asset: HedgeAsset, direction: HedgeDirection): Promise<void> {
  const { exchange, info, wallet } = getClients()

  const assetIdx = ASSET_INDEX[asset]

  // Get current position size from Hyperliquid
  const state = await info.clearinghouseState({ user: wallet.address })
  const pos = state.assetPositions.find(p => p.position.coin === asset)

  if (!pos || Number(pos.position.szi) === 0) {
    console.log(`[hedge] no open ${asset} position to close`)
    return
  }

  const currentSzi = Number(pos.position.szi)
  const absSize = Math.abs(currentSzi)
  const isCurrentLong = currentSzi > 0

  // Close by selling if long, buying if short
  const closeIsBuy = !isCurrentLong
  const currentMidRaw = Number(pos.position.entryPx)

  // Use a wide slippage for the close IOC to ensure fill
  const closePriceSlip = closeIsBuy ? 1.05 : 0.95
  const closePrice = currentMidRaw * closePriceSlip

  const priceStr = closePrice.toFixed(asset === "BTC" ? 1 : asset === "ETH" ? 2 : 4)
  const sizeStr = absSize.toFixed(asset === "BTC" ? 6 : asset === "ETH" ? 4 : 2)

  console.log(`[hedge] closing ${asset}: size=${sizeStr} closePrice=${priceStr}`)

  const result = await exchange.order({
    orders: [{
      a: assetIdx,
      b: closeIsBuy,
      p: priceStr,
      s: sizeStr,
      r: true,   // reduce-only
      t: { limit: { tif: "Ioc" } },
    }],
    grouping: "na",
  })

  console.log(`[hedge] close result: ${JSON.stringify(result)}`)
}

/** USDC balance in the Hyperliquid account (USD). */
export async function getUsdcBalance(): Promise<number> {
  const { info, wallet } = getClients()
  const state = await info.clearinghouseState({ user: wallet.address })
  return Number(state.marginSummary.accountValue)
}

/** Get all open Hyperliquid perp positions. */
export async function getOpenPositions() {
  const { info, wallet } = getClients()
  const state = await info.clearinghouseState({ user: wallet.address })
  return state.assetPositions.filter(p => Number(p.position.szi) !== 0)
}

/** Current mid price for an asset from Hyperliquid. */
export async function getMidPrice(asset: HedgeAsset): Promise<number> {
  const { info } = getClients()
  const mids = await info.allMids()
  const price = (mids as Record<string, string>)[asset]
  if (!price) throw new Error(`No mid price for ${asset}`)
  return Number(price)
}
