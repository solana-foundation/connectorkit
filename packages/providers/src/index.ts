// Re-export all providers for centralized access
 
// Jupiter provider
export { 
  createJupiter,
  type JupiterConfig,
  type JupiterQuoteResponse,
  type JupiterSwapResponse,
  getJupiterTokens 
} from '@connector-kit/jupiter'

import { createJupiter } from '@connector-kit/jupiter'
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