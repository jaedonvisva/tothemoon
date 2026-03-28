/**
 * ApolloX V2 / Aster Finance perpetual futures contracts on BNB Chain (BSC).
 * Powers PancakeSwap Perpetuals V2.
 *
 * Contract: https://bscscan.com/address/0x1b6f2d3844c6ae7d56ceb3c3643b9060ba28feb0
 * Uses Diamond Proxy pattern (EIP-2535).
 */

export const TRADING_CONTRACT = "0x1b6f2d3844c6ae7d56ceb3c3643b9060ba28feb0" as const

export const USDT_BSC = "0x55d398326f99059ff775485246999027b3197955" as const // 18 decimals

/**
 * pairBase = the base token address for each trading pair.
 * SOL is intentionally omitted — not listed on PancakeSwap perps.
 */
export const PAIR_BASE: Record<string, `0x${string}`> = {
  BTC: "0x7130d2a12b9bcbfae4f2634d864a1ee1ce3ead9c", // BTCB on BSC
  ETH: "0x2170ed0880ac9a755fd29b2688956bd959f933f8", // ETH on BSC
  BNB: "0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c", // WBNB
}

/**
 * Decimal scaling:
 *   amountIn (USDT margin)  → 1e18
 *   qty (position size)     → 1e10 (base asset units)
 *   price                   → 1e8  (USD)
 */
export const TRADING_ABI = [
  {
    // USDT collateral version — struct uses packed uint types (verified from BscScan calldata)
    name: "openMarketTrade",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      {
        name: "data",
        type: "tuple",
        components: [
          { name: "pairBase",    type: "address" },
          { name: "isLong",      type: "bool" },
          { name: "tokenIn",     type: "address" },
          { name: "amountIn",    type: "uint96" },  // USDT margin, 1e18 (fits in uint96)
          { name: "qty",         type: "uint80" },  // base asset size, 1e10
          { name: "price",       type: "uint64" },  // worst acceptable price, 1e8
          { name: "stopLoss",    type: "uint64" },  // 0 = disabled
          { name: "takeProfit",  type: "uint64" },  // 0 = disabled
          { name: "broker",      type: "uint24" },  // 0 = no broker
        ],
      },
    ],
    outputs: [],
  },
  {
    name: "closeTrade",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [{ name: "tradeHash", type: "bytes32" }],
    outputs: [],
  },
] as const

export const ERC20_ABI = [
  {
    name: "approve",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "spender", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [{ name: "", type: "bool" }],
  },
  {
    name: "balanceOf",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    name: "allowance",
    type: "function",
    stateMutability: "view",
    inputs: [
      { name: "owner", type: "address" },
      { name: "spender", type: "address" },
    ],
    outputs: [{ name: "", type: "uint256" }],
  },
] as const

/**
 * OpenMarketTrade event emitted by the contract on position open.
 * The first indexed topic after the event signature is the tradeHash.
 */
export const OPEN_TRADE_EVENT_TOPIC =
  "0x" + "OpenMarketTrade(bytes32,address,address,bool,address,uint256,uint256,uint256,uint256,uint256)".split("").reduce(
    // placeholder — replace with keccak256 of actual event signature from BscScan
    (a, c) => a, ""
  )
