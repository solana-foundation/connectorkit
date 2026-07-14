---
"@solana/connector": minor
---

Rework connector internals to consume @solana/kit's native features instead of reimplementing them. Public APIs are unchanged; internals are now kit-native:

- **Signers**: Wallet Standard → kit signer bridging delegates to `@solana/wallet-account-signer` (manual shortvec/wire-format code removed from the runtime path).
- **Wallet core**: `ConnectorProvider` is backed by a kit client built with `@solana/kit-plugin-wallet`'s `walletSigner()` — discovery, connection lifecycle, signer creation, persistence, and silent auto-connect all run through the plugin's `client.wallet` store, projected onto the existing connector state shape and events.
- **RPC client**: `createSolanaClient` constructs `rpc`/`rpcSubscriptions` via `createClient()` + `solanaRpcConnection()` from `@solana/kit-plugin-rpc`.
- **Transaction prep**: `prepareTransaction` (and `useTransactionPreparer`) now really estimate compute-unit/resource limits via kit's `estimateResourceLimitsFactory`; the `computeUnitLimitMultiplier` and `computeUnitLimitReset` options are functional instead of deprecated no-ops.
- **Live balances**: `useBalance` (and `useTokens` with `autoRefresh`) subscribe to the wallet's `accountNotifications` for push-based updates, with interval polling kept as an automatic fallback.
- **New entrypoint**: `@solana/connector/kit` re-exports the kit-native surface (`createClient`, `@solana/react` hooks, `@solana/kit-plugin-rpc`, `@solana/kit-plugin-wallet` + its store hooks) for apps adopting the plugin-client pattern directly.
- **Deprecations**: `lamportsToSol`/`solToLamports` are deprecated in favor of kit's exact fixed-point equivalents.

Behavioral notes: wallet discovery is now chain-aware (custom cluster ids normalize to `solana:mainnet` for discovery purposes); the legacy window-scanning "instant connect" path and wallet authenticity verifier were removed; auto-connect reconnects silently via the kit wallet plugin's own `connector-kit:v1:kit-wallet` persistence (the `config.storage.wallet` name adapter is still written for compatibility).
