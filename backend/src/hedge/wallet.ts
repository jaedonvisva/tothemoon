import { privateKeyToAccount } from "viem/accounts"
import { config } from "../config.js"

/** Returns the viem account derived from HEDGE_WALLET_PRIVATE_KEY. */
export function getAccount() {
  if (!config.hedgeWalletPrivateKey) throw new Error("HEDGE_WALLET_PRIVATE_KEY not set in .env")
  return privateKeyToAccount(config.hedgeWalletPrivateKey as `0x${string}`)
}
