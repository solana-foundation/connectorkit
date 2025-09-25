'use client'

import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useSyncExternalStore,
  type ReactNode,
} from 'react'
import { QueryClient, QueryClientProvider, type QueryClient as RQClient } from '@tanstack/react-query'
import { ArcWebClient, type ArcWebClientConfig } from './arc-web-client'
import type { Address } from '@solana/kit'

// The context now only holds the client instance.
const ArcClientContext = createContext<ArcWebClient | null>(null)
ArcClientContext.displayName = 'ArcClientContext'

export interface ArcClientSnapshot extends ReturnType<ArcWebClient['getSnapshot']> {
  select: (walletName: string) => Promise<void>
  disconnect: () => Promise<void>
  selectAccount: (accountAddress: Address) => Promise<void>
}

export interface ArcClientProviderProps {
  children: ReactNode
  config: ArcWebClientConfig
  queryClient?: RQClient
}

/**
 * Provides an instance of ArcWebClient to its children.
 * This is the root of the new, performant provider architecture.
 */
export function ArcClientProvider({ children, config, queryClient }: ArcClientProviderProps) {
  const qc = useMemo(() => queryClient ?? new QueryClient(), [queryClient])
  const clientRef = useRef<ArcWebClient | null>(null)

  if (clientRef.current == null) {
    clientRef.current = new ArcWebClient(config)
  }

  // Apply config updates without recreating the client instance
  useEffect(() => {
    clientRef.current?.updateConfig?.(config)
  }, [config, config.connector])

  // Cleanup wallet listeners on unmount
  useEffect(() => {
    return () => {
      clientRef.current?.destroy?.()
    }
  }, [])

  return (
    <QueryClientProvider client={qc}>
      <ArcClientContext.Provider value={clientRef.current}>
        {children}
      </ArcClientContext.Provider>
    </QueryClientProvider>
  )
}

/**
 * The core hook for accessing the ArcWebClient state.
 *
 * This hook uses useSyncExternalStore to subscribe to the ArcWebClient's
 * state, ensuring that components only re-render when the state they
 * depend on actually changes. This is a significant performance
 * improvement over the previous context-based approach.
 */
export function useArcClient(): ArcClientSnapshot
export function useArcClient<T>(selector: (s: ReturnType<ArcWebClient['getSnapshot']>) => T): T
export function useArcClient<T = ReturnType<ArcWebClient['getSnapshot']>>(selector?: (s: ReturnType<ArcWebClient['getSnapshot']>) => T) {
  const client = useContext(ArcClientContext)

  if (!client) {
    throw new Error('useArcClient must be used within an ArcClientProvider')
  }

  const state = useSyncExternalStore(
    (onStoreChange) => client.subscribe(onStoreChange),
    () => client.getSnapshot(),
    () => client.getSnapshot()
  )

  if (selector) {
    return selector(state) as unknown as T
  }

  const snapshot: ArcClientSnapshot = {
    ...state,
    select: client.select.bind(client),
    disconnect: client.disconnect.bind(client),
    selectAccount: client.selectAccount.bind(client),
  }
  return snapshot as unknown as T
}
