# ConnectorKit Vue Example

Modern Solana wallet connection built with Vue 3, Composition API, and nanostores. Perfect for Vue developers building on Solana.

## 🚀 Quick Start

```bash
# From repo root
pnpm install

# Run the example
cd examples/vue
pnpm dev
```

Open [http://localhost:5173](http://localhost:5173) to see the app in action.

## 📦 What's Included

### Core Features

- **ConnectButton** - Wallet connection with dropdown menu
- **WalletModal** - Wallet selection dialog
- **ClusterSelector** - Network switching (Mainnet, Devnet, Testnet, Localnet)
- **Headless Integration** - Uses ConnectorClient with nanostores for Vue reactivity

### Stack

- 🟢 **Vue 3.5** - Composition API with `<script setup>`
- ⚡ **Vite 6** - Lightning-fast dev server
- 🎨 **Tailwind CSS** - Utility-first styling
- 💼 **ConnectorKit** - Headless wallet connector
- 📦 **Nanostores** - Reactive state management
- 🔌 **TanStack Query** - Async state management

## 🎯 Why Vue?

### Perfect for Vue Developers

- **Native Reactivity** - Nanostores integrate seamlessly with Vue's reactivity system
- **Composition API** - Clean composables for wallet state
- **Framework-Agnostic Core** - Uses ConnectorKit's headless client
- **Type-Safe** - Full TypeScript support
- **Lightweight** - Small bundle size, fast performance

### Key Differences from React

- Uses `@nanostores/vue` for reactive state binding
- Composables instead of hooks
- Single File Components (`.vue`)
- `<Teleport>` for modals instead of React portals
- No need for `useState` - nanostores handle reactivity

## 🏗️ Project Structure

```
vue/
├── src/
│   ├── components/
│   │   ├── ConnectButton.vue     # Wallet connection button
│   │   ├── WalletModal.vue       # Wallet selection dialog
│   │   ├── ClusterSelector.vue   # Network selector
│   │   └── WalletInfo.vue        # Wallet info display
│   ├── composables/
│   │   └── useConnector.ts       # Connector composables
│   ├── App.vue                   # Main app component
│   ├── main.ts                   # Entry point
│   └── style.css                 # Global styles
├── index.html
├── vite.config.ts
└── package.json
```

## 🔧 How It Works

### Headless Client Integration

Unlike the React example which uses React hooks, the Vue example uses the **headless ConnectorClient** with nanostores:

```typescript
// src/composables/useConnector.ts
import { ConnectorClient, getDefaultConfig } from '@connector-kit/connector/headless'
import { useStore } from '@nanostores/vue'

const client = new ConnectorClient(getDefaultConfig({ appName: 'My App' }))

export function useConnectorClient() {
  const state = useStore(client.state)
  
  const wallets = computed(() => state.value.wallets)
  const connected = computed(() => state.value.connected)
  
  return { wallets, connected, select: client.select, disconnect: client.disconnect }
}
```

### Usage in Components

```vue
<script setup lang="ts">
import { useConnectorClient, useAccount } from './composables/useConnector'

const { wallets, select, disconnect } = useConnectorClient()
const { address, formatted, connected } = useAccount()
</script>

<template>
  <button v-if="!connected" @click="select('Phantom')">
    Connect
  </button>
  <div v-else>
    {{ formatted }}
    <button @click="disconnect">Disconnect</button>
  </div>
</template>
```

## 🔧 How to Use in Your Project

### Option 1: Clone This Example

```bash
# Copy this example
cp -r examples/vue my-vue-solana-app
cd my-vue-solana-app

# Install dependencies
pnpm install

# Start developing
pnpm dev
```

### Option 2: Add to Existing Vue Project

1. **Install dependencies:**

```bash
pnpm add @connector-kit/connector @nanostores/vue @tanstack/vue-query
pnpm add lucide-vue-next radix-vue
```

2. **Setup Tailwind CSS** (if not already installed):

```bash
pnpm add -D tailwindcss postcss autoprefixer
npx tailwindcss init -p
```

3. **Copy composables and components:**

```bash
cp -r examples/vue/src/composables your-project/src/
cp -r examples/vue/src/components your-project/src/
```

4. **Use in your app:**

```vue
<script setup lang="ts">
import { useConnectorClient } from './composables/useConnector'
import ConnectButton from './components/ConnectButton.vue'

const { connected } = useConnectorClient()
</script>

<template>
  <ConnectButton />
</template>
```

## 📚 Available Composables

### `useConnectorClient()`

```typescript
const {
  wallets,         // Ref<WalletInfo[]>
  selectedWallet,  // Ref<Wallet | null>
  accounts,        // Ref<AccountInfo[]>
  connected,       // Ref<boolean>
  connecting,      // Ref<boolean>
  select,          // (walletName: string) => Promise<void>
  disconnect,      // () => Promise<void>
} = useConnectorClient()
```

### `useAccount()`

```typescript
const {
  address,         // Ref<string | null>
  formatted,       // Ref<string>
  connected,       // Ref<boolean>
  copied,          // Ref<boolean>
  copy,            // () => Promise<boolean>
} = useAccount()
```

### `useCluster()`

```typescript
const {
  cluster,         // Ref<SolanaCluster | null>
  clusters,        // Ref<SolanaCluster[]>
  rpcUrl,          // Ref<string>
  setCluster,      // (clusterId: string) => Promise<void>
  isMainnet,       // Ref<boolean>
  isDevnet,        // Ref<boolean>
} = useCluster()
```

### `useWalletInfo()`

```typescript
const {
  name,            // Ref<string | null>
  icon,            // Ref<string | undefined>
  wallet,          // Ref<WalletInfo | null>
  connecting,      // Ref<boolean>
} = useWalletInfo()
```

## ⚙️ Configuration

### Change Network

Edit `src/composables/useConnector.ts`:

```typescript
const config = getDefaultConfig({
  appName: 'My App',
  network: 'mainnet-beta',  // or 'devnet', 'testnet', 'localnet'
})
```

### Add Custom RPC

```typescript
import { createSolanaMainnet } from '@connector-kit/connector/headless'

const config = getDefaultConfig({
  appName: 'My App',
  clusters: [
    createSolanaMainnet({
      endpoint: 'https://your-custom-rpc.com'
    })
  ]
})
```

## 🚢 Building for Production

```bash
# Build the app
pnpm build

# Preview production build
pnpm preview
```

Deploy the `dist/` folder to:
- **Vercel**, **Netlify**, **GitHub Pages**, **S3/CloudFront**, **IPFS**

## 💡 Pro Tips

### 1. Singleton Client Pattern

The composables use a singleton `ConnectorClient` instance shared across your entire app:

```typescript
let clientInstance: ConnectorClient | null = null

function getClient() {
  if (!clientInstance) {
    clientInstance = new ConnectorClient(config)
  }
  return clientInstance
}
```

This ensures all components share the same wallet state.

### 2. Reactive State with Nanostores

Nanostores work perfectly with Vue's reactivity:

```typescript
const state = useStore(client.state)
const wallets = computed(() => state.value.wallets)
```

Changes to the store automatically trigger Vue re-renders.

### 3. Composition API Best Practices

- Use `computed()` for derived state
- Keep composables focused and reusable
- Use `ref()` for local component state
- Use `reactive()` for complex objects

### 4. Type Safety

All composables are fully typed. Your IDE will provide autocomplete and type checking:

```typescript
const { address } = useAccount()  // address is Ref<string | null>
```

## 🎨 Customization

All components are built with Tailwind CSS and can be easily customized:

```vue
<ConnectButton class="bg-purple-500 hover:bg-purple-600" />
<ClusterSelector class="border-2" />
```

## 📖 Learn More

- [ConnectorKit Documentation](../../README.md)
- [Vue 3 Documentation](https://vuejs.org)
- [Nanostores Documentation](https://github.com/nanostores/nanostores)
- [@nanostores/vue](https://github.com/nanostores/vue)

## 🤝 Contributing

Found an issue or have a suggestion? Feel free to:

- Open an issue
- Submit a pull request
- Share your feedback

---

Built with 🟢 using ConnectorKit, Vue 3, and nanostores
