# @connector-kit/jupiter

**Example: Extending Arc with DeFi Protocols**

This package demonstrates how to extend Arc with protocol-specific functionality. While not currently active, it shows the pattern for integrating Jupiter (or any DEX) into the Arc ecosystem.

## 🎯 Purpose

Shows how to:
- Implement the `SwapProvider` interface
- Integrate with Arc's provider system
- Add protocol-specific functionality

## 🏗️ Pattern

```typescript
// 1. Implement the provider interface
export function createJupiter(config): SwapProvider {
  return {
    name: 'jupiter',
    quote: async (params) => { /* ... */ },
    buildTransaction: async (quote) => { /* ... */ },
    isTokenSupported: (mint) => { /* ... */ }
  }
}

// 2. Use with Arc
import { createJupiter } from '@connector-kit/jupiter'
import { ArcProvider } from '@connector-kit/solana'

<ArcProvider config={{
  providers: [createProvider({ 
    swap: [createJupiter()] 
  })]
}}>
```

## 🚀 Extension Ideas

- `@connector-kit/marinade` - Liquid staking
- `@connector-kit/kamino` - Yield vaults
- `@connector-kit/drift` - Perpetuals trading
- `@connector-kit/phoenix` - Order book DEX

Each extension follows the same pattern, implementing Arc's provider interfaces.
