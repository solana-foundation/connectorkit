# ConnectorKit Packages

This directory contains the core packages that make up ConnectorKit, enhanced with wallet-ui integration for the ultimate developer and user experience.

## 🚀 Enhanced Architecture

### Core Packages

- **`@connectorkit/sdk`** - Smart React hooks with enhanced cluster management
- **`@connectorkit/connector`** - Headless wallet connector with wallet-ui integration  
- **`@connectorkit/ui-primitives`** - Framework-agnostic UI components with cluster switcher
- **`@connectorkit/providers`** - Swap/DeFi providers (Jupiter, etc.)
- **`@connectorkit/jupiter`** - Jupiter swap integration

### 🎯 The Middle Ground Approach

We've integrated **wallet-ui-main** as dependencies to get the best of both worlds:

**✅ Your Benefits:**
- **Smart Detection** - Auto-detects clusters from RPC URLs (no manual setup)
- **Custom RPC Support** - Works with any provider (Alchemy, QuickNode, etc.)
- **Progressive Enhancement** - Simple by default, powerful when needed
- **Developer-friendly** - "Just works" philosophy with sensible defaults

**✅ wallet-ui Benefits:**
- **Rich UI Components** - `WalletUiClusterDropdown` and ecosystem
- **Persistent Storage** - User preferences remembered across sessions
- **Mature Architecture** - Battle-tested cluster management system
- **Type Safety** - Full TypeScript integration with branded types

## 🎨 Usage Examples

### Simple (Arc-style)
```tsx
import { EnhancedClusterProvider } from '@connectorkit/sdk'

<EnhancedClusterProvider config={{ network: 'devnet' }}>
  <App />
</EnhancedClusterProvider>
```

### Advanced (wallet-ui style)
```tsx
import { 
  EnhancedClusterProvider,
  createSolanaDevnet,
  createSolanaMainnet 
} from '@connectorkit/sdk'

<EnhancedClusterProvider config={{ 
  clusters: [createSolanaMainnet(), createSolanaDevnet()],
  allowSwitching: true 
}}>
  <App />
</EnhancedClusterProvider>
```

### Smart Hybrid (middle ground)
```tsx
<EnhancedClusterProvider config={{
  rpcUrl: 'https://my-premium-rpc.com',
  allowSwitching: true,  // Adds common clusters + your custom one
  persistSelection: true
}}>
  <App />
</EnhancedClusterProvider>
```

### Using Enhanced Hooks
```tsx
import { useEnhancedCluster } from '@connectorkit/sdk'

function MyComponent() {
  const { 
    cluster,           // Current cluster info
    clusters,          // Available clusters
    setCluster,        // Switch clusters
    canSwitch,         // UI should show switcher?
    getAddressUrl,     // Your explorer utilities
    isAutoDetected     // Smart detection flag
  } = useEnhancedCluster()
  
  return (
    <div>
      <p>Connected to: {cluster.name}</p>
      {canSwitch && <ClusterSwitcher />}
    </div>
  )
}
```

### UI Components
```tsx
import { EnhancedClusterSwitcher } from '@connectorkit/ui-primitives'

// Only renders if multiple clusters available
<EnhancedClusterSwitcher />
```

## 🔧 Architecture Benefits

| Feature | Before | After (Enhanced) |
|---------|--------|------------------|
| **Cluster Detection** | Manual config | ✅ Smart auto-detection |
| **Custom RPCs** | Hard to configure | ✅ Seamless support |
| **UI Components** | None | ✅ wallet-ui ecosystem |
| **Persistence** | None | ✅ Browser storage |
| **Type Safety** | Basic | ✅ Full wallet-ui types |
| **User Choice** | Developer-only | ✅ End-user switching |
| **Maintenance** | Custom code | ✅ Leverage mature libs |

## 🎯 Philosophy

**Pragmatic Layers** - Each package handles clusters at the right abstraction:

- **SDK**: Smart detection + enhanced hooks
- **Connector**: Wallet-standard integration + cluster context
- **UI-Primitives**: Optional components that enhance UX
- **Jupiter**: Network-agnostic (delegates to SDK)

**Progressive Enhancement** - Start simple, add complexity as needed:

1. **Just Works**: `network: 'devnet'` → automatically configured
2. **Custom RPC**: `rpcUrl: 'https://...'` → smart detection
3. **User Choice**: `allowSwitching: true` → UI appears
4. **Full Control**: `clusters: [...]` → manual configuration

This gives you the **"just works"** simplicity of your original approach with the **"power user"** capabilities of wallet-ui when needed.
