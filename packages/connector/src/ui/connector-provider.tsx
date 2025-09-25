'use client'

import React, { createContext, useContext, useMemo, useRef, useSyncExternalStore } from 'react'
import type { ReactNode } from 'react'
import { ConnectorClient, type ConnectorConfig } from '../lib/connector-client'

export type ConnectorSnapshot = ReturnType<ConnectorClient['getSnapshot']> & {
	select: (walletName: string) => Promise<void>
	disconnect: () => Promise<void>
	selectAccount: (address: string) => Promise<void>
	// Modal management methods
	setModalOpen: (open: boolean, route?: import('../lib/connector-client').ModalRoute) => void
	setModalRoute: (route: import('../lib/connector-client').ModalRoute) => void
	openModal: (route?: import('../lib/connector-client').ModalRoute) => void
	closeModal: () => void
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

export function ConnectorProvider({ children, config, mobile }: { children: ReactNode; config?: ConnectorConfig; mobile?: MobileWalletAdapterConfig }) {
	const ref = useRef<ConnectorClient | null>(null)
	if (!ref.current) {
		ref.current = new ConnectorClient(config)
	}

	React.useEffect(() => {
		return () => {
			// Cleanup on unmount if client has destroy method
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

export function useConnector(): ConnectorSnapshot {
	const client = useContext(ConnectorContext)
	if (!client) throw new Error('useConnector must be used within ConnectorProvider')
	const state = useSyncExternalStore(cb => client.subscribe(cb), () => client.getSnapshot(), () => client.getSnapshot())
	
	// Stable method references that don't change when state changes
	const methods = useMemo(() => ({
		select: client.select.bind(client), 
		disconnect: client.disconnect.bind(client), 
		selectAccount: client.selectAccount.bind(client),
		// Bind modal management methods
		setModalOpen: client.setModalOpen.bind(client),
		setModalRoute: client.setModalRoute.bind(client),
		openModal: client.openModal.bind(client),
		closeModal: client.closeModal.bind(client),
	}), [client])

	return useMemo(() => ({ 
		...state,
		...methods
	}), [state, methods])
}

export function useConnectorClient(): ConnectorClient | null {
    return useContext(ConnectorContext)
}


