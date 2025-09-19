# Arc Solana File Organization Guide

## Top-Level Source Files

### `index.ts` - Main Export (90KB)
**Purpose**: Default export with all commonly used features  
**Exports**:
- Level 1 functions (getBalance, transferSOL, etc)
- Common React hooks (useBalance, useWallet, etc)
- Client creation functions
- Essential types

**When to use**: Building full Solana applications

---

### `core.ts` - Minimal Bundle (15KB)
**Purpose**: Smallest possible bundle with only essentials  
**Exports**:
- useWallet, useBalance, useTransferSOL
- useCluster, useNetwork
- Core utilities (cluster detection, etc)

**When to use**: Simple dApps that only need wallet + balance

---

### `client.ts` - Backend API (30KB)
**Purpose**: Non-React API for servers, bots, scripts  
**Exports**:
- createArc, createEnterpriseArc
- ArcClient class
- Enterprise RPC types
- Backend-friendly types

**When to use**: Node.js backends, trading bots, scripts

---

### `level1.ts` - Zero Config Functions
**Purpose**: Simple async functions, no setup required  
**Exports**:
- configure(options)
- getBalance(address)
- transferSOL(options)
- requestAirdrop(address)
- getTransaction(signature)

**When to use**: Quick scripts, beginners, simple queries

---

### `react/index.ts` - All React Hooks (70KB)
**Purpose**: Complete React hook collection  
**Exports**:
- All 29 React hooks
- ArcProvider component
- React-specific types

**When to use**: Import from `@arc/solana/react` for React-only bundle

---

### `experimental/index.ts` - Advanced Features (40KB)
**Purpose**: Cutting-edge features that may change  
**Exports**:
- Versioned transactions (v0)
- Priority fee optimization
- MEV protection
- Enterprise RPC management

**When to use**: Advanced users needing latest features

---

### `types.ts` - Core Types
**Purpose**: Essential types used everywhere  
**Contains**:
- Basic option interfaces (BalanceOptions, etc)
- Result types (TransactionResult, etc)
- Network types
- Provider props

**Note**: Specific types live with their features

---

### `types/index.ts` - Type Re-exports
**Purpose**: Central type export location  
**Re-exports**:
- All types from types.ts
- Provider types
- Hook option types
- Additional state types

---

### `legacy-types.ts` - Deprecated Types
**Purpose**: Backward compatibility only  
**Status**: ⚠️ DEPRECATED - Will be removed in v2.0
**Contains**: Old wallet adapter interfaces

---

## Directory Structure

```
src/
├── components/          # React components
├── core/               # Core client & provider logic
├── experimental/       # Advanced/experimental features  
├── hooks/              # All React hooks
├── react/              # React-specific exports
├── types/              # Type definitions
└── utils/              # Utility functions
```

## Import Examples

```typescript
// Full SDK (default)
import { useBalance, createArc } from '@connectorkit/solana'

// React only 
import { useBalance } from '@connectorkit/solana/react'

// Minimal bundle
import { useBalance } from '@connectorkit/solana/core'

// Backend only
import { createArc } from '@connectorkit/solana/client'

// Advanced features
import { VersionedTransactionManager } from '@connectorkit/solana/experimental'

// Simple functions
import { getBalance } from '@connectorkit/solana'
```

## Best Practices

1. **Import from the most specific export** for smallest bundle
2. **Don't import from `/src` directly** - use package exports
3. **Types are co-located** with their features
4. **Experimental features may change** between versions
5. **Legacy types are deprecated** - migrate to new APIs
