# @connectorkit/providers

Centralized provider exports for the Arc ecosystem. This package allows you to import all providers from a single location:

```typescript
import { createJupiter, createKamino } from 'arc/providers'
```

## Current Providers

- **Jupiter** (`createJupiter`) - Swap provider for Jupiter aggregator
  - Configuration: `JupiterConfig`
  - Types: `JupiterQuoteResponse`, `JupiterSwapResponse`
  - Utilities: `getJupiterTokens()`

## Usage

### Individual Provider
```typescript
import { createJupiter } from 'arc/providers'

const jupiter = createJupiter({
  apiUrl: 'https://quote-api.jup.ag/v6',
  slippageBps: 50
})
```

### Multiple Providers
```typescript
import { createProviders } from 'arc/providers'

const providers = createProviders({
  jupiter: {
    apiUrl: 'https://quote-api.jup.ag/v6',
    slippageBps: 100
  }
  // kamino: { ... } // Future providers
})
```

## Adding New Providers

See `src/templates/provider-template.md` for a complete guide on adding new providers.

## Architecture

This package serves as a centralized re-export hub:
- Re-exports all provider factories and types
- Provides type-safe provider registry
- Enables bulk provider creation
- Maintains forward compatibility for new providers

## Next Steps

1. **Add Kamino Provider** - Create `@arc/kamino` package following the template
2. **Add Raydium Provider** - Create `@arc/raydium` package
3. **Add Orca Provider** - Create `@arc/orca` package
4. **Enhanced Provider Registry** - Add runtime provider discovery
5. **Provider Configuration Validation** - Add schema validation for configs