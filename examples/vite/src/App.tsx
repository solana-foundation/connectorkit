import { ConnectorProvider, getDefaultConfig } from '@connector-kit/connector'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ConnectButton, AccountSwitcher, ClusterSelector } from './components/connector'
import { useAccount, useCluster, useWalletInfo } from '@connector-kit/connector'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './components/ui/card'
import { Badge } from './components/ui/badge'
import { Separator } from './components/ui/separator'

const queryClient = new QueryClient()

const config = getDefaultConfig({
  appName: 'ConnectorKit Vite Example',
  network: 'devnet',
})

function WalletInfo() {
  const { address, formatted, connected } = useAccount()
  const { cluster, rpcUrl } = useCluster()
  const { name, icon } = useWalletInfo()

  if (!connected) {
    return (
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <CardTitle>Welcome to ConnectorKit</CardTitle>
          <CardDescription>
            Connect your Solana wallet to get started
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-muted-foreground">
            <p className="mb-2">This example demonstrates:</p>
            <ul className="list-disc list-inside space-y-1">
              <li>Wallet connection with ConnectButton</li>
              <li>Multi-account support with AccountSwitcher</li>
              <li>Network switching with ClusterSelector</li>
              <li>Built with React + Vite</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="w-full max-w-2xl space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Wallet Information</CardTitle>
          <CardDescription>Your connected wallet details</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-3">
            {icon && (
              <img src={icon} alt={name || ''} className="w-10 h-10 rounded-lg" />
            )}
            <div>
              <p className="text-sm font-medium">{name}</p>
              <p className="text-xs text-muted-foreground">Connected Wallet</p>
            </div>
          </div>

          <Separator />

          <div className="space-y-2">
            <div>
              <p className="text-xs text-muted-foreground mb-1">Address</p>
              <p className="text-sm font-mono">{formatted}</p>
              <p className="text-xs text-muted-foreground mt-1 break-all">
                {address}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Network Information</CardTitle>
          <CardDescription>Current Solana cluster details</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div>
              <p className="text-xs text-muted-foreground mb-1">Cluster</p>
              <Badge variant="secondary">{cluster?.label}</Badge>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">RPC Endpoint</p>
              <p className="text-sm font-mono break-all">{rpcUrl}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function AppContent() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-secondary/20">
      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold">ConnectorKit</h1>
            <Badge variant="outline">Vite</Badge>
          </div>
          <div className="flex items-center gap-2">
            <ClusterSelector />
            <AccountSwitcher />
            <ConnectButton />
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-12 flex flex-col items-center">
        <WalletInfo />
      </main>
    </div>
  )
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ConnectorProvider config={config}>
        <AppContent />
      </ConnectorProvider>
    </QueryClientProvider>
  )
}

export default App
