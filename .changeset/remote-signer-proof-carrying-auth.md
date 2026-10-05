---
'@solana/connector': minor
---

Harden the remote signer route handlers (`@solana/connector/server`).

- `authorize` may now return `{ principal }` in addition to a boolean. The principal is handed to policy hooks through a new third argument, `context: PolicyContext<P>`, alongside `operation` (`signTransaction`, `signAllTransactions`, `signAndSendTransaction`, `signMessage`) and, for batches, `index` / `total`. The principal type is inferred from `authorize`; existing boolean callbacks and two-argument hooks keep working unchanged. New exported types: `AuthorizeResult`, `PolicyContext`, `SigningOperation`.
- Signing is now gated by typed evidence: the handlers hold a signer that only accepts policy-approved values, and approval requires the authorization result, so a code path that skips either check no longer type-checks. The sequence is implemented once instead of per operation.
- Fix: the loaded signer was cached at module level and ignored the provider config, so two `createRemoteSignerRouteHandlers` calls in one process shared whichever signer initialised first. Each handler instance now owns its signer; concurrent first requests share one initialisation and a failed initialisation is retried.
- Fix: the default `CONNECTOR_SIGNER_TOKEN` check compared tokens with `===`; it now uses a constant-time comparison (runtime-neutral, no `node:crypto`).
- `authorize` results are now interpreted strictly: `true` or `{ principal }` allow, anything else rejects. Previously any truthy value allowed.
- Adds a test suite for the route handlers and compile-time assertions for the evidence types.
