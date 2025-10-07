# ConnectorKit Examples

Welcome to the ConnectorKit examples! This directory contains comprehensive, production-ready examples demonstrating how to integrate Solana wallet connections across different frameworks and use cases.

## 📚 Available Examples

### [Next.js (App Router)](./nextjs)

Full-featured Next.js application with Server Components and shadcn/ui.

**Stack:** Next.js 15, React 19, shadcn/ui, Tailwind CSS  
**Best For:** Production apps, SSR/SSG, complex routing, API routes

```bash
cd examples/nextjs
pnpm dev
```

**Features:**
- ✅ Server-side rendering (SSR)
- ✅ shadcn/ui component library
- ✅ Production-ready architecture
- ✅ SEO-friendly
- ✅ API routes support

---

### [Vite + React](./vite)

Lightweight single-page application with React and Vite.

**Stack:** Vite 6, React 18, Tailwind CSS  
**Best For:** Client-side SPAs, fast development, simple dApps

```bash
cd examples/vite
pnpm dev
```

**Features:**
- ⚡ Lightning-fast HMR
- ✅ Simple deployment (static files)
- ✅ Smaller bundle size
- ✅ Great DX with instant feedback
- ✅ Deploy anywhere (Vercel, Netlify, S3, IPFS)

---

### [Vue 3](./vue)

Modern Vue application using Composition API and nanostores.

**Stack:** Vue 3.5, Vite, nanostores, Tailwind CSS  
**Best For:** Vue developers, reactive state management

```bash
cd examples/vue
pnpm dev
```

**Features:**
- 🟢 Composition API with `<script setup>`
- ✅ Headless ConnectorClient integration
- ✅ Reactive state with nanostores
- ✅ Single File Components
- ✅ Type-safe composables

---

## 🎯 Which Example Should I Use?

### Choose **Next.js** if you need:
- Server-side rendering or static generation
- SEO optimization for landing pages
- Built-in routing and API routes
- Full-stack application with backend
- Production-ready architecture out of the box

### Choose **Vite + React** if you need:
- Pure client-side application
- Fastest development experience
- Simplest deployment (static files)
- Maximum flexibility
- Minimal framework overhead

### Choose **Vue** if you:
- Prefer Vue over React
- Want to use Composition API
- Need reactive state with nanostores
- Like Single File Components
- Want a more opinionated framework

---

## 🚀 Quick Start

From the repository root:

```bash
# Install all dependencies
pnpm install

# Run specific example
cd examples/[nextjs|vite|vue]
pnpm dev
```

---

## 📋 Feature Comparison

| Feature | Next.js | Vite | Vue |
|---------|---------|------|-----|
| **Framework** | Next.js + React | React | Vue 3 |
| **Rendering** | SSR/SSG/CSR | CSR only | CSR only |
| **Dev Server** | Next.js (Turbopack) | Vite | Vite |
| **Routing** | Built-in (file-based) | Manual | Manual |
| **API Routes** | ✅ Yes | ❌ No | ❌ No |
| **Build Output** | Hybrid | Static | Static |
| **Bundle Size** | Larger | Smaller | Smaller |
| **SEO** | ✅ Excellent | ⚠️ Limited | ⚠️ Limited |
| **Learning Curve** | Moderate | Easy | Easy |
| **State Management** | React Hooks | React Hooks | Nanostores + Composables |
| **Best Deployment** | Vercel | Any static host | Any static host |

---

## 🧩 Common Features Across All Examples

All examples include:

- ✅ **Wallet Connection** - Connect to any Solana wallet
- ✅ **ConnectButton** - Pre-built wallet connection UI
- ✅ **Multi-Account Support** - Handle wallets with multiple accounts
- ✅ **Network Switching** - Switch between Mainnet, Devnet, Testnet, Localnet
- ✅ **Mobile Support** - Mobile Wallet Adapter included
- ✅ **Type Safety** - Full TypeScript support
- ✅ **Auto-Reconnect** - Persistent wallet connections
- ✅ **Error Handling** - Graceful error boundaries
- ✅ **Responsive Design** - Mobile-first UI components

---

## 🏗️ Architecture Overview

### ConnectorKit Architecture

```
┌─────────────────────────────────────────┐
│   Your App (Next.js / React / Vue)     │
│                                         │
│  ┌─────────────┐      ┌──────────────┐ │
│  │ React Hooks │  OR  │ Vue          │ │
│  │  Provider   │      │ Composables  │ │
│  └──────┬──────┘      └──────┬───────┘ │
│         │                    │         │
│         └────────┬───────────┘         │
│                  │                     │
│         ┌────────▼────────┐            │
│         │ ConnectorClient │            │
│         │   (Headless)    │            │
│         └────────┬────────┘            │
│                  │                     │
└──────────────────┼─────────────────────┘
                   │
         ┌─────────▼─────────┐
         │  Wallet Standard  │
         │    WalletUI       │
         └─────────┬─────────┘
                   │
    ┌──────────────┼──────────────┐
    │              │              │
┌───▼────┐  ┌─────▼──────┐  ┌───▼────┐
│Phantom │  │  Solflare  │  │ Backpack│
└────────┘  └────────────┘  └────────┘
```

