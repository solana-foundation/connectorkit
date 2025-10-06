/**
 * @connector-kit/connector - Inspector Tab Component
 * 
 * Combines Storage + Performance into an advanced debugging tool
 * with contextual metrics and actionable insights
 */

'use client'

import { useState, useMemo } from 'react'
import { Section, Divider, Button } from '../ui-components'

interface InspectorTabProps {
	client: any
	state: any
	metrics: {
		stateUpdates: number
		noopUpdates: number
		optimizationRate: number
		eventListenerCount: number
		subscriptionCount: number
		avgUpdateTimeMs: number
	} | null
	poolStats: {
		size: number
		maxSize: number
		hits?: number
		misses?: number
	} | null
}

export function InspectorTab({ client, state, metrics, poolStats }: InspectorTabProps) {
	const [lastClear, setLastClear] = useState<string | null>(null)
	const [isStorageExpanded, setIsStorageExpanded] = useState(true)
	const [isPerfExpanded, setIsPerfExpanded] = useState(false)
	
	// Storage values
	const storedWallet = useMemo(() => {
		try {
			return (client as any).walletStorage?.get() || null
		} catch {
			return null
		}
	}, [client, lastClear])
	
	const storedCluster = useMemo(() => {
		try {
			return (client as any).clusterStorage?.get() || null
		} catch {
			return null
		}
	}, [client, lastClear])
	
	// Storage handlers
	const handleClearWallet = () => {
		try {
			(client as any).walletStorage?.set(undefined)
			setLastClear(Date.now().toString())
		} catch (error) {
			console.error('Failed to clear wallet storage:', error)
		}
	}
	
	const handleClearCluster = () => {
		try {
			(client as any).clusterStorage?.set('solana:mainnet')
			setLastClear(Date.now().toString())
		} catch (error) {
			console.error('Failed to clear cluster storage:', error)
		}
	}
	
	const handleClearAll = () => {
		handleClearWallet()
		handleClearCluster()
	}
	
	// Performance calculations
	const totalUpdates = metrics ? metrics.stateUpdates + metrics.noopUpdates : 0
	const hasPerformanceIssues = metrics && (
		metrics.eventListenerCount > 10 || 
		metrics.subscriptionCount > 10 ||
		metrics.avgUpdateTimeMs > 5
	)
	const hasPoolIssues = poolStats && poolStats.hits !== undefined && poolStats.misses !== undefined && 
		(poolStats.hits + poolStats.misses > 0) &&
		((poolStats.hits / (poolStats.hits + poolStats.misses)) < 0.5)
	
	return (
		<div style={{ height: '100%', overflowY: 'auto' }}>
			{/* Storage Section */}
			<div style={{
				border: '1px solid rgba(255, 255, 255, 0.1)',
				borderRadius: 6,
				marginBottom: 12,
				overflow: 'hidden'
			}}>
				<div 
					style={{
						padding: '10px 12px',
						backgroundColor: 'rgba(255, 255, 255, 0.05)',
						cursor: 'pointer',
						display: 'flex',
						alignItems: 'center',
						justifyContent: 'space-between',
						userSelect: 'none'
					}}
					onClick={() => setIsStorageExpanded(!isStorageExpanded)}
				>
					<div style={{ fontWeight: 600, fontSize: 11, display: 'flex', alignItems: 'center', gap: 6 }}>
						💾 STORAGE
					</div>
					<span style={{ fontSize: 10, opacity: 0.6 }}>
						{isStorageExpanded ? '▼' : '▶'}
					</span>
				</div>
				
				{isStorageExpanded && (
					<div style={{ padding: 12 }}>
						<Section title="Persisted State">
							<div style={{ fontSize: 11, lineHeight: 1.8 }}>
								<div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
									<span style={{ opacity: 0.7 }}>Wallet:</span>
									{storedWallet ? (
										<span style={{ color: '#0f0', fontFamily: 'monospace', fontSize: 10 }}>
											"{storedWallet}" ✓
										</span>
									) : (
										<span style={{ opacity: 0.5, fontSize: 10 }}>None</span>
									)}
								</div>
								<div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
									<span style={{ opacity: 0.7 }}>Account:</span>
									{state.selectedAccount ? (
										<span style={{ color: '#0f0', fontFamily: 'monospace', fontSize: 9 }}>
											{state.selectedAccount.slice(0, 6)}...{state.selectedAccount.slice(-4)} ✓
										</span>
									) : (
										<span style={{ opacity: 0.5, fontSize: 10 }}>None</span>
									)}
								</div>
								<div style={{ display: 'flex', justifyContent: 'space-between' }}>
									<span style={{ opacity: 0.7 }}>Cluster:</span>
									{storedCluster ? (
										<span style={{ color: '#0f0', fontFamily: 'monospace', fontSize: 10 }}>
											"{storedCluster}" ✓
										</span>
									) : (
										<span style={{ opacity: 0.5, fontSize: 10 }}>None</span>
									)}
								</div>
							</div>
						</Section>
						
						<Divider />
						
						<Section title="Actions">
							<div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
								<Button onClick={handleClearWallet} small>Clear Wallet</Button>
								<Button onClick={handleClearCluster} small>Clear Cluster</Button>
								<Button onClick={handleClearAll} small>Clear All</Button>
							</div>
						</Section>
						
						<div style={{ 
							fontSize: 9, 
							opacity: 0.5, 
							marginTop: 8,
							padding: 6,
							backgroundColor: 'rgba(255, 255, 255, 0.02)',
							borderRadius: 4
						}}>
							💡 Clearing storage resets auto-connect behavior
						</div>
					</div>
				)}
			</div>
			
			{/* Performance Section */}
			{metrics && (
				<div style={{
					border: '1px solid rgba(255, 255, 255, 0.1)',
					borderRadius: 6,
					marginBottom: 12,
					overflow: 'hidden'
				}}>
					<div 
						style={{
							padding: '10px 12px',
							backgroundColor: hasPerformanceIssues 
								? 'rgba(255, 165, 0, 0.1)' 
								: 'rgba(255, 255, 255, 0.05)',
							cursor: 'pointer',
							display: 'flex',
							alignItems: 'center',
							justifyContent: 'space-between',
							userSelect: 'none',
							border: hasPerformanceIssues ? '1px solid rgba(255, 165, 0, 0.3)' : 'none'
						}}
						onClick={() => setIsPerfExpanded(!isPerfExpanded)}
					>
						<div style={{ fontWeight: 600, fontSize: 11, display: 'flex', alignItems: 'center', gap: 6 }}>
							⚡ PERFORMANCE
							{hasPerformanceIssues && (
								<span style={{ fontSize: 10, color: '#ffaa00' }}>⚠️</span>
							)}
						</div>
						<span style={{ fontSize: 10, opacity: 0.6 }}>
							{isPerfExpanded ? '▼' : '▶'}
						</span>
					</div>
					
					{isPerfExpanded && (
						<div style={{ padding: 12 }}>
							<Section title="Connections">
								<div style={{ fontSize: 11, lineHeight: 1.8 }}>
									{poolStats ? (
										<>
											<div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
												<span style={{ opacity: 0.7 }}>Pool Size:</span>
												<span style={{ fontFamily: 'monospace' }}>
													{poolStats.size} / {poolStats.maxSize}
												</span>
											</div>
											{poolStats.hits !== undefined && poolStats.misses !== undefined && (
												<>
													<div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
														<span style={{ opacity: 0.7 }}>Cache Hits:</span>
														<span style={{ fontFamily: 'monospace' }}>{poolStats.hits}</span>
													</div>
													<div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
														<span style={{ opacity: 0.7 }}>Cache Misses:</span>
														<span style={{ fontFamily: 'monospace' }}>{poolStats.misses}</span>
													</div>
													{(poolStats.hits + poolStats.misses) > 0 && (
														<div style={{ 
															marginTop: 6, 
															padding: 6,
															backgroundColor: hasPoolIssues 
																? 'rgba(255, 165, 0, 0.1)' 
																: 'rgba(0, 170, 255, 0.1)',
															borderRadius: 4,
															border: hasPoolIssues 
																? '1px solid rgba(255, 165, 0, 0.3)'
																: '1px solid rgba(0, 170, 255, 0.2)'
														}}>
															<div style={{ fontSize: 10, fontWeight: 600, marginBottom: 2 }}>
																Hit Rate: {Math.round((poolStats.hits / (poolStats.hits + poolStats.misses)) * 100)}%
															</div>
															<div style={{ fontSize: 9, opacity: 0.7 }}>
																{hasPoolIssues 
																	? '⚠️ Low hit rate - connections not being reused efficiently'
																	: '✓ Good - connections being reused efficiently'
																}
															</div>
														</div>
													)}
												</>
											)}
										</>
									) : (
										<div style={{ opacity: 0.5, fontSize: 10 }}>No pool data available</div>
									)}
								</div>
							</Section>
							
							<Divider />
							
							<Section title="Resources">
								<div style={{ fontSize: 11, lineHeight: 1.8 }}>
									<div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
										<span style={{ opacity: 0.7 }}>Event Listeners:</span>
										<span style={{ 
											fontFamily: 'monospace',
											color: metrics.eventListenerCount > 10 ? '#ffaa00' : 'inherit'
										}}>
											{metrics.eventListenerCount}
											{metrics.eventListenerCount > 10 && ' ⚠️'}
										</span>
									</div>
									<div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
										<span style={{ opacity: 0.7 }}>State Subscribers:</span>
										<span style={{ 
											fontFamily: 'monospace',
											color: metrics.subscriptionCount > 10 ? '#ffaa00' : 'inherit'
										}}>
											{metrics.subscriptionCount}
											{metrics.subscriptionCount > 10 && ' ⚠️'}
										</span>
									</div>
									
									{(metrics.eventListenerCount > 10 || metrics.subscriptionCount > 10) && (
										<div style={{ 
											marginTop: 6,
											padding: 6,
											backgroundColor: 'rgba(255, 165, 0, 0.1)',
											borderRadius: 4,
											border: '1px solid rgba(255, 165, 0, 0.3)',
											fontSize: 9,
											lineHeight: 1.4
										}}>
											⚠️ High listener/subscriber count may indicate a memory leak. 
											Check for missing cleanup in useEffect hooks.
										</div>
									)}
								</div>
							</Section>
							
							<Divider />
							
							<Section title="Performance Metrics">
								<div style={{ fontSize: 11, lineHeight: 1.8 }}>
									<div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
										<span style={{ opacity: 0.7 }}>State Updates:</span>
										<span style={{ fontFamily: 'monospace' }}>{totalUpdates}</span>
									</div>
									<div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
										<span style={{ opacity: 0.7 }}>Avg Update Time:</span>
										<span style={{ 
											fontFamily: 'monospace',
											color: metrics.avgUpdateTimeMs > 5 ? '#ffaa00' : '#0f0'
										}}>
											{metrics.avgUpdateTimeMs.toFixed(2)}ms
											{metrics.avgUpdateTimeMs > 5 && ' ⚠️'}
										</span>
									</div>
									
									{metrics.avgUpdateTimeMs > 5 && (
										<div style={{ 
											marginTop: 6,
											padding: 6,
											backgroundColor: 'rgba(255, 165, 0, 0.1)',
											borderRadius: 4,
											border: '1px solid rgba(255, 165, 0, 0.3)',
											fontSize: 9,
											lineHeight: 1.4
										}}>
											⚠️ Slow state updates detected. Consider optimizing render logic.
										</div>
									)}
								</div>
							</Section>
							
							<div style={{ 
								fontSize: 9, 
								opacity: 0.5, 
								marginTop: 12,
								padding: 6,
								backgroundColor: 'rgba(255, 255, 255, 0.02)',
								borderRadius: 4,
								lineHeight: 1.4
							}}>
								💡 Performance metrics help identify memory leaks and optimization opportunities
							</div>
						</div>
					)}
				</div>
			)}
			
			{!metrics && (
				<div style={{ 
					textAlign: 'center', 
					padding: '20px',
					opacity: 0.5,
					fontSize: 11
				}}>
					Performance metrics not available
				</div>
			)}
		</div>
	)
}
