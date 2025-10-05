/**
 * @connector-kit/connector - Enhanced Debug Panel Component
 * 
 * Comprehensive development-only debug panel with:
 * - Tabbed interface for organization
 * - Transaction signer capabilities and activity
 * - Real-time event stream with filtering
 * - Wallet features deep dive
 * - Performance metrics dashboard
 * - Storage state inspector
 * 
 * Only rendered in development mode - automatically excluded in production builds.
 */

'use client'

import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { useConnector, useConnectorClient } from '../connector-provider'
import { useAccount } from '../../hooks/use-account'
import { useCluster } from '../../hooks/use-cluster'
import { useTransactionSigner } from '../../hooks/use-transaction-signer'
import { getConnectionPool } from '../../lib/connection-pool'
import type { ConnectorEvent } from '../../lib/connector-client'

import type { DebugPanelProps, TabId, TabConfig } from './types'
import { BugIcon } from './icons'
import { TabButton } from './ui-components'
import { 
	OverviewTab, 
	SignerTab, 
	TransactionsTab,
	EventsTab, 
	WalletTab, 
	PerfTab, 
	StorageTab 
} from './tabs'

// Tab configuration
const TABS: TabConfig[] = [
	{ id: 'overview', icon: '📊', label: 'Overview' },
	{ id: 'signer', icon: '🔐', label: 'Signer' },
	{ id: 'transactions', icon: '📝', label: 'Txs' },
	{ id: 'events', icon: '📡', label: 'Events' },
	{ id: 'wallet', icon: '💼', label: 'Wallet' },
	{ id: 'perf', icon: '⚡', label: 'Perf' },
	{ id: 'storage', icon: '💾', label: 'Storage' }
]

// Position styles mapping
const POSITION_STYLES: Record<string, React.CSSProperties> = {
	'top-left': { top: 16, left: 16 },
	'top-right': { top: 16, right: 16 },
	'bottom-left': { bottom: 16, left: 16 },
	'bottom-right': { bottom: 16, right: 16 }
}

/**
 * Enhanced development debug panel for connector
 * 
 * **Features**:
 * - 📊 Overview: Connection status, account, network, health
 * - 🔐 Signer: Transaction capabilities and activity
 * - 📝 Transactions: Real-time transaction tracking with explorer links
 * - 📡 Events: Real-time event stream with pause/clear
 * - 💼 Wallet: Features breakdown, chains, accounts
 * - ⚡ Perf: Performance metrics and optimization stats
 * - 💾 Storage: Persistence state with clear controls
 * 
 * **Important**: Only renders in development mode. Automatically excluded from production builds.
 * 
 * @example
 * ```tsx
 * import { ConnectorDebugPanel } from '@connector-kit/connector/react'
 * 
 * function App() {
 *   return (
 *     <ConnectorProvider config={config}>
 *       {process.env.NODE_ENV === 'development' && <ConnectorDebugPanel />}
 *       <YourApp />
 *     </ConnectorProvider>
 *   )
 * }
 * ```
 */
