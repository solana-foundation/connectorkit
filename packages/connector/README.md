# @connector-kit/connector

Headless wallet connection with React components and hooks built on Wallet Standard for Solana applications.

## Installation

```bash
npm install @connector-kit/connector
```

## Quick Start

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

## Core Features

- **🔌 Wallet Standard** - Built on official Wallet Standard for maximum compatibility
- **📱 Mobile Support** - Mobile Wallet Adapter integration for mobile apps  
- **🎨 Headless Design** - Use pre-built components or build completely custom UI
- **⚙️ Zero Config** - Sensible defaults with `getDefaultConfig()` helper
- **🪝 React Hooks** - Intuitive hooks for wallet connection state
- **🚀 Modal System** - Built-in modal with navigation and account management

## Components

### ConnectButton

Complete wallet connection interface with built-in modal and account management.

```tsx
import { ConnectButton } from '@connector-kit/connector'

<ConnectButton 
  size="md"                    // "sm" | "md" | "lg"
  variant="default"            // "default" | "icon-only" | "minimal" | "outline"
  label="Connect Wallet"       // Custom button text
/>
```

### ConnectorProvider

Root provider that manages wallet connections and configuration.

```tsx
import { ConnectorProvider, getDefaultConfig } from '@connector-kit/connector'

<ConnectorProvider 
  config={getDefaultConfig({ appName: "Your App" })}
  mobile={getDefaultMobileConfig({ appName: "Your App" })}
>
  {children}
</ConnectorProvider>
```

## Hooks

### useConnector

Main hook for wallet connection state and methods.

```tsx
import { useConnector } from '@connector-kit/connector'

function WalletStatus() {
  const { 
    connected, 
    connecting, 
    wallets, 
    selectedWallet, 
    accounts, 
    selectedAccount,
    select, 
    disconnect, 
    selectAccount 
  } = useConnector()
  
  if (!connected) return <div>Not connected</div>
  
  return (
    <div>
      <p>Connected to {selectedWallet?.name}</p>
      <p>Account: {selectedAccount}</p>
      <button onClick={disconnect}>Disconnect</button>
    </div>
  )
}
```

### useModal

Hook for managing modal state and navigation.

```tsx
import { useModal } from '@connector-kit/connector'

function ModalControls() {
  const { isOpen, openWallets, openProfile, openSettings, close } = useModal()
  
  return (
    <div>
      <button onClick={openWallets}>Connect Wallet</button>
      <button onClick={openProfile}>Profile</button>
      <button onClick={openSettings}>Settings</button>
    </div>
  )
}
```

## Configuration

### Basic Configuration

```tsx
import { getDefaultConfig } from '@connector-kit/connector'

const config = getDefaultConfig({
  appName: 'My App',              // Required: App name for wallet prompts
  appUrl: 'https://myapp.com',    // Optional: App URL
  autoConnect: true,              // Optional: Auto-reconnect (default: true)
  debug: false,                   // Optional: Debug logging (default: dev mode)
  network: 'mainnet-beta',        // Optional: Solana network (default: mainnet-beta)
  enableMobile: true,             // Optional: Enable mobile support (default: true)
})
```

### Mobile Configuration

```tsx
import { getDefaultMobileConfig } from '@connector-kit/connector'

const mobileConfig = getDefaultMobileConfig({
  appName: 'My App',
  appUrl: 'https://myapp.com',
  network: 'mainnet-beta',
})
```

### Custom Storage

```tsx
const config = getDefaultConfig({
  appName: 'My App',
  storage: {
    getItem: (key: string) => localStorage.getItem(key),
    setItem: (key: string, value: string) => localStorage.setItem(key, value),
    removeItem: (key: string) => localStorage.removeItem(key),
  }
})
```

## Headless Usage

Build completely custom UI while keeping all the connection logic:

```tsx
import { useConnector } from '@connector-kit/connector'

function CustomWalletConnect() {
  const { wallets, select, connected, connecting, disconnect } = useConnector()

  if (connected) {
    return <button onClick={disconnect}>Disconnect</button>
  }

  return (
    <div>
      {wallets?.map(wallet => (
        <button
          key={wallet.name}
          onClick={() => select(wallet.name)}
          disabled={!wallet.installed || connecting}
        >
          {wallet.installed ? `Connect ${wallet.name}` : `Install ${wallet.name}`}
        </button>
      ))}
    </div>
  )
}
```

## Framework Setup

### Next.js App Router

```tsx
// app/layout.tsx
import { ConnectorProvider, getDefaultConfig } from '@connector-kit/connector'

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html>
      <body>
        <ConnectorProvider config={getDefaultConfig({ appName: "Your App" })}>
          {children}
        </ConnectorProvider>
      </body>
    </html>
  )
}
```

### With SDK Integration

```bash
npm install @connector-kit/connector @connector-kit/sdk
```

```tsx
import { ConnectorProvider, ConnectButton, getDefaultConfig } from '@connector-kit/connector'
import { ArcProvider } from '@connector-kit/sdk'

export default function App() {
  return (
    <ConnectorProvider config={getDefaultConfig({ appName: "Your App" })}>
      <ArcProvider network="mainnet-beta">
        <ConnectButton />
        {/* Your app components */}
      </ArcProvider>
    </ConnectorProvider>
  )
}
```

## TypeScript

Full TypeScript support with comprehensive type definitions:

```tsx
import type { 
  ConnectorConfig,
  ConnectorSnapshot,
  WalletInfo,
  AccountInfo,
  ModalRoute,
  ConnectorTheme
} from '@connector-kit/connector'
```

## Documentation

- [Getting Started Guide](https://connectorkit.dev/docs/connector-kit/introduction)
- [API Reference](https://connectorkit.dev/docs/connector-kit/api-reference)
- [Try Interactive Examples](https://connectorkit.dev/docs/connector-kit/try-it-out)

## License

MIT
