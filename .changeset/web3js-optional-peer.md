---
'@solana/connector': patch
---

Fix bundling for apps that don't install the optional `@solana/web3.js` peer. Signed web3.js transactions are now rehydrated through the class of the caller's own transaction object instead of a dynamic `import('@solana/web3.js')`, so Turbopack and webpack no longer fail with `Module not found`. A `VersionedTransaction` carrying a legacy message now comes back as a `VersionedTransaction` rather than a `Transaction`, and `signAllTransactions` preserves each transaction's format individually.
