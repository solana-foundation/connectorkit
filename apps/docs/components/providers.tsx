'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useMemo, useState} from 'react'
import { createProvider, ArmaProvider } from '@armadura/sdk'
import { createJupiter } from '@armadura/jupiter'
import { 
  AppProvider, 
  createConfig,
} from '@connector-kit/connector'

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: { queries: { staleTime: 5 * 60 * 1000, retry: 3 } }
  }))

  const config = useMemo(() => createConfig({
    appName: 'Arc Docs',
    appUrl: 'https://docs.arc.so',
    network: (process.env.NEXT_PUBLIC_SOLANA_NETWORK as any) || 'mainnet',
    rpcUrl: process.env.NEXT_PUBLIC_SOLANA_RPC_URL,
    enableMobile: true,
    autoConnect: true,
    debug: process.env.NODE_ENV === 'development',
  }), [])

  const armaConfig = useMemo(() => ({
    network: config.network as 'mainnet' | 'devnet' | 'testnet',
    rpcUrl: config.rpcUrl,
    autoConnect: true,
    providers: [
      createProvider({
        swap: [
          createJupiter({
            slippageBps: 50,
            onlyDirectRoutes: false,
            excludeDexes: [],
            maxAccounts: 64,
            asLegacyTransaction: 'auto',
            walletSupportsVersioned: true,
            dynamicComputeUnitLimit: true,
            computeUnitPriceMicroLamports: 10_000,
            dynamicSlippage: true,
            timeoutMs: 15_000,
            retries: 2,
            debug: config.connectorConfig.debug,
            corsProxy: true,
          }),
        ],
      }),
    ],
  }), [config])

  return (
    <QueryClientProvider client={queryClient}>
      <AppProvider config={config}>
        <ArmaProvider 
        config={armaConfig} 
        queryClient={queryClient}
        useConnector="auto"
        enhancedCluster={{
          network: config.network as 'mainnet' | 'devnet' | 'testnet',
          allowSwitching: true,
          persistSelection: true
        }}
      >
          {children}
        </ArmaProvider>
      </AppProvider>
    </QueryClientProvider>
  )
}
