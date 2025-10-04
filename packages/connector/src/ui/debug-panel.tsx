/**
 * @connector-kit/connector - Debug Panel Component
 * 
 * Development-only debug panel that displays connector state, health,
 * and connection information in a floating overlay.
 * 
 * Only rendered in development mode - automatically excluded in production builds.
 */

'use client'

import React, { useState } from 'react'
import { useConnector, useConnectorClient } from './connector-provider'
import { useAccount } from '../hooks/use-account'
import { useCluster } from '../hooks/use-cluster'

/**
 * Props for the ConnectorDebugPanel component
 */
export interface DebugPanelProps {
	/** 
	 * Position of the debug panel on screen
	 * @default 'bottom-right'
	 */
	position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right'
	
	/** 
	 * Whether to show the panel expanded by default
	 * @default false
	 */
	defaultOpen?: boolean
	
	/**
	 * Custom styles for the panel container
	 */
	style?: React.CSSProperties
	
	/**
	 * z-index for the panel
	 * @default 9999
	 */
	zIndex?: number
}

/**
 * Development debug panel for connector
 * 
 * Shows:
 * - Connection state (connected/disconnected/connecting)
 * - Current account and wallet
 * - Active cluster/network
 * - Number of detected wallets
 * - Health check information
 * - Storage availability
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
 * 
 * @example
 * ```tsx
 * // Custom positioning and styling
 * <ConnectorDebugPanel 
 *   position="top-left" 
 *   defaultOpen={true}
 *   zIndex={10000}
 * />
 * ```
 */
