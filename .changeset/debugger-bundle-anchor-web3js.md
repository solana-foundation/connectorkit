---
'@solana/connector-debugger': patch
---

Stop installing vulnerable transitive dependencies into consumer apps.

`@coral-xyz/anchor`, `@solana/web3.js` and `bn.js` are now compiled into the package instead of being declared as dependencies, so installing the debugger no longer pulls in `jayson@4` (with `stream-json@1` and `uuid@8`) or `toml@3`. A clean install drops from 8 `npm audit` findings to 0. `rpc-websockets` stays a regular dependency because it is LGPL-licensed, and `dist/THIRD_PARTY_LICENSES.txt` lists everything that is bundled. The bundled code carries its own `Buffer`, so no polyfill is needed.

If your app imported `@solana/web3.js`, `@coral-xyz/anchor` or `bn.js` without declaring them, relying on the debugger to install them, add them to your own `package.json`.

Also fixes the IDL tab's instruction execution, which failed with `Cannot read properties of undefined (reading 'encode')` because `Program` was constructed with the pre-0.30 Anchor argument order.
