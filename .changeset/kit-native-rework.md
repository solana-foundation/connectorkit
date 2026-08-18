---
'@solana/connector': minor
---

Rework connector internals to consume @solana/kit's native features instead of reimplementing them. Most of the change is internal, but the reimplementations that kit now covers are gone from the public surface — see the API changes below:

- **Signers**: Wallet Standard → kit signer bridging delegates to `@solana/wallet-account-signer` (manual shortvec/wire-format code removed from the runtime path).
- **Wallet core**: `ConnectorProvider` is backed by a kit client built with `@solana/kit-plugin-wallet`'s `walletSigner()` — discovery, connection lifecycle, signer creation, persistence, and silent auto-connect all run through the plugin's `client.wallet` store, projected onto the existing connector state shape and events.
- **RPC client**: `createSolanaClient` constructs `rpc`/`rpcSubscriptions` via `createClient()` + `solanaRpcConnection()` from `@solana/kit-plugin-rpc`.
- **Transaction prep**: `prepareTransaction` (and `useTransactionPreparer`) now really estimate compute-unit/resource limits via kit's `estimateResourceLimitsFactory`; the `computeUnitLimitMultiplier` and `computeUnitLimitReset` options are functional instead of deprecated no-ops. With no multiplier supplied, headroom is the greater of a 300 CU floor and a margin decaying from 10% to 2% by 500,000 CU, capped at the 1,400,000 per-transaction maximum (matching `@solana/kit-plugin-rpc`).
- **Live balances**: `useBalance` (and `useTokens` with `autoRefresh`) subscribe to the wallet's `accountNotifications` for push-based updates, with interval polling kept as an automatic fallback.
- **New entrypoint**: `@solana/connector/kit` re-exports the kit-native surface (`createClient`, `@solana/react` hooks, `@solana/kit-plugin-rpc`, `@solana/kit-plugin-wallet` + its store hooks) for apps adopting the plugin-client pattern directly.
- **Deprecations**: `lamportsToSol`/`solToLamports` are deprecated in favor of kit's exact fixed-point equivalents.

API changes:

- `PrepareTransactionConfig.rpc` widened from `Rpc<GetLatestBlockhashApi>` to `Rpc<GetLatestBlockhashApi & SimulateTransactionApi>`, because `prepareTransaction` now issues a `simulateTransaction` call to estimate compute units. An `rpc` from `createSolanaClient` or `createSolanaRpc` already satisfies it; a hand-rolled or mocked RPC that only implements `getLatestBlockhash` no longer type-checks and will fail at call time.
- `useKitTransactionSigner` returns `{ signer: null, ready: false }` when the active cluster id is not one of `solana:mainnet`, `solana:devnet`, `solana:testnet`, or `solana:localnet`. Custom cluster ids previously produced a signer that prompted against a different network than the dapp was using.
- Removed, superseded by `@solana/wallet-account-signer` (used internally in their place): `createKitTransactionSigner` and its `createGillTransactionSigner` alias, `createMessageSignerFromWallet`, `createTransactionSendingSignerFromWallet`, and the signer utilities that only served them — `updateSignatureDictionary`, `freezeSigner`, `base58ToSignatureBytes`. Build kit signers with `createKitSignersFromWallet` or `useKitTransactionSigner` instead.
- Removed, unused since the kit wallet plugin owns persistence: `createEnhancedStorageWalletState`, `saveWalletState`, `clearWalletState`, `WALLET_STATE_VERSION`, and the `PersistedWalletState` / `EnhancedStorageWalletStateOptions` types that described their storage shape. The wallet name adapter (`createEnhancedStorageWallet`) and the rest of `EnhancedStorage` are unchanged.

Behavioral notes: wallet discovery is now chain-aware (custom cluster ids normalize to `solana:mainnet` for discovery purposes, but never for signing); switching directly from one wallet to another now emits `wallet:disconnected` for the outgoing wallet before `wallet:connected` for the new one; the legacy window-scanning "instant connect" path and wallet authenticity verifier were removed; auto-connect reconnects silently via the kit wallet plugin's own `connector-kit:v1:kit-wallet` persistence (the `config.storage.wallet` name adapter is still written for compatibility).
