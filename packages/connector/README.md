---
title: '@solana/connector'
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
                      url: customRpcUrl,
                  },
                  {
                      id: 'solana:devnet' as const,
                      label: 'Devnet',
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

import { useConnector } from '@solana/connector/react';

export function ConnectButton() {
    const {
        connectors,
        connectWallet,
        disconnectWallet,
        isConnected,
        isConnecting,
        isError,
        walletError,
        account,
    } = useConnector();

    if (isError) {
        return (
            <div>
                <p>Error: {walletError?.message ?? 'Unknown error'}</p>
            </div>
        );
    }

    if (!isConnected) {
        return (
            <div>
                {connectors.map(connector => (
                    <button
                        key={connector.id}
                        onClick={() => connectWallet(connector.id)}
                        disabled={isConnecting || !connector.ready}
                    >
                        {isConnecting ? 'Connecting...' : `Connect ${connector.name}`}
                    </button>
                ))}
            </div>
        );
    }

    return (
        <div>
            <span>{account}</span>
            <button onClick={disconnectWallet}>
                Disconnect
            </button>
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
import { useConnector } from '@solana/connector/react';

function Component() {
    const {
        // vNext state (recommended)
        connectors, // WalletConnectorMetadata[] - available wallet connectors
        walletStatus, // WalletStatus - discriminated union state machine
        connectorId, // WalletConnectorId | null - connected connector id
        connector, // WalletConnectorMetadata | null - connected connector metadata
        account, // Address | null - selected account address
        sessionAccounts, // SessionAccount[] - all accounts in session
        isConnected, // boolean - shorthand
        isConnecting, // boolean - shorthand
        isError, // boolean - shorthand
        walletError, // Error | null - set when status is 'error'

        // vNext actions (recommended)
        connectWallet, // (connectorId, options?) => Promise<void>
        disconnectWallet, // () => Promise<void>

        // Legacy fields (deprecated; kept for backwards compatibility)
        wallets,
        selectedWallet,
        selectedAccount,
        accounts,
        connected,
        connecting,

        // Legacy actions (deprecated; kept for backwards compatibility)
        select,
        disconnect,
    } = useConnector();
}
```

**Real Example** - Connect Button with wallet selection:

```typescript
'use client';

import { useConnector } from '@solana/connector/react';

export function ConnectButton() {
    const { connectors, connectWallet, disconnectWallet, isConnected, isConnecting, account } = useConnector();

    if (isConnecting) {
        return <button disabled>Connecting...</button>;
    }

    if (isConnected && account) {
        const shortAddress = `${account.slice(0, 4)}...${account.slice(-4)}`;
        return (
            <div>
                <span>{shortAddress}</span>
                <button onClick={disconnectWallet}>Disconnect</button>
            </div>
        );
    }

    return (
        <div>
            {connectors.map(connector => (
                <button
                    key={connector.id}
                    onClick={() => connectWallet(connector.id)}
                    disabled={isConnecting || !connector.ready}
                >
                    Connect {connector.name}
                </button>
            ))}
        </div>
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

## vNext API (Recommended)

The vNext API provides a cleaner, more type-safe approach to wallet connections using stable connector IDs and a wallet status state machine.

You can access the same vNext state + actions either through the focused hooks below, or via `useConnector()` (single hook) which also includes legacy compatibility fields.

### `useWallet()`

Primary hook for wallet status in vNext. Uses a discriminated union for type-safe status checks.

```typescript
import { useWallet } from '@solana/connector/react';

function Component() {
    const {
        status,      // 'disconnected' | 'connecting' | 'connected' | 'error'
        isConnected, // boolean shorthand
        isConnecting,// boolean shorthand
        account,     // Address | null - Selected account address
        accounts,    // SessionAccount[] - All available accounts
        connectorId, // WalletConnectorId | null - Connected wallet ID
        error,       // Error | null - Error if status is 'error'
    } = useWallet();

    if (status === 'connected') {
        // TypeScript knows account is non-null here
        return <p>Connected: {account}</p>;
    }
}
```

### `useWalletConnectors()`

Get available wallet connectors with stable IDs.

```typescript
import { useWalletConnectors } from '@solana/connector/react';

function WalletList() {
    const connectors = useWalletConnectors();

    return (
        <ul>
            {connectors.map(connector => (
                <li key={connector.id}>
                    <img src={connector.icon} alt={connector.name} />
                    {connector.name}
                    {connector.ready ? '✓' : 'Not Ready'}
                </li>
            ))}
        </ul>
    );
}
```

### `useConnectWallet()`

Connect to a wallet using its stable connector ID.

```typescript
import { useConnectWallet, useWalletConnectors } from '@solana/connector/react';

function ConnectButton() {
    const { connect, isConnecting, error, resetError } = useConnectWallet();
    const connectors = useWalletConnectors();

    return (
        <div>
            {connectors.map(connector => (
                <button
                    key={connector.id}
                    onClick={() => connect(connector.id)}
                    disabled={isConnecting || !connector.ready}
                >
                    Connect {connector.name}
                </button>
            ))}
            {error && (
                <p>
                    Error: {error.message}
                    <button onClick={resetError}>Dismiss</button>
                </p>
            )}
        </div>
    );
}
```

### `useDisconnectWallet()`

Disconnect the current wallet session.

```typescript
import { useDisconnectWallet, useWallet } from '@solana/connector/react';

function DisconnectButton() {
    const { isConnected } = useWallet();
    const { disconnect, isDisconnecting } = useDisconnectWallet();

    if (!isConnected) return null;

    return (
        <button onClick={disconnect} disabled={isDisconnecting}>
            {isDisconnecting ? 'Disconnecting...' : 'Disconnect'}
        </button>
    );
}
```

### Silent-First Auto-Connect

The vNext API supports silent-first auto-connect, which attempts to reconnect without prompting the user:

```typescript
const { connect } = useConnectWallet();

// Silent connect (won't prompt user)
await connect('wallet-standard:phantom', {
    silent: true,
    allowInteractiveFallback: false,
});

// Silent-first with interactive fallback (prompts if silent fails)
await connect('wallet-standard:phantom', {
    silent: true,
    allowInteractiveFallback: true,
});
```

---

## Migration Guide (Legacy → vNext)

### Connect by Wallet Name → Connect by Connector ID

**Before (Legacy):**

```typescript
const { select, wallets } = useConnector();
await select('Phantom');
```

**After (vNext):**

```typescript
const { connect } = useConnectWallet();
await connect('wallet-standard:phantom');
// Or use connectors from useWalletConnectors()
```

### Check Connection Status

**Before (Legacy):**

```typescript
const { connected, connecting } = useConnector();
if (connected) {
    /* ... */
}
```

**After (vNext):**

```typescript
const { status, isConnected, isConnecting } = useWallet();
if (status === 'connected') {
    /* ... */
}
// Or use the boolean shorthand:
if (isConnected) {
    /* ... */
}
```

### Get Selected Account

**Before (Legacy):**

```typescript
const { selectedAccount } = useConnector();
```

**After (vNext):**

```typescript
const { account } = useWallet();
// Or for full account info:
const { accounts, account } = useWallet();
```

### Disconnect

**Before (Legacy):**

```typescript
const { disconnect } = useConnector();
await disconnect();
```

**After (vNext):**

```typescript
const { disconnect } = useDisconnectWallet();
await disconnect();
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
            url: 'https://my-custom-rpc.com',
        },
        {
            id: 'solana:devnet' as const,
            label: 'Devnet',
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

### WalletConnect Integration

Connect mobile wallets via QR code or deep link using WalletConnect. This enables users to connect wallets like Trust Wallet, Exodus, and other WalletConnect-compatible Solana wallets.

**1. Install WalletConnect dependency:**

```bash
npm install @walletconnect/universal-provider
```

**2. Get a WalletConnect Cloud Project ID:**

Visit [cloud.walletconnect.com](https://cloud.walletconnect.com/) and create a project to get your `projectId`.

**3. Enable WalletConnect in your config:**

```typescript
'use client';

import { getDefaultConfig } from '@solana/connector/headless';
import { useMemo } from 'react';
import { AppProvider } from '@solana/connector/react';

export function Providers({ children }: { children: React.ReactNode }) {
    const connectorConfig = useMemo(() => {
        return getDefaultConfig({
            appName: 'My App',
            appUrl: 'https://myapp.com',
            // Reads NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID from env
            walletConnect: true,
        });
    }, []);

    return (
        <AppProvider connectorConfig={connectorConfig}>
            {children}
            <WalletConnectQRModal />
        </AppProvider>
    );
}
```

**4. Render a QR code when a pairing URI is available:**

```typescript
'use client';

import { useConnector } from '@solana/connector/react';
import { QRCodeSVG } from 'qrcode.react'; // npm install qrcode.react

export function WalletConnectQRModal() {
    const { walletConnectUri, clearWalletConnectUri } = useConnector();

    if (!walletConnectUri) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <div className="w-full max-w-sm rounded-xl bg-white p-6">
                <h2 className="text-lg font-semibold">Scan with your wallet</h2>
                <div className="mt-4 flex justify-center">
                    <QRCodeSVG value={walletConnectUri} size={256} />
                </div>
                <p className="mt-4 text-center text-sm text-gray-500">
                    Open your WalletConnect-compatible wallet and scan this QR code
                </p>
                <button
                    type="button"
                    onClick={clearWalletConnectUri}
                    className="mt-4 w-full rounded bg-gray-100 py-2"
                >
                    Cancel
                </button>
            </div>
        </div>
    );
}
```

Once enabled, "WalletConnect" appears as a connector (id: `walletconnect`) in your wallet list. When selected, `useConnector().walletConnectUri` will be set to a `wc:` URI that you can display as a QR code or use for deep linking.

**Supported WalletConnect Solana methods:**

- `solana_getAccounts` / `solana_requestAccounts` - Get connected accounts
- `solana_signMessage` - Sign arbitrary messages
- `solana_signTransaction` - Sign transactions
- `solana_signAllTransactions` - Sign multiple transactions
- `solana_signAndSendTransaction` - Sign and broadcast transactions

See the [WalletConnect Solana documentation](https://docs.walletconnect.network/wallet-sdk/chain-support/solana) for more details.

---

## Security Considerations

### RPC API Key Protection

If you're using a paid RPC provider (Helius, QuickNode, etc.), avoid exposing your API key client-side. Anyone can grab it from the browser's network tab.

**Solution: RPC Proxy Route**

Create an API route that proxies RPC requests, keeping the API key server-side:

```typescript
// app/api/rpc/route.ts
import { NextRequest, NextResponse } from 'next/server';

// Server-side only - not exposed to client
const RPC_URL = process.env.SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();

        const response = await fetch(RPC_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
        });

        const data = await response.json();
        return NextResponse.json(data);
    } catch (error) {
        return NextResponse.json({ error: 'RPC request failed' }, { status: 500 });
    }
}
```

Then configure the connector to use the proxy:

```typescript
'use client';

import { getDefaultConfig } from '@solana/connector/headless';

// Get origin for absolute URL (Kit requires full URLs)
const getOrigin = () => {
    if (typeof window !== 'undefined') return window.location.origin;
    return 'http://localhost:3000';
};

const config = getDefaultConfig({
    appName: 'My App',
    clusters: [
        {
            id: 'solana:mainnet' as const,
            label: 'Mainnet',
            url: `${getOrigin()}/api/rpc`, // Proxy URL
        },
        // ... other clusters
    ],
});
```

Your `.env` file (no `NEXT_PUBLIC_` prefix):

```
SOLANA_RPC_URL=https://mainnet.helius-rpc.com/?api-key=your-key
```

### Token Image Privacy

When using `useTokens()` or `useTransactions()`, token metadata (including logo URLs) is fetched from external APIs. By default, these image URLs are returned directly, which means when your users' browsers fetch these images, the image host can see:

- User IP addresses
- Request timing (when users viewed their tokens)
- User agent and browser information

This could potentially be exploited by malicious token creators who set tracking URLs in their token metadata.

### Image Proxy Configuration

To protect user privacy, you can configure an image proxy that fetches images on behalf of your users:

```typescript
const config = getDefaultConfig({
    appName: 'My App',
    imageProxy: '/_next/image?w=64&q=75&url=', // Next.js Image Optimization
});
```

When `imageProxy` is set, all token image URLs returned by `useTokens()` and `useTransactions()` will be automatically transformed:

```
// Original URL from token metadata
https://raw.githubusercontent.com/.../token-logo.png

// Transformed URL (when imageProxy is set)
/_next/image?w=64&q=75&url=https%3A%2F%2Fraw.githubusercontent.com%2F...%2Ftoken-logo.png
```

### Common Proxy Options

| Service           | Configuration                                                     |
| ----------------- | ----------------------------------------------------------------- |
| **Next.js Image** | `imageProxy: '/_next/image?w=64&q=75&url='`                       |
| **Cloudflare**    | `imageProxy: '/cdn-cgi/image/width=64,quality=75/'`               |
| **imgproxy**      | `imageProxy: 'https://imgproxy.example.com/insecure/fill/64/64/'` |
| **Custom API**    | `imageProxy: '/api/image-proxy?url='`                             |

### Custom Proxy API Route (Next.js Example)

```typescript
// app/api/image-proxy/route.ts
import { NextRequest, NextResponse } from 'next/server';
import dns from 'dns/promises';

// Allowlist of permitted domains for image fetching
const ALLOWED_DOMAINS = [
    'raw.githubusercontent.com',
    'arweave.net',
    'ipfs.io',
    'cloudflare-ipfs.com',
    'nftstorage.link',
    // Add other trusted image domains as needed
];

// Check if an IP address falls within private/reserved ranges
function isPrivateOrReservedIP(ip: string): boolean {
    // IPv4 private/reserved ranges
    const ipv4PrivateRanges = [
        /^127\./, // 127.0.0.0/8 (loopback)
        /^10\./, // 10.0.0.0/8 (private)
        /^172\.(1[6-9]|2[0-9]|3[0-1])\./, // 172.16.0.0/12 (private)
        /^192\.168\./, // 192.168.0.0/16 (private)
        /^169\.254\./, // 169.254.0.0/16 (link-local/metadata)
        /^0\./, // 0.0.0.0/8 (current network)
        /^100\.(6[4-9]|[7-9][0-9]|1[0-1][0-9]|12[0-7])\./, // 100.64.0.0/10 (CGNAT)
        /^192\.0\.0\./, // 192.0.0.0/24 (IETF protocol assignments)
        /^192\.0\.2\./, // 192.0.2.0/24 (TEST-NET-1)
        /^198\.51\.100\./, // 198.51.100.0/24 (TEST-NET-2)
        /^203\.0\.113\./, // 203.0.113.0/24 (TEST-NET-3)
        /^224\./, // 224.0.0.0/4 (multicast)
        /^240\./, // 240.0.0.0/4 (reserved)
        /^255\.255\.255\.255$/, // broadcast
    ];

    // IPv6 private/reserved ranges
    const ipv6PrivatePatterns = [
        /^::1$/, // loopback
        /^fe80:/i, // link-local
        /^fc00:/i, // unique local (fc00::/7)
        /^fd/i, // unique local (fd00::/8)
        /^::ffff:(127\.|10\.|172\.(1[6-9]|2[0-9]|3[0-1])\.|192\.168\.|169\.254\.)/i, // IPv4-mapped
    ];

    // Check IPv4
    for (const range of ipv4PrivateRanges) {
        if (range.test(ip)) return true;
    }

    // Check IPv6
    for (const pattern of ipv6PrivatePatterns) {
        if (pattern.test(ip)) return true;
    }

    return false;
}

// Validate and parse the URL
function validateUrl(urlString: string): URL | null {
    try {
        const parsed = new URL(urlString);
        // Only allow http and https protocols
        if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
            return null;
        }
        return parsed;
    } catch {
        return null;
    }
}

