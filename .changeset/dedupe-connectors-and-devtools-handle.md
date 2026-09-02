---
'@solana/connector': patch
---

Fix three server-rendering and remount issues in `ConnectorProvider`:

- Hydration mismatch during auto-connect. The React store hooks passed live client state as their `getServerSnapshot`, so React's hydration pass rendered whatever wallet discovery and silent reconnect had already produced — a spinner or a populated wallet list where the server had written an idle label and an empty list. `ConnectorClient.getServerSnapshot()` now returns state as it stood before browser-only initialization, and the subscription delivers live state on the render after hydration.
- Connector ids derive from the wallet name, so two wallets registered under the same name produced two connectors sharing one id — enough to trigger React's duplicate-key error in wallet lists, and to let a stale duplicate shadow the live wallet in `getConnectorById`. The projected wallet list now keeps the first wallet per connector id.
- `ConnectorProvider` cleared `window.__connectorClient` on unmount and never republished it when the effect re-ran, leaving Connector Devtools unable to find the client for the rest of the session. The handle is now republished on each effect run and only cleared by the client that owns it.
