# ConnectorKit Vite Example

Lightweight Solana wallet connection built with React, Vite, and Tailwind CSS. Perfect for single-page applications and client-side dApps.

## 🚀 Quick Start

```bash
# From repo root
pnpm install

# Run the example
cd examples/vite
pnpm dev
```

Open [http://localhost:5173](http://localhost:5173) to see the app in action.

## 📦 What's Included

### Core Features

- **ConnectButton** - Wallet connection with dropdown menu
- **WalletModal** - Wallet selection dialog
- **AccountSwitcher** - Multi-account support
- **ClusterSelector** - Network switching (Mainnet, Devnet, Testnet, Localnet)

### Stack

- ⚡ **Vite 6** - Lightning-fast dev server and build tool
- ⚛️ **React 18** - Modern React with hooks
- 🎨 **Tailwind CSS** - Utility-first styling
- 💼 **ConnectorKit** - Headless wallet connector
- 🔌 **TanStack Query** - Async state management

## 🎯 Why Use This Example?

### When to Choose Vite Over Next.js

- **Client-side only apps** - No need for SSR/SSG
- **Faster development** - Instant HMR with Vite
- **Simpler deployment** - Static files, deploy anywhere (Vercel, Netlify, S3)
- **Smaller learning curve** - Pure React without framework abstractions
- **Better for Chrome extensions** - No server-side concerns

### Use Cases

- Portfolio trackers
- Token swappers
- NFT minting sites
- Simple dApp frontends
- Trading dashboards
- Airdrop claim sites

## 🏗️ Project Structure

```
vite/
├── src/
│   ├── components/
│   │   ├── connector/          # Wallet connector components
│   │   │   ├── connect-button.tsx
│   │   │   ├── wallet-modal.tsx
│   │   │   ├── account-switcher.tsx
│   │   │   ├── cluster-selector.tsx
│   │   │   └── index.ts
│   │   └── ui/                 # Reusable UI components
│   ├── lib/
│   │   └── utils.ts            # Utility functions
│   ├── App.tsx                 # Main app component
│   ├── main.tsx                # Entry point
│   └── index.css               # Global styles
├── index.html
├── vite.config.ts
└── package.json
```

## 🔧 How to Use in Your Project

### Option 1: Clone This Example

```bash
# Copy this example to your project
cp -r examples/vite my-solana-app
cd my-solana-app

# Install dependencies
pnpm install

# Start developing
pnpm dev
```

### Option 2: Add to Existing Vite Project

1. **Install dependencies:**

```bash
pnpm add @connector-kit/connector @tanstack/react-query
pnpm add @radix-ui/react-dialog @radix-ui/react-dropdown-menu @radix-ui/react-avatar
pnpm add lucide-react clsx tailwind-merge class-variance-authority
```

2. **Setup Tailwind CSS** (if not already installed):

```bash
pnpm add -D tailwindcss postcss autoprefixer
npx tailwindcss init -p
```

3. **Copy components:**

```bash
cp -r examples/vite/src/components your-project/src/
cp examples/vite/src/lib/utils.ts your-project/src/lib/
```

4. **Wrap your app with providers:**

```tsx
import { ConnectorProvider, getDefaultConfig } from '@connector-kit/connector'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

const queryClient = new QueryClient()
const config = getDefaultConfig({ appName: 'My App' })

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ConnectorProvider config={config}>
        <YourApp />
      </ConnectorProvider>
    </QueryClientProvider>
  )
}
```

## 📚 Key Differences from Next.js Example

| Feature | Vite | Next.js |
|---------|------|---------|
| **Rendering** | Client-side only (SPA) | Server & Client (SSR/SSG) |
| **Dev Server** | Vite (instant HMR) | Next.js + Turbopack |
| **Build Output** | Static HTML/JS/CSS | Hybrid (static + serverless) |
| **Routing** | Manual (React Router needed) | Built-in file-based routing |
| **API Routes** | Not included | Built-in API routes |
| **Deployment** | Any static host | Vercel optimized |
| **Bundle Size** | Smaller (no framework) | Larger (framework overhead) |
| **Complexity** | Simpler | More features, more complex |

## 🚢 Building for Production

```bash
# Build the app
pnpm build

# Preview production build
pnpm preview
```

The `dist/` folder contains your production-ready static files. Deploy to:

- **Vercel**: `vercel deploy`
- **Netlify**: Connect your Git repo or drag-and-drop `dist/`
- **GitHub Pages**: Push `dist/` to `gh-pages` branch
- **S3/CloudFront**: Upload `dist/` contents
- **IPFS**: Pin `dist/` folder for decentralized hosting

## ⚙️ Configuration

### Change Network

Edit `src/App.tsx`:

```tsx
const config = getDefaultConfig({
  appName: 'My App',
  network: 'mainnet-beta',  // or 'devnet', 'testnet', 'localnet'
})
```

### Add Custom RPC

```tsx
import { createSolanaMainnet } from '@connector-kit/connector'

const config = getDefaultConfig({
  appName: 'My App',
  clusters: [
    createSolanaMainnet({
      endpoint: 'https://your-custom-rpc.com'
    })
  ]
})
```

### Enable Mobile Wallet Adapter

Mobile support is enabled by default! Test on mobile browsers to see the Mobile Wallet Adapter in action.

## 🎨 Customization

All components accept `className` prop for easy styling:

```tsx
<ConnectButton className="bg-purple-500 hover:bg-purple-600" />
<ClusterSelector className="border-2" />
```

## 💡 Pro Tips

1. **Code Splitting**: Vite automatically code-splits for optimal loading
2. **Tree Shaking**: Only imported code is bundled
3. **Fast Refresh**: Changes reflect instantly without losing state
4. **TypeScript**: Full type safety out of the box
5. **Import Aliases**: Use `@/` for clean imports

## 🐛 Troubleshooting

### Buffer not found error

If you encounter buffer errors, install the buffer polyfill:

```bash
pnpm add buffer
```

Add to `vite.config.ts`:

```ts
import { defineConfig } from 'vite'
import { Buffer } from 'buffer'

export default defineConfig({
  define: {
    global: 'globalThis',
    'process.env': {}
  },
  resolve: {
    alias: {
      buffer: 'buffer'
    }
  }
})
```

## 📖 Learn More

- [ConnectorKit Documentation](../../README.md)
- [Vite Documentation](https://vite.dev)
- [React Documentation](https://react.dev)

## 🤝 Contributing

Found an issue or have a suggestion? Feel free to:

- Open an issue
- Submit a pull request
- Share your feedback

---

Built with ⚡ using ConnectorKit, React, and Vite
