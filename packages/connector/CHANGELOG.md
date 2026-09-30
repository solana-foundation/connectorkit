# @solana/connector

## 0.3.0

### Minor Changes

- 5c62168: Rework connector internals to consume @solana/kit's native features instead of reimplementing them. Most of the change is internal, but the reimplementations that kit now covers are gone from the public surface — see the API changes below:

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

- 245c587: Upgrade @solana/kit and companion packages (addresses, codecs, keys, react, signers, transactions, transaction-messages, wallet-account-signer, webcrypto-ed25519-polyfill) from v6.9 to v7.1, along with `@solana/kit-plugin-rpc` 0.16 and `@solana/kit-plugin-wallet` 0.14. Kit v7's breaking changes (pattern-match codec typing, instruction-plan limits, reactive store lifecycle) do not touch any API used by these packages, so no source changes were required — but consumers now receive kit v7.1 types transitively.

    Kit 7.1 adds a hook per client capability to `@solana/react`, all of which `@solana/connector/kit` now re-exports:

    - `usePayer` / `useIdentity` read `client.payer` / `client.identity` and, when the client advertises `subscribeToPayer` / `subscribeToIdentity` (as `walletSigner()` does), track them reactively.
    - `useAirdrop`, `usePlanTransaction`, `usePlanTransactions`, `useSendTransaction`, and `useSendTransactions` wrap the matching client method as an action exposing `{ dispatch, dispatchAsync, isRunning, data, error }`, each dispatch running under a fresh `AbortSignal`.

    These are hooks on a kit plugin client and are additive — the connector's own hooks are unchanged.

- 5c62168: Upgrade @solana/kit and companion packages (addresses, codecs, keys, react, signers, transactions, transaction-messages, wallet-account-signer, webcrypto-ed25519-polyfill) from v7.1 to v8.0, along with `@solana/kit-plugin-rpc`, `@solana/kit-plugin-wallet`, and `@solana/kit-plugin-signer` 0.18, and the Codama program clients (`@solana-program/compute-budget` 0.18, `@solana-program/program-metadata` 0.9, `@solana-program/system` 0.14, `@solana-program/token` 0.16, `@solana-program/token-2022` 0.15).

    Kit v8's breaking changes — the removal of the compute-unit-limit estimation helpers, `getBigIntDowncastRequestTransformer`, the fixed transaction size constants (`TRANSACTION_SIZE_LIMIT` and friends), and the transaction plan result context rework — do not touch any API used by these packages, so no source changes were required. Consumers now receive kit v8 types transitively.

- 5c62168: Add transaction v1 (SIMD-0296/SIMD-0385) support across the stack.

    Reading and validating v1 transactions now works everywhere unconditionally: transaction bytes are classified by a wire-layout-aware version sniffer (the v1 `0x81` discriminator at byte 0, or the legacy/v0 signature-count prefix — this also fixes a latent bug that misrouted signed v0 transactions to the legacy web3.js parser), the transaction validator applies the right size limit per version (1232 bytes for legacy/v0, 4096 for v1), RPC reads raise `maxSupportedTransactionVersion` to 1 (a ceiling — pinned at 0, any request touching a v1 transaction fails), and the devtools decode the v1 embedded transaction config (compute unit limit, total-lamports priority fee, loaded accounts data size limit, heap size) instead of scanning ComputeBudget instructions. WalletConnect signature injection now uses kit's transaction codec, working identically for legacy/v0/v1.

    Building v1 transactions is opt-in and off by default: pass `transactionConfig: { version: 1, priorityFeeLamports }` to `solanaRpc` via the re-exported `@solana/kit-plugin-rpc` 0.19 planner. The web3.js compat layer rejects v1 bytes with a descriptive error instead of misparsing them (web3.js 1.x cannot represent v1).

    New negotiation helpers `walletSupportsTransactionVersion` / `getWalletSupportedTransactionVersions` read the wallet-standard `supportedTransactionVersions` field permissively (typed `'legacy' | 0 | 1` as of `@solana/wallet-standard-features` 1.5, tolerating unknown future versions) and can be scoped to a single signing operation — `solana:signTransaction`, `solana:signAndSendTransaction`, `solana:signAndSendAllTransactions`, or the connector's own `solana:signAllTransactions` — a `supportedTransactionVersions` slot lands on `TransactionSignerCapabilities`, the remote-signer protocol can declare supported versions in its metadata capabilities, and `WalletConnectConfig` accepts an advertised-versions override.

