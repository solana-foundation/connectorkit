'use client'

import { QueryClient } from '@tanstack/react-query'
import { useMemo, useState } from 'react'
import { createProvider, ArcProvider } from '@connectorkit/hooks'
import { createJupiter } from '@connectorkit/jupiter'
import { 
  AppProvider, 
  getDefaultConfig, 
  getDefaultMobileConfig,
  solanaTheme,
  type MobileWalletAdapterConfig 
} from '@connectorkit/connector-kit'

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: { queries: { staleTime: 5 * 60 * 1000, retry: 3 } }
  }))

  const arcConfig = useMemo(() => ({
    network: (process.env.NEXT_PUBLIC_SOLANA_NETWORK as 'mainnet' | 'devnet' | 'testnet' | undefined) || 'mainnet',
    rpcUrl:
      (process.env.NEXT_PUBLIC_SOLANA_RPC_URL && process.env.NEXT_PUBLIC_SOLANA_RPC_URL.trim()) ||
      ((process.env.NEXT_PUBLIC_SOLANA_NETWORK === 'devnet')
        ? 'https://api.devnet.solana.com'
        : (process.env.NEXT_PUBLIC_SOLANA_NETWORK === 'testnet')
          ? 'https://api.testnet.solana.com'
          : 'https://api.mainnet-beta.solana.com'),
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
            debug: process.env.NODE_ENV === 'development',
            corsProxy: true,
          }),
        ],
      }),
    ],
  }), [])

  // Simplified configuration using new helpers
  const connectorConfig = useMemo(() => getDefaultConfig({
    appName: 'Arc Docs',
    appUrl: 'https://docs.arc.so',
    network: (process.env.NEXT_PUBLIC_SOLANA_NETWORK as any) || 'mainnet-beta',
    enableMobile: true,
  }), [])

  const mobile = useMemo(() => getDefaultMobileConfig({
    appName: 'Arc Docs',
    appUrl: 'https://docs.arc.so',
    network: (process.env.NEXT_PUBLIC_SOLANA_NETWORK as any) || 'mainnet-beta',
  }), [])

  return (
    <AppProvider connectorConfig={connectorConfig} mobile={mobile}>
      <ArcProvider config={arcConfig} queryClient={queryClient}>
        {children as any}
      </ArcProvider>
    </AppProvider>
  )
}