# @connector-kit/sdk

Type-safe React hooks for Solana operations like balance, transactions, and more - built on @solana/kit.

## 📦 Installation

```bash
npm install @connector-kit/sdk @connector-kit/connector
# or
yarn add @connector-kit/sdk @connector-kit/connector
# or
bun add @connector-kit/sdk @connector-kit/connector
```

## 🚀 Quick Start

```tsx
import { ConnectorProvider, ConnectButton, getDefaultConfig } from '@connector-kit/connector'
import { ArcProvider, useWalletAddress, useBalance } from '@connector-kit/sdk'

export default function App() {
  return (
    <ConnectorProvider config={getDefaultConfig({ appName: "Your App" })}>
      <ArcProvider network="mainnet-beta">
        <ConnectButton />
        <BalanceDisplay />
      </ArcProvider>
    </ConnectorProvider>
  )
}

function BalanceDisplay() {
  const { address, connected } = useWalletAddress()
  const { balance } = useBalance({ address })
  
  if (!connected) return <div>Connect wallet to view balance</div>
  
  return (
    <div>
      <p>Address: {address}</p>
      <p>Balance: {balance ? Number(balance) / 1e9 : 0} SOL</p>
    </div>
  )
}
```

## 📚 Core Hooks

### useWalletAddress
```typescript
import { useWalletAddress } from '@connector-kit/sdk'

function WalletInfo() {
  const { address, addressParsed, connected, connecting } = useWalletAddress()
  
  return <div>Address: {address}</div>
}
```

### useBalance
```typescript
import { useBalance } from '@connector-kit/sdk'

function Balance() {
  const { address } = useWalletAddress()
  const { balance, isLoading, error, refresh } = useBalance({ 
    address,
    refreshInterval: 30000 // 30 seconds
  })
  
  return <div>Balance: {balance ? Number(balance) / 1e9 : 0} SOL</div>
}
```

### useTransaction
```typescript
import { useTransaction } from '@connector-kit/sdk'

function SendSOL() {
  const { sendTransaction, isLoading } = useTransaction()
  
  const handleSend = async () => {
    try {
      const signature = await sendTransaction({
        to: 'recipient-address',
        amount: 0.001 * 1e9 // 0.001 SOL in lamports
      })
      console.log('Transaction sent:', signature)
    } catch (error) {
      console.error('Transaction failed:', error)
    }
  }
  
  return (
    <button onClick={handleSend} disabled={isLoading}>
      {isLoading ? 'Sending...' : 'Send 0.001 SOL'}
    </button>
  )
}
```

### useAirdrop (Devnet/Testnet)
```typescript
import { useAirdrop } from '@connector-kit/sdk'

function AirdropButton() {
  const { address } = useWalletAddress()
  const { requestAirdrop, isLoading } = useAirdrop()
  
  const handleAirdrop = () => {
    requestAirdrop({ 
      address, 
      amount: 1e9 // 1 SOL 
    })
  }
  
  return (
    <button onClick={handleAirdrop} disabled={isLoading}>
      Request Airdrop
    </button>
  )
}
```

## 🏗️ Providers

### ArcProvider
Root provider for SDK functionality:

```tsx
import { ArcProvider } from '@connector-kit/sdk'

<ArcProvider 
  network="mainnet-beta"    // "mainnet-beta" | "devnet" | "testnet"
  rpcUrl="custom-rpc-url"   // Optional: Custom RPC endpoint
  commitment="confirmed"     // Optional: Commitment level
>
  <YourApp />
</ArcProvider>
```

### With Custom Configuration
```tsx
import { ArcProvider } from '@connector-kit/sdk'

<ArcProvider 
  config={{
    network: 'mainnet-beta',
    rpcUrl: 'https://api.mainnet-beta.solana.com',
    commitment: 'confirmed',
    // Add protocol providers
    providers: [
      createJupiter(), // From @connector-kit/jupiter
    ]
  }}
>
  <YourApp />
</ArcProvider>
```

## 🔧 Advanced Features

### useSwap (with Jupiter)
```bash
npm install @connector-kit/jupiter
```

```typescript
import { useSwap } from '@connector-kit/sdk'

function SwapComponent() {
  const { quote, swap, isLoading } = useSwap()
  
  const handleSwap = async () => {
    const quoteResponse = await quote({
      inputMint: 'So11111111111111111111111111111111111111112', // SOL
      outputMint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', // USDC
      amount: 1000000 // 0.001 SOL
    })
    
    if (quoteResponse) {
      await swap(quoteResponse)
    }
  }
  
  return (
    <button onClick={handleSwap} disabled={isLoading}>
      Swap SOL to USDC
    </button>
  )
}
```

### useCluster
```typescript
import { useCluster } from '@connector-kit/sdk'

function NetworkSelector() {
  const { cluster, setCluster, clusters } = useCluster()
  
  return (
    <select 
      value={cluster.name} 
      onChange={(e) => setCluster(e.target.value)}
    >
      {clusters.map(c => (
        <option key={c.name} value={c.name}>
          {c.name}
        </option>
      ))}
    </select>
  )
}
```

## 🎯 Key Features

- **🔒 Type Safety** - Built on @solana/kit with full TypeScript support
- **⚡ Performance** - React Query caching and optimized re-renders
- **🌐 Context-Based** - No prop drilling, automatic state coordination
- **🚀 Modern Standards** - Compatible with Wallet Standard
- **📦 Modular** - Use only the hooks you need
- **🔧 Extensible** - Plugin system for protocol integrations

## 📖 Documentation

- [Getting Started](https://connectorkit.dev/docs/connector-kit/introduction#sdk-integration)
- [API Reference](https://connectorkit.dev/docs/connector-kit/api-reference#sdk-integration) 
- [Interactive Examples](https://connectorkit.dev/docs/connector-kit/try-it-out)

## 🤝 Extension Packages

SDK is designed to be extended with protocol-specific functionality:

- **[@connector-kit/jupiter](../jupiter)** - Jupiter DEX integration
- **[@connector-kit/providers](../providers)** - Provider utilities and templates

## 📝 License

MIT
