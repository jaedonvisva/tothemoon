/**
 * Phase 1 validation script — opens and closes a minimal BTC LONG on Hyperliquid.
 *
 * Requirements:
 *   1. HEDGE_WALLET_PRIVATE_KEY set in .env
 *   2. At least $15 USDC deposited on Hyperliquid (app.hyperliquid.xyz → deposit)
 *
 * Run: bun run hedge:test
 *
 * $0.50 margin × 40x (BTC max) = $20 notional — above Hyperliquid's ~$10.25 minimum.
 */

import { HttpTransport, InfoClient, ExchangeClient } from "@nktkas/hyperliquid"
import { privateKeyToAccount } from "viem/accounts"
import { config } from "../config.js"

const TEST_MARGIN_USD = 0.50
const BTC_ASSET_IDX = 0
const BTC_MAX_LEVERAGE = 40

async function main() {
  console.log("=== Moonshot Hedge — Hyperliquid Test Trade ===\n")

  if (!config.hedgeWalletPrivateKey) {
    console.error("ERROR: HEDGE_WALLET_PRIVATE_KEY is not set in .env")
    process.exit(1)
  }

  const wallet = privateKeyToAccount(config.hedgeWalletPrivateKey as `0x${string}`)
  console.log(`Wallet:    ${wallet.address}`)
  console.log(`Explorer:  https://app.hyperliquid.xyz/portfolio/${wallet.address}\n`)

  const transport = new HttpTransport()
  const info = new InfoClient({ transport })
  const exchange = new ExchangeClient({ transport, wallet })

  // Get current USDC balance
  const state = await info.clearinghouseState({ user: wallet.address })
  const balance = Number(state.marginSummary.accountValue)
  console.log(`USDC balance (Hyperliquid): $${balance.toFixed(2)}\n`)

  if (balance < 5) {
    console.error(`ERROR: Need at least $5 USDC on Hyperliquid.`)
    console.error(`  1. Go to https://app.hyperliquid.xyz`)
    console.error(`  2. Connect wallet ${wallet.address}`)
    console.error(`  3. Deposit USDC`)
    process.exit(1)
  }

  // Get BTC mid price
  const mids = await info.allMids() as Record<string, string>
  const btcPrice = Number(mids["BTC"])
  if (!btcPrice) {
    console.error("ERROR: Could not fetch BTC mid price from Hyperliquid")
    process.exit(1)
  }
  console.log(`BTC mid price: $${btcPrice.toLocaleString()}\n`)

  const notionalUsd = TEST_MARGIN_USD * BTC_MAX_LEVERAGE
  const sizeBtc = notionalUsd / btcPrice
  const limitBuyPrice = btcPrice * 1.01  // 1% above mid for IOC fill

  console.log("Opening LONG BTC position:")
  console.log(`  Margin:    $${TEST_MARGIN_USD.toFixed(2)} USDC`)
  console.log(`  Leverage:  ${BTC_MAX_LEVERAGE}x`)
  console.log(`  Notional:  $${notionalUsd.toFixed(2)}`)
  console.log(`  Size:      ${sizeBtc.toFixed(6)} BTC`)
  console.log(`  Limit px:  $${limitBuyPrice.toLocaleString(undefined, { maximumFractionDigits: 1 })}\n`)

  const openResult = await exchange.order({
    orders: [{
      a: BTC_ASSET_IDX,
      b: true,                                           // buy (long)
      p: limitBuyPrice.toFixed(1),
      s: sizeBtc.toFixed(6),
      r: false,
      t: { limit: { tif: "Ioc" } },
    }],
    grouping: "na",
  })

  console.log("Open order result:", JSON.stringify(openResult, null, 2))

  // Verify position opened
  const stateAfter = await info.clearinghouseState({ user: wallet.address })
  const btcPos = stateAfter.assetPositions.find(p => p.position.coin === "BTC")

  if (!btcPos || Number(btcPos.position.szi) === 0) {
    console.error("\nERROR: Position did not open. Check result above for details.")
    console.error("Common causes: insufficient margin, price moved too fast, or position too small.")
    process.exit(1)
  }

  const openSzi = Number(btcPos.position.szi)
  const openEntry = Number(btcPos.position.entryPx)
  console.log(`\n✓ Position opened!`)
  console.log(`  Size:       ${openSzi.toFixed(6)} BTC`)
  console.log(`  Entry:      $${openEntry.toLocaleString()}`)
  console.log(`  Unrealized: $${Number(btcPos.position.unrealizedPnl).toFixed(4)}`)

  console.log("\nWaiting 5 seconds before closing...")
  await new Promise(r => setTimeout(r, 5_000))

  // Close with reduce-only IOC
  const closeLimitPrice = btcPrice * 0.99  // 1% below mid
  const closeSize = Math.abs(openSzi)

  console.log(`\nClosing position (size=${closeSize.toFixed(6)} BTC, limit=$${closeLimitPrice.toFixed(1)})...`)

  const closeResult = await exchange.order({
    orders: [{
      a: BTC_ASSET_IDX,
      b: false,                                          // sell (close long)
      p: closeLimitPrice.toFixed(1),
      s: closeSize.toFixed(6),
      r: true,                                           // reduce-only
      t: { limit: { tif: "Ioc" } },
    }],
    grouping: "na",
  })

  console.log("Close order result:", JSON.stringify(closeResult, null, 2))

  const stateFinal = await info.clearinghouseState({ user: wallet.address })
  const btcPosFinal = stateFinal.assetPositions.find(p => p.position.coin === "BTC")
  const balanceFinal = Number(stateFinal.marginSummary.accountValue)

  if (!btcPosFinal || Number(btcPosFinal.position.szi) === 0) {
    console.log(`\n✓ Position closed!`)
  } else {
    console.log(`\n⚠ Position may still be open (szi=${btcPosFinal.position.szi}) — check Hyperliquid UI`)
  }

  console.log(`\nFinal balance: $${balanceFinal.toFixed(4)} USDC`)
  console.log(`Net P&L:       $${(balanceFinal - balance).toFixed(4)} USDC (fees + price move)`)
}

main().catch(e => {
  console.error("\nTest failed:", e instanceof Error ? e.message : e)
  process.exit(1)
})
