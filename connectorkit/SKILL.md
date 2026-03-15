---
name: connectorkit
description: >
    Solana wallet connection library with headless core and React UI components.
    Use when working with @solana/connector, ConnectorKit, Solana wallet connection,
    wallet standard integration, ConnectorClient, wallet elements, render props,
    useWallet, useConnectWallet, useBalance, useTransactionSigner,
    WalletListElement, AccountElement, BalanceElement, TransactionHistoryElement,
    migrating from @solana/wallet-adapter, remote signer, server-side signing,
    Fireblocks Solana, Privy Solana, or mobile wallet adapter integration.
---

# ConnectorKit

`@solana/connector` — Headless wallet connection library for Solana.

- **GitHub**: https://github.com/solana-foundation/connectorkit
- **NPM**: `npm i @solana/connector`

## Entry Points

| Import                       | Purpose                                           |
| ---------------------------- | ------------------------------------------------- |
| `@solana/connector`          | Full library (React + headless)                   |
| `@solana/connector/headless` | Framework-agnostic core (Vue, Svelte, vanilla JS) |
| `@solana/connector/react`    | React hooks + element components                  |
| `@solana/connector/compat`   | Bridge for existing `@solana/wallet-adapter` code |
| `@solana/connector/remote`   | Browser-side remote wallet adapter                |
| `@solana/connector/server`   | Server-side route handlers for remote signing     |

React hooks and elements are only available via `@solana/connector` or `@solana/connector/react`. For non-React frameworks, use `ConnectorClient` from `@solana/connector/headless` and subscribe to state changes directly.

## Recommended Imports

- Prefer explicit entry points for clarity:
    - React: `@solana/connector/react`
    - Headless/core: `@solana/connector/headless`
- Use `@solana/connector` as a convenience re-export (it re-exports both `./react` and `./headless`).

## Next.js (App Router) Setup

Put providers in a single client boundary (typically `app/providers.tsx`) and keep the rest of your app as Server Components.

```tsx
// app/providers.tsx
'use client';

import type { ReactNode } from 'react';
import { useMemo } from 'react';
import { AppProvider } from '@solana/connector/react';
import { getDefaultConfig, getDefaultMobileConfig } from '@solana/connector/headless';

function getOrigin() {
    if (typeof window === 'undefined') return 'http://localhost:3000';
    return window.location.origin;
}

export function Providers({ children }: { children: ReactNode }) {
    const connectorConfig = useMemo(
        () =>
            getDefaultConfig({
                appName: 'My App',
                appUrl: getOrigin(),
                network: 'devnet',
                autoConnect: true,
                enableMobile: true,
                walletConnect: true, // reads NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID
            }),
        [],
    );

    const mobile = useMemo(
        () =>
            getDefaultMobileConfig({
                appName: 'My App',
                appUrl: getOrigin(),
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

```tsx
// app/layout.tsx
import type { ReactNode } from 'react';
import { Providers } from './providers';

export default function RootLayout({ children }: { children: ReactNode }) {
    return (
        <html lang="en">
            <body>
                <Providers>{children}</Providers>
            </body>
        </html>
    );
}
```

## Quick Start (React)

```tsx
import { AppProvider } from '@solana/connector/react';
import { getDefaultConfig } from '@solana/connector/headless';

const config = getDefaultConfig({
    appName: 'My App',
    network: 'devnet',
    autoConnect: true,
    enableMobile: true,
    walletConnect: true, // optional; reads NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID
});

function App() {
    return (
        <AppProvider connectorConfig={config}>
            <WalletUI />
        </AppProvider>
    );
}
```

## Common Patterns

### Connect a Wallet

```tsx
import { useConnectWallet, useWalletConnectors, useWallet } from '@solana/connector/react';

