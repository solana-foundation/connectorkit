/**
 * @connector-kit/connector - Events Tab Component
 */

'use client'

import { Button } from '../ui-components'
import type { ConnectorEvent } from '../../../lib/connector-client'

interface EventsTabProps {
	events: ConnectorEvent[]
	onClear: () => void
	onPause: () => void
	isPaused: boolean
}

function getEventColor(type: string) {
	if (type.includes('connected') && !type.includes('failed')) return '#0f0'
	if (type.includes('disconnected')) return '#f00'
	if (type.includes('changed')) return '#00aaff'
	if (type.includes('error') || type.includes('failed')) return '#ff0000'
	if (type.includes('connecting')) return '#ffaa00'
	return '#999'
}

function getRelativeTime(timestamp: string) {
	const ms = Date.now() - new Date(timestamp).getTime()
	if (ms < 1000) return 'just now'
	if (ms < 60000) return `${Math.floor(ms/1000)}s ago`
	if (ms < 3600000) return `${Math.floor(ms/60000)}m ago`
	return `${Math.floor(ms/3600000)}h ago`
}

export function EventsTab({ events, onClear, onPause, isPaused }: EventsTabProps) {
	return (
		<div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
			<div style={{ 
				display: 'flex', 
				gap: 6, 
				marginBottom: 12,
				flexWrap: 'wrap'
			}}>
				<Button onClick={onPause} small>
					{isPaused ? '▶ Resume' : '⏸ Pause'}
				</Button>
				<Button onClick={onClear} small>🗑 Clear</Button>
				<span style={{ fontSize: 10, opacity: 0.6, alignSelf: 'center' }}>
					{events.length} events
				</span>
			</div>
			
			<div style={{ flex: 1, overflowY: 'auto' }}>
				{events.length === 0 ? (
					<div style={{ textAlign: 'center', opacity: 0.5, padding: '20px 0', fontSize: 10 }}>
						No events yet
					</div>
				) : (
					events.map((event: ConnectorEvent, i: number) => (
						<div
							key={i}
							style={{
								padding: '6px 8px',
								marginBottom: 4,
								backgroundColor: 'rgba(255, 255, 255, 0.03)',
								borderRadius: 4,
								borderLeft: `3px solid ${getEventColor(event.type)}`
							}}
						>
							<div style={{ 
								display: 'flex', 
								justifyContent: 'space-between',
								alignItems: 'center',
								marginBottom: 2
							}}>
								<span style={{ 
									fontSize: 10, 
									fontWeight: 600,
									color: getEventColor(event.type)
								}}>
									{event.type}
								</span>
								<span style={{ fontSize: 9, opacity: 0.5 }}>
									{getRelativeTime(event.timestamp)}
								</span>
							</div>
							{'wallet' in event && event.wallet && (
								<div style={{ fontSize: 9, opacity: 0.7 }}>
									Wallet: {event.wallet}
								</div>
							)}
							{'account' in event && event.account && (
								<div style={{ fontSize: 9, opacity: 0.7, fontFamily: 'monospace' }}>
									{event.account.slice(0, 8)}...{event.account.slice(-6)}
								</div>
							)}
							{'error' in event && event.error && (
								<div style={{ fontSize: 9, color: '#ff6b6b', marginTop: 2 }}>
									{typeof event.error === 'string' ? event.error : event.error.message}
								</div>
							)}
						</div>
					))
				)}
			</div>
		</div>
	)
}

