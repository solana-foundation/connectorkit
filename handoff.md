# Handoff — ConnectorKit → kit-native rework

**Branch:** `chore/-consume-kit-7` (worktree: `/Users/sf-am/emdash/worktrees/connectorkit/main`)
**Full plan:** `/Users/sf-am/.claude/plans/can-you-study-the-pure-church.md` (read it — this doc is the delta + execution detail)
**Goal:** make `@solana/connector` a shining example of consuming `@solana/kit`'s native features instead of reimplementing them. Trigger: solana-dev-skill PR #55 deprecated ConnectorKit for new apps in favor of `createClient().use(walletSigner()).use(solanaRpc())` + `@solana/react`.

## Locked decisions
- **Hybrid/phased**: gut reinvented internals under today's public API, then add a kit-native surface.
- **All four subsystems in scope**: signer bridging · RPC/client · data-fetching · wallet-connection core.
- **Minimize breakage**: keep public API stable, deprecate rather than remove, add kit-native paths alongside, bump kit already done.

## Branch reality (differs from the plan's basis)
The plan was mapped against `feat/offchain-message-signing`. This branch (`chore/-consume-kit-7`, from PR #50 "wallet stack upgrade") differs:
- **kit-7 bump already committed** — connector `0.2.6`, all `@solana/*` at `^7`, `@wallet-ui/core ^4.2.0`, keychain peers `^1.2.0`. The plan's "prerequisite" is DONE here.
- **No OCMS** — `lib/offchain-message/*` does not exist on this branch (it's only on the OCMS branch). The plan's "leave OCMS untouched" is moot here.
- Run commands against the worktree: `pnpm -C /Users/sf-am/emdash/worktrees/connectorkit/main <script>` (harness pins cwd elsewhere; `cd` into the worktree does not persist).

## Done (commit `b249c64`) — Phase 1: signer bridging
Deleted hand-rolled Wallet-Standard→kit signer wiring; delegate to `@solana/wallet-account-signer`. Net −102 source lines, non-breaking, green (883 tests / 19 skipped, type-check clean).
- `src/hooks/use-kit-transaction-signer.ts` — builds via `getOrCreateUiWalletAccountForStandardWalletAccount(selectedWallet, account)` → `createTransactionSignerFromWalletAccount(uiAccount, cluster.id)`. Manual shortvec/wire-format now off the runtime path.
- `src/lib/kit/signer-integration.ts` (`createKitSignersFromWallet`) — delegates to `createMessageSignerFromWalletAccount` / `createTransactionSendingSignerFromWalletAccount`.
- Added deps: `@solana/wallet-account-signer ^7`, `@wallet-standard/ui ^1`, `@wallet-standard/ui-registry ^1`.
- **Left in place (compat):** `src/lib/transaction/kit-transaction-signer.ts` `createKitTransactionSigner(connectorSigner)` (~475-line manual bridge) is now runtime-dead but still exported — clean deletion target for a future major. Its tests still pass, keep them until removal.

## Verified kit-native APIs (do NOT re-research — confirmed against source, kit v7 / kit-plugins)
- `@solana/wallet-account-signer@7.0.0`: `createTransactionSignerFromWalletAccount(uiWalletAccount, chain)` → `TransactionModifyingSigner`; `createMessageSignerFromWalletAccount(uiWalletAccount)` → `MessageModifyingSigner`; `createTransactionSendingSignerFromWalletAccount(uiWalletAccount, chain)` → `TransactionSendingSigner`.
- `@wallet-standard/ui-registry@1.1.1`: `getOrCreateUiWalletAccountForStandardWalletAccount(wallet, account)` → `UiWalletAccount` (clean public fn; the `_DO_NOT_USE_OR_YOU_WILL_BE_FIRED` name is just a deprecated alias). **This is the seam** between connector's `@wallet-standard/base` discovery and kit's account-based helpers — reuse it everywhere a `UiWalletAccount` is needed. Connector context (`useConnector`) exposes `selectedWallet`, `accounts[].raw` (WalletAccount), `cluster.id` (chain).
- `@solana/react@7.0.0` (peers: react ≥18, `@solana/kit`, optional `@tanstack/react-query ^5`, `swr ^2`; subpaths `.`, `./swr`, `./query`): `ClientProvider`, `useClient`, `useClientCapability`, data hooks `useRequest`/`useSubscription`/`useTrackedData`, wallet hooks `useSignIn`/`useSignMessage`/`useSignTransaction`/`useSignAndSendTransaction`/`useWalletAccount{Message,Transaction,TransactionSending}Signer`, `SelectedWalletAccountContextProvider`. (`useSignTransactions`/`useSignAndSendTransactions` plural and `useSelectedWalletAccount` DO NOT exist — do not use.)
- `@solana/kit-plugin-wallet@0.13.1`: `walletSigner/walletPayer/walletIdentity/walletWithoutSigner({chain,storage,storageKey,autoConnect,filter})`; `client.wallet.{getState,connect,disconnect,selectAccount,signMessage,signIn,whenReady,subscribe}`; `/react` hooks `useWallets/useConnectedWallet/useWalletStatus/useIsWalletReady/useConnect/useDisconnect/useSignIn/useSignMessage/useSelectAccount` + `WalletReadyGate`.
- `@solana/kit-plugin-rpc@0.13.0`: `solanaRpc/solanaDevnetRpc/...`, `rpcTransactionPlanner`/`rpcTransactionPlanExecutor` (CU estimation + preflight sim).
- Caveat: `@solana-program/*` still peer-declare kit `^6` while kit is 7 — works fine, ignore the peer warning.

## Remaining work
### Phase 1 (continue) — RPC / client + helpers
- `src/lib/kit/client.ts` `createSolanaClient` — keep `{rpc,rpcSubscriptions,urlOrMoniker}` shape; drop bespoke URL/moniker/WS-port logic for kit RPC transport / `@solana/kit-plugin-rpc`.
- `src/lib/kit/rpc.ts` — replace reimplemented URL helpers with kit equivalents.
- `src/lib/kit/prepare-transaction.ts` + `use-transaction-preparer.ts` — route CU estimation + preflight through kit-plugin-rpc planner/executor.
- `src/lib/kit/constants.ts` — prefer kit `lamports()` units; dedupe the two explorer modules (`lib/kit/explorer.ts` + `lib/utils/explorer-urls.ts`) to one (kit has no explorer helper — internal dedup only).
- Tests present here: `lib/kit/{client,rpc,constants,explorer,debug}.test.ts` — keep green / update on signature shifts.

### Phase 2 — data-fetching, wallet-core, showcase
- **Data-fetching:** rebuild `src/hooks/_internal/use-shared-query.ts` on `@solana/react` data hooks (`useRequest`/`useSubscription`/`useTrackedData`); rewire `use-balance.ts`/`use-tokens.ts`/`use-transactions.ts`/`_internal/use-wallet-assets.ts` under the hood (public signatures unchanged). Move balance polling → subscription. Replace hand-rolled Token/Token-2022 jsonParsed parsers with `@solana-program/token`(+`token-2022`) decoders. **Open Q (unresolved):** base `@solana/react` hooks (no extra dep — recommended) vs `/query` (TanStack) vs `/swr`.
- **Wallet connection core:** back `ConnectorProvider` with a kit client using `walletSigner()` + `client.wallet` store; reimplement connector hooks (`useWallet`/`useConnectWallet`/`useDisconnectWallet`/`useWalletConnectors`/`useAccount`) as thin adapters mapping kit `UiWalletAccount`/`WalletStatus` → connector `SessionAccount`/`WalletStatus`. Keep connector-only layers: MWA registration, WalletConnect, remote signer, cluster manager, devtools metrics. **Open Q:** adopt kit-plugin-wallet discovery wholesale (UiWalletAccount free) vs keep connector discovery + convert via the seam above.
- **Showcase surface:** new `@solana/connector/kit` entrypoint (`src/kit.ts` + package.json `exports`) re-exporting/wrapping `@solana/react` + `@solana/kit-plugin-wallet/react`.

### Demonstration + release
- Update `connectorkit/SKILL.md` + `connectorkit/references/*` and `examples/*` to show kit-native patterns; reconcile with PR #55.
- Add a changeset (`pnpm changeset`) when the rework is release-ready — single version bump for the whole rework, not per-slice.

## Known state / gotchas
- **Pre-existing prettier drift** (NOT ours): 7 files fail `prettier --check` on this branch (`use-wallet-info.ts`, `errors/index.ts`, `session.ts`, `connection-manager.ts`, `walletconnect/create-walletconnect-wallet.ts`, `remote/protocol.ts`, `types/walletconnect.ts`) → `turbo lint` for connector is red independent of this work. Decision: leave them, keep diffs clean. Handle in a separate formatting pass if a green branch is needed.
- devtools already uses `@solana-program/{system,token,token-2022,compute-budget,program-metadata}` — decoders available for Phase 2 data parsing.

## Verify each slice
```
W=/Users/sf-am/emdash/worktrees/connectorkit/main
pnpm -C $W --filter @solana/connector type-check
pnpm -C $W --filter @solana/connector test
npx prettier@3.9.4 --check <changed files>   # avoid touching the 7 pre-existing failures
```
End-to-end (later): run an example app vs devnet — connect a Wallet Standard wallet, sign+send a transfer via the kit signer, read balance/tokens live via subscription — confirm parity.