function ConnectButton() {
    const { status, account } = useWallet();
    const { connect, isConnecting } = useConnectWallet();
    const connectors = useWalletConnectors();

    if (status === 'connected') return <div>{account}</div>;

    return connectors.map(w => (
        <button key={w.id} onClick={() => connect(w.id)} disabled={isConnecting}>
            {w.name}
        </button>
    ));
}
```

### Sign & Send a Transaction

```tsx
import { useTransactionSigner } from '@solana/connector/react';

const { signer, ready } = useTransactionSigner();
const sig = await signer.signAndSendTransaction(transaction);
```

For `@solana/kit` compatible signer: `useKitTransactionSigner()`.

### Elements with Render Props

All elements accept a `render` prop for full UI customization:

```tsx
import { WalletListElement, AccountElement, BalanceElement } from '@solana/connector/react'

// Default rendering
<WalletListElement />
<AccountElement showAvatar showCopy />
<BalanceElement showTokens />

// Custom via render prop
<AccountElement render={({ address, formatted, copy, copied }) => (
  <div onClick={copy}>{copied ? 'Copied!' : formatted}</div>
)} />

<WalletListElement render={({ wallets, connectById, connecting }) => (
  wallets.map(w => (
    <button key={w.id} onClick={() => connectById(w.id)}>{w.name}</button>
  ))
)} />
```

**All elements**: `WalletListElement`, `AccountElement`, `ClusterElement`, `DisconnectElement`, `BalanceElement`, `TransactionHistoryElement`, `TokenListElement`, `SkeletonShine`

### Switch Networks

```tsx
import { useCluster } from '@solana/connector/react';

const { cluster, clusters, setCluster, isMainnet, isDevnet } = useCluster();
await setCluster('devnet');
```

### Wallet Filtering & Ordering

Improve UX for users with lots of installed wallets by filtering and/or featuring wallets at the config level:

```ts
import { getDefaultConfig } from '@solana/connector/headless';

const config = getDefaultConfig({
    appName: 'My App',
    wallets: {
        allowList: ['Phantom', 'Solflare', 'Backpack'],
        denyList: ['MetaMask'],
        featured: ['Phantom', 'Solflare'],
    },
});
```

### WalletConnect (QR / Deep Link)

- Install the WalletConnect peer dependency: `npm i @walletconnect/universal-provider`
- Set `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=...`
- Enable in config: `walletConnect: true`

When a pairing URI is available, render a QR/deep link UI (e.g. a dialog). The provider exposes `walletConnectUri` and `clearWalletConnectUri`.

```tsx
'use client';

import { useConnector } from '@solana/connector/react';

export function WalletConnectQrModal() {
    const { walletConnectUri, clearWalletConnectUri } = useConnector();
    if (!walletConnectUri) return null;

    return (
        <div>
            <div>WalletConnect URI: {walletConnectUri}</div>
            <button onClick={clearWalletConnectUri}>Close</button>
        </div>
    );
}
```

For a full QR example, see `packages/connector/README.md` (WalletConnect section).

### Remote Signer (Server-backed Signing)

Remote signing is a two-part setup:

1) **Browser**: create a Wallet Standard wallet that delegates signing to your API.

```ts
import { createRemoteSignerWallet } from '@solana/connector/remote';
import { getDefaultConfig } from '@solana/connector/headless';

const remoteWallet = createRemoteSignerWallet({
    endpoint: '/api/connector-signer',
    name: 'Treasury',
    // getAuthHeaders: () => ({ Authorization: `Bearer ${token}` }),
});

const config = getDefaultConfig({
    appName: 'My App',
    additionalWallets: [remoteWallet],
});
```

2) **Server**: implement the Next.js route handler to actually sign.

```ts
// app/api/connector-signer/route.ts
import { createRemoteSignerRouteHandlers } from '@solana/connector/server';

const { GET, POST } = createRemoteSignerRouteHandlers({
    provider: { type: 'custom', signer: myRemoteSigner }, // implements RemoteSigner (see references/remote-signer.md)
    authorize: async request => true,
    policy: {
        validateTransaction: async bytes => true,
        validateMessage: async bytes => true,
    },
    rpc: { endpoint: process.env.RPC_URL },
    chains: ['solana:mainnet'],
    name: 'Treasury',
});

