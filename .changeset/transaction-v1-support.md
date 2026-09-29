---
'@solana/connector': minor
'@solana/connector-debugger': minor
---

Add transaction v1 (SIMD-0296/SIMD-0385) support across the stack.

Reading and validating v1 transactions now works everywhere unconditionally: transaction bytes are classified by a wire-layout-aware version sniffer (the v1 `0x81` discriminator at byte 0, or the legacy/v0 signature-count prefix — this also fixes a latent bug that misrouted signed v0 transactions to the legacy web3.js parser), the transaction validator applies the right size limit per version (1232 bytes for legacy/v0, 4096 for v1), RPC reads raise `maxSupportedTransactionVersion` to 1 (a ceiling — pinned at 0, any request touching a v1 transaction fails), and the devtools decode the v1 embedded transaction config (compute unit limit, total-lamports priority fee, loaded accounts data size limit, heap size) instead of scanning ComputeBudget instructions. WalletConnect signature injection now uses kit's transaction codec, working identically for legacy/v0/v1.

Building v1 transactions is opt-in and off by default: pass `transactionConfig: { version: 1, priorityFeeLamports }` to `solanaRpc` via the re-exported `@solana/kit-plugin-rpc` 0.19 planner. The web3.js compat layer rejects v1 bytes with a descriptive error instead of misparsing them (web3.js 1.x cannot represent v1).

New negotiation helpers `walletSupportsTransactionVersion` / `getWalletSupportedTransactionVersions` read the wallet-standard `supportedTransactionVersions` field permissively (typed `'legacy' | 0 | 1` as of `@solana/wallet-standard-features` 1.5, tolerating unknown future versions) and can be scoped to a single signing operation — `solana:signTransaction`, `solana:signAndSendTransaction`, `solana:signAndSendAllTransactions`, or the connector's own `solana:signAllTransactions` — a `supportedTransactionVersions` slot lands on `TransactionSignerCapabilities`, the remote-signer protocol can declare supported versions in its metadata capabilities, and `WalletConnectConfig` accepts an advertised-versions override.
