# ConnectorKit

Headless wallet connector and React toolkit for building modern Solana applications.

## 🚀 Quick Start

### Installation

```bash
npm install @connector-kit/connector
# Optional: Add SDK for Solana operations
npm install @connector-kit/sdk
```

### Basic Setup

```tsx
"use client"

import { ConnectorProvider, ConnectButton, getDefaultConfig } from '@connector-kit/connector'

export default function App() {
  return (
    <ConnectorProvider config={getDefaultConfig({ appName: "Your App" })}>
      <ConnectButton />
    </ConnectorProvider>
  )
}
```

## 📦 Packages

| Package | Description | Version |
|---------|-------------|---------|
| `@connector-kit/connector` | Headless wallet connection with React components built on Wallet Standard | ![npm](https://img.shields.io/npm/v/@connector-kit/connector) |
| `@connector-kit/sdk` | Type-safe React hooks for Solana operations like balance, transactions | ![npm](https://img.shields.io/npm/v/@connector-kit/sdk) |
| `@connector-kit/jupiter` | Jupiter DEX integration for token swapping | ![npm](https://img.shields.io/npm/v/@connector-kit/jupiter) |
| `@connector-kit/providers` | Provider utilities and templates | ![npm](https://img.shields.io/npm/v/@connector-kit/providers) |

## ✨ Features

- **🔌 Wallet Standard** - Built on official Wallet Standard for maximum compatibility
- **⚡ TypeScript Ready** - Full type safety with excellent IntelliSense support  
- **🪝 React Hooks** - Intuitive hooks for wallet state and Solana operations
- **📱 Mobile Support** - Mobile Wallet Adapter integration for mobile apps
- **🎨 Headless Design** - Use pre-built components or build custom UI
- **⚙️ Zero Config** - Sensible defaults with `getDefaultConfig()` helper
- **🚀 Modern React** - Supports React 18+ with concurrent features
- **🏭 Production Ready** - Used in production Solana applications

## 📖 Documentation

Visit our [documentation site](https://connectorkit.dev) for:

- [Getting Started Guide](https://connectorkit.dev/docs/connector-kit/introduction)
- [API Reference](https://connectorkit.dev/docs/connector-kit/api-reference) 
- [Interactive Examples](https://connectorkit.dev/docs/connector-kit/try-it-out)
- [Customization Guide](https://connectorkit.dev/docs/connector-kit/customization)

## 🔧 Usage Examples

### Wallet Connection

```tsx
import { useConnector } from '@connector-kit/connector'

function WalletStatus() {
  const { connected, selectedWallet, disconnect } = useConnector()
  
  if (!connected) return <div>Not connected</div>
  
  return (
    <div>
      <p>Connected to {selectedWallet?.name}</p>
      <button onClick={disconnect}>Disconnect</button>
    </div>
  )
}
```

### Solana Operations

```tsx
import { useWalletAddress, useBalance } from '@connector-kit/sdk'

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

## 🛠️ Development

For contributors and maintainers:

```bash
# Clone and setup
git clone https://github.com/your-org/connector-kit.git
cd connector-kit
pnpm install

# Development
pnpm dev      # Start docs site
pnpm build    # Build all packages
pnpm test     # Run tests
```

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
