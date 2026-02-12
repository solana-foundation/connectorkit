# Remote & Server Signing

## Table of Contents

- [Overview](#overview)
- [Browser-Side Remote Wallet](#browser-side-remote-wallet)
- [Server-Side Route Handlers](#server-side-route-handlers)
- [Provider Configurations](#provider-configurations)
- [Custom Provider](#custom-provider)
- [Protocol Types](#protocol-types)
- [Security](#security)

## Overview

ConnectorKit supports remote signing where the private key lives on a server (custodial wallet, MPC, HSM). Two entry points work together:

- `@solana/connector/remote` — Creates a Wallet Standard wallet in the browser that delegates signing to an API
- `@solana/connector/server` — Provides Next.js-compatible route handlers that perform the actual signing

## Browser-Side Remote Wallet

```ts
import { createRemoteSignerWallet } from '@solana/connector/remote'

const remoteWallet = createRemoteSignerWallet({
  endpoint: '/api/signer',               // API route URL
  name: 'Treasury Wallet',               // Display name in wallet list
  icon: 'https://...',                    // Optional icon URL
  chains: ['solana:mainnet'],             // Optional chain filter
  getAuthHeaders: () => ({                // Optional auth
    'Authorization': `Bearer ${token}`,
  }),
})

// Add to connector config
const config = getDefaultConfig({
  appName: 'My App',
  additionalWallets: [remoteWallet],
})
```

The remote wallet appears in `useWalletConnectors()` like any other wallet. Users connect to it the same way.

## Server-Side Route Handlers

```ts
// app/api/signer/route.ts (Next.js App Router)
import { createRemoteSignerRouteHandlers } from '@solana/connector/server'

const { GET, POST } = createRemoteSignerRouteHandlers({
  provider: { /* Fireblocks, Privy, or custom */ },
  authorize: async (request) => {
    // Validate the request (check JWT, session, etc.)
    return true
  },
  policy: {
    validateTransaction: async (bytes, request) => {
      // Inspect transaction before signing
      return true
    },
    validateMessage: async (bytes, request) => true,
  },
  rpc: {
    endpoint: process.env.RPC_URL,  // Required for signAndSend
  },
  chains: ['solana:mainnet'],
  name: 'Treasury Wallet',
})

export { GET, POST }
```

`GET` returns wallet metadata (address, capabilities). `POST` handles sign operations.

## Provider Configurations

### Fireblocks

```ts
provider: {
  type: 'fireblocks',
  apiKey: process.env.FIREBLOCKS_API_KEY,
  privateKeyPem: process.env.FIREBLOCKS_PRIVATE_KEY,  // RSA key for JWT auth
  vaultAccountId: process.env.FIREBLOCKS_VAULT_ID,
  assetId: 'SOL',               // default
  apiBaseUrl: '...',             // optional, for sandbox
}
```

### Privy

```ts
provider: {
  type: 'privy',
  appId: process.env.PRIVY_APP_ID,
  appSecret: process.env.PRIVY_APP_SECRET,
  walletId: process.env.PRIVY_WALLET_ID,
  apiBaseUrl: '...',             // optional
}
```

## Custom Provider

Implement the `RemoteSigner` interface:

```ts
interface RemoteSigner {
  address: string
  signTransaction(bytes: Uint8Array): Promise<Uint8Array>
  signAllTransactions(txs: Uint8Array[]): Promise<Uint8Array[]>
  signMessage(msg: Uint8Array): Promise<Uint8Array>  // 64-byte ed25519 sig
  isAvailable(): Promise<boolean>
}

provider: {
  type: 'custom',
  signer: myRemoteSigner,
}
```

## Protocol Types

The remote signer uses a JSON protocol over HTTP.

**Request operations:**
- `signTransaction` — `{ operation, transaction: base64 }`
- `signAllTransactions` — `{ operation, transactions: base64[] }`
- `signMessage` — `{ operation, message: base64 }`
- `signAndSendTransaction` — `{ operation, transaction: base64, options? }`

**Success responses:**
- `{ signedTransaction: base64 }`
- `{ signedTransactions: base64[] }`
- `{ signature: base64 }`

**Error response:**
- `{ error: RemoteSignerErrorCode, message: string }`

**Utilities** (from `@solana/connector/remote`):
- `encodeBase64(data): string`
- `decodeBase64(encoded): Uint8Array`
- `isErrorResponse(response): boolean`

## Security

- Always implement `authorize` to validate requests (JWT, session, API key)
- Use `policy.validateTransaction` to inspect transactions before signing (whitelist programs, check amounts)
- The server handler never exposes private keys to the browser
- Use HTTPS in production
- Consider rate limiting the signing endpoint
