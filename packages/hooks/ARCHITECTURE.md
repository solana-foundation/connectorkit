# Arc Solana Architecture

## File Organization

### Entry Points (Top Level)

```
src/
├── index.ts         # Default export - Complete SDK
├── react.ts         # React-specific re-export (points to react/index.ts)
├── core.ts          # Minimal bundle - Essential hooks only
├── client.ts        # Backend/server API - No React
├── level1.ts        # Zero-config functions - No React, no hooks
└── experimental/    # Advanced features directory
    └── index.ts     # Experimental features
```

### Type Organization

```
src/types/
├── index.ts         # Main type exports
├── core.ts          # Core/essential types
├── react.ts         # React-specific types  
├── client.ts        # Backend client types
├── experimental.ts  # Experimental feature types
└── legacy.ts        # Deprecated types (to be removed)
```

### Hook Organization

```
src/hooks/
├── core/            # Essential hooks (useBalance, useWallet, etc)
├── token/           # Token-related hooks
├── defi/            # DeFi hooks (swap, stake, etc)
└── experimental/    # Experimental hooks
```

## Import Paths & Bundle Sizes

| Import Path | Bundle Size | Use Case | Includes |
|------------|-------------|----------|----------|
| `@arc/solana` | ~90KB | Full SDK | Everything |
| `@arc/solana/react` | ~70KB | React apps | All React hooks |
| `@arc/solana/core` | ~15KB | Simple dApps | Essential hooks only |
| `@arc/solana/client` | ~30KB | Backend/bots | No React dependencies |
| `@arc/solana/experimental` | ~40KB | Advanced | V0 tx, MEV, etc |

## Design Principles

1. **Clear Separation**: Each file has ONE clear purpose
2. **No Circular Dependencies**: Strict dependency hierarchy
3. **Progressive Disclosure**: Simple → React → Advanced
4. **Type Safety**: Types co-located with features
5. **Tree Shaking**: Fine-grained exports for optimal bundles

## File Purposes

### `index.ts`
- Default export for maximum convenience
- Includes Level 1 functions + common React hooks
- Re-exports from other modules

### `core.ts`  
- Minimal bundle for simple use cases
- Only essential hooks (wallet, balance, transfer)
- No token operations or advanced features

### `client.ts`
- Backend/server API without React
- Programmatic interface
- Enterprise RPC features

### `react.ts`
- All React hooks and providers
- Forward to `react/index.ts`
- Includes experimental hooks

### `level1.ts`
- Zero-config functions
- No React, no providers needed
- Simple async functions

### `experimental/`
- Advanced features that may change
- V0 transactions, MEV protection
- Priority fee optimization

## Type Strategy

Types should be:
1. Co-located with their features
2. Re-exported from type files for organization
3. Minimal public API surface
4. Well-documented with JSDoc

## Migration Path

To clean up current structure:
1. Move types to organized type files
2. Remove `advanced.ts` (merge into react or experimental)
3. Clean up duplicate exports
4. Remove legacy types after deprecation period
5. Add missing package.json exports
