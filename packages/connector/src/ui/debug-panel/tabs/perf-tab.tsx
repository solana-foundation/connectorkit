/**
 * @connector-kit/connector - Performance Tab Component
 */

'use client'

import { Section } from '../ui-components'

interface PerfTabProps {
	metrics: {
		stateUpdates: number
		noopUpdates: number
		optimizationRate: number
		eventListenerCount: number
		subscriptionCount: number
		avgUpdateTimeMs: number
	}
	poolStats: {
		size: number
		maxSize: number
		hits?: number
		misses?: number
	} | null
}

export function PerfTab({ metrics, poolStats }: PerfTabProps) {
	const totalUpdates = metrics.stateUpdates + metrics.noopUpdates
	
	return (
		<div style={{ height: '100%', overflowY: 'auto' }}>
			<Section title="State Updates">
				<div style={{ fontSize: 11, lineHeight: 1.8 }}>
					<div>Total: <strong>{totalUpdates}</strong></div>
					<div>Real: <strong>{metrics.stateUpdates}</strong></div>
					<div>Skipped: <strong>{metrics.noopUpdates}</strong></div>
					{metrics.optimizationRate > 0 && (
						<div style={{ color: '#0f0', marginTop: 4 }}>
							🎉 {metrics.optimizationRate}% optimized away!
						</div>
					)}
				</div>
			</Section>
			
			{poolStats && (
				<Section title="Connection Pool">
					<div style={{ fontSize: 11, lineHeight: 1.8 }}>
						<div>Size: {poolStats.size} / {poolStats.maxSize}</div>
						{poolStats.hits !== undefined && poolStats.misses !== undefined && (
							<>
								<div>Hits: {poolStats.hits}</div>
								<div>Misses: {poolStats.misses}</div>
								{(poolStats.hits + poolStats.misses) > 0 && (
									<div style={{ color: '#00aaff', marginTop: 4 }}>
										Hit Rate: {Math.round((poolStats.hits / (poolStats.hits + poolStats.misses)) * 100)}%
									</div>
								)}
							</>
						)}
					</div>
				</Section>
			)}
			
			<Section title="Listeners">
				<div style={{ fontSize: 11, lineHeight: 1.8 }}>
					<div>Event Listeners: {metrics.eventListenerCount}</div>
					<div>State Subscribers: {metrics.subscriptionCount}</div>
				</div>
			</Section>
			
			<Section title="Timing">
				<div style={{ fontSize: 11, lineHeight: 1.8 }}>
					<div>Avg Update: {metrics.avgUpdateTimeMs.toFixed(2)}ms</div>
				</div>
			</Section>
		</div>
	)
}

