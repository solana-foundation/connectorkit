---
'@solana/connector': patch
---

Run transaction validation on every client signing path.

`TransactionValidator` previously ran only in `signTransaction`; the batch path of `signAllTransactions`, `signAndSendTransaction`, and `signAndSendTransactions` forwarded transactions to the wallet unvalidated. All paths now validate first, and the wallet-feature calls are typed to accept only validated bytes so a future path cannot skip the check. Oversized, empty, or unrecognised transactions on those paths now throw a `ValidationError` with code `INVALID_TRANSACTION` before any wallet interaction (batch failures report `index` / `total` in the error context) instead of reaching the wallet.

Also: the validator now accepts any typed-array view (`Int8Array`, `DataView`, ...) the same way `serializeTransaction` does, instead of rejecting non-`Uint8Array` views as unrecognised.
