# Provider Template

This template shows how to add a new provider to the `@connectorkit/providers` package.

## Steps to add a new provider (e.g., Kamino):

### 1. Create the provider package
```bash
mkdir -p packages/kamino/src
```

### 2. Create package.json
```json
{
  "name": "@arc/kamino", 
  "version": "0.0.1",
  "private": false,
  "type": "module",
  "main": "./dist/index.cjs",
  "module": "./dist/index.js", 
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "import": "./dist/index.js",
      "require": "./dist/index.cjs"
    }
  },
  "scripts": {
    "build": "tsup",
    "dev": "tsup --watch",
    "lint": "echo skip"
  },
  "peerDependencies": {
    "@arc/solana": "*"
  },
  "devDependencies": {
    "@arc/solana": "workspace:*",
    "tsup": "^8.5.0",
    "typescript": "^5.3.3"
  },
  "files": ["dist", "src"]
}
```

### 3. Implement the provider in src/index.ts
```typescript
import type { SwapProvider, SwapParams, SwapQuote, SwapBuild } from '@connectorkit/solana'

export interface KaminoConfig {
  // Provider-specific config
  apiUrl?: string
  // ... other config options
}

export function createKamino(config: KaminoConfig = {}): SwapProvider {
  return {
    name: 'kamino',
    async quote(params: SwapParams): Promise<SwapQuote> {
      // Implementation
    },
    async build({ quote, userPublicKey, capabilities }): Promise<SwapBuild> {
      // Implementation
    },
    isTokenSupported(mint: string): boolean {
      // Implementation
    }
  }
}
```

### 4. Add to @connectorkit/providers dependencies
Update `packages/providers/package.json`:
```json
{
  "dependencies": {
    "@arc/jupiter": "workspace:*",
    "@arc/kamino": "workspace:*"
  }
}
```

### 5. Update providers/src/index.ts
```typescript
// Add the export
export { createKamino, type KaminoConfig } from '@connectorkit/kamino'

// Update the registry type
export interface ProviderRegistry {
  jupiter: ReturnType<typeof createJupiter>
  kamino: ReturnType<typeof createKamino>
}

// Update createProviders
export interface CreateProvidersConfig {
  jupiter?: Parameters<typeof createJupiter>[0]
  kamino?: Parameters<typeof createKamino>[0]
}
```

### 6. Build and test
```bash
pnpm build
# Test: import { createJupiter, createKamino } from 'arc/providers'
```