// Check if hostname is in the allowlist
function isAllowedDomain(hostname: string): boolean {
    return ALLOWED_DOMAINS.some(domain => hostname === domain || hostname.endsWith(`.${domain}`));
}

export async function GET(request: NextRequest) {
    const urlParam = request.nextUrl.searchParams.get('url');

    // (1) Ensure URL exists and parses correctly with http/https
    if (!urlParam) {
        return new NextResponse('Missing URL parameter', { status: 400 });
    }

    const parsedUrl = validateUrl(urlParam);
    if (!parsedUrl) {
        return new NextResponse('Invalid URL or protocol', { status: 400 });
    }

    // (2) Enforce allowlist of permitted domains
    if (!isAllowedDomain(parsedUrl.hostname)) {
        return new NextResponse('Domain not allowed', { status: 403 });
    }

    // (3) Resolve hostname and check for private/reserved IPs
    try {
        const addresses = await dns.resolve(parsedUrl.hostname);
        for (const ip of addresses) {
            if (isPrivateOrReservedIP(ip)) {
                return new NextResponse('Resolved IP is not allowed', { status: 403 });
            }
        }
    } catch {
        return new NextResponse('Failed to resolve hostname', { status: 400 });
    }

    // (4) All checks passed - perform the fetch
    try {
        const response = await fetch(parsedUrl.toString());
        const buffer = await response.arrayBuffer();

        return new NextResponse(buffer, {
            headers: {
                'Content-Type': response.headers.get('Content-Type') || 'image/png',
                'Cache-Control': 'public, max-age=86400',
            },
        });
    } catch {
        return new NextResponse('Failed to fetch image', { status: 500 });
    }
}
```

---

## CoinGecko API & Rate Limits

The `useTokens()` hook fetches token prices from CoinGecko. CoinGecko has rate limits that may affect your application:

### Rate Limits (as of 2024)

| Tier              | Rate Limit            | API Key Required |
| ----------------- | --------------------- | ---------------- |
| **Free (Public)** | 10-30 requests/minute | No               |
| **Demo**          | 30 requests/minute    | Yes (free)       |
| **Analyst**       | 500 requests/minute   | Yes (paid)       |
| **Pro**           | 1000+ requests/minute | Yes (paid)       |

### Handling Rate Limits

ConnectorKit automatically handles rate limits with:

- **Exponential backoff**: Retries with increasing delays
- **Jitter**: Random delay added to prevent thundering herd
- **Retry-After header**: Honors server-specified wait times
- **Bounded timeout**: Won't block forever (default 30s max)

### Adding a CoinGecko API Key

For higher rate limits, add a free Demo API key from [CoinGecko](https://www.coingecko.com/en/api/pricing):

```typescript
const config = getDefaultConfig({
    appName: 'My App',
    coingecko: {
        apiKey: process.env.COINGECKO_API_KEY, // Demo or Pro API key
        isPro: false, // Set to true for Pro API keys
    },
});
```

### Advanced Configuration

```typescript
const config = getDefaultConfig({
    appName: 'My App',
    coingecko: {
        // API key for higher rate limits (optional)
        apiKey: process.env.COINGECKO_API_KEY,

        // Set to true if using a Pro API key (default: false for Demo keys)
        isPro: false,

        // Maximum retry attempts on 429 (default: 3)
        maxRetries: 3,

        // Base delay for exponential backoff in ms (default: 1000)
        baseDelay: 1000,

        // Maximum total timeout in ms (default: 30000)
        maxTimeout: 30000,
    },
});
```

### Caching

Token prices are cached for 60 seconds to minimize API calls. The retry logic only applies to uncached token IDs, so frequently-viewed tokens won't trigger additional API calls.

---

## Advanced Usage

### Error Handling with `tryCatch`

ConnectorKit exports a `tryCatch` utility for consistent async error handling:

```typescript
import { tryCatch } from '@solana/connector/headless';