### React vs Vue Integration

**React Example (Next.js, Vite):**
```typescript
// Uses React Provider and Hooks
<ConnectorProvider config={config}>
  <App />
</ConnectorProvider>

const { wallets, select } = useConnector()
```

**Vue Example:**
```typescript
// Uses Headless Client with nanostores
const client = new ConnectorClient(config)
const state = useStore(client.state)

const wallets = computed(() => state.value.wallets)
```

---

## 📦 What's in Each Example?

### Components Included

All examples include these pre-built components:

1. **ConnectButton** - Main wallet connection button
   - Shows "Connect Wallet" when disconnected
   - Shows address and dropdown menu when connected
   - Dropdown includes copy address and disconnect options

2. **WalletModal** - Wallet selection dialog
   - Lists all available wallets
   - Shows wallet icons and names
   - Detects installed vs. not installed wallets
   - Handles connection flow

3. **ClusterSelector** - Network selector dropdown
   - Switch between Mainnet, Devnet, Testnet, Localnet
   - Color-coded badges for each network
   - Persists selection across sessions

4. **AccountSwitcher** (Next.js, Vite) - Multi-account support
   - Automatically hidden when only one account
   - Switch between multiple accounts
   - Visual indicator for active account

---

## 🔧 Customization Guide

All examples are designed to be **copied and customized** for your needs.

### Styling

Every component accepts `className` prop:

```tsx
<ConnectButton className="bg-purple-500 hover:bg-purple-600" />
```

### Configuration

Change network, RPC endpoint, and more:

```typescript
const config = getDefaultConfig({
  appName: 'My App',
  network: 'mainnet-beta',
  clusters: [
    createSolanaMainnet({
      endpoint: 'https://your-custom-rpc.com'
    })
  ]
})
```

### Adding Features

All source code is included. Extend components with:
- Transaction signing
- Message signing
- Token transfers
- NFT minting
- Custom UI libraries

---

## 🚢 Deployment

### Next.js
```bash
# Vercel (recommended)
vercel deploy

# Or build locally
pnpm build
```

### Vite & Vue
```bash
# Build
pnpm build

# Deploy dist/ to:
# - Vercel: vercel deploy
# - Netlify: Drag-and-drop dist/
# - GitHub Pages: Push to gh-pages
# - S3/CloudFront: Upload dist/
# - IPFS: Pin dist/ folder
```

---

## 📖 Documentation

- [ConnectorKit Core Documentation](../README.md)
- [Next.js Example Docs](./nextjs/README.md)
- [Vite Example Docs](./vite/README.md)
- [Vue Example Docs](./vue/README.md)

---

## 🎨 UI Libraries Used

All examples use **Tailwind CSS** for styling.

**Next.js & Vite (React):**
- [shadcn/ui](https://ui.shadcn.com) - Radix UI + Tailwind
- [Lucide Icons](https://lucide.dev)

**Vue:**
- [Radix Vue](https://www.radix-vue.com) - Radix for Vue
- [Lucide Vue](https://lucide.dev)

---

## 💡 Learning Path

1. **Start with the framework you know**
   - React developer? Try Next.js or Vite
   - Vue developer? Start with Vue

2. **Understand the core concepts**
   - Review `ConnectorProvider` setup
   - Explore wallet connection flow
   - Test network switching

3. **Customize for your needs**
   - Copy components to your project
   - Modify styling and behavior
   - Add your own features

4. **Build your dApp**
   - Add transaction logic
   - Integrate with Solana programs
   - Deploy to production

---

## 🤝 Contributing

Found an issue or have a suggestion?

- Open an issue on GitHub
- Submit a pull request
- Share your feedback

We welcome contributions for:
- New framework examples (Svelte, Angular, etc.)
- Additional features
- UI improvements
- Documentation enhancements

---

## 🔗 Useful Links

- [Solana Wallet Standard](https://github.com/wallet-standard/wallet-standard)
- [Wallet UI](https://github.com/wallet-ui/wallet-ui)
- [Solana Documentation](https://docs.solana.com)
- [ConnectorKit GitHub](https://github.com/your-repo)

---

**Built with ❤️ by the ConnectorKit team**

Each example is production-ready and maintained. Choose the one that fits your stack and start building on Solana!
