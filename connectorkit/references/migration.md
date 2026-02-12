# Migration from @solana/wallet-adapter

## Table of Contents

- [Overview](#overview)
- [Compat Bridge (Incremental)](#compat-bridge-incremental)
- [Full Migration](#full-migration)
- [API Mapping](#api-mapping)

## Overview

ConnectorKit provides two migration paths from `@solana/wallet-adapter`:

1. **Compat bridge** — Drop-in compatibility layer. Keep existing wallet-adapter code working while adopting ConnectorKit incrementally.
2. **Full migration** — Replace wallet-adapter hooks and components entirely.

## Compat Bridge (Incremental)

Import from `@solana/connector/compat`:

```tsx
import { useTransactionSigner, useDisconnectWallet } from '@solana/connector'
import { useWalletAdapterCompat } from '@solana/connector/compat'

function LegacyComponent() {
  const { signer } = useTransactionSigner()
  const { disconnect } = useDisconnectWallet()

  // Creates a wallet-adapter compatible object
  const wallet = useWalletAdapterCompat(signer, disconnect)

  // Use with existing wallet-adapter code:
  wallet.publicKey       // string | null
  wallet.connected       // boolean
  wallet.connecting      // boolean
  wallet.disconnecting   // boolean
  wallet.signTransaction(tx)
  wallet.signAllTransactions(txs)
  wallet.sendTransaction(tx, connection, options?)
  wallet.signMessage?(msg)
  wallet.connect()
  wallet.disconnect()
}
```

### Factory function (non-React)

```ts
import { createWalletAdapterCompat } from '@solana/connector/compat'

const compat = createWalletAdapterCompat(signer, {
  disconnect: () => client.disconnectWallet(),
  transformTransaction: (tx) => tx,    // optional transform
  onError: (error, operation) => {},   // optional error handler
})
```

### Type guard

```ts
import { isWalletAdapterCompatible } from '@solana/connector/compat'

if (isWalletAdapterCompatible(obj)) {
  obj.signTransaction(tx)
}
```

## Full Migration

### 1. Replace providers

```diff
- import { ConnectionProvider, WalletProvider } from '@solana/wallet-adapter-react'
- import { WalletModalProvider } from '@solana/wallet-adapter-react-ui'
+ import { AppProvider, getDefaultConfig } from '@solana/connector'

- <ConnectionProvider endpoint={rpcUrl}>
-   <WalletProvider wallets={wallets} autoConnect>
-     <WalletModalProvider>
-       <App />
-     </WalletModalProvider>
-   </WalletProvider>
- </ConnectionProvider>
+ <AppProvider connectorConfig={getDefaultConfig({ appName: 'My App', autoConnect: true })}>
+   <App />
+ </AppProvider>
```

### 2. Replace hooks

```diff
- import { useWallet, useConnection } from '@solana/wallet-adapter-react'
+ import { useWallet, useConnectWallet, useDisconnectWallet, useTransactionSigner } from '@solana/connector'

- const { publicKey, connected, signTransaction, sendTransaction } = useWallet()
+ const { status, account } = useWallet()
+ const { signer } = useTransactionSigner()

- if (connected && publicKey) { ... }
+ if (status === 'connected' && account) { ... }

- await signTransaction(tx)
+ await signer.signTransaction(tx)

- await sendTransaction(tx, connection)
+ await signer.signAndSendTransaction(tx)
```

### 3. Replace wallet button

```diff
- import { WalletMultiButton } from '@solana/wallet-adapter-react-ui'
- <WalletMultiButton />
+ import { WalletListElement, AccountElement, DisconnectElement } from '@solana/connector'
+ <WalletListElement />
+ <AccountElement showAvatar showCopy />
+ <DisconnectElement />
```

## API Mapping

| wallet-adapter | ConnectorKit |
|---|---|
| `useWallet()` | `useWallet()` + `useTransactionSigner()` |
| `useConnection()` | `useSolanaClient()` |
| `wallet.publicKey` | `useWallet().account` |
| `wallet.connected` | `useWallet().status === 'connected'` |
| `wallet.signTransaction` | `useTransactionSigner().signer.signTransaction` |
| `wallet.sendTransaction` | `useTransactionSigner().signer.signAndSendTransaction` |
| `wallet.signMessage` | `useTransactionSigner().signer.signMessage` |
| `wallet.select(name)` | `useConnectWallet().connect(connectorId)` |
| `wallet.disconnect()` | `useDisconnectWallet().disconnect()` |
| `WalletMultiButton` | `WalletListElement` + `AccountElement` |
| `WalletModalProvider` | `AppProvider` (built-in) |
| `ConnectionProvider` | `AppProvider` with `getDefaultConfig({ network })` |
