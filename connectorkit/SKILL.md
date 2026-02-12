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

| Import | Purpose |
|---|---|
| `@solana/connector` | Full library (React + headless) |
| `@solana/connector/headless` | Framework-agnostic core (Vue, Svelte, vanilla JS) |
| `@solana/connector/react` | React hooks + element components |
| `@solana/connector/compat` | Bridge for existing `@solana/wallet-adapter` code |
| `@solana/connector/remote` | Browser-side remote wallet adapter |
| `@solana/connector/server` | Server-side route handlers for remote signing |

React hooks and elements are only available via `@solana/connector` or `@solana/connector/react`. For non-React frameworks, use `ConnectorClient` from `@solana/connector/headless` and subscribe to state changes directly.

## Quick Start (React)

```tsx
import { AppProvider, getDefaultConfig } from '@solana/connector'

const config = getDefaultConfig({
  appName: 'My App',
  network: 'devnet',
  autoConnect: true,
  enableMobile: true,
  walletConnect: { projectId: '...' }, // optional
})

function App() {
  return (
    <AppProvider connectorConfig={config}>
      <WalletUI />
    </AppProvider>
  )
}
```

## Common Patterns

### Connect a Wallet

```tsx
import { useConnectWallet, useWalletConnectors, useWallet } from '@solana/connector'

function ConnectButton() {
  const { status, account } = useWallet()
  const { connect, isConnecting } = useConnectWallet()
  const connectors = useWalletConnectors()

  if (status === 'connected') return <div>{account}</div>

  return connectors.map(w => (
    <button key={w.id} onClick={() => connect(w.id)} disabled={isConnecting}>
      {w.name}
    </button>
  ))
}
```

### Sign & Send a Transaction

```tsx
import { useTransactionSigner } from '@solana/connector'

const { signer, ready } = useTransactionSigner()
const sig = await signer.signAndSendTransaction(transaction)
```

For `@solana/kit` compatible signer: `useKitTransactionSigner()`.

### Elements with Render Props

All elements accept a `render` prop for full UI customization:

```tsx
import { WalletListElement, AccountElement, BalanceElement } from '@solana/connector'

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
import { useCluster } from '@solana/connector'

const { cluster, clusters, setCluster, isMainnet, isDevnet } = useCluster()
await setCluster('devnet')
```

### Headless (Non-React)

```ts
import { ConnectorClient } from '@solana/connector/headless'

const client = new ConnectorClient({
  autoConnect: true,
  cluster: { initialCluster: 'devnet' },
})

client.subscribe((state) => { /* react to changes */ })
await client.connectWallet('wallet-standard:phantom')
const snapshot = client.getSnapshot()
```

### Wallet Adapter Compat Bridge

```ts
import { useWalletAdapterCompat } from '@solana/connector/compat'

const compat = useWalletAdapterCompat(signer, disconnect)
compat.publicKey    // string | null
compat.connected    // boolean
compat.signTransaction(tx)
compat.sendTransaction(tx, connection)
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
status: 'disconnected' | 'connecting' | 'connected' | 'error'
```

When `status === 'connected'`, `session` contains `accounts`, `selectedAccount`, `selectAccount()`.

Type guards: `isDisconnected()`, `isConnecting()`, `isConnected()`, `isStatusError()`

### Providers

- **`<AppProvider>`** — Convenience wrapper (recommended). Auto-wires ConnectorProvider, WalletConnect, error boundaries.
- **`<ConnectorProvider>`** — Lower-level, accepts `config` and `mobile` props.
- **`<ConnectorErrorBoundary>`** — Catches errors in connector tree.

## Reference Files

- **[Hooks & Elements API](references/api.md)** — All hooks with return types, all elements with props
- **[Remote & Server Signing](references/remote-signer.md)** — Remote wallet adapter, server route handlers, Fireblocks/Privy/custom provider setup
- **[Migration Guide](references/migration.md)** — Compat bridge details, wallet-adapter to connector migration steps
