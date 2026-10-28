---
'@solana/connector': patch
---

Run transaction validation on every client signing path.

`TransactionValidator` previously ran only in `signTransaction`; the batch path of `signAllTransactions`, `signAndSendTransaction`, and `signAndSendTransactions` forwarded transactions to the wallet unvalidated. All paths now validate first, and the wallet-feature calls are typed to accept only validated bytes so a future path cannot skip the check.

What callers observe for an oversized, empty, unrecognised, or unserializable transaction:

- `signTransaction` and `signAndSendTransaction` throw a `ValidationError` with code `INVALID_TRANSACTION` before any wallet interaction (previously such input could reach the wallet, or surface as `SIGNING_FAILED` / `SEND_FAILED`).
- `signAllTransactions` with a wallet that supports batch signing validates every item up front and throws the same `ValidationError` (with `index` / `total` in the error context) before the wallet is asked, so nothing is signed.
- `signAndSendTransactions`, and `signAllTransactions` on wallets without batch support, process items sequentially: items before the invalid one are still signed/sent, and the failure is reported as `SEND_FAILED` / `SIGNING_FAILED` with the `ValidationError` as `originalError` and `index` / `total` in the context. This matches the previous sequential behaviour; the only change is that the invalid item itself is now rejected instead of being forwarded to the wallet.

Also: the validator now accepts any typed-array view (`Int8Array`, `DataView`, ...) the same way `serializeTransaction` does, instead of rejecting non-`Uint8Array` views as unrecognised.