export { GET, POST };
```

Details (provider configs + protocol types + security) live in `references/remote-signer.md`.

### Devtools (Development Only)

ConnectorKit also ships devtools (`@solana/connector-debugger`) that can be dynamically mounted in development.

```tsx
'use client';

import { useEffect } from 'react';

export function DevtoolsLoader() {
    useEffect(() => {
        if (process.env.NODE_ENV !== 'development') return;

        let devtools: { mount: (el: HTMLElement) => void; unmount: () => void } | undefined;
        let container: HTMLDivElement | undefined;

        import('@solana/connector-debugger').then(({ ConnectorDevtools }) => {
            container = document.createElement('div');
            document.body.appendChild(container);
            devtools = new ConnectorDevtools({ config: { position: 'bottom-right', theme: 'dark' } });
            devtools.mount(container);
        });

        return () => {
            devtools?.unmount();
            container?.remove();
        };
    }, []);

    return null;
}
```

## Security & Production Checklist

- **RPC API keys**: don’t expose paid RPC URLs as `NEXT_PUBLIC_*`; use a Next.js RPC proxy route and point your cluster URL at the proxy (see `packages/connector/README.md`).
- **Token logo privacy**: set `imageProxy` if you render token images to avoid leaking user IPs to arbitrary token metadata hosts (see `packages/connector/README.md`).
- **CoinGecko rate limits**: if you use token prices heavily, configure `coingecko.apiKey`.
- **Remote signer**: always implement `authorize` + `policy.validateTransaction`, use HTTPS, and rate limit the signer endpoint.

### Headless (Non-React)

```ts
import { ConnectorClient } from '@solana/connector/headless';

const client = new ConnectorClient({
    autoConnect: true,
    cluster: { initialCluster: 'devnet' },
});

client.subscribe(state => {
    /* react to changes */
});
await client.connectWallet('wallet-standard:phantom');
const snapshot = client.getSnapshot();
```

### Wallet Adapter Compat Bridge

```ts
import { useWalletAdapterCompat } from '@solana/connector/compat';

const compat = useWalletAdapterCompat(signer, disconnect);
compat.publicKey; // string | null
compat.connected; // boolean
compat.signTransaction(tx);
compat.sendTransaction(tx, connection);
```

## Key Concepts

### Connector IDs

Wallets use stable branded `WalletConnectorId` strings:

- `'wallet-standard:phantom'`, `'wallet-standard:solflare'`, etc.
- `'walletconnect'`
- `'mwa:phantom'` (Mobile Wallet Adapter on iOS/Android)

### Wallet Status State Machine

`useWallet()` returns a discriminated union:

```ts
status: 'disconnected' | 'connecting' | 'connected' | 'error';
```

When `status === 'connected'`, `session` contains `accounts`, `selectedAccount`, `selectAccount()`.

Type guards: `isDisconnected()`, `isConnecting()`, `isConnected()`, `isStatusError()`

### Providers

- **`<AppProvider>`** — Convenience wrapper (recommended). Auto-wires ConnectorProvider, WalletConnect, error boundaries.
- **`<ConnectorProvider>`** — Lower-level, accepts `config` and `mobile` props.
- **`<ConnectorErrorBoundary>`** — Catches errors in connector tree.

## Reference Files

- **[Hooks & Elements API](references/api.md)** — All hooks with return types, all elements with props
- **[Connector Package README](../packages/connector/README.md)** — WalletConnect QR, RPC proxy pattern, `imageProxy`, CoinGecko config, headless examples
- **[Next.js Example Providers](../examples/next-js/app/providers.tsx)** — End-to-end Next.js provider wiring (clusters, WalletConnect, remote signer, devtools)
- **[Remote & Server Signing](references/remote-signer.md)** — Remote wallet adapter, server route handlers, Fireblocks/Privy/custom provider setup
- **[Migration Guide](references/migration.md)** — Compat bridge details, wallet-adapter to connector migration steps
