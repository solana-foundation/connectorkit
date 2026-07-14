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

## Done — Phase 1: RPC/client + Phase 2: data-fetching (partial) + kit entrypoint
- **RPC/client** — `createSolanaClient` builds rpc/rpcSubscriptions via `createClient().use(solanaRpcConnection(...))` from `@solana/kit-plugin-rpc` (new dep). `prepareTransaction` now really estimates CU/resource limits via kit's `estimateResourceLimitsFactory`/`estimateAndSetResourceLimitsFactory` (multiplier + reset params un-stubbed; explicit-limit messages skip simulation). `lamportsToSol`/`solToLamports` deprecated toward kit's fixed-point versions; `GENESIS_HASH` deleted (internal-only, unused). Explorer modules merged into `lib/kit/explorer.ts`; `lib/utils/explorer-urls.*` deleted; public paths unchanged.
- **Data-fetching (live balance)** — `useWalletAssets` gained `liveUpdates`: `accountNotifications` subscription via `@solana/react`'s `useSubscription` pushes lamports into the shared cache (`setSharedQueryData`) + refetches for token deltas; polling remains as automatic fallback on subscription error/no-WS. `useBalance` `autoRefresh` now drives the subscription. Kit's transport coalesces duplicate subscriptions across components.
- **Kit-native surface** — new `@solana/connector/kit` entrypoint (`src/kit.ts`, tsup entry + exports map): `createClient`/`extendClient`, all of `@solana/react`, `@solana/kit-plugin-rpc`, `@solana/kit-plugin-wallet` (+ its `/react` store hooks, minus `useSignIn`/`useSignMessage` which collide with @solana/react's account-based hooks).
- **Deliberate deviations from this doc:**
  - `use-shared-query.ts` was NOT rebuilt on @solana/react data hooks: those are per-component primitives with no keyed cache, and `getBalanceQueryKey`/`getTokensQueryKey`/`invalidateSharedQuery` are public documented API — rebuilding would break the locked "keep public API stable" decision. The store stays; it now also serves push-based writes.
  - jsonParsed→`@solana-program/token` decoder swap is BLOCKED upstream: latest token clients (token 0.14.0 / token-2022 0.12.0) peer on kit ^6 and import `getMinimumBalanceForRentExemption`, removed in kit 7 (ESM link error). Revisit when kit-7 builds ship. (token-2022 also drags a `@solana/zk-sdk` wasm peer — weigh bundle cost then.)
  - `prepareTransaction` uses kit's estimate factories, not kit-plugin-rpc's planner/executor — the planner assumes a `client.payer` instruction-plan flow; the factories match connector's message-in/message-out shape.
- Verified green after each slice: type-check, 881 tests / 19 skipped, build, prettier (7 pre-existing failures untouched).

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

## Done — Phase 2: wallet core (kit-plugin-wallet wholesale, per user decision)
`KitWalletCore` (`lib/wallet/kit-wallet-core.ts`) replaces the WalletDetector/ConnectionManager/AutoConnector trio (−3,664/+878 lines). `createClient().use(walletSigner({chain, storageKey: 'connector-kit:v1:kit-wallet', autoConnect, filter}))`; plugin state projected onto `ConnectorState` (vNext machine + legacy `selectedWallet`/`accounts[].raw`/`selectedAccount` that feed the kit signer path) + event parity. Notables:
- Custom cluster ids normalize to `solana:mainnet` for wallet discovery (`normalizeWalletChain`); cluster switches rebuild the client behind `whenReady()`.
- `additionalWallets` now register into the wallet-standard registry (connectable, not just listed).
- Legacy name-storage (`config.storage.wallet`) still written/cleared for compat; auto-connect runs via the plugin's own persistence (one-time non-reconnect for users with only the legacy key).
- Removed: window-scanning instant connect, authenticity-verifier, `ConnectOptions.silent` semantics (plugin connect is always interactive; silent is auto-connect-only).
- Tests: vitest aliases `@solana/kit-plugin-wallet` → browser build (node build is an SSR stub, permanently 'pending'); integration mocks register into the real registry; mock wallet `accounts` is a live getter.
- Changeset added (`.changeset/kit-native-rework.md`, minor); SKILL.md + references/api.md document `/kit` + live balance.

## Remaining work
- **use-transactions.ts** — untouched; candidate for `signatureNotifications`/log-subscription-driven updates in a later slice.
- **Blocked:** jsonParsed→decoder swap (see deviations above) until `@solana-program/token`/`token-2022` ship kit-7 builds.
- **Follow-ups worth considering:** consume `client.wallet` state's cached `signer` in `use-kit-transaction-signer` (currently still built per-hook via the seam); expose the kit client itself from `ConnectorProvider` for `/kit` interop; e2e run vs devnet per the plan's verification section.

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
