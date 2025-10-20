# @connector-kit/connector

Headless wallet connector built on Wallet Standard with powerful transaction signing, event system, and performance optimizations.

![npm](https://img.shields.io/npm/v/@connector-kit/connector)
![Bundle Size](https://img.shields.io/bundlephobia/minzip/@connector-kit/connector)
![TypeScript](https://img.shields.io/badge/TypeScript-100%25-blue)

## ✨ What's New

**Enhanced with production-ready features:**

- 🔐 **Transaction Signer** - Clean abstraction for signing/sending transactions
- 📊 **Event System** - Track connections, transactions, and errors for analytics
- 🐛 **Debug Panel** - Floating dev-only state inspector
- ⚡ **Performance** - 40-60% fewer re-renders via optimized state updates
- 🔄 **Connection Pooling** - Reusable RPC connections for better performance
- 🏥 **Health Checks** - Comprehensive diagnostics for production debugging
- 🌐 **Browser Polyfills** - Automatic compatibility for all browsers
- 🔌 **Wallet Adapter Compat** - Drop-in replacement for @solana/wallet-adapter

---

## Installation

```bash
pnpm add @connector-kit/connector
```

## Quick Start

### 1. Setup Provider

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

### 2. Connect Wallet

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

### 3. Sign Transactions (NEW!)

```typescript
import { useTransactionSigner } from '@connector-kit/connector';

function SendTransaction() {
  const { signer, ready, capabilities } = useTransactionSigner();

  const handleSend = async () => {
    if (!signer) return;

    const signature = await signer.signAndSendTransaction(transaction);
    console.log('Transaction sent:', signature);
  };

  return (
    <button onClick={handleSend} disabled={!ready}>
      Send Transaction
    </button>
  );
}
```

**That's it!** You're ready to build. Everything else below is optional.

---

## Table of Contents

- [Core Features](#core-features)
- [Core Hooks](#core-hooks)
- [New Features](#new-features)
    - [Transaction Signer](#transaction-signer)
    - [Event System](#event-system)
    - [Debug Panel](#debug-panel)
    - [Connection Pooling](#connection-pooling)
    - [Health Checks](#health-checks)
    - [Wallet Adapter Compatibility](#wallet-adapter-compatibility)
- [Configuration](#configuration)
- [Advanced Usage](#advanced-usage)
- [Testing](#testing)
- [API Reference](#complete-api-reference)

---

## Core Features

- ✅ **Wallet Standard** - Compatible with all Wallet Standard wallets
- ✅ **Multi-Wallet** - Support for multiple wallet adapters
- ✅ **Auto-Connect** - Automatic wallet reconnection
- ✅ **Account Management** - Multi-account support
- ✅ **Network Switching** - Full cluster/network management
- ✅ **Mobile Support** - Solana Mobile Wallet Adapter integration
- ✅ **Enhanced Storage** - Persistent state with validation
- ✅ **Error Boundaries** - Automatic error handling and recovery
- ✅ **Framework Agnostic** - Headless core works with any framework
- ✅ **TypeScript** - Fully typed with comprehensive JSDoc

---

## Core Hooks

### `useConnector()`

Main hook for wallet connection and state.

```typescript
import { useConnector } from '@connector-kit/connector';

function Component() {
    const {
        // State
        wallets, // WalletInfo[] - All available wallets
        selectedWallet, // Wallet | null - Currently connected wallet
        accounts, // AccountInfo[] - Connected accounts
        connected, // boolean - Connection status
        connecting, // boolean - Connecting in progress

        // Actions
        select, // (walletName: string) => Promise<void>
        disconnect, // () => Promise<void>
    } = useConnector();
}
```

### `useAccount()`

Hook for working with the connected account.

```typescript
import { useAccount } from '@connector-kit/connector';

function Component() {
    const {
        address, // string | null - Full wallet address
        formatted, // string - Shortened address (e.g., "5Gv8...x3kF")
        copy, // () => Promise<boolean> - Copy address to clipboard
        copied, // boolean - True for 2s after copying
        connected, // boolean - Connection status
        accounts, // AccountInfo[] - All accounts
        selectAccount, // (address: string) => Promise<void>
    } = useAccount();
}
```

### `useCluster()`

Hook for managing Solana network/cluster.

```typescript
import { useCluster } from '@connector-kit/connector';

function Component() {
    const {
        cluster, // SolanaCluster | null - Active cluster
        clusters, // SolanaCluster[] - Available clusters
        setCluster, // (id: SolanaClusterId) => Promise<void>
        isMainnet, // boolean - Convenience flags
        isDevnet, // boolean
        rpcUrl, // string - RPC endpoint URL
        explorerUrl, // string - Solana Explorer base URL
    } = useCluster();
}
```

---

## New Features

### Transaction Signer

Clean, unified interface for transaction signing operations.

```typescript
import { useTransactionSigner } from '@connector-kit/connector';

function SendTx() {
  const { signer, ready, capabilities } = useTransactionSigner();

  // Check capabilities
  console.log('Can sign:', capabilities.canSign);
  console.log('Can send:', capabilities.canSend);
  console.log('Can sign messages:', capabilities.canSignMessage);
  console.log('Batch support:', capabilities.supportsBatchSigning);

  const handleSend = async () => {
    if (!signer) return;

    try {
      // Sign and send a transaction
      const signature = await signer.signAndSendTransaction(transaction);
      console.log('Success:', signature);

      // Or just sign without sending
      const signed = await signer.signTransaction(transaction);

      // Or sign multiple transactions
      const signedBatch = await signer.signAllTransactions([tx1, tx2, tx3]);

      // Or sign and send multiple
      const signatures = await signer.signAndSendTransactions([tx1, tx2]);

    } catch (error) {
      if (error instanceof TransactionSignerError) {
        console.error('Signing error:', error.code, error.message);
      }
    }
  };

  return (
    <button onClick={handleSend} disabled={!ready}>
      Send Transaction
    </button>
  );
}
```

**Error Handling**:

```typescript
import { isTransactionSignerError, TransactionSignerError } from '@connector-kit/connector';

try {
    await signer.signAndSendTransaction(tx);
} catch (error) {
    if (isTransactionSignerError(error)) {
        switch (error.code) {
            case 'WALLET_NOT_CONNECTED':
                // Show connect prompt
                break;
            case 'FEATURE_NOT_SUPPORTED':
                // Show unsupported feature message
                break;
            case 'SIGNING_FAILED':
                // User rejected or signing failed
                break;
            case 'SEND_FAILED':
                // Transaction broadcast failed
                break;
        }
    }
}
```

### Event System

Track all connector lifecycle events for analytics and monitoring.

```typescript
import { useConnectorClient } from '@connector-kit/connector';

function AnalyticsTracker() {
    const client = useConnectorClient();

    useEffect(() => {
        if (!client) return;

        // Subscribe to events
        const unsubscribe = client.on(event => {
            switch (event.type) {
                case 'wallet:connected':
                    analytics.track('Wallet Connected', {
                        wallet: event.wallet,
                        account: event.account,
                        timestamp: event.timestamp,
                    });
                    break;

                case 'wallet:disconnected':
                    analytics.track('Wallet Disconnected');
                    break;

                case 'cluster:changed':
                    analytics.track('Network Changed', {
                        from: event.previousCluster,
                        to: event.cluster,
                    });
                    break;

                case 'error':
                    errorTracker.captureException(event.error, {
                        context: event.context,
                    });
                    break;
            }
        });

        return unsubscribe;
    }, [client]);

    return null;
}
```

**Available Events**:

- `wallet:connected` - Wallet successfully connected
- `wallet:disconnected` - Wallet disconnected
- `wallet:changed` - Selected wallet changed
- `account:changed` - Selected account changed
- `cluster:changed` - Network/cluster changed
- `wallets:detected` - New wallets detected
- `connecting` - Connection attempt started
- `connection:failed` - Connection attempt failed
- `error` - Error occurred

### Debug Panel

Floating development panel for instant state visibility.

```typescript
import { ConnectorDebugPanel } from '@connector-kit/connector';

function App() {
  return (
    <ConnectorProvider config={config}>
      {/* Only visible in development mode */}
      {process.env.NODE_ENV === 'development' && <ConnectorDebugPanel />}
      <YourApp />
    </ConnectorProvider>
  );
}
```

**Features**:

- Shows connection status (connected/disconnected/connecting)
- Displays current account and wallet
- Shows active cluster and RPC URL
- Lists detected wallets
- Health check information
- Click to expand/collapse
- Automatically excluded in production builds

**Custom positioning**:

```typescript
<ConnectorDebugPanel
  position="top-left"    // 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right'
  defaultOpen={true}
  zIndex={10000}
/>
```

### Connection Pooling

Reusable RPC connections for better performance.

```typescript
import { ConnectionPool, createConnectionPool } from '@connector-kit/connector/headless';
import { Connection } from '@solana/web3.js';

// Create custom pool
const pool = createConnectionPool({
    maxSize: 10,
    createConnection: cluster => {
        return new Connection(cluster.endpoint, {
            commitment: 'confirmed',
        });
    },
});

// Get or create connection for a cluster
const connection = pool.get(currentCluster);
const balance = await connection.getBalance(publicKey);

// Clear specific connection when settings change
pool.clear('solana:mainnet');

// Get pool statistics
const stats = pool.getStats();
console.log(`Pool: ${stats.size}/${stats.maxSize}`);
console.log(`Hit rate: ${(stats.hits / (stats.hits + stats.misses)) * 100}%`);
```

**Global pool** (simpler):

```typescript
import { getConnectionPool } from '@connector-kit/connector/headless';

const pool = getConnectionPool();
const connection = pool.get(cluster);
```

### Health Checks

Comprehensive diagnostics for debugging and monitoring.

```typescript
import { useConnectorClient } from '@connector-kit/connector';

function HealthMonitor() {
  const client = useConnectorClient();

  if (!client) return null;

  const health = client.getHealth();

  return (
    <div>
      <h3>Connector Health</h3>
      <div>Initialized: {health.initialized ? '✓' : '✗'}</div>
      <div>Wallet Standard: {health.walletStandardAvailable ? '✓' : '✗'}</div>
      <div>Storage: {health.storageAvailable ? '✓' : '✗'}</div>
      <div>Wallets Detected: {health.walletsDetected}</div>

      {health.errors.length > 0 && (
        <div className="errors">
          {health.errors.map(err => <div key={err}>{err}</div>)}
        </div>
      )}
    </div>
  );
}
```

### Wallet Adapter Compatibility

Drop-in replacement for libraries expecting @solana/wallet-adapter.

```typescript
import { useTransactionSigner, useConnector } from '@connector-kit/connector';
import { createWalletAdapterCompat } from '@connector-kit/connector/compat';

function JupiterIntegration() {
  const { signer } = useTransactionSigner();
  const { disconnect } = useConnector();

  // Create wallet-adapter compatible interface
  const walletAdapter = createWalletAdapterCompat(signer, {
    disconnect: async () => {
      await disconnect();
    },
    onError: (error, operation) => {
      console.error(`Wallet adapter error in ${operation}:`, error);
    }
  });

  // Use with Jupiter, Serum, or any wallet-adapter library
  return <JupiterTerminal wallet={walletAdapter} />;
}
```

**Compatible with**:

- Jupiter Aggregator
- Serum DEX
- Raydium
- Marinade Finance
- Any library expecting @solana/wallet-adapter

---

## Configuration

### Basic Configuration

```typescript
import { getDefaultConfig } from '@connector-kit/connector';

const config = getDefaultConfig({
    appName: 'My App', // Required
    autoConnect: true, // Auto-reconnect (default: true)
    network: 'mainnet-beta', // Initial network
    enableMobile: true, // Mobile Wallet Adapter (default: true)
    debug: false, // Debug logging

    // NEW: Custom error handler
    onError: (error, errorInfo) => {
        console.error('Connector error:', error);
        errorTracker.captureException(error, errorInfo);
    },
});
```

### Network Selection

```typescript
const config = getDefaultConfig({
    appName: 'My App',
    network: 'devnet', // 'mainnet-beta' | 'devnet' | 'testnet' | 'localnet'
});
```

### Custom Clusters

```typescript
import { getDefaultConfig, createSolanaMainnet } from '@connector-kit/connector';

const config = getDefaultConfig({
    appName: 'My App',
    clusters: [
        createSolanaMainnet({
            endpoint: 'https://my-custom-rpc.com',
        }),
    ],
    customClusters: [
        // Add additional custom clusters
    ],
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

---

## Advanced Usage

### Headless Client (Vue, Svelte, Vanilla JS)

Use `ConnectorClient` for non-React frameworks.

```typescript
import { ConnectorClient, getDefaultConfig } from '@connector-kit/connector/headless';

// Create client
const client = new ConnectorClient(getDefaultConfig({ appName: 'My App' }));

// Get state
const state = client.getSnapshot();
console.log('Wallets:', state.wallets);

// Connect
await client.select('Phantom');

// Subscribe to changes
const unsubscribe = client.subscribe(state => {
    console.log('State updated:', state);
});

// Subscribe to events (NEW!)
const unsubEvents = client.on(event => {
    console.log('Event:', event.type, event);
});

// Check health (NEW!)
const health = client.getHealth();
console.log('Health:', health);

// Disconnect
await client.disconnect();

// Cleanup
client.destroy();
```

### Unified Config (Armadura Integration)

If you're using both ConnectorKit and Armadura:

```typescript
import { createConfig, AppProvider } from '@connector-kit/connector';
import { ArmaProvider } from '@armadura/sdk';

const config = createConfig({
  appName: 'My App',
  network: 'mainnet',
  rpcUrl: 'https://my-custom-rpc.com',
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

### Custom Storage

**Most users don't need to configure storage** - it works automatically with validation, error handling, and SSR fallback.

Only customize for:

- React Native (custom storage backend)
- Additional validation rules
- Custom error tracking

```typescript
import { getDefaultConfig, createEnhancedStorageWallet, EnhancedStorageAdapter } from '@connector-kit/connector';

const config = getDefaultConfig({
    appName: 'My App',

    storage: {
        wallet: new EnhancedStorageAdapter(
            createEnhancedStorageWallet({
                validator: walletName => {
                    // Custom validation
                    return walletName !== null && walletName.length > 0;
                },
                onError: error => {
                    Sentry.captureException(error);
                },
            }),
        ),
        // account and cluster use defaults if not specified
    },
});
```

---

## Package Exports

### Main Export

```typescript
// Full library - includes React and headless
import { ConnectorProvider, useConnector } from '@connector-kit/connector';
```

### Headless Export (Framework Agnostic)

```typescript
// Headless core only - no React
import { ConnectorClient, getDefaultConfig } from '@connector-kit/connector/headless';
```

### React Export

```typescript
// React-specific exports only
import { useConnector, useAccount } from '@connector-kit/connector/react';
```

### Compatibility Layer (NEW!)

```typescript
// Wallet adapter compatibility bridge
import { createWalletAdapterCompat } from '@connector-kit/connector/compat';
```

---

## Testing

The connector package includes a comprehensive test suite built with Vitest. All tests are located in `src/__tests__/` and co-located with source files.

### Running Tests

```bash
# Run all tests
pnpm test

# Run tests in watch mode
pnpm test:watch

# Run tests with UI
pnpm test:ui

# Generate coverage report
pnpm test:coverage
```

### Test Coverage

The package maintains high test coverage:

- **Lines**: 80%+
- **Functions**: 80%+
- **Branches**: 75%+
- **Statements**: 80%+

### Test Structure

```
src/
├── lib/
│   ├── core/
│   │   ├── state-manager.ts
│   │   └── state-manager.test.ts      # Unit tests
│   └── connection/
│       ├── connection-manager.ts
│       └── connection-manager.test.ts # Unit tests
├── hooks/
│   ├── use-account.ts
│   └── use-account.test.tsx           # React hook tests
└── __tests__/
    ├── setup.ts                       # Global test setup
    ├── mocks/                         # Mock implementations
    │   ├── wallet-standard-mock.ts    # Mock wallets
    │   ├── storage-mock.ts            # Mock storage
    │   └── window-mock.ts             # Mock browser APIs
    ├── fixtures/                      # Test data
    │   ├── wallets.ts                 # Wallet fixtures
    │   ├── accounts.ts                # Account fixtures
    │   └── transactions.ts            # Transaction fixtures
    ├── utils/                         # Test helpers
    │   ├── test-helpers.ts            # Common utilities
    │   ├── react-helpers.tsx          # React test utils
    │   └── wait-for-state.ts          # State helpers
    └── integration/                   # Integration tests
        └── connector-flow.test.ts     # Full workflows
```

### Writing Tests

Example unit test:

```typescript
import { describe, it, expect } from 'vitest';
import { StateManager } from './state-manager';

describe('StateManager', () => {
    it('should update state correctly', () => {
        const manager = new StateManager(initialState);
        manager.updateState({ connected: true });

        expect(manager.getSnapshot().connected).toBe(true);
    });
});
```

Example React hook test:

```typescript
import { renderHook } from '@testing-library/react';
import { useAccount } from './use-account';
import { createHookWrapper } from '../__tests__/utils/react-helpers';

describe('useAccount', () => {
    it('should return account information', () => {
        const { result } = renderHook(() => useAccount(), {
            wrapper: createHookWrapper(),
        });

        expect(result.current.address).toBeDefined();
    });
});
```

### Test Utilities

The package provides comprehensive test utilities:

**Mock Wallets:**

```typescript
import { createMockPhantomWallet, createMockSolflareWallet } from '../mocks/wallet-standard-mock';

const wallet = createMockPhantomWallet({
    connectBehavior: 'success', // or 'error', 'timeout'
});
```

**Test Fixtures:**

```typescript
import { createTestAccounts, TEST_ADDRESSES } from '../fixtures/accounts';
import { createTestWallets } from '../fixtures/wallets';

const accounts = createTestAccounts(3);
const wallets = createTestWallets();
```

**Test Helpers:**

```typescript
import { waitForCondition, createEventCollector } from '../utils/test-helpers';

// Wait for a condition
await waitForCondition(() => state.connected, { timeout: 5000 });

// Collect events
const collector = createEventCollector();
client.on(collector.collect);
collector.assertEventEmitted('connected');
```

### Contributing Tests

All new features and bug fixes should include tests:

1. Create test file next to source file with `.test.ts` or `.test.tsx` extension
2. Follow existing patterns in similar test files
3. Ensure tests pass locally before submitting
4. Maintain or improve coverage percentage

For detailed testing guidelines, see [Testing Guide](src/__tests__/README.md).

---

## Complete API Reference

### Configuration Functions

#### `getDefaultConfig(options)`

```typescript
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
  onError?: (error, errorInfo) => void    // Error handler (NEW!)
});
```

### Transaction Signing API (NEW!)

#### `useTransactionSigner()`

React hook for transaction operations.

```typescript
interface UseTransactionSignerReturn {
    signer: TransactionSigner | null; // Signer instance
    ready: boolean; // Whether signer is ready
    address: string | null; // Current address
    capabilities: TransactionSignerCapabilities; // What signer can do
}
```

#### `createTransactionSigner(config)`

Create a transaction signer (headless).

```typescript
import { createTransactionSigner } from '@connector-kit/connector/headless';

const signer = createTransactionSigner({
    wallet: connectedWallet,
    account: selectedAccount,
    cluster: currentCluster, // Optional
});
```

#### `TransactionSigner` Interface

```typescript
interface TransactionSigner {
    readonly address: string;

    signTransaction(tx: any): Promise<any>;
    signAllTransactions(txs: any[]): Promise<any[]>;
    signAndSendTransaction(tx: any, options?: SendOptions): Promise<string>;
    signAndSendTransactions(txs: any[], options?: SendOptions): Promise<string[]>;
    signMessage?(message: Uint8Array): Promise<Uint8Array>;

    getCapabilities(): TransactionSignerCapabilities;
}
```

### Event System API (NEW!)

#### Event Types

```typescript
type ConnectorEvent =
    | { type: 'wallet:connected'; wallet: string; account: string; timestamp: string }
    | { type: 'wallet:disconnected'; timestamp: string }
    | { type: 'cluster:changed'; cluster: string; previousCluster: string | null; timestamp: string }
    | { type: 'wallets:detected'; count: number; timestamp: string }
    | { type: 'connecting'; wallet: string; timestamp: string }
    | { type: 'connection:failed'; wallet: string; error: string; timestamp: string }
    | { type: 'error'; error: Error; context: string; timestamp: string };
```

#### Methods

```typescript
// Subscribe to events
const unsubscribe = client.on(event => {
    console.log('Event:', event.type, event);
});

// Unsubscribe
client.off(listener);

// Unsubscribe all
client.offAll();
```

### Health Check API (NEW!)

```typescript
interface ConnectorHealth {
    initialized: boolean;
    walletStandardAvailable: boolean;
    storageAvailable: boolean;
    walletsDetected: number;
    errors: string[];
    connectionState: {
        connected: boolean;
        connecting: boolean;
        hasSelectedWallet: boolean;
        hasSelectedAccount: boolean;
    };
    timestamp: string;
}

// Get health status
const health = client.getHealth();
```

### Connection Pool API (NEW!)

```typescript
class ConnectionPool {
    get(cluster: SolanaCluster): ConnectionLike;
    has(clusterId: string): boolean;
    clear(clusterId: string): void;
    clearAll(): void;
    getStats(): ConnectionPoolStats;
    resetStats(): void;
}

// Create pool
const pool = createConnectionPool(options);

// Get global pool
const pool = getConnectionPool();
```

### Wallet Adapter Compat API (NEW!)

```typescript
// Create wallet-adapter compatible interface
createWalletAdapterCompat(
  signer: TransactionSigner | null,
  options: {
    disconnect: () => Promise<void>;
    transformTransaction?: (tx: any) => any;
    onError?: (error: Error, operation: string) => void;
  }
): WalletAdapterCompatible

// React hook version
useWalletAdapterCompat(
  signer: TransactionSigner | null,
  disconnect: () => Promise<void>,
  options?: Omit<WalletAdapterCompatOptions, 'disconnect'>
): WalletAdapterCompatible

// Type guard
isWalletAdapterCompatible(obj: any): obj is WalletAdapterCompatible
```

### Polyfill API (NEW!)

```typescript
import {
    installPolyfills,
    isPolyfillInstalled,
    isCryptoAvailable,
    getPolyfillStatus,
} from '@connector-kit/connector/headless';

// Install browser polyfills (automatic in React provider)
installPolyfills();

// Check status
const installed = isPolyfillInstalled();
const cryptoAvailable = isCryptoAvailable();
const status = getPolyfillStatus();
```

### Utility Functions

#### Formatting

```typescript
import { formatSOL, formatAddress } from '@connector-kit/connector';

// Format SOL amounts
formatSOL(1500000000, { decimals: 4 }); // "1.5000 SOL"

// Format addresses
formatAddress(address, { length: 6 }); // "5Gv8yU...8x3kF"

// Lightweight versions (smaller bundle, no Intl)
import { formatSOLSimple, formatAddressSimple } from '@connector-kit/connector';
```

#### Clipboard

```typescript
import { copyAddressToClipboard, copyToClipboard } from '@connector-kit/connector';

await copyAddressToClipboard(address);
await copyToClipboard(text);
```

#### Cluster Utilities

```typescript
import {
    getClusterRpcUrl,
    getClusterExplorerUrl,
    getTransactionUrl,
    getAddressUrl,
    isMainnetCluster,
    isDevnetCluster,
} from '@connector-kit/connector';

const rpcUrl = getClusterRpcUrl(cluster);
const explorerUrl = getClusterExplorerUrl(cluster);
const txUrl = getTransactionUrl(cluster, signature);
const addrUrl = getAddressUrl(cluster, address);
```

### Types

```typescript
import type {
    // Configuration
    ConnectorConfig,
    DefaultConfigOptions,
    ExtendedConnectorConfig,
    UnifiedConfig,
    MobileWalletAdapterConfig,

    // State & Info
    ConnectorState,
    ConnectorSnapshot,
    WalletInfo,
    AccountInfo,
    ConnectorHealth, // NEW!

    // Events
    ConnectorEvent, // NEW!
    ConnectorEventListener, // NEW!

    // Transaction Signing
    TransactionSigner, // NEW!
    TransactionSignerConfig, // NEW!
    TransactionSignerCapabilities, // NEW!
    SignedTransaction, // NEW!

    // Connection Pooling
    ConnectionLike, // NEW!
    ConnectionPoolOptions, // NEW!
    ConnectionPoolStats, // NEW!

    // Wallet Adapter Compat
    WalletAdapterCompatible, // NEW!
    WalletAdapterCompatOptions, // NEW!

    // Wallet Standard
    Wallet,
    WalletAccount,

    // Clusters
    SolanaCluster,
    SolanaClusterId,

    // Storage
    StorageAdapter,

    // Hook Returns
    UseClusterReturn,
    UseAccountReturn,
    UseWalletInfoReturn,
    UseTransactionSignerReturn, // NEW!

    // Errors
    WalletError,
} from '@connector-kit/connector';
```

---

## Performance

### Bundle Size

| Component            | Size (gzipped) | Tree-Shakeable     |
| -------------------- | -------------- | ------------------ |
| **Base Connector**   | ~45KB          | ✅                 |
| + Polyfills          | +2KB           | ❌ (auto-included) |
| + Transaction Signer | +3KB           | ✅                 |
| + Connection Pool    | +1.5KB         | ✅                 |
| + Debug Panel        | +2KB           | ✅ (dev-only)      |
| + Event System       | +0.5KB         | ✅                 |
| + Compat Layer       | +2KB           | ✅                 |

**Total**: ~48-53KB for typical production usage

### Runtime Performance

- **40-60% fewer re-renders** via optimized state updates
- **Connection pooling** reduces memory usage and initialization overhead
- **Automatic tree-shaking** excludes unused features
- **Debug panel** automatically excluded in production builds

---

## Browser Compatibility

Enhanced support for:

- ✅ Chrome/Edge 90+
- ✅ Firefox 88+
- ✅ Safari 14+
- ✅ iOS Safari 14+
- ✅ Chrome Mobile 90+
- ✅ Samsung Internet 15+

Automatic polyfills ensure compatibility across all environments.

---

## Migration from @solana/wallet-adapter

Using the wallet-adapter compatibility bridge for gradual migration:

```typescript
// Before (wallet-adapter)
import { useWallet } from '@solana/wallet-adapter-react';

const { publicKey, sendTransaction } = useWallet();
await sendTransaction(tx, connection);

// After (connector-kit)
import { useTransactionSigner } from '@connector-kit/connector';

const { signer } = useTransactionSigner();
await signer.signAndSendTransaction(tx);

// Or use compatibility bridge for existing integrations
import { createWalletAdapterCompat } from '@connector-kit/connector/compat';

const walletAdapter = createWalletAdapterCompat(signer, { disconnect });
// Pass walletAdapter to existing wallet-adapter code
```

---

## Examples

Check out the [examples directory](../../examples/react) for:

- Complete wallet connection UI with shadcn/ui
- Transaction signing demos
- Network switching
- Account management
- Mobile wallet support

---

## Development

```bash
pnpm install     # Install dependencies
pnpm build       # Build package
pnpm dev         # Development mode with watch
pnpm type-check  # TypeScript validation
pnpm lint        # Lint code
pnpm size        # Check bundle size
```

---

## Supported Wallets

Compatible with all [Wallet Standard](https://github.com/wallet-standard/wallet-standard) compliant wallets:

- Phantom
- Solflare
- Backpack
- Glow
- Brave Wallet
- Solana Mobile wallets
- Any Wallet Standard compatible wallet

---

## Documentation

- [Full Documentation](https://connectorkit.dev)
- [API Reference](#complete-api-reference) (above)
- [Examples](../../examples/react)
- [Wallet Standard Spec](https://github.com/wallet-standard/wallet-standard)

---

## License

MIT

---

**Built with ❤️ and attention to detail**
