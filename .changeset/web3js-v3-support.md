---
'@solana/connector': minor
---

Support `@solana/web3.js` 3.x alongside 1.x.

- The optional `@solana/web3.js` peer range is now `^1.0.0 || ^3.0.0`. web3.js 3.x is a Kit-based rebuild where `Transaction.serialize()` returns a promise; every internal call site now awaits serialization, so signing, `signAllTransactions`, `signAndSendTransaction`, and the wallet-adapter compat `sendTransaction` work on both majors.
- `ConnectorClient.previewTransaction` now returns `Promise<void>` (was `void`). Add `await` at call sites; the `transaction:preparing` event fires once the wire bytes are available.
- `getLatestBlockhash` (headless) normalizes `lastValidBlockHeight` to a `number` on both majors (web3.js 3.x reports a `bigint`). `sendRawTransaction` converts a `bigint` `maxRetries` for the Kit path and no longer forwards the connector-only `commitment` key to a legacy `Connection`.
- Version 1 (SIMD-0296) transactions now round-trip through web3.js objects on 3.x: `convertSignedTransaction` returns a `VersionedTransaction` instead of throwing. On 1.x the descriptive rejection is unchanged.
- `TransactionValidator.validate` accepts a `serialized` option with pre-computed wire bytes and treats an async `serialize()` as "size not measurable" instead of reading `.length` off a promise. The transaction signer now serializes first and validates the bytes, which also means unsigned legacy transactions are size-checked (previously `serialize()` threw and the check was skipped).
- `@solana/connector-debugger` still requires web3.js 1.x (it depends on Anchor 0.32).
