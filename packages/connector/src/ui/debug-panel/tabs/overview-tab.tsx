/**
 * @connector-kit/connector - Overview Tab Component
 */

'use client'

import { Section, Divider } from '../ui-components'

interface OverviewTabProps {
	state: any
	health: any
	address: string | null
	formatted: string
	copied: boolean
	cluster: any
	rpcUrl: string
}

function getStatusColor(state: any) {
	if (state.connected) return '#0f0'
	if (state.connecting) return '#ff0'
	return '#f00'
}

export function OverviewTab({ 
	state, 
	health, 
	address, 
	formatted, 
	copied, 
	cluster, 
	rpcUrl 
}: OverviewTabProps) {
	return (
		<div style={{ height: '100%', overflowY: 'auto' }}>
			{/* Connection Status */}
			<div style={{ marginBottom: 12 }}>
				<div style={{ 
					color: getStatusColor(state),
					display: 'flex',
					alignItems: 'center',
					gap: 8,
					fontSize: 13,
					fontWeight: 600
				}}>
					<span style={{ 
						width: 8, 
						height: 8, 
						borderRadius: '50%', 
						backgroundColor: getStatusColor(state),
						display: 'inline-block'
					}} />
					{state.connected ? 'Connected' : state.connecting ? 'Connecting...' : 'Disconnected'}
				</div>
			</div>
			
			<Divider />
			
			{/* Account */}
			<Section title="Account">
				{address ? (
					<>
						<div style={{ 
							fontFamily: 'monospace',
							wordBreak: 'break-all',
							padding: '6px 8px',
							backgroundColor: 'rgba(255, 255, 255, 0.05)',
							borderRadius: 4,
							marginBottom: 4,
							fontSize: 11
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
			</Section>
			
			{/* Cluster */}
			<Section title="Network">
				<div style={{ marginBottom: 4, fontWeight: 500 }}>
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
			</Section>
			
			{/* Wallets */}
			<Section title="Wallets">
				<div>
					{state.wallets.length} detected
				</div>
				{state.selectedWallet && (
					<div style={{ fontSize: 10, opacity: 0.6, marginTop: 4 }}>
						Using: {state.selectedWallet.name}
					</div>
				)}
			</Section>
			
			{/* Health */}
			{health && (
				<>
					<Divider />
					<Section title="Health Check">
						<div style={{ fontSize: 10, opacity: 0.9, lineHeight: 1.6 }}>
							<div>Initialized: <span style={{ color: health.initialized ? '#0f0' : '#f00' }}>
								{health.initialized ? '✓' : '✗'}
							</span></div>
							<div>Wallet Standard: <span style={{ color: health.walletStandardAvailable ? '#0f0' : '#f00' }}>
								{health.walletStandardAvailable ? '✓' : '✗'}
							</span></div>
							<div>Storage: <span style={{ color: health.storageAvailable ? '#0f0' : '#f00' }}>
								{health.storageAvailable ? '✓' : '✗'}
							</span></div>
						</div>
						
						{health.errors.length > 0 && (
							<div style={{ 
								marginTop: 8,
								padding: 8,
								backgroundColor: 'rgba(255, 0, 0, 0.1)',
								borderRadius: 4,
								border: '1px solid rgba(255, 0, 0, 0.3)'
							}}>
								<div style={{ color: '#ff6b6b', fontWeight: 600, marginBottom: 4, fontSize: 10 }}>
									⚠️ Errors:
								</div>
								{health.errors.map((error: string, i: number) => (
									<div key={i} style={{ marginBottom: 2, fontSize: 9, opacity: 0.9 }}>
										• {error}
									</div>
								))}
							</div>
						)}
					</Section>
				</>
			)}
		</div>
	)
}