export function ConnectorDebugPanel({ 
	position = 'bottom-right',
	defaultOpen = false,
	style = {},
	zIndex = 9999
}: DebugPanelProps) {
	const [isOpen, setIsOpen] = useState(defaultOpen)
	const client = useConnectorClient()
	const state = useConnector()
	const { address, formatted, copied } = useAccount()
	const { cluster, rpcUrl } = useCluster()
	
	// Only render in development mode
	if (process.env.NODE_ENV !== 'development') {
		return null
	}
	
	// Don't render if client is not available
	if (!client) {
		return null
	}
	
	// Get health information if available
	const health = (client as any).getHealth?.()
	
	// Position styles for each corner
	const positionStyles: Record<string, React.CSSProperties> = {
		'top-left': { top: 16, left: 16 },
		'top-right': { top: 16, right: 16 },
		'bottom-left': { bottom: 16, left: 16 },
		'bottom-right': { bottom: 16, right: 16 }
	}
	
	// Base container styles
	const containerStyle: React.CSSProperties = {
		position: 'fixed',
		...positionStyles[position],
		zIndex,
		backgroundColor: 'rgba(0, 0, 0, 0.92)',
		color: '#fff',
		borderRadius: 8,
		padding: isOpen ? 16 : 8,
		fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, monospace',
		fontSize: 12,
		maxWidth: isOpen ? 400 : 140,
		minWidth: isOpen ? 320 : 'auto',
		boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
		backdropFilter: 'blur(8px)',
		border: '1px solid rgba(255, 255, 255, 0.1)',
		transition: 'all 0.2s ease',
		...style
	}
	
	// Header toggle style
	const headerStyle: React.CSSProperties = {
		cursor: 'pointer',
		fontWeight: 'bold',
		marginBottom: isOpen ? 12 : 0,
		display: 'flex',
		alignItems: 'center',
		gap: 6,
		userSelect: 'none'
	}
	
	// Status dot color based on connection state
	const getStatusColor = () => {
		if (state.connected) return '#0f0'
		if (state.connecting) return '#ff0'
		return '#f00'
	}
	
	// Format health status
	const getHealthIcon = (available: boolean) => available ? '✓' : '✗'
	
	return (
		<div style={containerStyle}>
			<div style={headerStyle} onClick={() => setIsOpen(!isOpen)}>
				<span>🔧</span>
				<span>Connector</span>
				<span style={{ fontSize: 10, opacity: 0.7 }}>
					{isOpen ? '▼' : '▶'}
				</span>
			</div>
			
			{isOpen && (
				<div style={{ fontSize: 11, lineHeight: 1.8 }}>
					{/* Connection Status */}
					<div style={{ 
						marginBottom: 12, 
						paddingBottom: 8, 
						borderBottom: '1px solid rgba(255, 255, 255, 0.15)' 
					}}>
						<div style={{ 
							color: getStatusColor(),
							display: 'flex',
							alignItems: 'center',
							gap: 8
						}}>
							<span style={{ 
								width: 8, 
								height: 8, 
								borderRadius: '50%', 
								backgroundColor: getStatusColor(),
								display: 'inline-block'
							}} />
							{state.connected ? 'Connected' : state.connecting ? 'Connecting...' : 'Disconnected'}
						</div>
					</div>
					
					{/* Account Info */}
					<div style={{ marginBottom: 12 }}>
						<div style={{ 
							opacity: 0.7, 
							fontSize: 10, 
							textTransform: 'uppercase',
							letterSpacing: 0.5,
							marginBottom: 4
						}}>
							Account
						</div>
						{address ? (
							<>
								<div style={{ 
									fontFamily: 'monospace',
									wordBreak: 'break-all',
									padding: '6px 8px',
									backgroundColor: 'rgba(255, 255, 255, 0.05)',
									borderRadius: 4,
									marginBottom: 4
								}}>
									{formatted}
									{copied && <span style={{ color: '#0f0', marginLeft: 8 }}>✓</span>}
								</div>
								<div style={{ fontSize: 10, opacity: 0.6 }}>
									{state.accounts.length} account{state.accounts.length !== 1 ? 's' : ''} available
								</div>
							</>
						) : (
							<div style={{ opacity: 0.4, fontStyle: 'italic' }}>None</div>
						)}
					</div>
					
					{/* Cluster Info */}
					<div style={{ marginBottom: 12 }}>
						<div style={{ 
							opacity: 0.7, 
							fontSize: 10, 
							textTransform: 'uppercase',
							letterSpacing: 0.5,
							marginBottom: 4
						}}>
							Network
						</div>
						<div style={{ marginBottom: 4 }}>
							{cluster?.label || 'None'}
						</div>
						<div style={{ 
							fontSize: 10, 
							opacity: 0.5,
							wordBreak: 'break-all',
							fontFamily: 'monospace'
						}}>
							{rpcUrl || 'No RPC URL'}
						</div>
					</div>
					
					{/* Wallets */}
					<div style={{ marginBottom: 12 }}>
						<div style={{ 
							opacity: 0.7, 
							fontSize: 10, 
							textTransform: 'uppercase',
							letterSpacing: 0.5,
							marginBottom: 4
						}}>
							Wallets
						</div>
						<div>
							{state.wallets.length} detected
						</div>
						{state.selectedWallet && (
							<div style={{ fontSize: 10, opacity: 0.6, marginTop: 4 }}>
								Using: {state.selectedWallet.name}
							</div>
						)}
					</div>
					
					{/* Health Information */}
					{health && (
						<div style={{ 
							marginTop: 12, 
							paddingTop: 12, 
							borderTop: '1px solid rgba(255, 255, 255, 0.15)' 
						}}>
							<div style={{ 
								opacity: 0.7, 
								fontSize: 10, 
								textTransform: 'uppercase',
								letterSpacing: 0.5,
								marginBottom: 6
							}}>
								Health Check
							</div>
							<div style={{ fontSize: 10, opacity: 0.8 }}>
								<div style={{ marginBottom: 3 }}>
									<span style={{ opacity: 0.6 }}>Initialized:</span>{' '}
									<span style={{ color: health.initialized ? '#0f0' : '#f00' }}>
										{getHealthIcon(health.initialized)}
									</span>
								</div>
								<div style={{ marginBottom: 3 }}>
									<span style={{ opacity: 0.6 }}>Wallet Standard:</span>{' '}
									<span style={{ color: health.walletStandardAvailable ? '#0f0' : '#f00' }}>
										{getHealthIcon(health.walletStandardAvailable)}
									</span>
								</div>
								<div style={{ marginBottom: 3 }}>
									<span style={{ opacity: 0.6 }}>Storage:</span>{' '}
									<span style={{ color: health.storageAvailable ? '#0f0' : '#f00' }}>
										{getHealthIcon(health.storageAvailable)}
									</span>
								</div>
								
								{health.errors.length > 0 && (
									<div style={{ 
										marginTop: 8,
										padding: 8,
										backgroundColor: 'rgba(255, 0, 0, 0.1)',
										borderRadius: 4,
										border: '1px solid rgba(255, 0, 0, 0.3)'
									}}>
										<div style={{ 
											color: '#ff6b6b',
											fontWeight: 'bold',
											marginBottom: 4
										}}>
											⚠️ Errors:
										</div>
										{health.errors.map((error: string, i: number) => (
											<div key={i} style={{ 
												marginBottom: 2,
												fontSize: 9,
												opacity: 0.9
											}}>
												• {error}
											</div>
										))}
									</div>
								)}
							</div>
						</div>
					)}
					
					{/* Footer */}
					<div style={{ 
						marginTop: 12,
						paddingTop: 8,
						borderTop: '1px solid rgba(255, 255, 255, 0.1)',
						fontSize: 9,
						opacity: 0.5,
						textAlign: 'center'
					}}>
						@connector-kit/connector
					</div>
				</div>
			)}
		</div>
	)
}

/**
 * Type alias for backward compatibility
 * @deprecated Use ConnectorDebugPanel instead
 */
export const DebugPanel = ConnectorDebugPanel

