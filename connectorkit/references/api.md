# Hooks & Elements API Reference

## Table of Contents

- [Wallet Hooks](#wallet-hooks)
- [Data Hooks](#data-hooks)
- [Transaction Hooks](#transaction-hooks)
- [Utility Hooks](#utility-hooks)
- [Element Components](#element-components)
- [Configuration](#configuration)

## Wallet Hooks

### useWallet()

Primary wallet status hook.

```ts
const {
    status, // 'disconnected' | 'connecting' | 'connected' | 'error'
    isConnected, // boolean
    isConnecting, // boolean
    isError, // boolean
    error, // Error | null
    connectorId, // WalletConnectorId | null
    account, // Address | null (selected account)
    accounts, // SessionAccount[]
    session, // WalletSession | null
} = useWallet();
```

### useConnectWallet()

```ts
const {
    connect, // (connectorId: WalletConnectorId, options?: ConnectOptions) => Promise<void>
    isConnecting, // boolean
    error, // Error | null
    resetError, // () => void
} = useConnectWallet();

// ConnectOptions:
// { silent?: boolean, allowInteractiveFallback?: boolean, preferredAccount?: Address }
```

### useDisconnectWallet()

```ts
const { disconnect, isDisconnecting } = useDisconnectWallet();
```

### useWalletConnectors()

Returns available wallets for connection.

```ts
const connectors: WalletConnectorMetadata[] = useWalletConnectors();
// Each: { id, name, icon, ready, chains, features }
```

### useWalletInfo()

```ts
const {
    name, // string | null
    icon, // string | null
    installed, // boolean
    connectable, // boolean
    connected, // boolean
    connecting, // boolean
    wallets, // WalletDisplayInfo[]
} = useWalletInfo();
```

### useAccount()

```ts
const { account, address, label, isLoading, error } = useAccount();
```

## Data Hooks

### useBalance(options?)

```ts
const {
    solBalance, // number
    lamports, // bigint
    formattedSol, // string
    tokens, // TokenBalance[]
    isLoading, // boolean
    isError, // boolean
    error, // Error | null
    refetch, // () => Promise<void>
} = useBalance();
```

### useTransactions(options?)

```ts
const { transactions, isLoading, isError, error, refetch } = useTransactions();
// Each tx: { signature, timestamp, status, method, metadata }
```

### useTokens(options?)

```ts
const { tokens, isLoading, isError, error } = useTokens();
// Each: { mint, symbol, decimals, balance, price, ... }
```

### useCluster()

```ts
const {
    cluster, // SolanaCluster | null
    clusters, // SolanaCluster[]
    setCluster, // (id: SolanaClusterId) => Promise<void>
    isMainnet, // boolean
    isDevnet, // boolean
    isTestnet, // boolean
    isLocal, // boolean
    explorerUrl, // string
} = useCluster();
```

## Transaction Hooks

### useTransactionSigner()

Legacy web3.js compatible signer.

```ts
const { signer, ready, address, capabilities } = useTransactionSigner()

// signer methods:
signer.signTransaction(tx)
signer.signAllTransactions(txs)
signer.signAndSendTransaction(tx, options?)
signer.signAndSendTransactions(txs, options?)
signer.signMessage?(msg)  // optional capability
signer.getCapabilities()  // { canSign, canSend, canSignMessage, supportsBatchSigning }
```

### useKitTransactionSigner()

`@solana/kit` / `@solana/signers` compatible signer.

```ts
const { signer, ready } = useKitTransactionSigner();
// signer is TransactionModifyingSigner — compatible with @solana/kit pipelines
```

### useTransactionPreparer()

Add blockhash + compute units to a transaction message.

```ts
const { prepare, ready } = useTransactionPreparer()
const prepared = await prepare(transactionMessage, options?)
// Returns tx with BlockhashLifetime attached
```

### useSolanaClient() / useKitSolanaClient()

Get a `@solana/kit` SolanaClient instance.

```ts
const { client, ready, clusterType } = useSolanaClient();
// client.rpc — RPC methods
// client.rpcSubscriptions — subscription methods
```

## Utility Hooks

### useConnector()

Access full provider snapshot.

```ts
const snapshot: ConnectorSnapshot = useConnector();
```

### useConnectorClient()

Get raw ConnectorClient instance.

```ts
const client: ConnectorClient | null = useConnectorClient();
```

### Query Cache Helpers

```ts
getBalanceQueryKey(rpcUrl, address);
getTransactionsQueryKey(options);
getWalletAssetsQueryKey(rpcUrl, address);
invalidateSharedQuery(key);
clearSharedQueryCache();
```

## Element Components

All elements support default rendering and custom `render` props.

### WalletListElement

```tsx
<WalletListElement
  installedOnly?   // boolean — only show installed wallets
  variant?         // string
  className?       // string
  showStatus?      // boolean
  onConnect?       // (connectorId) => void
  render?          // ({ wallets, installedWallets, connectById, connecting }) => ReactNode
  renderWallet?    // (wallet) => ReactNode
/>
```

### AccountElement

```tsx
<AccountElement
  showAvatar?      // boolean
  showCopy?        // boolean
  showFullAddress? // boolean
  avatarSize?      // number
  variant?         // string
  className?       // string
  render?          // ({ address, formatted, walletName, walletIcon, copy, copied }) => ReactNode
/>
```

### ClusterElement

```tsx
<ClusterElement
  variant?         // string
  className?       // string
  onClusterChange? // (cluster) => void
  render?          // ({ cluster, clusters, setCluster, explorerUrl }) => ReactNode
/>
```

### DisconnectElement

```tsx
<DisconnectElement
  variant?         // string
  className?       // string
  onDisconnect?    // () => void
  render?          // ({ disconnect, disconnecting }) => ReactNode
/>
```

### BalanceElement

```tsx
<BalanceElement
  showTokens?      // boolean
  variant?         // string
  className?       // string
  enabled?         // boolean
  render?          // ({ solBalance, tokens, isLoading, refetch }) => ReactNode
/>
```

### TransactionHistoryElement

```tsx
<TransactionHistoryElement
  limit?           // number
  variant?         // string
  className?       // string
  render?          // ({ transactions, isLoading, explorerUrl }) => ReactNode
/>
```

### TokenListElement

```tsx
<TokenListElement
  variant?         // string
  className?       // string
  filter?          // (token) => boolean
  render?          // ({ tokens, isLoading, selected, setSelected }) => ReactNode
/>
```

### SkeletonShine

Loading placeholder component.

## Configuration

### getDefaultConfig(options)

```ts
getDefaultConfig({
  appName: string,                          // required
  appUrl?: string,
  autoConnect?: boolean,
  debug?: boolean,
  network?: 'mainnet' | 'devnet' | 'testnet' | 'localnet',
  enableMobile?: boolean,
  clusters?: SolanaCluster[],
  customClusters?: SolanaCluster[],
  persistClusterSelection?: boolean,
  enableErrorBoundary?: boolean,            // default: true
  walletConnect?: boolean | { projectId },
  additionalWallets?: Wallet[],
  wallets?: WalletDisplayConfig,            // { allow?, deny?, featured? }
  coingecko?: CoinGeckoConfig,
  imageProxy?: string,
  programLabels?: Record<string, string>,
  storage?: { account, cluster, wallet },
  onError?: (error, errorInfo) => void,
})
```

### ConnectorConfig (low-level)

```ts
new ConnectorClient({
  autoConnect?: boolean,
  debug?: boolean,
  wallets?: WalletDisplayConfig,
  storage?: { account, cluster, wallet },
  cluster?: { clusters, initialCluster, persistSelection },
  imageProxy?: string,
  programLabels?: Record<string, string>,
  coingecko?: CoinGeckoConfig,
  walletConnect?: WalletConnectConfig,
  additionalWallets?: Wallet[],
})
```

### ConnectorClient Methods

```ts
client.connectWallet(connectorId, options?)
client.disconnectWallet()
client.getConnector(connectorId)
client.setCluster(clusterId)
client.getCluster()
client.getClusters()
client.getRpcUrl()
client.subscribe(listener)       // returns unsubscribe fn
client.getSnapshot()
client.resetStorage()
client.emitEvent(event)
```
