/**
 * @connector-kit/solana/client - Server-side Client API
 * 
 * Minimal client for server-side usage (API routes, serverless functions, etc.)
 * No React dependencies.
 */

import { createHttpTransport } from './transports/http'
import type { Address } from '@solana/kit'
import { address } from '@solana/kit'

export interface ClientConfig {
  cluster?: string
  rpcUrl?: string
  commitment?: string
}

export interface SolanaClient {
  getBalance(address: string | Address): Promise<bigint>
  // Add more methods as needed for API routes
}

export function createClient(config: ClientConfig = {}): SolanaClient {
  const rpcUrl = config.rpcUrl || 'https://api.devnet.solana.com'
  const transport = createHttpTransport({ url: rpcUrl })

  return {
    async getBalance(addr: string | Address): Promise<bigint> {
      const addressObj = typeof addr === 'string' ? address(addr) : addr
      const result = await transport.request({
        method: 'getBalance',
        params: [addressObj, { commitment: config.commitment || 'confirmed' }]
      })
      
      const raw = (result as any).value
      return typeof raw === 'bigint' ? raw : BigInt(raw ?? 0)
    }
  }
}
