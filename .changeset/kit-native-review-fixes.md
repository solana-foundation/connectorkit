---
'@solana/connector': patch
---

Fix regressions found in review of the kit-native rework:

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
