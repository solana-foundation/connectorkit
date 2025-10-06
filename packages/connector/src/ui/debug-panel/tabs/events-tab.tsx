/**
 * @connector-kit/connector - Events Tab Component
 */

'use client'

import { Button, EmptyState } from '../ui-components'
import { PlayIcon, PauseIcon, TrashIcon } from '../icons'
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
				alignItems: 'start',
				justifyContent: 'space-between',
				marginBottom: 12
			}}>
				<div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
					<div style={{ 
						opacity: 0.7, 
						fontSize: 10, 
						textTransform: 'uppercase',
						letterSpacing: 0.5,
						fontWeight: 400
					}}>
						Events
					</div>
					<div style={{ 
						fontSize: 11, 
						fontWeight: 600,
						fontFamily: 'monospace',
						opacity: 0.9
					}}>
						{events.length}
					</div>
				</div>
				<div style={{ display: 'flex', gap: 6 }}>
					<Button onClick={onPause} small icon>
						{isPaused ? <PlayIcon /> : <PauseIcon />}
					</Button>
					<Button onClick={onClear} small>
						<span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
							<TrashIcon />
							Clear
						</span>
					</Button>
				</div>
			</div>
			
			<div style={{ flex: 1, overflowY: 'auto' }}>
				{events.length === 0 ? (
					<EmptyState
						icon={
							<svg width="88" height="88" viewBox="0 0 110 101" fill="none" xmlns="http://www.w3.org/2000/svg" strokeWidth="1px" strokeLinecap="round" strokeLinejoin="round">
								<path d="M107.471 31.07C107.471 32.33 107.101 33.6099 106.351 34.8899C105.611 36.1699 104.691 37.1299 103.591 37.7599L88.0806 46.72C87.2406 47.2 86.5106 47.36 85.8906 47.2L85.2407 46.87H85.2207C84.9307 46.64 84.6807 46.3199 84.4907 45.8999L78.3005 30.82L76.4407 26.2899L74.5906 32.96L72.4907 40.5L58.6006 90.5499C58.1506 92.0699 57.4407 93.5199 56.4707 94.8999C55.5007 96.2699 54.4007 97.3099 53.1707 98.0199C51.9407 98.7299 50.8406 98.96 49.8706 98.7C49.6706 98.65 49.4805 98.58 49.3105 98.49L49.1707 98.4199C49.1107 98.3899 49.0507 98.3499 48.9907 98.2999C48.4607 97.9799 48.0407 97.49 47.7407 96.82L39.5806 77.0099L38.8206 75.1599L26.0208 82.5499C26.0208 82.5499 26.0007 82.56 25.9907 82.57C24.9007 83.18 23.9907 83.28 23.2607 82.86C23.2607 82.86 23.2407 82.85 23.2007 82.83C22.5007 82.39 22.1406 81.56 22.1406 80.33C22.1406 79.1 22.5207 77.7999 23.2607 76.5199C23.3107 76.4399 23.3506 76.3599 23.4006 76.2899C24.1106 75.1199 24.9908 74.2399 26.0208 73.6399L31.3105 70.59L35.0208 68.45L41.5405 64.6899C42.1305 64.3499 42.6706 64.1599 43.1506 64.1499C43.3506 64.1399 43.5407 64.16 43.7207 64.21C43.8007 64.23 43.8707 64.2499 43.9407 64.2799L44.0806 64.35C44.5206 64.56 44.8706 64.9599 45.1206 65.5099L53.1707 85.12L66.4006 37.46L66.4607 37.25L70.0305 24.3999L71.0107 20.86C71.4607 19.34 72.1706 17.8899 73.1406 16.5099C74.1106 15.1299 75.2107 14.0899 76.4407 13.3799C77.6707 12.6699 78.7707 12.45 79.7407 12.7C79.8607 12.73 79.9806 12.7699 80.0906 12.8099L80.1907 12.86C80.9307 13.18 81.4906 13.75 81.8706 14.59L83.6206 18.84L86.2107 25.12L90.7905 36.25L103.591 28.86C104.581 28.29 105.421 28.1499 106.121 28.4399L106.351 28.5499C107.101 28.9699 107.471 29.81 107.471 31.07Z" stroke="#E0E0E0" strokeLinejoin="round"/>
								<path d="M85.8901 47.2001C85.6501 47.1401 85.4302 47.0401 85.2402 46.8701L85.8901 47.2001Z" stroke="#E0E0E0" strokeLinejoin="round"/>
								<path d="M48.9902 98.2999L29.5203 88.59L29.2302 88.45C28.5802 88.13 28.0802 87.5799 27.7402 86.8199L25.9902 82.5699C25.9902 82.5699 26.0103 82.5699 26.0203 82.5499L38.8201 75.1599L39.5801 77.0099L47.7402 96.8199C48.0402 97.4899 48.4602 97.9799 48.9902 98.2999Z" stroke="#E0E0E0" strokeLinejoin="round"/>
								<path d="M106.121 28.4399C105.421 28.1499 104.581 28.29 103.591 28.86L90.791 36.25L86.2112 25.12L83.6211 18.8399C84.7111 18.2299 85.6211 18.1199 86.3511 18.5499L106.121 28.4399Z" stroke="#E0E0E0" strokeLinejoin="round"/>
								<path d="M80.0908 12.8099C79.9808 12.7699 79.861 12.73 79.741 12.7C78.771 12.45 77.6709 12.6699 76.4409 13.3799C75.2109 14.0899 74.1109 15.1299 73.1409 16.5099C72.1709 17.8899 71.461 19.34 71.011 20.86L70.0308 24.3999L66.4609 37.25L66.4009 37.46L53.1709 85.12L45.1208 65.5099C44.8708 64.9599 44.5208 64.56 44.0808 64.35L43.9409 64.2799L37.1309 60.8799L51.011 10.86C51.461 9.33999 52.1709 7.8899 53.1409 6.5099C54.1109 5.1299 55.2109 4.08989 56.4409 3.37989C57.6709 2.66989 58.771 2.44996 59.741 2.69996C59.981 2.75996 60.2009 2.84998 60.4109 2.96998L60.501 3.01991L80.0908 12.8099Z" stroke="#E0E0E0" strokeLinejoin="round"/>
								<path d="M85.2202 46.8601L72.4902 40.5001L74.5901 32.9601L76.4402 26.29L78.3 30.8201L84.4902 45.9C84.6802 46.32 84.9302 46.6401 85.2202 46.8601Z" stroke="#E0E0E0" strokeLinejoin="round"/>
								<path d="M43.9407 64.2799C43.8707 64.2499 43.8007 64.23 43.7207 64.21C43.5407 64.16 43.3506 64.1399 43.1506 64.1499C42.6706 64.1599 42.1305 64.35 41.5405 64.69L35.0208 68.45L31.3105 70.59L26.0208 73.6399C24.9908 74.2399 24.1106 75.1199 23.4006 76.2899C23.3506 76.3599 23.3107 76.4399 23.2607 76.5199C22.5207 77.7999 22.1406 79.07 22.1406 80.33C22.1406 81.59 22.5007 82.39 23.2007 82.83L22.5505 82.5L3.34058 72.8999C3.34058 72.8999 3.29074 72.88 3.26074 72.86C2.52074 72.44 2.14062 71.59 2.14062 70.33C2.14062 69.07 2.52074 67.7999 3.26074 66.5199C4.00074 65.2399 4.92075 64.2799 6.02075 63.6399L21.5405 54.69C22.3805 54.2 23.1007 54.04 23.7207 54.21C23.8707 54.25 24.0106 54.3099 24.1406 54.3899H24.1606L37.1306 60.8799L43.9407 64.2799Z" stroke="#E0E0E0" strokeLinejoin="round"/>
								<path d="M49.3301 98.4698L48.9902 98.2998" stroke="#E0E0E0" strokeLinejoin="round"/>
								<path d="M80.1909 12.8601L80.0908 12.8101" stroke="#E0E0E0" strokeLinejoin="round"/>
							</svg>
						}
						title="No Events Yet"
						description="Events will appear here as you interact with the wallet and blockchain"
					/>
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

