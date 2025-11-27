---
title: @solana/connector
description: Production-ready wallet connector for Solana applications
---

**ConnectorKit is your Solana wallet infrastructure.** A headless, framework-agnostic wallet connector built on Wallet Standard that just work.

![npm](https://img.shields.io/npm/v/@solana/connector)
![Bundle Size](https://img.shields.io/badge/bundle-~45KB-gzip-green)
![TypeScript](https://img.shields.io/badge/TypeScript-100%25-blue)

### Why ConnectorKit?

- **Wallet Standard First**: Built on the official Wallet Standard protocol for universal wallet compatibility
- **Modern & Legacy Support**: Works with both `@solana/kit` (web3.js 2.0) and `@solana/web3.js` (legacy)
- **Framework Agnostic**: React hooks + headless core for Vue, Svelte, or vanilla JavaScript
- **Production Ready**: Event system for analytics, health checks for diagnostics, error boundaries for React apps
- **Enhanced Storage**: Automatic validation, SSR fallback, and error handling out of the box
- **Mobile Support**: Built-in Solana Mobile Wallet Adapter integration

---

## Quick Start

### 1. Install

```bash
npm install @solana/connector
# or
pnpm add @solana/connector
# or
yarn add @solana/connector
# or 
bun add @solana/connector
```

### 2. Setup Provider (once in your app root)

```typescript
'use client';

import { useMemo } from 'react';
import { AppProvider } from '@solana/connector/react';
import { getDefaultConfig, getDefaultMobileConfig } from '@solana/connector/headless';

export function Providers({ children }: { children: React.ReactNode }) {
    const connectorConfig = useMemo(() => {
        // Optional: Get custom RPC URL from environment variable
        const customRpcUrl = process.env.SOLANA_RPC_URL;

        // Optional: Create custom cluster configuration
        const clusters = customRpcUrl
            ? [
                  {
                      id: 'solana:mainnet' as const,
                      label: 'Mainnet (Custom RPC)',
                      name: 'mainnet-beta' as const,
                      url: customRpcUrl,
                  },
                  {
                      id: 'solana:devnet' as const,
                      label: 'Devnet',
                      name: 'devnet' as const,
                      url: 'https://api.devnet.solana.com',
                  },
              ]
            : undefined;

        return getDefaultConfig({
            appName: 'My App',
            appUrl: 'https://myapp.com',
            autoConnect: true,
            enableMobile: true,
            clusters,
        });
    }, []);

    const mobile = useMemo(
        () =>
            getDefaultMobileConfig({
                appName: 'My App',
                appUrl: 'https://myapp.com',
            }),
        [],
    );

    return (
        <AppProvider connectorConfig={connectorConfig} mobile={mobile}>
            {children}
        </AppProvider>
    );
}
```

### 3. Use Hooks (in any component)

```typescript
'use client';

import { useConnector, useAccount } from '@solana/connector';

export function ConnectButton() {
    const { wallets, select, disconnect, connected, connecting, selectedWallet, selectedAccount } = useConnector();
    const { address, formatted, copy } = useAccount();

    if (connecting) {
        return <button disabled>Connecting...</button>;
    }

    if (!connected) {
        return (
            <div>
                {wallets.map(w => (
                    <button key={w.wallet.name} onClick={() => select(w.wallet.name)}>
                        Connect {w.wallet.name}
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
import { useConnector } from '@solana/connector';

function Component() {
    const {
        // State
        wallets, // WalletInfo[] - All available wallets
        selectedWallet, // Wallet | null - Currently connected wallet
        selectedAccount, // string | null - Currently selected account address
        accounts, // AccountInfo[] - Connected accounts
        connected, // boolean - Connection status
        connecting, // boolean - Connecting in progress

        // Actions
        select, // (walletName: string) => Promise<void>
        disconnect, // () => Promise<void>
    } = useConnector();
}
```

**Real Example** - Connect Button with wallet selection:

```typescript
'use client';

import { useConnector } from '@solana/connector';
import { useState } from 'react';

export function ConnectButton() {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const { connected, connecting, selectedWallet, selectedAccount, wallets, select } = useConnector();

    if (connecting) {
        return <button disabled>Connecting...</button>;
    }

    if (connected && selectedAccount && selectedWallet) {
        const shortAddress = `${selectedAccount.slice(0, 4)}...${selectedAccount.slice(-4)}`;
        return (
            <div>
                <span>{shortAddress}</span>
                <button onClick={() => select(selectedWallet.name)}>Switch Wallet</button>
            </div>
        );
    }

    return (
        <>
            <button onClick={() => setIsModalOpen(true)}>Connect Wallet</button>
            {/* Wallet selection modal */}
        </>
    );
}
```

### `useAccount()`

Hook for working with the connected account.

```typescript
import { useAccount } from '@solana/connector';

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

**Real Example** - Account Switcher for multi-account wallets:

```typescript
'use client';

import { useAccount } from '@solana/connector';

export function AccountSwitcher() {
    const { accounts, address, selectAccount, connected } = useAccount();

    if (!connected || accounts.length <= 1) {
        return null;
    }

    return (
        <select
            value={address || ''}
            onChange={e => selectAccount(e.target.value)}
        >
            {accounts.map(account => (
                <option key={account.address} value={account.address}>
                    {account.address.slice(0, 6)}...{account.address.slice(-6)}
                </option>
            ))}
        </select>
    );
}
```

### `useCluster()`

Hook for managing Solana network/cluster.

```typescript
import { useCluster } from '@solana/connector';

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

**Real Example** - Network Selector:

```typescript
'use client';

import { useCluster } from '@solana/connector';

export function ClusterSelector() {
    const { cluster, clusters, setCluster } = useCluster();

    return (
        <select
            value={cluster?.id || ''}
            onChange={e => setCluster(e.target.value as SolanaClusterId)}
        >
            {clusters.map(c => (
                <option key={c.id} value={c.id}>
                    {c.label}
                </option>
            ))}
        </select>
    );
}
```

### `useWalletInfo()`

Hook for accessing current wallet metadata.

```typescript
import { useWalletInfo } from '@solana/connector';

function Component() {
    const {
        name, // string | null - Wallet name
        icon, // string | undefined - Wallet icon URL
        wallet, // WalletInfo | null - Full wallet info
        connecting, // boolean - Connection in progress
    } = useWalletInfo();
}
```

---

## Transaction Signing

ConnectorKit provides powerful transaction signing capabilities with support for both legacy `@solana/web3.js` and modern `@solana/kit` APIs.

### Modern API (`@solana/kit`)

Use `useKitTransactionSigner()` for modern, type-safe transaction building:

```typescript
'use client';

import { useState } from 'react';
import {
    address,
    createSolanaRpc,
    pipe,
    createTransactionMessage,
    setTransactionMessageFeePayerSigner,
    setTransactionMessageLifetimeUsingBlockhash,
    appendTransactionMessageInstructions,
    sendAndConfirmTransactionFactory,
    getSignatureFromTransaction,
    signTransactionMessageWithSigners,
    createSolanaRpcSubscriptions,
    lamports,
    assertIsTransactionWithBlockhashLifetime,
} from '@solana/kit';
import { getTransferSolInstruction } from '@solana-program/system';
import { useKitTransactionSigner, useCluster, useConnectorClient, LAMPORTS_PER_SOL } from '@solana/connector';

export function ModernSolTransfer() {
    const { signer, ready } = useKitTransactionSigner();
    const { cluster } = useCluster();
    const client = useConnectorClient();
    const [signature, setSignature] = useState<string | null>(null);

    async function handleTransfer(recipientAddress: string, amount: number) {
        if (!signer || !client) {
            throw new Error('Wallet not connected');
        }

        // Get RPC URL from connector client
        const rpcUrl = client.getRpcUrl();
        if (!rpcUrl) {
            throw new Error('No RPC endpoint configured');
        }

        // Create RPC client using web3.js 2.0
        const rpc = createSolanaRpc(rpcUrl);
        const rpcSubscriptions = createSolanaRpcSubscriptions(rpcUrl.replace('http', 'ws'));

        // Get recent blockhash
        const { value: latestBlockhash } = await rpc.getLatestBlockhash().send();

        // Convert SOL to lamports
        const amountInLamports = lamports(BigInt(Math.floor(amount * Number(LAMPORTS_PER_SOL))));

        // Create transfer instruction
        const transferInstruction = getTransferSolInstruction({
            source: signer,
            destination: address(recipientAddress),
            amount: amountInLamports,
        });

        // Build transaction message
        const transactionMessage = pipe(
            createTransactionMessage({ version: 0 }),
            tx => setTransactionMessageFeePayerSigner(signer, tx),
            tx => setTransactionMessageLifetimeUsingBlockhash(latestBlockhash, tx),
            tx => appendTransactionMessageInstructions([transferInstruction], tx),
        );

        // Sign transaction
        const signedTransaction = await signTransactionMessageWithSigners(transactionMessage);

        // Send and confirm
        assertIsTransactionWithBlockhashLifetime(signedTransaction);
        await sendAndConfirmTransactionFactory({ rpc, rpcSubscriptions })(signedTransaction, {
            commitment: 'confirmed',
        });

        const transactionSignature = getSignatureFromTransaction(signedTransaction);
        setSignature(transactionSignature);
    }

    return (
        <div>
            {/* Your form UI */}
            <button onClick={() => handleTransfer('...', 0.1)} disabled={!ready}>
                Send SOL
            </button>
            {signature && <div>Transaction: {signature}</div>}
        </div>
    );
}
```

### Legacy API (`@solana/web3.js`)

Use `useTransactionSigner()` for legacy web3.js compatibility:

```typescript
import { useTransactionSigner } from '@solana/connector';
import { Transaction, SystemProgram } from '@solana/web3.js';

function SendTransaction() {
    const { signer, ready } = useTransactionSigner();

    const handleSend = async () => {
        if (!signer) return;

        const transaction = new Transaction().add(
            SystemProgram.transfer({
                fromPubkey: signer.address,
                toPubkey: recipientPubkey,
                lamports: 1000000,
            })
        );

        const signature = await signer.signAndSendTransaction(transaction);
        console.log('Transaction sent:', signature);
    };

    return <button onClick={handleSend} disabled={!ready}>Send</button>;
}
```

---

## UI Elements

ConnectorKit provides composable UI elements that handle data fetching and state management for you. Use the render prop pattern to customize the UI.

### Available Elements

- `BalanceElement` - Display SOL balance with refresh
- `ClusterElement` - Network/cluster selector
- `TokenListElement` - List of SPL tokens
- `TransactionHistoryElement` - Recent transaction history
- `DisconnectElement` - Disconnect button
- `AccountElement` - Account display and switcher
- `WalletListElement` - List of available wallets

### Example: Wallet Dropdown

```typescript
'use client';

import {
    BalanceElement,
    ClusterElement,
    TokenListElement,
    TransactionHistoryElement,
    DisconnectElement,
} from '@solana/connector/react';

export function WalletDropdown() {
    return (
        <div className="wallet-dropdown">
            {/* Balance */}
            <BalanceElement
                render={({ solBalance, isLoading, refetch }) => (
                    <div>
                        <div>Balance: {isLoading ? '...' : `${solBalance?.toFixed(4)} SOL`}</div>
                        <button onClick={refetch}>Refresh</button>
                    </div>
                )}
            />

            {/* Network Selector */}
            <ClusterElement
                render={({ cluster, clusters, setCluster }) => (
                    <select value={cluster?.id} onChange={e => setCluster(e.target.value)}>
                        {clusters.map(c => (
                            <option key={c.id} value={c.id}>
                                {c.label}
                            </option>
                        ))}
                    </select>
                )}
            />

            {/* Tokens */}
            <TokenListElement
                limit={5}
                render={({ tokens, isLoading }) => (
                    <div>
                        {isLoading ? (
                            <div>Loading tokens...</div>
                        ) : (
                            tokens.map(token => (
                                <div key={token.mint}>
                                    {token.symbol}: {token.formatted}
                                </div>
                            ))
                        )}
                    </div>
                )}
            />

            {/* Transaction History */}
            <TransactionHistoryElement
                limit={5}
                render={({ transactions, isLoading }) => (
                    <div>
                        {isLoading ? (
                            <div>Loading transactions...</div>
                        ) : (
                            transactions.map(tx => (
                                <a key={tx.signature} href={tx.explorerUrl} target="_blank">
                                    {tx.type} - {tx.formattedTime}
                                </a>
                            ))
                        )}
                    </div>
                )}
            />

            {/* Disconnect */}
            <DisconnectElement
                render={({ disconnect, disconnecting }) => (
                    <button onClick={disconnect} disabled={disconnecting}>
                        {disconnecting ? 'Disconnecting...' : 'Disconnect'}
                    </button>
                )}
            />
        </div>
    );
}
```

---

## Configuration

### Basic Configuration

```typescript
import { getDefaultConfig } from '@solana/connector';

const config = getDefaultConfig({
    appName: 'My App', // Required
    appUrl: 'https://myapp.com', // Optional: for mobile wallet adapter
    autoConnect: true, // Auto-reconnect (default: true)
    network: 'mainnet-beta', // Initial network (default: 'mainnet-beta')
    enableMobile: true, // Mobile Wallet Adapter (default: true)
    debug: false, // Debug logging
});
```

### Network Selection

```typescript
const config = getDefaultConfig({
    appName: 'My App',
    network: 'devnet', // 'mainnet-beta' | 'devnet' | 'testnet' | 'localnet'
});
```

### Custom RPC Endpoints

```typescript
import { getDefaultConfig } from '@solana/connector';

const config = getDefaultConfig({
    appName: 'My App',
    clusters: [
        {
            id: 'solana:mainnet' as const,
            label: 'Mainnet (Custom RPC)',
            name: 'mainnet-beta' as const,
            url: 'https://my-custom-rpc.com',
        },
        {
            id: 'solana:devnet' as const,
            label: 'Devnet',
            name: 'devnet' as const,
            url: 'https://api.devnet.solana.com',
        },
    ],
});
```

### Mobile Wallet Adapter

```typescript
import { getDefaultMobileConfig } from '@solana/connector/headless';

const mobile = getDefaultMobileConfig({
    appName: 'My App',
    appUrl: 'https://myapp.com',
});

<AppProvider connectorConfig={config} mobile={mobile}>
    {children}
</AppProvider>
```

---

## Advanced Usage

### Headless Client (Vue, Svelte, Vanilla JS)

Use `ConnectorClient` for non-React frameworks:

```typescript
import { ConnectorClient, getDefaultConfig } from '@solana/connector/headless';

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

// Disconnect
await client.disconnect();

// Cleanup
client.destroy();
```

### Custom Storage (React Native, SSR)

Storage uses nanostores with built-in enhancements that are **automatically applied**:

- Validation (Solana address format checking)
- Error handling (catches localStorage quota errors, private browsing)
- SSR fallback (uses memory storage when localStorage unavailable)

**Most users don't need to configure storage.** Only customize for:

- React Native (custom storage backend)
- Additional validation rules
- Custom error tracking

```typescript
import { getDefaultConfig, createEnhancedStorageWallet, EnhancedStorageAdapter } from '@solana/connector';

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
                    // Custom error tracking
                    Sentry.captureException(error);
                },
            }),
        ),
    },
});
```

---

## Package Exports

### Main Export

```typescript
// Full library - includes React and headless
import { ConnectorProvider, useConnector, useAccount } from '@solana/connector';
```

### Headless Export (Framework Agnostic)

```typescript
// Headless core only - no React
import { ConnectorClient, getDefaultConfig } from '@solana/connector/headless';
```

### React Export

```typescript
// React-specific exports only
import { useConnector, useAccount } from '@solana/connector/react';
```

---

## API Reference

### Hooks

| Hook | Description | Returns |
|------|-------------|---------|
| `useConnector()` | Main wallet connection hook | `{ wallets, selectedWallet, accounts, connected, connecting, select, disconnect }` |
| `useAccount()` | Account management hook | `{ address, formatted, copy, copied, accounts, selectAccount }` |
| `useCluster()` | Network/cluster management hook | `{ cluster, clusters, setCluster, isMainnet, isDevnet, rpcUrl }` |
| `useWalletInfo()` | Wallet metadata hook | `{ name, icon, wallet, connecting }` |
| `useTransactionSigner()` | Legacy transaction signer (web3.js) | `{ signer, ready, address, capabilities }` |
| `useKitTransactionSigner()` | Modern transaction signer (@solana/kit) | `{ signer, ready, address }` |
| `useBalance()` | SOL balance hook | `{ solBalance, isLoading, refetch }` |
| `useTokens()` | SPL tokens hook | `{ tokens, isLoading, refetch }` |
| `useTransactions()` | Transaction history hook | `{ transactions, isLoading, refetch }` |

### Configuration Functions

| Function | Description |
|----------|-------------|
| `getDefaultConfig(options)` | Create default connector configuration |
| `getDefaultMobileConfig(options)` | Create mobile wallet adapter configuration |
| `createConfig(options)` | Create unified config for ConnectorKit + Armadura |

### Utility Functions

| Function | Description |
|----------|-------------|
| `formatAddress(address, options?)` | Format Solana address |
| `formatSOL(lamports, options?)` | Format SOL amount |
| `copyAddressToClipboard(address)` | Copy address to clipboard |
| `getTransactionUrl(cluster, signature)` | Get Solana Explorer transaction URL |
| `getAddressUrl(cluster, address)` | Get Solana Explorer address URL |

---

## Types

```typescript
import type {
    // Configuration
    ConnectorConfig,
    DefaultConfigOptions,
    UnifiedConfig,

    // State & Info
    ConnectorState,
    ConnectorSnapshot,
    WalletInfo,
    AccountInfo,

    // Wallet Standard
    Wallet,
    WalletAccount,

    // Clusters
    SolanaCluster,
    SolanaClusterId,

    // Hook Returns
    UseClusterReturn,
    UseAccountReturn,
    UseWalletInfoReturn,
    UseTransactionSignerReturn,
    UseKitTransactionSignerReturn,
} from '@solana/connector';
```

---

## Development

### Commands

```bash
# Install dependencies
pnpm install

# Build package
pnpm build

# Development mode with watch
pnpm dev

# Type checking
pnpm type-check

# Linting
pnpm lint

# Run tests
pnpm test

# Test in watch mode
pnpm test:watch

# Coverage report
pnpm test:coverage

# Check bundle size
pnpm size
```

---

## Examples

Check out the [examples directory](../../examples/next-js) for complete working examples:

- **Next.js Example** - Full-featured wallet connection UI with shadcn/ui
- **Transaction Signing** - Modern and legacy transaction examples
- **Network Switching** - Cluster/network management
- **Account Management** - Multi-account support
- **Mobile Support** - Solana Mobile Wallet Adapter

---

## Supported Wallets

Compatible with all [Wallet Standard](https://github.com/wallet-standard/wallet-standard) compliant wallets:

- **Phantom** - Browser extension and mobile
- **Solflare** - Browser extension and mobile
- **Backpack** - xNFT and wallet
- **Glow** - Browser extension
- **Brave Wallet** - Built-in browser wallet
- **Solana Mobile** - All mobile wallet adapter compatible wallets
- **Any Wallet Standard wallet** - Full compatibility

---

## License

MIT
