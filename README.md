# @connector-kit/connector

Headless wallet connector built on Wallet Standard and WalletUI

![npm](https://img.shields.io/npm/v/@connector-kit/connector)

## Installation

```bash
pnpm add @connector-kit/connector
```

## Features

- Wallet Standard / WalletUI integration
- Multi-wallet support and detection
- Global Wallet Context provider and hooks
- Framework-agnostic core client
- Type-safe wallet interactions
- Auto-connect support
- Account change detection
- Full Cluster/network management
- Mobile Wallet Adapter support
- Full featured storage system
- Comprehensive Error boundaries with automatic retry

## Table of Contents

- [Quick Start](#quick-start) - Get up and running in 3 steps
- [Core Hooks](#core-hooks) - Main hooks you'll use daily
- [Optional Utilities](#optional-utilities) - Convenience functions for special cases
- [Configuration](#configuration) - Customize behavior and networks
- [Advanced Usage](#advanced-usage) - Headless client, custom storage, integrations
- [Complete API Reference](#complete-api-reference) - Comprehensive documentation

## Quick Start

### 1. Install

```bash
pnpm add @connector-kit/connector
```

### 2. Setup Provider (once in your app root)

```typescript
import { ConnectorProvider, getDefaultConfig } from '@connector-kit/connector';

function App() {
  return (
    <ConnectorProvider config={getDefaultConfig({ appName: "My App" })}>
      <YourApp />
    </ConnectorProvider>
  );
}
```

### 3. Use Hooks (in any component)

```typescript
import { useConnector, useAccount } from '@connector-kit/connector';

function WalletButton() {
  const { wallets, select, disconnect, connected } = useConnector();
  const { address, formatted, copy } = useAccount();

  if (!connected) {
    return (
      <div>
        {wallets.map(w => (
          <button key={w.name} onClick={() => select(w.name)}>
            Connect {w.name}
          </button>
        ))}
      </div>
    );
  }
  
  return (
    <div>
      <button onClick={copy}>{formatted}</button>
      <button onClick={disconnect}>Disconnect</button>
    </div>
  );
}
```

**That's it!** You're ready to go. Everything else below is optional.

---

## Core Hooks

These are the main hooks you'll use in your components.

### `useConnector()`

Main hook for wallet connection and state.

```typescript
import { useConnector } from '@connector-kit/connector';

function Component() {
  const {
    // State
    wallets,         // WalletInfo[] - All available wallets
    selectedWallet,  // Wallet | null - Currently connected wallet
    accounts,        // AccountInfo[] - Connected accounts
    connected,       // boolean - Connection status
    connecting,      // boolean - Connecting in progress
    
    // Actions
    select,          // (walletName: string) => Promise<void>
    disconnect,      // () => Promise<void>
  } = useConnector();
}
```

### `useAccount()`

Hook for working with the connected account.

```typescript
import { useAccount } from '@connector-kit/connector';

function Component() {
  const {
    address,      // string | null - Full wallet address
    formatted,    // string - Shortened address (e.g., "5Gv8...x3kF")
    copy,         // () => Promise<boolean> - Copy address to clipboard
    copied,       // boolean - True for 2s after copying
    connected     // boolean - Connection status
  } = useAccount();
}
```

### `useCluster()`

Hook for managing Solana network/cluster.

```typescript
import { useCluster } from '@connector-kit/connector';

function Component() {
  const {
    cluster,      // SolanaCluster | null - Active cluster
    clusters,     // SolanaCluster[] - Available clusters
    setCluster,   // (id: SolanaClusterId) => Promise<void>
    isMainnet,    // boolean - Convenience flags
    isDevnet,     // boolean
    rpcUrl,       // string - RPC endpoint URL
    explorerUrl   // string - Solana Explorer base URL
  } = useCluster();
}
```

### `useWalletInfo()`

Hook for accessing current wallet metadata.

```typescript
import { useWalletInfo } from '@connector-kit/connector';

function Component() {
  const {
    name,         // string | null - Wallet name
    icon,         // string | undefined - Wallet icon URL
    wallet,       // WalletInfo | null - Full wallet info
    connecting    // boolean - Connection in progress
  } = useWalletInfo();
}
```

---

## Optional Utilities

Convenience functions when you need more control than the hooks provide.

### Formatting

```typescript
import { formatSOL, formatAddress } from '@connector-kit/connector';

// Format SOL amounts (custom decimals)
formatSOL(1500000000, { decimals: 4 })  // "1.5000 SOL"

// Format addresses (custom length)
formatAddress(address, { length: 6 })  // "5Gv8yU...8x3kF"
```

### Clipboard

```typescript
import { copyAddressToClipboard } from '@connector-kit/connector';

// Copy to clipboard
await copyAddressToClipboard(address);
```

### Explorer URLs

```typescript
import { getTransactionUrl, getAddressUrl } from '@connector-kit/connector';

// Get Solana Explorer URLs
const txUrl = getTransactionUrl(cluster, signature);
const addrUrl = getAddressUrl(cluster, address);
```

### Network Helpers

```typescript
import { isMainnet, getNetworkDisplayName } from '@connector-kit/connector';

// Check network type
if (isMainnet(cluster)) { /* ... */ }

// Get display name
const name = getNetworkDisplayName('mainnet-beta'); // "Mainnet"
```

**See [Complete API Reference](#complete-api-reference) below for all utilities.**

---

## Configuration

### Basic Configuration

```typescript
import { getDefaultConfig } from '@connector-kit/connector';

const config = getDefaultConfig({
  appName: 'My App',           // Required
  autoConnect: true,            // Auto-reconnect (default: true)
  network: 'mainnet-beta',      // Initial network
  enableMobile: true,           // Mobile Wallet Adapter (default: true)
  debug: false                  // Debug logging
});
```

### Network Selection

```typescript
const config = getDefaultConfig({
  appName: 'My App',
  network: 'devnet'  // 'mainnet-beta' | 'devnet' | 'testnet' | 'localnet'
});
```

### Custom Clusters

```typescript
import { getDefaultConfig, createSolanaMainnet } from '@connector-kit/connector';

const config = getDefaultConfig({
  appName: 'My App',
  clusters: [
    createSolanaMainnet({
      endpoint: 'https://my-custom-rpc.com'
    })
  ]
});
```

### Mobile Wallet Adapter

```typescript
<ConnectorProvider
  config={config}
  mobile={{
    appIdentity: {
      name: 'My App',
      uri: 'https://myapp.com',
      icon: 'https://myapp.com/icon.png'
    }
  }}
>
  <App />
</ConnectorProvider>
```

### Error Boundaries

```typescript
import { ConnectorErrorBoundary } from '@connector-kit/connector';

<ConnectorErrorBoundary
  maxRetries={3}
  onError={(error) => console.error(error)}
  fallback={(error, retry) => (
    <div>
      <p>Error: {error.message}</p>
      <button onClick={retry}>Retry</button>
    </div>
  )}
>
  <YourApp />
</ConnectorErrorBoundary>
```

---

## Advanced Usage

### Headless Client (Vue, Svelte, Vanilla JS)

Use `ConnectorClient` for non-React frameworks.

```typescript
import { ConnectorClient, getDefaultConfig } from '@connector-kit/connector/headless';

// Create client
const client = new ConnectorClient(
  getDefaultConfig({ appName: 'My App' })
);

// Get state
const state = client.getSnapshot();
console.log('Wallets:', state.wallets);

// Connect
await client.select('Phantom');

// Subscribe to changes
const unsubscribe = client.subscribe((state) => {
  console.log('State updated:', state);
});

// Disconnect
await client.disconnect();

// Cleanup
client.destroy();
```

**Key Methods:**
- `getSnapshot()` - Get current state (wallets, accounts, connection status)
- `select(walletName)` - Connect to a wallet
- `disconnect()` - Disconnect from wallet
- `selectAccount(address)` - Switch account (multi-account wallets)
- `setCluster(clusterId)` - Change network
- `subscribe(listener)` - Listen to state changes
- `destroy()` - Cleanup resources

See [Complete API Reference](#complete-api-reference) for full details.

### Unified Config (Armadura Integration)

If you're using both ConnectorKit and Armadura, use `createConfig()` to avoid duplication:

```typescript
import { createConfig, AppProvider } from '@connector-kit/connector';
import { ArmaProvider } from '@armadura/sdk';

const config = createConfig({
  appName: 'My App',
  network: 'mainnet',
  rpcUrl: 'https://my-custom-rpc.com',  // Optional
  autoConnect: true
});

function App() {
  return (
    <AppProvider config={config.connectorConfig}>
      <ArmaProvider
        config={{
          network: config.network,
          rpcUrl: config.rpcUrl,
          providers: [/* ... */]
        }}
        useConnector="auto"
      >
        {children}
      </ArmaProvider>
    </AppProvider>
  );
}
```

### Custom Storage (React Native, SSR)

Storage uses nanostores with built-in enhancements that are **automatically applied**:
- ✅ Validation (Solana address format checking)
- ✅ Error handling (catches localStorage quota errors, private browsing)
- ✅ SSR fallback (uses memory storage when localStorage unavailable)
- ✅ Utility methods (reset, clear, isAvailable)

**Most users don't need to configure storage.** Only customize for:
- React Native (custom storage backend)
- Additional validation rules
- Custom error tracking

```typescript
import { 
  getDefaultConfig,
  createEnhancedStorageWallet,
  EnhancedStorageAdapter 
} from '@connector-kit/connector';

const config = getDefaultConfig({
  appName: 'My App',
  
  // Optional: Add custom validation
  storage: {
    wallet: new EnhancedStorageAdapter(
      createEnhancedStorageWallet({
        validator: (walletName) => {
          // Additional validation on top of defaults
          return walletName !== null && walletName.length > 0;
        },
        onError: (error) => {
          // Custom error tracking
          Sentry.captureException(error);
        }
      })
    ),
    // ... account and cluster storage (uses defaults if not specified)
  },
  
  // Optional: Global error handler
  onError: (error, errorInfo) => {
    console.error('Connector error:', error, errorInfo);
  }
});
```

---

## Wallet Standard

This connector implements the [Wallet Standard](https://github.com/wallet-standard/wallet-standard) specification, ensuring compatibility with all compliant wallets:

- Phantom
- Solflare
- Backpack
- Glow
- Brave Wallet
- Any Wallet Standard compatible wallet

---

## Development

```bash
# First time setup
pnpm install                                    # Install dependencies
pnpm --filter @connector-kit/connector build    # Build connector package first

# Development
pnpm dev         # Run all examples in dev mode
pnpm build       # Build all packages
pnpm type-check  # TypeScript validation
pnpm lint        # Lint code
```

### Running Examples

The monorepo includes three example projects:

```bash
# Run all examples at once (after initial build)
pnpm dev

# Or run individually
cd examples/nextjs && pnpm dev  # Next.js example (port 3000)
cd examples/vite && pnpm dev    # Vite example (port 5173)
cd examples/vue && pnpm dev     # Vue example (port 5174)
```

**Note:** The connector package must be built at least once before running examples. This is done automatically with `pnpm dev` after the initial build.

---

## Complete API Reference

> **Note:** This section contains comprehensive documentation of all exports. Most users only need the [Core Hooks](#core-hooks) above. Use this section to discover additional utilities or for advanced use cases.

### Configuration Functions

#### `getDefaultConfig(options)`

Create a default connector configuration with sensible defaults.

```typescript
import { getDefaultConfig } from '@connector-kit/connector';

const config = getDefaultConfig({
  appName: string,                        // Required: App name
  appUrl?: string,                        // App URL for metadata
  autoConnect?: boolean,                  // Auto-reconnect (default: true)
  debug?: boolean,                        // Debug logging
  network?: 'mainnet' | 'mainnet-beta'    // Initial network (default: mainnet-beta)
    | 'devnet' | 'testnet' | 'localnet',
  enableMobile?: boolean,                 // Mobile Wallet Adapter (default: true)
  storage?: ConnectorConfig['storage'],   // Custom storage adapters
  clusters?: SolanaCluster[],             // Override default clusters
  customClusters?: SolanaCluster[],       // Add custom clusters
  persistClusterSelection?: boolean,      // Persist cluster (default: true)
  enableErrorBoundary?: boolean,          // Error boundaries (default: true)
  maxRetries?: number,                    // Retry attempts (default: 3)
  onError?: (error, errorInfo) => void    // Error handler
});
```

#### `createConfig(options)`

Create unified configuration for ConnectorKit + Armadura integration.

```typescript
import { createConfig } from '@connector-kit/connector';

const config = createConfig({
  appName: string,
  network?: 'mainnet' | 'devnet' | 'testnet' | 'localnet',
  rpcUrl?: string,                        // Custom RPC endpoint
  autoConnect?: boolean,
  enableMobile?: boolean,
  debug?: boolean
});

// Returns UnifiedConfig with:
// - config.connectorConfig (for ConnectorProvider)
// - config.network (for Armadura)
// - config.rpcUrl (for Armadura)
// - config.mobile (for Mobile Wallet Adapter)
```

#### `getDefaultMobileConfig(options)`

Create Mobile Wallet Adapter configuration.

```typescript
import { getDefaultMobileConfig } from '@connector-kit/connector';

const mobileConfig = getDefaultMobileConfig({
  appName: string,
  appUrl?: string,
  network?: 'mainnet' | 'devnet' | 'testnet'
});
```

### Utility Functions

#### Clipboard Utilities

```typescript
import { copyAddressToClipboard, copyToClipboard } from '@connector-kit/connector';

// Copy address to clipboard
await copyAddressToClipboard(address: string): Promise<boolean>

// Copy any text to clipboard
await copyToClipboard(text: string): Promise<boolean>
```

#### Formatting Utilities

```typescript
import {
  // Full featured formatters (with Intl support)
  formatAddress,
  formatSOL,
  formatNumber,
  formatTokenAmount,
  truncate,
  
  // Lightweight formatters (no Intl, smaller bundle)
  formatAddressSimple,
  formatSOLSimple,
  formatNumberSimple,
  truncateSimple
} from '@connector-kit/connector';

// Format Solana address (with copy to clipboard)
formatAddress(address: string, options?: {
  length?: number,        // Chars to show on each side (default: 4)
  separator?: string      // Middle separator (default: '...')
}): string

// Format SOL amount
formatSOL(lamports: number | bigint, options?: {
  decimals?: number,      // Decimal places (default: 2)
  showSymbol?: boolean    // Show 'SOL' suffix (default: true)
}): string

// Format numbers with Intl
formatNumber(value: number, options?: {
  decimals?: number,
  locale?: string
}): string

// Format token amounts
formatTokenAmount(amount: number | bigint, decimals: number, options?: {
  displayDecimals?: number,
  showSymbol?: boolean,
  symbol?: string
}): string
```

#### Cluster Utilities

```typescript
import {
  getClusterRpcUrl,
  getClusterExplorerUrl,
  getTransactionUrl,
  getAddressUrl,
  getTokenUrl,
  getBlockUrl,
  isMainnetCluster,
  isDevnetCluster,
  isTestnetCluster,
  isLocalCluster,
  getClusterName,
  getClusterType
} from '@connector-kit/connector';

// Get RPC endpoint for cluster
getClusterRpcUrl(cluster: SolanaCluster): string

// Get Solana Explorer URL
getClusterExplorerUrl(cluster: SolanaCluster, path?: string): string

// Get transaction explorer URL
getTransactionUrl(cluster: SolanaCluster, signature: string): string

// Get address explorer URL
getAddressUrl(cluster: SolanaCluster, address: string): string

// Get token explorer URL
getTokenUrl(cluster: SolanaCluster, tokenMint: string): string

// Get block explorer URL
getBlockUrl(cluster: SolanaCluster, slot: number): string

// Check cluster type
isMainnetCluster(cluster: SolanaCluster): boolean
isDevnetCluster(cluster: SolanaCluster): boolean
isTestnetCluster(cluster: SolanaCluster): boolean
isLocalCluster(cluster: SolanaCluster): boolean

// Get cluster metadata
getClusterName(cluster: SolanaCluster): string
getClusterType(cluster: SolanaCluster): 'mainnet' | 'devnet' | 'testnet' | 'localnet' | 'custom'
```

#### Network Utilities

```typescript
import {
  normalizeNetwork,
  toRpcNetwork,
  toClusterId,
  getDefaultRpcUrl,
  isMainnet,
  isDevnet,
  isTestnet,
  isLocalnet,
  getNetworkDisplayName,
  RPC_ENDPOINTS
} from '@connector-kit/connector';

// Normalize network names ('mainnet' vs 'mainnet-beta')
normalizeNetwork(network: string): SolanaNetwork

// Convert to RPC network name
toRpcNetwork(network: SolanaNetwork): SolanaNetworkRpc

// Convert to cluster ID
toClusterId(network: string): SolanaClusterId

// Get default RPC URL
getDefaultRpcUrl(network: string): string

// Check network type
isMainnet(network: string): boolean
isDevnet(network: string): boolean
isTestnet(network: string): boolean
isLocalnet(network: string): boolean

// Get display name
getNetworkDisplayName(network: string): string

// Default RPC endpoints
RPC_ENDPOINTS: Record<SolanaNetwork, string>
```

### Storage System

**Built with WalletUI powered by nanostores with automatic enhancements** (validation, error handling, SSR fallback).

`getDefaultConfig()` automatically applies these features - **no configuration needed** for most apps.

#### When to Use Custom Storage

Only needed for:
- React Native (custom storage backend)
- Additional validation rules beyond defaults
- Custom error tracking/reporting

#### Factory Functions

```typescript
import {
  createEnhancedStorageAccount,
  createEnhancedStorageCluster,
  createEnhancedStorageWallet,
  EnhancedStorageAdapter
} from '@connector-kit/connector';

// Account storage (with Solana address validation)
const accountStorage = createEnhancedStorageAccount({
  key?: string,                           // Storage key (default: 'connector-kit:account')
  initial?: string | undefined,           // Initial value
  validator?: (value) => boolean,         // Additional validation
  onError?: (error) => void               // Error handler
});

// Cluster storage (with cluster ID validation)
const clusterStorage = createEnhancedStorageCluster({
  key?: string,                           // Storage key (default: 'connector-kit:cluster')
  initial?: SolanaClusterId,              // Initial cluster ID
  validClusters?: SolanaClusterId[],      // Allowed clusters
  onError?: (error) => void               // Error handler
});

// Wallet storage
const walletStorage = createEnhancedStorageWallet({
  key?: string,                           // Storage key (default: 'connector-kit:wallet')
  initial?: string | undefined,           // Initial value
  onError?: (error) => void               // Error handler
});

// Wrap with adapter for ConnectorClient
const adapter = new EnhancedStorageAdapter(storage);
```

#### Automatic Features

These work out-of-the-box with `getDefaultConfig()`:

- ✅ **Validation**: Solana address format checking (`/^[1-9A-HJ-NP-Za-km-z]{32,44}$/`)
- ✅ **Error Handling**: Catches localStorage quota errors, private browsing mode
- ✅ **SSR Fallback**: Uses memory storage when localStorage unavailable
- ✅ **Persistence**: Auto-saves to localStorage with nanostore reactivity

#### Available Methods

```typescript
// Get value
storage.get(): T

// Set value (with automatic validation)
storage.set(value: T): boolean

// Subscribe to changes (nanostore)
storage.value.subscribe(callback: (value: T) => void): () => void

// Utility methods
storage.reset(): void                    // Reset to initial value
storage.clear(): void                    // Clear from storage
storage.isAvailable(): boolean           // Check localStorage availability

// Add custom validation (chainable)
storage.addValidator(validator: (value: T) => boolean): this

// Add error handlers (chainable)
storage.onError(handler: (error: Error) => void): this

// Transform values
storage.transform<U>(transformer: (value: T) => U): U
```

### Cluster Creation

```typescript
import {
  createSolanaMainnet,
  createSolanaDevnet,
  createSolanaTestnet,
  createSolanaLocalnet
} from '@connector-kit/connector';

// Create cluster configurations
const mainnet = createSolanaMainnet({
  endpoint?: string,                      // Custom RPC (optional)
  ...options
});

const devnet = createSolanaDevnet({ /* options */ });
const testnet = createSolanaTestnet({ /* options */ });
const localnet = createSolanaLocalnet({ /* options */ });
```

### Error Handling

```typescript
import { WalletErrorType, type WalletError } from '@connector-kit/connector';

// Error types enum
WalletErrorType {
  CONNECTION_ERROR = 'connection_error',
  DISCONNECTION_ERROR = 'disconnection_error',
  TRANSACTION_ERROR = 'transaction_error',
  SIGN_MESSAGE_ERROR = 'sign_message_error',
  NETWORK_ERROR = 'network_error',
  UNKNOWN_ERROR = 'unknown_error'
}

// WalletError interface
interface WalletError {
  type: WalletErrorType;
  message: string;
  originalError?: Error;
}
```

### Types

```typescript
import type {
  // Configuration
  ConnectorConfig,
  DefaultConfigOptions,
  ExtendedConnectorConfig,
  UnifiedConfigOptions,
  UnifiedConfig,
  MobileWalletAdapterConfig,
  
  // State & Info
  ConnectorState,
  ConnectorSnapshot,
  WalletInfo,
  AccountInfo,
  
  // Wallet Standard
  Wallet,
  WalletAccount,
  WalletStandardWallet,
  WalletStandardAccount,
  
  // Clusters
  SolanaCluster,
  SolanaClusterId,
  
  // Storage
  StorageAdapter,
  StorageOptions,
  EnhancedStorageAccountOptions,
  EnhancedStorageClusterOptions,
  EnhancedStorageWalletOptions,
  
  // Hook Returns
  UseClusterReturn,
  UseAccountReturn,
  UseWalletInfoReturn,
  
  // Errors
  WalletError
} from '@connector-kit/connector';
```

### Advanced Usage

#### Headless (Framework-Agnostic)

```typescript
// Import headless exports only (no React)
import { ConnectorClient, getDefaultConfig } from '@connector-kit/connector/headless';

const client = new ConnectorClient(config);
```

#### React-Only Imports

```typescript
// Import React exports only
import { 
  ConnectorProvider, 
  useConnector, 
  useAccount 
} from '@connector-kit/connector/react';
```

#### Tree-Shaking

The package supports tree-shaking. Import only what you need:

```typescript
// Import specific utilities
import { formatAddress } from '@connector-kit/connector/utils/formatting';
import { getClusterRpcUrl } from '@connector-kit/connector/utils/cluster';
```

## Documentation

Visit [connectorkit.dev](#) for interactive examples and guides.

## License

MIT
