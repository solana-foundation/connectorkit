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
							opacity: 0.5,
							padding: '40px 0',
							fontSize: 10
						}}
					>
						No transactions yet
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

