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
import { createRemoteSignerWallet } from '@solana/connector/remote';

const remoteWallet = createRemoteSignerWallet({
    endpoint: '/api/signer', // API route URL
    name: 'Treasury Wallet', // Display name in wallet list
    icon: 'https://...', // Optional icon URL
    chains: ['solana:mainnet'], // Optional chain filter
    getAuthHeaders: () => ({
        // Optional auth
        Authorization: `Bearer ${token}`,
    }),
});

// Add to connector config
const config = getDefaultConfig({
    appName: 'My App',
    additionalWallets: [remoteWallet],
});
```

The remote wallet appears in `useWalletConnectors()` like any other wallet. Users connect to it the same way.

## Server-Side Route Handlers

```ts
// app/api/signer/route.ts (Next.js App Router)
import { createRemoteSignerRouteHandlers } from '@solana/connector/server';

const { GET, POST } = createRemoteSignerRouteHandlers({
    provider: {/* Fireblocks, Privy, or custom */},
    authorize: async request => {
        // Validate the request (check JWT, session, etc.)
        const user = await getUser(request);
        if (!user) return false; // -> 401
        return { principal: user }; // passed to policy hooks as context.principal
    },
    policy: {
        validateTransaction: async (bytes, request, context) => {
            // Inspect transaction before signing; context.principal is `user` above.
            // It is typed `User | undefined` (authorize may return `true`), so narrow first.
            return context.principal?.canSign === true;
        },
        validateMessage: async (bytes, request, context) => true,
    },
    rpc: {
        url: process.env.RPC_URL, // Required for signAndSend
        commitment: 'confirmed', // optional preflight commitment
    },
    chains: ['solana:mainnet'],
    name: 'Treasury Wallet',
});

export { GET, POST };
```

`GET` returns wallet metadata (address, capabilities). `POST` handles sign operations.

### Authorization and policy

- `authorize(request)` may return `true` (allow, no identity), `{ principal }` (allow and identify the caller), or `false` / `null` / `undefined` (reject with 401). Omit it to use the default: the `Authorization` header (`Bearer <token>` or raw) is compared against `CONNECTOR_SIGNER_TOKEN` in constant time; an unset token rejects everything.
- Policy hooks receive `(bytes, request, context)`. `context` is a `PolicyContext<P>` with `principal` (typed `P | undefined`: the value `authorize` returned, or `undefined` when it returned `true` or the default token check ran), `request`, `operation` (`'signTransaction' | 'signAllTransactions' | 'signAndSendTransaction' | 'signMessage'`), and for batches `index` / `total`. Narrow `context.principal` before reading it. Two-argument hooks still work.
- The principal type is inferred from `authorize`, so put `authorize` before `policy` in the config literal (or pass the type explicitly: `createRemoteSignerRouteHandlers<User>({...})`).
- Internally, signing requires evidence that both steps ran: the handlers hold a signer that only accepts policy-approved values, and approval requires the authorization result. A code path that skips either step does not type-check.
- Each `createRemoteSignerRouteHandlers` call owns its own signer instance; concurrent first requests share a single provider initialisation and a failed initialisation is retried on the next request.

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

- `signTransaction` — `{ signedTransaction: base64 }`
- `signAllTransactions` — `{ signedTransactions: base64[] }`
- `signMessage` — `{ signature: base64 }` (64-byte signature)
- `signAndSendTransaction` — `{ signature: base58 }` (transaction signature)

**Error response:**

- `{ error: { code: RemoteSignerErrorCode, message: string, details?: unknown } }`

**Utilities** (from `@solana/connector/remote`):

- `encodeBase64(data): string`
- `decodeBase64(encoded): Uint8Array`
- `isErrorResponse(response): boolean`

## Security

- Always implement `authorize` to validate requests (JWT, session, API key), or set `CONNECTOR_SIGNER_TOKEN` to use the built-in constant-time bearer check
- Use `policy.validateTransaction` to inspect transactions before signing (whitelist programs, check amounts); use `context.principal` to apply per-caller rules
- The server handler never exposes private keys to the browser
- Use HTTPS in production
- Consider rate limiting the signing endpoint
