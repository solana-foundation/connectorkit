import type { Address, Instruction, Lamports } from '@solana/kit'

export interface SwapQuote {
  provider: string
  inputMint: Address
  outputMint: Address
  inputAmount: Lamports
  outputAmount: Lamports
  priceImpact: number
  fees: Lamports
  route?: any // Provider-specific route data
  // Optional: surface provider-computed effective slippage (bps)
  effectiveSlippageBps?: number
}

export interface SwapParams {
  inputMint: Address
  outputMint: Address
  amount: Lamports
  slippageBps?: number
}

export interface SwapProvider {
  name: string
  quote(params: SwapParams): Promise<SwapQuote>
  build(params: { quote: SwapQuote; userPublicKey: string; capabilities?: { walletSupportsVersioned?: boolean } }): Promise<SwapBuild>
  isTokenSupported(mint: Address): boolean
}

export interface Provider {
  swap?: SwapProvider[]
  // Future: lending, staking, etc.
}

export function createProvider(config: Partial<Provider>): Provider {
  return {
    swap: config.swap || [],
    ...config
  }
}

// ===== Extended types for prebuilt transactions (provider-friendly) =====

export interface PrebuiltTransaction {
  wireTransaction: Uint8Array
}

export type SwapBuild =
  | { kind: 'instructions'; instructions: Instruction[] }
  | { kind: 'prebuilt'; transaction: PrebuiltTransaction }