// Instead of try/catch blocks
async function sendTransaction() {
    const { data: signature, error } = await tryCatch(signer.signAndSendTransaction(transaction));

    if (error) {
        console.error('Transaction failed:', error.message);
        return;
    }

    console.log('Transaction sent:', signature);
}
```

The `tryCatch` utility returns a `Result<T, E>` type that's either a success with `data` or a failure with `error`:

```typescript
interface Success<T> {
    data: T;
    error: null;
}

interface Failure<E> {
    data: null;
    error: E;
}
```

Also available: `tryCatchSync` for synchronous operations, and `isSuccess`/`isFailure` type guards.

### Cache Invalidation with Query Keys

For advanced cache management, ConnectorKit exports query key generators:

```typescript
import {
    getBalanceQueryKey,
    getTokensQueryKey,
    getTransactionsQueryKey,
    invalidateSharedQuery,
} from '@solana/connector/react';

// After sending a transaction, invalidate relevant caches
async function sendAndRefresh() {
    await sendTransaction();

    // Invalidate balance and tokens (they share the same cache)
    const balanceKey = getBalanceQueryKey(rpcUrl, address);
    if (balanceKey) invalidateSharedQuery(balanceKey);

    // Invalidate transactions
    const txKey = getTransactionsQueryKey({ rpcUrl, address, clusterId });
    if (txKey) invalidateSharedQuery(txKey);
}
```

### Configuration Validation

Configuration is validated at runtime using Zod schemas. For manual validation:

```typescript
import { validateConfigOptions } from '@solana/connector/headless';

