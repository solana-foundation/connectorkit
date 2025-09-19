# @arc/solana

**The modern React SDK for Solana development** - Type-safe, progressive complexity, built on Kit 2.0

## 📦 Installation

```bash
npm install @arc/solana
# or
yarn add @arc/solana
# or
bun add @arc/solana
```

## 🚀 Import Paths & Use Cases

Arc provides different entry points optimized for specific use cases:

### **Default Import** - Complete SDK
```typescript
import { ArcProvider, useBalance, useTransaction } from '@connectorkit/solana'
```
- **Bundle Size**: ~90KB
- **Use When**: Building full-featured Solana apps
- **Includes**: All hooks, providers, and utilities

### **`/react`** - React Hooks Only
```typescript
import { useBalance, useWallet } from '@connectorkit/solana/react'
```
- **Bundle Size**: ~70KB
- **Use When**: Building React apps with Solana
- **Includes**: All React hooks and providers

### **`/core`** - Minimal Bundle
```typescript
import { useBalance, useTransferSOL } from '@connectorkit/solana/core'
```
- **Bundle Size**: ~15KB
- **Use When**: You need only essential hooks
- **Includes**: Core hooks only (wallet, balance, transfer)

### **`/client`** - Backend/Server API
```typescript
import { createArc, createEnterpriseArc } from '@connectorkit/solana/client'
```
- **Bundle Size**: ~30KB
- **Use When**: Building backend services, bots, or scripts
- **Includes**: Non-React client API

### **`/experimental`** - Advanced Features
```typescript
import { VersionedTransactionManager } from '@connectorkit/solana/experimental'
```
- **Bundle Size**: ~40KB
- **Use When**: You need cutting-edge features
- **Includes**: V0 transactions, MEV protection, priority fees

## 📚 Progressive Complexity Levels

### **Level 1: Simple Functions** (No React)
```typescript
import { getBalance, transferSOL, requestAirdrop } from '@connectorkit/solana'

// Just works™ - no setup required
const balance = await getBalance('8rUupu3N3VV...')
const sig = await transferSOL(from, to, 0.1)
```

### **Level 2: React Hooks** (Declarative)
```typescript
import { ArcProvider, useBalance, useWallet } from '@connectorkit/solana'

function App() {
  return (
    <ArcProvider config={{ network: 'devnet' }}>
      <WalletComponent />
    </ArcProvider>
  )
}

function WalletComponent() {
  const { wallet, connect } = useWallet()
  const { balance } = useBalance()
  
  return <div>Balance: {balance} SOL</div>
}
```

### **Level 3: Advanced Features** (Power Users)
```typescript
import { useProgramAccount } from '@connectorkit/solana'

// Custom codec for any program
const { data } = useProgramAccount({
  address: programId,
  codec: async (rpc, address) => {
    // Custom parsing logic
    return parsedData
  }
})
```

## 🏗️ Architecture

```
@arc/solana/
├── /                   # Default export - Complete SDK
├── /react              # React-specific hooks and providers
├── /core               # Minimal bundle - Essential hooks only
├── /client             # Backend/server API (no React)
└── /experimental       # Advanced features (V0 tx, MEV, etc)
```

## 🔧 Key Features

- **🎯 Progressive Complexity**: Simple → React Hooks → Advanced
- **📦 Optimized Bundles**: Import only what you need
- **🔒 Type Safety**: Built on Solana Kit 2.0
- **⚡ Performance**: React Query caching, optimized re-renders
- **🌐 Context-Based**: No prop drilling, automatic coordination
- **🚀 Modern Standards**: Wallet Standard, Kit 2.0 compatible

## 📖 Documentation

Full documentation available at [arc-docs.vercel.app](https://arc-docs.vercel.app)

## 🤝 Extension Packages

Arc is designed to be extended. See these examples:

- **[@arc/jupiter](../jupiter)** - Jupiter DEX integration example
- **[@arc/ui-primitives](../ui-primitives)** - UI component library example

## 📝 License

MIT
