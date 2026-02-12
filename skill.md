# ConnectorKit

Headless wallet connection library for Solana with framework-agnostic hooks and pre-built components.

- **Website**: https://www.connectorkit.dev/
- **Docs**: https://www.connectorkit.dev/docs
- **GitHub**: https://github.com/solana-foundation/connectorkit
- **NPM**: `npm i @solana/connector`

## Key Features

- **Framework agnostic**: Works with React, Vue, Svelte, and vanilla JavaScript
- **Headless design**: Zero styling opinions, composable blocks with render props
- **Wallet standard**: Built on official Wallet Standard, auto-detects Phantom, Solflare, Backpack
- **Mobile-first**: First-class Solana Mobile Adapter integration with desktop parity
- **Pre-built components**: AccountElement, BalanceElement, TokenListElement, TransactionHistoryElement
- **Developer features**: Auto-connect persistence, network switching, connection pooling, diagnostics
- **Backward compatible**: Works incrementally with existing `@solana/wallet-adapter` code

## Installation & Setup

```
npm i @solana/connector
```

The package includes a playground for exploring components, hooks, and transaction examples. Framework examples available using Radix UI and Base UI.

## API

- **ConnectorClient**: Framework-agnostic client for direct integration
- **Hooks**: Framework-specific hooks for React, Vue, Svelte
- **Elements**: Pre-built UI components for common wallet interactions
- **Render props**: Full control over rendering and styling
