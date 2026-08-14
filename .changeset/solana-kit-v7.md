---
'@solana/connector': minor
'@solana/connector-debugger': minor
---

Upgrade @solana/kit and companion packages (addresses, codecs, keys, react, signers, transactions, transaction-messages, wallet-account-signer, webcrypto-ed25519-polyfill) from v6.9 to v7.1, along with `@solana/kit-plugin-rpc` 0.16 and `@solana/kit-plugin-wallet` 0.14. Kit v7's breaking changes (pattern-match codec typing, instruction-plan limits, reactive store lifecycle) do not touch any API used by these packages, so no source changes were required — but consumers now receive kit v7.1 types transitively.

Kit 7.1 adds a hook per client capability to `@solana/react`, all of which `@solana/connector/kit` now re-exports:

- `usePayer` / `useIdentity` read `client.payer` / `client.identity` and, when the client advertises `subscribeToPayer` / `subscribeToIdentity` (as `walletSigner()` does), track them reactively.
- `useAirdrop`, `usePlanTransaction`, `usePlanTransactions`, `useSendTransaction`, and `useSendTransactions` wrap the matching client method as an action exposing `{ dispatch, dispatchAsync, isRunning, data, error }`, each dispatch running under a fresh `AbortSignal`.

These are hooks on a kit plugin client and are additive — the connector's own hooks are unchanged.
