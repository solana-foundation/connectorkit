---
'@solana/connector': minor
'@solana/connector-debugger': minor
---

Upgrade @solana/kit and companion packages (addresses, codecs, keys, react, signers, transactions, transaction-messages, wallet-account-signer, webcrypto-ed25519-polyfill) from v7.1 to v8.0, along with `@solana/kit-plugin-rpc`, `@solana/kit-plugin-wallet`, and `@solana/kit-plugin-signer` 0.18, and the Codama program clients (`@solana-program/compute-budget` 0.18, `@solana-program/program-metadata` 0.9, `@solana-program/system` 0.14, `@solana-program/token` 0.16, `@solana-program/token-2022` 0.15).

Kit v8's breaking changes — the removal of the compute-unit-limit estimation helpers, `getBigIntDowncastRequestTransformer`, the fixed transaction size constants (`TRANSACTION_SIZE_LIMIT` and friends), and the transaction plan result context rework — do not touch any API used by these packages, so no source changes were required. Consumers now receive kit v8 types transitively.
