# `@helium/sus` (vendored/adapted notes)

This repo does **not** depend on `@helium/sus` directly. Instead, `packages/devtools` implements a **Sus-inspired** simulation/analysis view using only existing dependencies in this monorepo.

## Upstream

- **Name**: `@helium/sus`
- **Version referenced**: `0.11.11`
- **Repo**: `https://github.com/helium/helium-program-library`
- **License**: Apache-2.0 (see `LICENSE-APACHE-2.0.txt`)

## What we implemented (best-effort)

The Transactions → Simulate sub-tab reimplements a minimal subset of Sus-like behavior:

- Build an **Explorer tx inspector link** from the transaction message bytes.
- Run **`simulateTransaction`** (optionally requesting post-state snapshots for selected accounts).
- Compute **writable-account diffs** (changed vs unchanged) from lamports + raw account data bytes.
- Compute **balance deltas**:
    - SOL deltas (lamports)
    - Classic SPL token-account amount deltas when the account layout is the fixed 165-byte form
- Emit **warnings** inspired by Sus output (e.g. unchanged writable, token delegation/owner/close-authority changes).
- Best-effort **Anchor instruction decoding** by fetching Program Metadata IDLs and decoding instruction data with Anchor’s `BorshInstructionCoder`.

## What we intentionally did not implement

To keep `packages/devtools` dependency-free (no new npm deps), we do not include:

- DAS/cNFT scanning (`searchAssets`)
- Token metadata fetching for tickers/URIs
- Extra RPC batching/axios helpers from upstream
- Anchor account diffing using `decodeIdlAccount` field-level comparisons

If you want the full Sus feature set, consider integrating upstream `@helium/sus` in an application layer (not in this devtools package), or expanding this implementation with additional features as needed.
