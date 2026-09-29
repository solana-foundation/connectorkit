---
'@solana/connector': patch
'@solana/connector-debugger': patch
---

Harden cluster switching and restarts in the kit-backed wallet core, and show v1 instructions in the devtools:

- A failed silent reconnect during a cluster switch no longer clears the persisted session for apps that rely on the default `localStorage` persistence; the guard previously applied only when a custom wallet storage adapter was supplied.
- `connectWallet`, `selectAccount`, and `disconnect` called during a cluster switch now hold until the replacement wallet client is attached, instead of running against the previous chain and having their result replaced when the switch completed. The wait on the replacement's silent reconnect is capped at 5 seconds.
- A session restored after `destroy()` and re-initialization (React StrictMode runs one on every dev mount) emits `wallet:connected` again; connection bookkeeping from the previous lifecycle no longer suppresses it.
- The devtools in-flight transaction view and simulation fallback render the instructions of v1 transactions, which store them as headers and payloads rather than an `instructions` array.