export function ConnectorDebugPanel({ 
	position = 'bottom-right',
	defaultOpen = false,
	defaultTab = 'overview',
	style = {},
	zIndex = 9999,
	maxEvents = 50
}: DebugPanelProps) {
	// State
	const [isOpen, setIsOpen] = useState(defaultOpen)
	const [activeTab, setActiveTab] = useState<TabId>(defaultTab)
	const [events, setEvents] = useState<ConnectorEvent[]>([])
	const [isPaused, setIsPaused] = useState(false)
	const [isHeaderHovered, setIsHeaderHovered] = useState(false)
	const [isHeaderPressed, setIsHeaderPressed] = useState(false)
	
	// Hooks
	const client = useConnectorClient()
	const state = useConnector()
	const { address, formatted, copied } = useAccount()
	const { cluster, rpcUrl } = useCluster()
	const { signer, ready, capabilities } = useTransactionSigner()
	
	// Only render in development mode
	if (process.env.NODE_ENV !== 'development') {
		return null
	}
	
	// Don't render if client is not available
	if (!client) {
		return null
	}
	
	// Get diagnostics
	const health = (client as any).getHealth?.()
	const metrics = (client as any).getDebugMetrics?.()
	
	// Get connection pool stats
	const poolStats = useMemo(() => {
		try {
			return getConnectionPool().getStats()
		} catch {
			return null
		}
	}, [])
	
	// Subscribe to events
	useEffect(() => {
		if (!client || isPaused) return
		
		const unsubscribe = client.on((event) => {
			setEvents(prev => {
				const newEvents = [event, ...prev]
				return newEvents.slice(0, maxEvents)
			})
		})
		
		return unsubscribe
	}, [client, isPaused, maxEvents])
	
	// Event handlers
	const handleClearEvents = useCallback(() => {
		setEvents([])
	}, [])
	
	const handleTogglePause = useCallback(() => {
		setIsPaused(prev => !prev)
	}, [])
	
	// Styles
	const containerStyle: React.CSSProperties = {
		position: 'fixed',
		...POSITION_STYLES[position],
		zIndex,
		backgroundColor: isOpen
			? 'rgba(0, 0, 0, 0.94)'
			: isHeaderHovered 
				? 'rgba(40, 40, 40, 0.96)' 
				: 'rgba(0, 0, 0, 0.94)',
		color: '#fff',
		borderRadius: 15,
		padding: isOpen ? 0 : '10px 14px',
		fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, monospace',
		fontSize: 12,
		width: isOpen ? 420 : 'auto',
		minHeight: isOpen ? 520 : 'auto',
		maxHeight: isOpen ? 620 : 'auto',
		boxShadow: '0 8px 32px rgba(0,0,0,0.7), 0 0 0 1px rgba(255, 255, 255, 0.1)',
		backdropFilter: 'blur(12px)',
		border: !isOpen && isHeaderHovered
			? '2px solid rgba(255, 255, 255, 0.25)'
			: '2px solid rgba(255, 255, 255, 0.12)',
		transition: 'all 0.2s ease, transform 0.1s ease',
		overflow: 'hidden',
		cursor: isOpen ? 'default' : 'pointer',
		transform: !isOpen && isHeaderPressed ? 'scale(0.98)' : 'scale(1)',
		...style
	}
	
	const headerStyle: React.CSSProperties = {
		cursor: 'pointer',
		padding: isOpen ? '14px 16px' : '0',
		fontWeight: 600,
		display: 'flex',
		alignItems: 'center',
		gap: 10,
		userSelect: 'none',
		backgroundColor: isOpen ? 'rgba(255, 255, 255, 0.05)' : 'transparent',
		borderBottom: isOpen ? '1px solid rgba(255, 255, 255, 0.1)' : 'none',
		fontSize: 13
	}
	
	return (
		<div 
			style={containerStyle}
			onClick={() => !isOpen && setIsOpen(true)}
			onMouseEnter={() => setIsHeaderHovered(true)}
			onMouseLeave={() => {
				setIsHeaderHovered(false)
				setIsHeaderPressed(false)
			}}
			onMouseDown={() => !isOpen && setIsHeaderPressed(true)}
			onMouseUp={() => setIsHeaderPressed(false)}
		>
			{/* Header */}
			<div 
				style={headerStyle} 
				onClick={(e) => {
					if (isOpen) {
						e.stopPropagation()
						setIsOpen(false)
					}
				}}
			>
				<BugIcon size={isOpen ? 18 : 16} color="rgba(255, 255, 255, 0.85)" />
				<span style={{ flex: 1 }}>
					Connector Debug
				</span>
				{isOpen && (
					<span style={{ fontSize: 10, opacity: 0.5, marginLeft: 'auto' }}>
						▼
					</span>
				)}
			</div>
			
			{isOpen && (
				<>
					{/* Tab Navigation */}
					<div style={{ 
						display: 'flex',
						gap: 0,
						borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
						backgroundColor: 'rgba(255, 255, 255, 0.02)'
					}}>
						{TABS.map(tab => (
							<TabButton
								key={tab.id}
								tab={tab}
								isActive={activeTab === tab.id}
								onClick={() => setActiveTab(tab.id)}
							/>
						))}
					</div>
					
					{/* Tab Content */}
					<div style={{ 
						padding: 16,
						minHeight: 420,
						maxHeight: 480,
						overflow: 'hidden',
						position: 'relative',
						transition: 'min-height 0.3s ease'
					}}>
						<TabPanel isActive={activeTab === 'overview'}>
							<OverviewTab 
								state={state}
								health={health}
								address={address}
								formatted={formatted}
								copied={copied}
								cluster={cluster}
								rpcUrl={rpcUrl}
							/>
						</TabPanel>
						
					<TabPanel isActive={activeTab === 'signer'}>
						<SignerTab
							signer={signer}
							ready={ready}
							capabilities={capabilities}
							address={address}
						/>
					</TabPanel>
					
					<TabPanel isActive={activeTab === 'transactions'}>
						<TransactionsTab client={client} cluster={cluster} />
					</TabPanel>
					
					<TabPanel isActive={activeTab === 'events'}>
							<EventsTab
								events={events}
								onClear={handleClearEvents}
								onPause={handleTogglePause}
								isPaused={isPaused}
							/>
						</TabPanel>
						
						<TabPanel isActive={activeTab === 'wallet'}>
							<WalletTab wallet={state.selectedWallet} />
						</TabPanel>
						
						<TabPanel isActive={activeTab === 'perf'}>
							{metrics && <PerfTab metrics={metrics} poolStats={poolStats} />}
						</TabPanel>
						
						<TabPanel isActive={activeTab === 'storage'}>
							<StorageTab client={client} state={state} />
						</TabPanel>
					</div>
					
					{/* Footer */}
					<div style={{ 
						padding: '8px 16px',
						borderTop: '1px solid rgba(255, 255, 255, 0.1)',
						fontSize: 9,
						opacity: 0.5,
						display: 'flex',
						justifyContent: 'space-between',
						alignItems: 'center',
						backgroundColor: 'rgba(255, 255, 255, 0.02)'
					}}>
						<span>@connector-kit/connector</span>
						{events.length > 0 && (
							<span>{events.length} events</span>
						)}
					</div>
				</>
			)}
		</div>
	)
}

/**
 * Tab panel wrapper for smooth transitions
 */
function TabPanel({ isActive, children }: { isActive: boolean; children: React.ReactNode }) {
	return (
		<div style={{
			position: 'absolute',
			top: 16,
			left: 16,
			right: 16,
			bottom: 16,
			opacity: isActive ? 1 : 0,
			transform: isActive ? 'translateY(0)' : 'translateY(-8px)',
			transition: 'opacity 0.25s cubic-bezier(0.4, 0, 0.2, 1), transform 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
			pointerEvents: isActive ? 'auto' : 'none'
		}}>
			{children}
		</div>
	)
}

/**
 * Type alias for backward compatibility
 * @deprecated Use ConnectorDebugPanel instead
 */
export const DebugPanel = ConnectorDebugPanel

// Re-export types
export type { DebugPanelProps, TabId } from './types'

