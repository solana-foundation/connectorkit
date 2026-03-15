# Third-Party Notice: `@helium/sus`

This project includes **logic adapted** from Helium’s transaction simulation checker library:

- **Package**: `@helium/sus`
- **Version referenced**: `0.11.11`
- **License**: Apache-2.0
- **Upstream**: `https://github.com/helium/helium-program-library`

## What we adapted (best-effort)

- **Explorer tx inspector link format** (`/tx/inspector?cluster=…&message=…`)
- **Blockhash-not-found retry loop** idea for simulation
- **Warnings heuristics** inspired by Sus output:
    - “Unchanged but writable” warning
    - Token-account delegation/owner/close-authority changes

## Where it lives in this repo

- `packages/devtools/src/plugins/transactions/simulation/*`
- `packages/devtools/src/utils/rpc.ts`

See `LICENSE-APACHE-2.0.txt` for the Apache 2.0 license text.
