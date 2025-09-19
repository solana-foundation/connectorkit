// MVP configuration - simplified version for demo components
export interface SolanaConfig {
  cluster: string
  rpcUrl: string
  commitment?: string
}

export function createSolanaConfig(config: Partial<SolanaConfig> = {}): SolanaConfig {
  return {
    cluster: config.cluster || 'devnet',
    rpcUrl: config.rpcUrl || 'https://api.devnet.solana.com',
    commitment: config.commitment || 'confirmed',
  }
}
