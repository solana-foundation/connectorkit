'use client'

import React, { createContext, useContext, useMemo, useRef, useSyncExternalStore } from 'react'
import type { ReactNode } from 'react'
import { ConnectorClient, type ConnectorConfig } from '../lib/connector-client'
import type { ExtendedConnectorConfig } from '../config/default-config'
import { ConnectorErrorBoundary } from '../components/ErrorBoundary'

// Global connector client declaration for auto-detection
declare global {
  interface Window {
    __connectorClient?: ConnectorClient
  }
}

export type ConnectorSnapshot = ReturnType<ConnectorClient['getSnapshot']> & {
	select: (walletName: string) => Promise<void>
	disconnect: () => Promise<void>
	selectAccount: (address: string) => Promise<void>
}

export const ConnectorContext = createContext<ConnectorClient | null>(null)
ConnectorContext.displayName = 'ConnectorContext'

export interface MobileWalletAdapterConfig {
	appIdentity: {
		name: string
		uri?: string
		icon?: string
	}
	remoteHostAuthority?: string
	chains?: readonly string[]
	authorizationCache?: any
	chainSelector?: any
	onWalletNotFound?: (wallet: any) => Promise<void>
}

// Internal provider without error boundary
function ConnectorProviderInternal({ children, config, mobile }: { children: ReactNode; config?: ConnectorConfig; mobile?: MobileWalletAdapterConfig }) {
	const ref = useRef<ConnectorClient | null>(null)
	
	// Create client immediately (works in both SSR and client)
	if (!ref.current) {
		ref.current = new ConnectorClient(config)
	}
	
	// On client mount, ensure wallet detection runs
	React.useEffect(() => {
		if (typeof window !== 'undefined' && ref.current) {
			window.__connectorClient = ref.current
			// Force re-initialization if client was created during SSR
			// This ensures wallets are detected even if client was created before window existed
			const privateClient = ref.current as any
			if (privateClient.initialize && typeof privateClient.initialize === 'function') {
				privateClient.initialize()
			}
		}
		
		return () => {
			// Cleanup global reference and client on unmount
			if (typeof window !== 'undefined') {
				window.__connectorClient = undefined
			}
			if (ref.current && typeof ref.current.destroy === 'function') {
				ref.current.destroy()
				ref.current = null
			}
		}
	}, [])

	// Optionally register Mobile Wallet Adapter on the client
	React.useEffect(() => {
		if (!mobile) return
		let cancelled = false
		;(async () => {
			try {
				const mod = await import('@solana-mobile/wallet-standard-mobile')
				if (cancelled) return
				const {
					registerMwa,
					createDefaultAuthorizationCache,
					createDefaultChainSelector,
					createDefaultWalletNotFoundHandler,
					MWA_SOLANA_CHAINS,
				} = mod as any
				registerMwa({
					appIdentity: mobile.appIdentity,
					authorizationCache: mobile.authorizationCache ?? createDefaultAuthorizationCache(),
					chains: (mobile.chains ?? MWA_SOLANA_CHAINS) as any,
					chainSelector: mobile.chainSelector ?? createDefaultChainSelector(),
					remoteHostAuthority: mobile.remoteHostAuthority,
					onWalletNotFound: mobile.onWalletNotFound ?? createDefaultWalletNotFoundHandler(),
				})
			} catch (e) {
				// Failed to register Mobile Wallet Adapter
			}
		})()
		return () => {
			cancelled = true
		}
	}, [mobile])

	return <ConnectorContext.Provider value={ref.current}>{children}</ConnectorContext.Provider>
}

// Enhanced provider with optional error boundary
export function ConnectorProvider({ children, config, mobile }: { children: ReactNode; config?: ExtendedConnectorConfig; mobile?: MobileWalletAdapterConfig }) {
	const extendedConfig = config as ExtendedConnectorConfig
	const errorBoundaryConfig = extendedConfig?.errorBoundary

	// If error boundary is disabled, use internal provider directly
	if (!errorBoundaryConfig?.enabled) {
		return (
			<ConnectorProviderInternal config={config} mobile={mobile}>
				{children}
			</ConnectorProviderInternal>
		)
	}

	// Wrap with error boundary for enhanced error handling
	return (
		<ConnectorErrorBoundary
			maxRetries={errorBoundaryConfig.maxRetries ?? 3}
			onError={errorBoundaryConfig.onError}
			fallback={errorBoundaryConfig.fallback}
		>
			<ConnectorProviderInternal config={config} mobile={mobile}>
				{children}
			</ConnectorProviderInternal>
		</ConnectorErrorBoundary>
	)
}

export function useConnector(): ConnectorSnapshot {
	const client = useContext(ConnectorContext)
	if (!client) throw new Error('useConnector must be used within ConnectorProvider')
	const state = useSyncExternalStore(cb => client.subscribe(cb), () => client.getSnapshot(), () => client.getSnapshot())
	
	// Stable method references that don't change when state changes
	const methods = useMemo(() => ({
		select: client.select.bind(client), 
		disconnect: client.disconnect.bind(client), 
		selectAccount: client.selectAccount.bind(client),
	}), [client])

	return useMemo(() => ({ 
		...state,
		...methods
	}), [state, methods])
}

export function useConnectorClient(): ConnectorClient | null {
    return useContext(ConnectorContext)
}