### Patch Changes

- 5c62168: Fix three server-rendering and remount issues in `ConnectorProvider`:

    - Hydration mismatch during auto-connect. The React store hooks passed live client state as their `getServerSnapshot`, so React's hydration pass rendered whatever wallet discovery and silent reconnect had already produced — a spinner or a populated wallet list where the server had written an idle label and an empty list. `ConnectorClient.getServerSnapshot()` now returns state as it stood before browser-only initialization, and the subscription delivers live state on the render after hydration.
    - Connector ids derive from the wallet name, so two wallets registered under the same name produced two connectors sharing one id — enough to trigger React's duplicate-key error in wallet lists, and to let a stale duplicate shadow the live wallet in `getConnectorById`. The projected wallet list now keeps the first wallet per connector id.
    - `ConnectorProvider` cleared `window.__connectorClient` on unmount and never republished it when the effect re-ran, leaving Connector Devtools unable to find the client for the rest of the session. The handle is now republished on each effect run and only cleared by the client that owns it.

- 5c62168: Fix regressions found in review of the kit-native rework:

    - Re-initialize cleanly after `destroy()` — React StrictMode's dev
      unmount/remount cycle no longer leaves the wallet client permanently torn
      down ("Wallet client not initialized" on every connect).
    - Preserve wallet values persisted by pre-plugin releases (bare wallet name)
      instead of letting the plugin erase them and silently log the user out once
      on upgrade; the next connect upgrades the value to the new format.
    - Cluster switches no longer block on the replacement wallet client's
      unbounded silent-reconnect warm-up, and a failed silent reconnect during
      the switch no longer wipes the persisted session.
    - `onAccountsChanged` listeners are cleared when their session ends, so a
      dead session's listeners no longer fire with the next session's accounts.
    - `selectAccount` regains the pre-plugin re-authorize fallback: on a miss it
      re-invokes the wallet's connect to refresh the authorized accounts before
      failing.
    - Interval polling in `useBalance`/`useTokens` keeps running under live
      account subscriptions (the subscription only watches the system account, so
      SPL token changes previously went stale once it loaded); subscriptions now
      purely add push immediacy.
    - One shared `SolanaClient` (and WebSocket transport) per RPC URL across
      hooks, instead of one socket per hook instance.
    - `prepareTransaction` gains an `estimateResources: false` opt-out for
      blockhash-only preparation, accepting a plain `Rpc<GetLatestBlockhashApi>`
      (also on `useTransactionPreparer` options).
    - `createKitSignersFromWallet` warns and omits the transaction signer for
      unrecognized RPC endpoints instead of throwing (and still does not guess a
      chain).
    - `useKitTransactionSigner` derives the chain from the cluster (fixing
      `solana:mainnet-beta` and URL-detected local clusters), accepts an explicit
      `chain` override for custom clusters, and reports a `reason` when no signer
      is available.
    - Deprecated the no-op `ConnectOptions.silent` / `allowInteractiveFallback`
      fields; silent session restore happens via `autoConnect` persistence.

- 245c587: Refresh wallet stack dependencies: wallet-standard 1.1.1, Wallet UI core 4.2.0, wallet-standard-mobile 0.5.3, and latest solana-program packages (compute-budget 0.16, program-metadata 0.7, system 0.12.2, token 0.14, token-2022 0.12), plus dev tooling updates.

## 0.2.6

### Patch Changes

- fd4e65a: Upgrade the Solana Kit, Wallet UI, Wallet Standard mobile, WalletConnect, and keychain dependency ranges to the latest wallet stack.
