/**
 * @connector-kit/connector - Transactions Tab Component
 */

'use client'

import { Button } from '../ui-components'
import { 
	getSolanaExplorerUrl, 
	getSolscanUrl, 
	getXrayUrl,
	formatSignature
} from '../../../lib/explorer-urls'
import type { TransactionActivity } from '../../../lib/connector-client'

interface TransactionsTabProps {
	client: any
	cluster: any
}

function getStatusColor(status: TransactionActivity['status']) {
	if (status === 'confirmed') return '#0f0'
	if (status === 'failed') return '#f00'
	return '#ffaa00' // pending
}

function getStatusIcon(status: TransactionActivity['status']) {
	if (status === 'confirmed') return '✅'
	if (status === 'failed') return '❌'
	return '⏳'
}

function getRelativeTime(timestamp: string) {
	const ms = Date.now() - new Date(timestamp).getTime()
	if (ms < 1000) return 'just now'
	if (ms < 60000) return `${Math.floor(ms / 1000)}s ago`
	if (ms < 3600000) return `${Math.floor(ms / 60000)}m ago`
	return `${Math.floor(ms / 3600000)}h ago`
}

function normalizeCluster(clusterLabel: string): string {
	return clusterLabel.toLowerCase().replace('-beta', '').replace(' ', '')
}

