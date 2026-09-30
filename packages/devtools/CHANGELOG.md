# @solana/connector-debugger

## 0.3.0

### Minor Changes

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

- 245c587: Refresh wallet stack dependencies: wallet-standard 1.1.1, Wallet UI core 4.2.0, wallet-standard-mobile 0.5.3, and latest solana-program packages (compute-budget 0.16, program-metadata 0.7, system 0.12.2, token 0.14, token-2022 0.12), plus dev tooling updates.
- Updated dependencies [5c62168]
- Updated dependencies [5c62168]
- Updated dependencies [5c62168]
- Updated dependencies [245c587]
- Updated dependencies [245c587]
- Updated dependencies [5c62168]
- Updated dependencies [5c62168]
    - @solana/connector@0.3.0

## 0.2.1

### Patch Changes

- fd4e65a: Upgrade the Solana Kit, Wallet UI, Wallet Standard mobile, WalletConnect, and keychain dependency ranges to the latest wallet stack.
