---
'@solana/connector': patch
---

Security hardening:

- `createConnectorId` no longer trims separators with a backtracking regex, removing a polynomial ReDoS on wallet names made of long runs of non-alphanumeric characters (CodeQL `js/polynomial-redos`). Output is unchanged.
- Raise the minimum `zod` to `^4.6.6` so installs pick up the patched release.
