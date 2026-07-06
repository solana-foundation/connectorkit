---
"@solana/connector": minor
"@solana/connector-debugger": minor
---

Upgrade @solana/kit and companion packages (addresses, codecs, keys, signers, transactions, transaction-messages, webcrypto-ed25519-polyfill) from v6.9 to v7.0. Kit v7's breaking changes (pattern-match codec typing, instruction-plan limits, reactive store lifecycle) do not touch any API used by these packages, so no source changes were required — but consumers now receive kit v7 types transitively.
