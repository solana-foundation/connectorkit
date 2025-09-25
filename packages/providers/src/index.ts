// Re-export all providers for centralized access
 
// Jupiter provider
export { 
  createJupiter,
  type JupiterConfig,
  type JupiterQuoteResponse,
  type JupiterSwapResponse,
  getJupiterTokens 
} from '@connector-kit/jupiter'

// Future providers will be added here:
// export { createKamino, type KaminoConfig } from '@connectorkit/kamino'
// export { createRaydium, type RaydiumConfig } from '@connectorkit/raydium'
// export { createOrcaWhirlpools, type OrcaConfig } from '@connectorkit/orca'

// Import locally for internal use
import { createJupiter } from '@connector-kit/jupiter'

// Provider registry type for future extensibility
export interface ProviderRegistry {
  jupiter: ReturnType<typeof createJupiter>
}

export type ProviderName = keyof ProviderRegistry

export interface CreateProvidersConfig {
  jupiter?: Parameters<typeof createJupiter>[0]
}

export function createProviders(config: CreateProvidersConfig): Partial<ProviderRegistry> {
  const providers: Partial<ProviderRegistry> = {}
  
  if (config.jupiter) {
    providers.jupiter = createJupiter(config.jupiter)
  }
  
  return providers
}