export function TransactionsTab({ client, cluster }: TransactionsTabProps) {
	const debugState = (client as any).getDebugState?.()
	const transactions = debugState?.transactions || []

	const handleClearHistory = () => {
		(client as any).clearTransactionHistory?.()
	}

	const clusterName = normalizeCluster(cluster?.label || 'mainnet')

	return (
		<div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
			<div
				style={{
					display: 'flex',
					justifyContent: 'space-between',
					alignItems: 'center',
					marginBottom: 12
				}}
			>
				<span style={{ fontSize: 10, opacity: 0.7 }}>
					{transactions.length} of {debugState?.totalTransactions || 0} shown
				</span>
				{transactions.length > 0 && (
					<Button onClick={handleClearHistory} small>
						Clear History
					</Button>
				)}
			</div>

			<div style={{ flex: 1, overflowY: 'auto' }}>
				{transactions.length === 0 ? (
					<div
						style={{
							textAlign: 'center',
							padding: '40px 20px',
							display: 'flex',
							flexDirection: 'column',
							alignItems: 'center',
							gap: 8
						}}
					>
						<div style={{ opacity: 0.5 }}>
							<svg 
								width="88" 
								height="88" 
								viewBox="0 0 78 105" 
								fill="none" 
								xmlns="http://www.w3.org/2000/svg" 
								strokeWidth="2px" 
								strokeLinecap="round" 
								strokeLinejoin="round"
							>
								<path d="M35.9297 42.4501C35.4997 42.2901 35.0997 42.0901 34.7197 41.8501L35.9297 42.4501Z" stroke="#E0E0E0" strokeLinejoin="round"/>
								<path d="M75.7695 52.1099C75.7695 60.6699 73.1695 69.43 67.9695 78.4C62.7795 87.37 56.4395 93.9999 48.9795 98.3099C41.5195 102.62 35.1895 103.29 29.9895 100.33C26.6095 98.4099 24.3294 95.2999 23.1594 91.0099C22.5094 88.6899 22.1895 86.0399 22.1895 83.0399C22.1895 76.1599 23.9595 68.9699 27.4995 61.4699C31.0395 53.9799 35.6794 47.62 41.4194 42.4C39.3194 43.03 37.4894 43.0499 35.9194 42.4499L34.7095 41.8499C33.6895 41.2199 32.8395 40.3399 32.1395 39.1999C31.1895 37.6299 30.5195 35.7099 30.1295 33.4399C29.7495 31.1699 29.6895 28.6899 29.9395 25.9799C32.5295 24.1199 34.9895 22.8799 37.3295 22.2399C37.3595 22.2399 37.3794 22.2399 37.4094 22.2199C39.7694 21.5899 41.8995 21.5198 43.8195 22.0298C44.4695 22.1998 45.0795 22.4399 45.6495 22.7299L45.6995 22.7499L46.0195 22.9299C46.9795 23.4799 47.8194 24.1999 48.5494 25.1099C48.6194 25.1999 48.6995 25.29 48.7595 25.39C49.8895 26.91 50.5594 28.9499 50.7994 31.4999C51.1194 30.4299 51.4695 29.3699 51.8495 28.3099C52.0595 27.6999 52.2795 27.0899 52.5195 26.4899C52.9195 25.4299 53.3494 24.3899 53.8094 23.3399C54.9894 20.6399 56.3195 18.0299 57.7795 15.4999C58.4895 14.2899 59.3795 13.3699 60.4595 12.7499C61.4395 12.1799 62.2594 12.0399 62.9294 12.3099L63.1395 12.4099C63.8395 12.8099 64.1895 13.6299 64.1895 14.8699C64.1895 16.1099 63.8395 17.3499 63.1395 18.5599C61.7395 20.9799 60.4994 23.4699 59.4094 26.0399C58.9194 27.2099 58.4795 28.3799 58.1095 29.5399C57.6595 30.9099 57.2995 32.2699 57.0195 33.6199C60.8095 32.8199 64.1094 33.0599 66.9094 34.3499L66.9595 34.3699C68.2895 34.9899 69.4995 35.8399 70.5995 36.9199C74.0495 40.3099 75.7695 45.3699 75.7695 52.1099Z" stroke="#E0E0E0" strokeLinejoin="round"/>
								<path d="M34.7194 41.85L19.5094 34.24L15.9293 32.45C14.3693 31.85 13.1094 30.77 12.1494 29.2C11.1994 27.63 10.5294 25.7099 10.1394 23.4399C9.75943 21.1699 9.69937 18.69 9.94937 15.98L29.9494 25.98C29.6994 28.69 29.7594 31.1699 30.1394 33.4399C30.5294 35.7099 31.1994 37.63 32.1494 39.2C32.8494 40.34 33.6994 41.22 34.7194 41.85Z" stroke="#E0E0E0" strokeLinejoin="round"/>
								<path d="M27.4995 61.47C23.9595 68.97 22.1895 76.1599 22.1895 83.0399C22.1895 86.0399 22.5094 88.69 23.1594 91.01C24.3294 95.3 26.6095 98.41 29.9895 100.33C28.8295 100.49 14.3794 92.71 10.7894 90.76C10.6394 90.68 10.5095 90.6099 10.3995 90.5499C10.3195 90.5099 10.2495 90.4699 10.1995 90.4399C10.0595 90.3699 9.9895 90.33 9.9895 90.33C4.7895 87.37 2.18945 81.5999 2.18945 73.0399C2.18945 66.1599 3.95951 58.97 7.49951 51.47C10.6395 44.84 14.6295 39.09 19.4995 34.24L34.7095 41.85C35.0895 42.09 35.4894 42.29 35.9194 42.45C37.4894 43.05 39.3194 43.03 41.4194 42.4C35.6794 47.62 31.0395 53.98 27.4995 61.47Z" stroke="#E0E0E0" strokeLinejoin="round"/>
								<path d="M35.9297 42.4501C35.4997 42.2901 35.0997 42.0901 34.7197 41.8501L35.9297 42.4501Z" stroke="#E0E0E0" strokeLinejoin="round"/>
								<path d="M62.9298 12.31C62.2598 12.04 61.4398 12.18 60.4598 12.75C59.3798 13.37 58.4899 14.29 57.7799 15.5C56.3199 18.03 54.9898 20.64 53.8098 23.34C53.3498 24.39 52.9199 25.43 52.5199 26.49C52.2799 27.09 52.0599 27.7 51.8499 28.31C51.4699 29.37 51.1198 30.43 50.7998 31.5C50.5598 28.95 49.8899 26.9101 48.7599 25.3901C48.6999 25.2901 48.6198 25.2 48.5498 25.11C47.8198 24.2 46.9799 23.48 46.0199 22.93L45.6998 22.75L45.6499 22.73L32.6299 16.22C32.9899 15.26 33.3898 14.3 33.8098 13.34C34.9898 10.64 36.3199 8.03005 37.7799 5.50005C38.4899 4.29005 39.3798 3.37005 40.4598 2.75005C41.5498 2.12005 42.4399 2.00996 43.1399 2.40996L62.9298 12.31Z" stroke="#E0E0E0" strokeLinejoin="round"/>
								<path d="M67.609 34.7301L66.959 34.3701" stroke="#E0E0E0" strokeLinejoin="round"/>
								<path d="M66.9192 34.3501C64.1192 33.0601 60.8193 32.8201 57.0293 33.6201C57.3093 32.2701 57.6693 30.91 58.1193 29.54L66.9192 34.3501Z" stroke="#E0E0E0" strokeLinejoin="round"/>
								<path d="M45.6592 22.73C45.0892 22.44 44.4792 22.1999 43.8292 22.0299C41.9092 21.5199 39.7792 21.59 37.4192 22.22C37.3892 22.23 37.3692 22.23 37.3392 22.24C34.9992 22.88 32.5392 24.12 29.9492 25.98L9.94922 15.98C12.5692 14.1 15.0592 12.85 17.4192 12.22C19.7792 11.59 21.9092 11.5199 23.8292 12.0299C24.5692 12.2299 25.2593 12.5 25.8993 12.85L45.6592 22.73Z" stroke="#E0E0E0" strokeLinejoin="round"/>
							</svg>
						</div>
						<div style={{ color: '#fff', fontSize: 12, fontWeight: 500 }}>
							No Transactions Yet
						</div>
						<div style={{ fontSize: 10, opacity: 0.5, maxWidth: 200 }}>
							Transactions will appear here when you start interacting with the blockchain
						</div>
					</div>
				) : (
					transactions.map((tx: TransactionActivity, i: number) => (
						<div
							key={`${tx.signature}-${i}`}
							style={{
								padding: '8px',
								marginBottom: 6,
								backgroundColor: 'rgba(255, 255, 255, 0.03)',
								borderRadius: 6,
								borderLeft: `3px solid ${getStatusColor(tx.status)}`,
								fontSize: 10
							}}
						>
							{/* Header */}
							<div
								style={{
									display: 'flex',
									justifyContent: 'space-between',
									alignItems: 'center',
									marginBottom: 4
								}}
							>
								<div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
									<span style={{ fontSize: 12 }}>{getStatusIcon(tx.status)}</span>
									<span
										style={{
											fontWeight: 600,
											color: getStatusColor(tx.status)
										}}
									>
										{tx.status.toUpperCase()}
									</span>
								</div>
								<span style={{ fontSize: 9, opacity: 0.5 }}>
									{getRelativeTime(tx.timestamp)}
								</span>
							</div>

							{/* Signature */}
							<div
								style={{
									fontFamily: 'monospace',
									fontSize: 9,
									marginBottom: 4,
									opacity: 0.9,
									cursor: 'pointer'
								}}
								onClick={async () => {
									try {
										await navigator.clipboard.writeText(tx.signature)
									} catch (err) {
										console.error('Failed to copy signature:', err)
									}
								}}
								title="Click to copy full signature"
							>
								{formatSignature(tx.signature, 8)}
							</div>

							{/* Details */}
							<div style={{ fontSize: 9, opacity: 0.7, marginBottom: 6 }}>
								<div>Method: {tx.method}</div>
								{tx.feePayer && <div>Fee Payer: {formatSignature(tx.feePayer, 8)}</div>}
								<div>Cluster: {tx.cluster}</div>
							</div>

							{/* Error */}
							{tx.error && (
								<div
									style={{
										fontSize: 9,
										color: '#ff6b6b',
										marginBottom: 6,
										padding: 4,
										backgroundColor: 'rgba(255, 0, 0, 0.1)',
										borderRadius: 4
									}}
								>
									{tx.error}
								</div>
							)}

							{/* Explorer Links */}
							<div
								style={{
									display: 'flex',
									gap: 6,
									flexWrap: 'wrap'
								}}
							>
								<ExplorerLink
									href={getSolanaExplorerUrl(tx.signature, { cluster: clusterName })}
									icon="🔍"
									label="Explorer"
								/>
								<ExplorerLink
									href={getSolscanUrl(tx.signature, { cluster: clusterName })}
									icon="📊"
									label="Solscan"
								/>
								<ExplorerLink
									href={getXrayUrl(tx.signature)}
									icon="⚡"
									label="XRAY"
								/>
							</div>
						</div>
					))
				)}
			</div>
		</div>
	)
}

function ExplorerLink({
	href,
	icon,
	label
}: {
	href: string
	icon: string
	label: string
}) {
	return (
		<a
			href={href}
			target="_blank"
			rel="noopener noreferrer"
			style={{
				fontSize: 9,
				color: '#00aaff',
				textDecoration: 'none',
				padding: '2px 6px',
				backgroundColor: 'rgba(0, 170, 255, 0.1)',
				borderRadius: 4,
				border: '1px solid rgba(0, 170, 255, 0.3)',
				transition: 'background-color 0.15s ease'
			}}
			onMouseEnter={e => {
				e.currentTarget.style.backgroundColor = 'rgba(0, 170, 255, 0.2)'
			}}
			onMouseLeave={e => {
				e.currentTarget.style.backgroundColor = 'rgba(0, 170, 255, 0.1)'
			}}
		>
			{icon} {label}
		</a>
	)
}

