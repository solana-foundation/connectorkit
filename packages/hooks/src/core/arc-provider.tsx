'use client'

import React from 'react'
import type { ReactNode } from 'react'
import { ArcClientProvider, useArcClient } from './arc-client-provider'
import { useConnectorClient } from '@connectorkit/connector-kit'
import type { ArcWebClientConfig } from './arc-web-client'
import type { SolanaConfig } from '../config/create-config'
import type { QueryClient } from '@tanstack/react-query'

export type ArcProviderProps = {
  children: ReactNode
  config: ArcWebClientConfig | SolanaConfig
  queryClient?: QueryClient
}

/**
 * The primary ArcProvider.
 *
 * This component now wraps the ArcClientProvider, which contains the new
 * performant state management logic. The hooks exported from this file
 * are now compatibility wrappers around the new useArcClient hook.
 */
export function ArcProvider({ children, config, queryClient }: ArcProviderProps) {
  const connector = useConnectorClient()
  const merged: ArcWebClientConfig = { ...config, connector } as ArcWebClientConfig
  return (
    <ArcClientProvider config={merged} queryClient={queryClient}>
      {children}
    </ArcClientProvider>
  )
}

// ===== BACKWARD COMPATIBLE HOOKS =====

/**
 * A compatibility wrapper for the old useArcConfig hook.
 *
 * @deprecated Use useArcClient instead.
 */
export function useArcConfig(): ArcWebClientConfig {
  const { config } = useArcClient()
  return config
}

/**
 * A compatibility wrapper for the old useWallet hook.
 *
 * @deprecated Use useArcClient instead.
 */
export function useWallet() {
  const { wallet, select, disconnect } = useArcClient()
  return { ...wallet, select, disconnect, connect: select }
}

/**
 * A compatibility wrapper for the old useNetwork hook.
 *
 * @deprecated Use useArcClient instead.
 */
export function useNetwork() {
  const { network } = useArcClient()
  return network
}

/**
 * A compatibility wrapper for the old useArc hook.
 *
 * @deprecated Use useArcClient instead.
 */
export function useArc() {
  return useArcClient()
}
