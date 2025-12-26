# ConnectorKit

Production-ready Solana wallet infrastructure. A headless, framework-agnostic wallet connector built on Wallet Standard.

![npm](https://img.shields.io/npm/v/@solana/connector)
![TypeScript](https://img.shields.io/badge/TypeScript-100%25-blue)

## Packages

| Package                                           | Description                                                          |
| ------------------------------------------------- | -------------------------------------------------------------------- |
| [@solana/connector](./packages/connector)         | Core wallet connector with React hooks and headless client           |
| [@solana/connector-debugger](./packages/debugger) | Development debug panel with transaction analysis (experimental wip) |

## Why ConnectorKit?

- **Wallet Standard First** - Built on the official Wallet Standard protocol for universal wallet compatibility
- **Modern & Legacy Support** - Works with both `@solana/kit` and `@solana/web3.js` (legacy)
- **Framework Agnostic** - React hooks + headless core for Vue, Svelte, or vanilla JavaScript
- **Production Ready** - Event system for analytics, health checks for diagnostics, error boundaries for React apps
- **Mobile Support** - Built-in Solana Mobile Wallet Adapter integration

## Quick Start

```bash
npm install @solana/connector
```

```typescript
import { AppProvider } from '@solana/connector/react';
import { getDefaultConfig } from '@solana/connector/headless';

function App() {
  const config = getDefaultConfig({ appName: 'My App' });

  return (
    <AppProvider connectorConfig={config}>
      <YourApp />
    </AppProvider>
  );
}
```

```typescript
import { useConnector, useAccount } from '@solana/connector';

function WalletButton() {
  const { wallets, select, disconnect, connected } = useConnector();
  const { formatted, copy } = useAccount();

  if (!connected) {
    return wallets.map(w => (
      <button key={w.wallet.name} onClick={() => select(w.wallet.name)}>
        Connect {w.wallet.name}
      </button>
    ));
  }

  return (
    <div>
      <button onClick={copy}>{formatted}</button>
      <button onClick={disconnect}>Disconnect</button>
    </div>
  );
}
```

See the [connector package docs](./packages/connector/README.md) for full API reference.

## Debug Panel (Development)

```bash
npm install @solana/connector-debugger
```

```typescript
import { ConnectorDebugPanel } from '@solana/connector-debugger/react';

// Add to your app (development only)
{process.env.NODE_ENV === 'development' && <ConnectorDebugPanel />}
```

Features:

- Live wallet state monitoring
- Pre-flight transaction simulation
- Transaction size analysis with optimization suggestions
- Address Lookup Table recommendations
- Real-time event stream

See the [debugger package docs](./packages/debugger/README.md) for full documentation.

## Examples

Check out the [Next.js example](./examples/next-js) for a complete implementation with shadcn/ui components.

## Supported Wallets

Compatible with all [Wallet Standard](https://github.com/wallet-standard/wallet-standard) compliant wallets:

- Phantom
- Solflare
- Backpack
- Jupiter
- Any Wallet Standard compatible wallet

## Development

```bash
# Install dependencies
pnpm install

# Build all packages
pnpm build

# Development mode
pnpm dev

# Type checking
pnpm type-check

# Linting
pnpm lint
```

## License

MIT