const result = validateConfigOptions({
    appName: 'My App',
    network: 'mainnet',
});

if (!result.success) {
    console.error('Validation errors:', result.error.issues);
}
```

### Headless Client (Vue, Svelte, Vanilla JS)

Use `ConnectorClient` for non-React frameworks:

```typescript
import { ConnectorClient, getDefaultConfig, createConnectorId } from '@solana/connector/headless';

// Create client
const client = new ConnectorClient(getDefaultConfig({ appName: 'My App' }));

// Get state
const state = client.getSnapshot();
console.log('Connectors:', state.connectors);

// Connect (vNext)
await client.connectWallet(createConnectorId('Phantom'));

// Subscribe to changes
const unsubscribe = client.subscribe(state => {
    console.log('State updated:', state);
});

// Disconnect (vNext)
await client.disconnectWallet();

// Cleanup
unsubscribe();
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
import { AppProvider, useConnector, getDefaultConfig } from '@solana/connector';
```

### Headless Export (Framework Agnostic)

```typescript
// Headless core only - no React
import { ConnectorClient, getDefaultConfig } from '@solana/connector/headless';
```

### React Export

```typescript
// React-specific exports only
import { AppProvider, useConnector, useWallet, useConnectWallet } from '@solana/connector/react';
```

---

## API Reference

### Hooks

#### vNext Hooks (Recommended)

| Hook                    | Description                 | Returns                                                           |
| ----------------------- | --------------------------- | ----------------------------------------------------------------- |
| `useWallet()`           | Wallet status state machine | `{ status, isConnected, isConnecting, account, accounts, error }` |
| `useWalletConnectors()` | Available wallet connectors | `WalletConnectorMetadata[]`                                       |
| `useConnectWallet()`    | Connect by connector ID     | `{ connect, isConnecting, error, resetError }`                    |
| `useDisconnectWallet()` | Disconnect current wallet   | `{ disconnect, isDisconnecting }`                                 |

#### Legacy Hooks

| Hook                        | Description                                  | Returns                                                          |
| --------------------------- | -------------------------------------------- | ---------------------------------------------------------------- |
| `useConnector()`            | Main wallet connection hook (vNext + legacy) | `ConnectorSnapshot`                                              |
| `useAccount()`              | Account management hook                      | `{ address, formatted, copy, copied, accounts, selectAccount }`  |
| `useCluster()`              | Network/cluster management hook              | `{ cluster, clusters, setCluster, isMainnet, isDevnet, rpcUrl }` |
| `useWalletInfo()`           | Wallet metadata hook                         | `{ name, icon, wallet, connecting }`                             |
| `useTransactionSigner()`    | Legacy transaction signer (web3.js)          | `{ signer, ready, address, capabilities }`                       |
| `useKitTransactionSigner()` | Modern transaction signer (@solana/kit)      | `{ signer, ready, address }`                                     |
| `useBalance()`              | SOL balance hook                             | `{ solBalance, isLoading, refetch }`                             |
| `useTokens()`               | SPL tokens hook                              | `{ tokens, isLoading, refetch }`                                 |
| `useTransactions()`         | Transaction history hook                     | `{ transactions, isLoading, refetch }`                           |

### Configuration Functions

| Function                          | Description                                |
| --------------------------------- | ------------------------------------------ |
| `getDefaultConfig(options)`       | Create default connector configuration     |
| `getDefaultMobileConfig(options)` | Create mobile wallet adapter configuration |

### Utility Functions

| Function                                | Description                         |
| --------------------------------------- | ----------------------------------- |
| `formatAddress(address, options?)`      | Format Solana address               |
| `formatSOL(lamports, options?)`         | Format SOL amount                   |
| `copyAddressToClipboard(address)`       | Copy address to clipboard           |
| `getTransactionUrl(cluster, signature)` | Get Solana Explorer transaction URL |
| `getAddressUrl(cluster, address)`       | Get Solana Explorer address URL     |

---

## Types

```typescript
import type {
    // Configuration
    ConnectorConfig,
    DefaultConfigOptions,
    ExtendedConnectorConfig,

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

    // vNext Session Types
    WalletConnectorId,
    WalletConnectorMetadata,
    WalletSession,
    WalletStatus,
    SessionAccount,
    ConnectOptions,

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
- **WalletConnect** - Connect any WalletConnect-compatible mobile wallet via QR code
- **Any Wallet Standard wallet** - Full compatibility

---

## License

MIT
