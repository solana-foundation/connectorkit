# @connector-kit/providers

Provider utilities and templates for the ConnectorKit ecosystem. This package provides tools for creating and managing protocol integrations.

```typescript
import { createProvider } from '@connector-kit/providers'
```

## Current Providers

- **Jupiter** (`@connector-kit/jupiter`) - Swap provider for Jupiter aggregator
  - Configuration: `JupiterConfig`
  - Types: `JupiterQuoteResponse`, `JupiterSwapResponse` 
  - Utilities: `getJupiterTokens()`

## Usage

### Creating a Provider
```typescript
import { createProvider } from '@connector-kit/providers'

const customProvider = createProvider({
  name: 'my-protocol',
  swap: {
    quote: async (params) => { /* implementation */ },
    buildTransaction: async (quote) => { /* implementation */ },
    isTokenSupported: (mint) => { /* implementation */ }
  }
})
```

### Using with SDK
```typescript
import { ArcProvider } from '@connector-kit/sdk'
import { createJupiter } from '@connector-kit/jupiter'

<ArcProvider 
  network="mainnet-beta"
  providers={[createJupiter()]}
>
  <YourApp />
</ArcProvider>
```

### Provider Registry
```typescript
import { createProviderRegistry } from '@connector-kit/providers'

const registry = createProviderRegistry({
  jupiter: createJupiter({
    apiUrl: 'https://quote-api.jup.ag/v6',
    slippageBps: 50
  })
  // Add more providers as they become available
})
```

## Creating New Providers

See `src/templates/provider-template.md` for a complete guide on creating new providers.

### Provider Interface

```typescript
interface SwapProvider {
  name: string
  quote: (params: SwapParams) => Promise<SwapQuote>
  buildTransaction: (quote: SwapQuote) => Promise<PrebuiltTransaction>
  isTokenSupported: (mint: string) => boolean
}
```

## Architecture

This package serves as the foundation for protocol integrations:
- Provides base interfaces and types
- Includes provider creation utilities
- Offers templates for new integrations
- Maintains type safety across all providers

## Available Provider Packages

- `@connector-kit/jupiter` - Jupiter DEX integration
- More providers coming soon...

## Development Roadmap

1. **Add Marinade Provider** - Liquid staking integration
2. **Add Kamino Provider** - Yield farming integration  
3. **Add Orca Provider** - AMM trading integration
4. **Enhanced Provider Registry** - Runtime provider discovery
5. **Provider Configuration Validation** - Schema validation for configs