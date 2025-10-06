/**
 * @connector-kit/connector - Transactions Tab Component
 */

'use client'

import { useState } from 'react'
import { Button, EmptyState } from '../ui-components'
import { ExternalLinkIcon } from '../icons'
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
					alignItems: 'flex-start',
					marginBottom: 12
				}}
			>
				<div>
					<div style={{ 
						opacity: 0.7, 
						fontSize: 10, 
						textTransform: 'uppercase',
						letterSpacing: 0.5,
						fontWeight: 400,
						marginBottom: 4
					}}>
						Transactions
					</div>
					<div style={{ fontSize: 10, opacity: 0.6 }}>
						{transactions.length} of {debugState?.totalTransactions || 0} shown
					</div>
				</div>
				{transactions.length > 0 && (
					<Button onClick={handleClearHistory} small>
						Clear History
					</Button>
				)}
			</div>

			<div style={{ flex: 1, overflowY: 'auto' }}>
				{transactions.length === 0 ? (
					<EmptyState
						icon={
							<svg width="88" height="88" viewBox="0 0 101 110" fill="none" xmlns="http://www.w3.org/2000/svg" strokeWidth="1px" strokeLinecap="round" strokeLinejoin="round">
								<path d="M66.3198 12.3662L67.0398 12.7262C66.8398 12.5362 66.5998 12.4162 66.3198 12.3662Z" stroke="#E0E0E0" strokeLinejoin="round"/>
								<path d="M97.5598 33.8863C97.4498 33.7963 97.3398 33.7063 97.2098 33.6463C97.0798 33.5763 96.9298 33.5263 96.7798 33.4963C96.4198 33.4063 95.9998 33.4063 95.5198 33.4963C92.8598 34.0063 90.7898 33.7163 89.2998 32.6163C88.2198 31.8063 87.4898 30.4963 87.1298 28.6863C87.1298 28.6863 87.1298 28.6263 87.1298 28.6063C86.9998 27.9663 86.9298 27.2663 86.8898 26.4963C86.8298 24.8663 86.4498 23.8463 85.7498 23.4563L85.5498 23.3563C84.8698 23.0863 83.9298 23.2663 82.7198 23.8963C81.7798 24.4063 80.8697 24.8163 79.9897 25.1063H79.9797C79.3897 25.3063 78.8198 25.4663 78.2698 25.5563C76.1098 25.9663 74.1698 25.6663 72.4198 24.6663C71.7698 24.2963 71.1898 23.8563 70.6998 23.3363C68.9298 21.5563 67.9998 18.8863 67.9098 15.3463C67.8898 15.0363 67.8598 14.7563 67.8198 14.4963C67.6898 13.6763 67.4398 13.0963 67.0498 12.7363L66.3298 12.3763C65.9198 12.3063 65.4398 12.3963 64.8698 12.6363C63.1798 13.3663 61.5398 14.1963 59.9298 15.1263C55.6098 17.5763 51.5598 20.6963 47.7798 24.4563C45.0898 27.1363 42.5898 29.9863 40.2898 32.9963C38.1398 35.7863 36.1597 38.7263 34.3497 41.8063C33.9497 42.4763 33.5698 43.1463 33.1898 43.8263C30.9498 47.8363 29.0298 51.9163 27.4298 56.0763C26.7298 57.8863 26.0898 59.7063 25.5198 61.5463C24.6198 64.4363 23.8998 67.2463 23.3898 69.9763C22.6898 73.6463 22.3398 77.1763 22.3398 80.5463C22.3398 86.5763 23.3398 91.6563 25.3298 95.8163C25.5698 96.3163 25.8198 96.7963 26.0798 97.2563C27.9798 100.686 30.4398 103.246 33.4498 104.956C33.8098 105.156 34.1698 105.346 34.5398 105.526L34.6198 105.566C37.7698 107.066 41.3998 107.656 45.4998 107.316C50.1198 106.936 55.0598 105.226 60.3098 102.196C65.6298 99.1263 70.6298 95.0763 75.3098 90.0463C79.9998 85.0163 84.0498 79.5064 87.4598 73.4964C90.8798 67.4964 93.5698 61.2463 95.5298 54.7363C97.4898 48.2263 98.4098 41.9963 98.2898 36.0463C98.2898 35.0263 98.0498 34.3063 97.5698 33.8963L97.5598 33.8863ZM51.0498 75.1164C49.9398 77.0264 48.5898 78.4463 47.0098 79.3563C45.4298 80.2663 44.0897 80.4064 42.9797 79.7764C41.8697 79.1464 41.3198 77.9263 41.3198 76.1063C41.3198 74.2863 41.8697 72.4263 42.9797 70.5163C44.0897 68.6063 45.4298 67.1963 47.0098 66.2863C48.5898 65.3663 49.9398 65.2263 51.0498 65.8563C52.1498 66.4963 52.7098 67.7164 52.7098 69.5264C52.7098 71.3364 52.1498 73.2064 51.0498 75.1164ZM58.6398 48.9463C57.7398 50.4963 56.6897 51.7163 55.4797 52.6063C55.1997 52.8163 54.9097 53.0163 54.6097 53.1863C53.0197 54.0963 51.6798 54.2363 50.5698 53.6063C50.1598 53.3763 49.8298 53.0663 49.5798 52.6663C49.1298 51.9963 48.9098 51.0863 48.9098 49.9363C48.9098 48.1163 49.4598 46.2563 50.5698 44.3463C51.6798 42.4363 53.0197 41.0263 54.6097 40.1163C56.1897 39.1963 57.5298 39.0563 58.6398 39.6863C59.7498 40.3163 60.2998 41.5463 60.2998 43.3563C60.2998 45.1663 59.7498 47.0363 58.6398 48.9463ZM74.3998 66.6463C73.6698 67.9063 72.7698 68.8463 71.6898 69.4663C70.6198 70.0863 69.7197 70.1864 68.9897 69.7764C68.2597 69.3564 67.8998 68.5363 67.8998 67.2963C67.8998 66.0563 68.2597 64.8163 68.9897 63.5663C69.7197 62.3063 70.6198 61.3663 71.6898 60.7463C72.7698 60.1263 73.6698 60.0263 74.3998 60.4363C75.1298 60.8563 75.4897 61.6763 75.4897 62.9163C75.4897 64.1563 75.1298 65.3963 74.3998 66.6463Z" stroke="#E0E0E0" strokeLinejoin="round"/>
								<path d="M75.4897 62.9165C75.4897 64.1465 75.1298 65.3965 74.3998 66.6465C73.6698 67.9065 72.7698 68.8465 71.6898 69.4665C70.6198 70.0865 69.7197 70.1865 68.9897 69.7765C68.2597 69.3565 67.8998 68.5365 67.8998 67.2965C67.8998 66.0565 68.2597 64.8165 68.9897 63.5665C69.7197 62.3065 70.6198 61.3665 71.6898 60.7465C72.7698 60.1265 73.6698 60.0265 74.3998 60.4365C75.1298 60.8565 75.4897 61.6765 75.4897 62.9165Z" stroke="#E0E0E0" strokeLinejoin="round"/>
								<path d="M52.7098 69.5261C52.7098 71.3461 52.1498 73.2061 51.0498 75.1161C49.9398 77.0261 48.5898 78.4461 47.0098 79.3561C45.4298 80.2661 44.0897 80.4061 42.9797 79.7761C41.8697 79.1461 41.3198 77.9261 41.3198 76.1061C41.3198 74.2861 41.8697 72.4261 42.9797 70.5161C44.0897 68.6061 45.4298 67.1961 47.0098 66.2861C48.5898 65.3661 49.9398 65.2261 51.0498 65.8561C52.1498 66.4961 52.7098 67.7161 52.7098 69.5261Z" stroke="#E0E0E0" strokeLinejoin="round"/>
								<path d="M60.2998 43.3562C60.2998 45.1762 59.7498 47.0362 58.6398 48.9462C57.7398 50.4962 56.6897 51.7162 55.4797 52.6062C55.1997 52.8162 54.9097 53.0162 54.6097 53.1862C53.0197 54.0962 51.6798 54.2362 50.5698 53.6062C50.1598 53.3762 49.8298 53.0662 49.5798 52.6662C49.1298 51.9962 48.9098 51.0862 48.9098 49.9362C48.9098 48.1162 49.4598 46.2562 50.5698 44.3462C51.6798 42.4362 53.0197 41.0262 54.6097 40.1162C56.1897 39.1962 57.5298 39.0562 58.6398 39.6862C59.7498 40.3162 60.2998 41.5462 60.2998 43.3562Z" stroke="#E0E0E0" strokeLinejoin="round"/>
								<path d="M66.3198 12.3663C65.9098 12.2963 65.4297 12.3863 64.8597 12.6263C63.1697 13.3563 61.5298 14.1863 59.9198 15.1163C55.5998 17.5663 51.5498 20.6863 47.7698 24.4463C45.0798 27.1263 42.5798 29.9763 40.2798 32.9863C38.1298 35.7763 36.1498 38.7163 34.3398 41.7963C33.9398 42.4663 33.5598 43.1363 33.1798 43.8163C30.9398 47.8263 29.0198 51.9063 27.4198 56.0663C26.7198 57.8763 26.0798 59.6963 25.5098 61.5363C24.6098 64.4263 23.8898 67.2363 23.3798 69.9663C22.6798 73.6363 22.3298 77.1663 22.3298 80.5363C22.3298 86.5663 23.3298 91.6463 25.3198 95.8063C25.5598 96.3063 25.8098 96.7863 26.0698 97.2463C27.9698 100.676 30.4298 103.236 33.4398 104.946C33.7998 105.146 34.1598 105.336 34.5298 105.516L14.9298 95.6963L13.4398 94.9463C10.0198 93.0063 7.30982 89.9563 5.31982 85.8063C3.32982 81.6463 2.32983 76.5663 2.32983 70.5363C2.32983 64.5063 3.38977 58.3163 5.50977 51.5363C7.62977 44.7563 10.5698 38.1763 14.3398 31.7963C18.0998 25.4063 22.5798 19.6263 27.7698 14.4463C32.9598 9.27632 38.6597 5.33633 44.8597 2.62633C45.8097 2.21633 46.5398 2.25632 47.0398 2.72632L66.3198 12.3663Z" stroke="#E0E0E0" strokeLinejoin="round"/>
								<path d="M85.5398 23.3463C84.8598 23.0763 83.9198 23.2563 82.7098 23.8863C81.7698 24.3963 80.8597 24.8063 79.9797 25.0963H79.9698C79.3798 25.2963 78.8098 25.4563 78.2598 25.5463C76.0998 25.9563 74.1598 25.6563 72.4098 24.6563C71.7598 24.2863 71.1798 23.8463 70.6898 23.3263C68.9198 21.5463 67.9898 18.8763 67.8998 15.3363C67.8798 15.0263 67.8498 14.7463 67.8098 14.4863L85.5398 23.3463Z" stroke="#E0E0E0" strokeLinejoin="round"/>
								<path d="M97.2098 33.6464C97.0798 33.5764 96.9298 33.5264 96.7798 33.4964C96.4198 33.4064 95.9998 33.4064 95.5198 33.4964C92.8598 34.0064 90.7898 33.7164 89.2998 32.6164C88.2198 31.8064 87.4898 30.4964 87.1298 28.6864C87.1298 28.6864 87.1298 28.6264 87.1298 28.6064L97.2198 33.6564L97.2098 33.6464Z" stroke="#E0E0E0" strokeLinejoin="round"/>
								<path d="M97.2898 33.6862L97.2098 33.6462" stroke="#E0E0E0" strokeLinejoin="round"/>
							</svg>
						}
						title="No Transactions Yet"
						description="Transactions will appear here when you start interacting with the blockchain"
					/>
				) : (
					transactions.map((tx: TransactionActivity, i: number) => (
						<TransactionItem
							key={`${tx.signature}-${i}`}
							tx={tx}
							clusterName={clusterName}
						/>
					))
				)}
			</div>
		</div>
	)
}

function TransactionItem({ 
	tx, 
	clusterName 
}: { 
	tx: TransactionActivity
	clusterName: string 
}) {
	const [isExpanded, setIsExpanded] = useState(false)
	const [isHovered, setIsHovered] = useState(false)
	const [copySuccess, setCopySuccess] = useState(false)
	
	const handleCopySignature = async () => {
		try {
			await navigator.clipboard.writeText(tx.signature)
			setCopySuccess(true)
			setTimeout(() => setCopySuccess(false), 2000)
		} catch (err) {
			console.error('Failed to copy signature:', err)
		}
	}

	// Extract metadata if available
	const metadata = tx.metadata || {}
	const hasMetadata = Object.keys(metadata).length > 0

	return (
		<div
			style={{
				border: '1px solid rgba(255, 255, 255, 0.1)',
				borderRadius: 8,
				marginBottom: 8,
				overflow: 'hidden',
				backgroundColor: isHovered ? 'rgba(255, 255, 255, 0.03)' : 'transparent',
				transition: 'all 0.2s ease'
			}}
			onMouseEnter={() => setIsHovered(true)}
			onMouseLeave={() => setIsHovered(false)}
		>
		{/* Header - Always visible */}
		<div
			style={{
				padding: '10px 12px',
				cursor: 'pointer',
				display: 'flex',
				alignItems: 'center',
				justifyContent: 'space-between',
				userSelect: 'none'
			}}
			onClick={() => setIsExpanded(!isExpanded)}
		>
			<div style={{ 
				display: 'flex', 
				alignItems: 'center', 
				gap: 8,
				flex: 1,
				minWidth: 0
			}}>
				{/* Status Icon */}
				<span style={{ fontSize: 14, flexShrink: 0 }}>
					{getStatusIcon(tx.status)}
				</span>
				
				{/* Method and Signature inline */}
				<div style={{ 
					minWidth: 0, 
					flex: 1,
					display: 'flex',
					alignItems: 'baseline',
					gap: 6,
					flexWrap: 'wrap'
				}}>
					<span style={{ 
						fontWeight: 600, 
						fontSize: 11,
						whiteSpace: 'nowrap'
					}}>
						{tx.method}
					</span>
					<span style={{ 
						fontSize: 9, 
						opacity: 0.6,
						fontFamily: 'monospace'
					}}>
						{formatSignature(tx.signature, 6)}
					</span>
				</div>
			</div>
			
			{/* Timestamp and Expand Arrow */}
			<div style={{ 
				display: 'flex', 
				alignItems: 'center', 
				gap: 8,
				flexShrink: 0
			}}>
				<span style={{ fontSize: 9, opacity: 0.5 }}>
					{getRelativeTime(tx.timestamp)}
				</span>
				<span style={{ fontSize: 10, opacity: 0.6 }}>
					{isExpanded ? '▼' : '▶'}
				</span>
			</div>
		</div>

			{/* Expanded Details */}
			{isExpanded && (
				<div style={{ padding: 12 }}>
					{/* Signature Section */}
					<div style={{ marginBottom: 8 }}>
						<div style={{ 
							opacity: 0.6, 
							fontSize: 9, 
							marginBottom: 4,
							textTransform: 'uppercase',
							letterSpacing: 0.5
						}}>
							Signature
						</div>
						<div 
							style={{ 
								fontFamily: 'monospace',
								wordBreak: 'break-all',
								padding: '8px 10px',
								backgroundColor: 'rgba(255, 255, 255, 0.05)',
								borderRadius: 6,
								fontSize: 9,
								fontWeight: 500,
								border: '1px solid rgba(255, 255, 255, 0.1)',
								cursor: 'pointer',
								transition: 'all 0.15s ease',
								display: 'flex',
								alignItems: 'center',
								gap: 6
							}}
							onClick={handleCopySignature}
							onMouseEnter={(e) => {
								e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.08)'
								e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.2)'
							}}
							onMouseLeave={(e) => {
								e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.05)'
								e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)'
							}}
							title="Click to copy signature"
						>
							<span style={{ flex: 1 }}>{tx.signature}</span>
							{copySuccess ? (
								<svg
									width={14}
									height={14}
									viewBox="0 0 24 24"
									fill="#0f0"
									xmlns="http://www.w3.org/2000/svg"
									style={{ flexShrink: 0 }}
								>
									<g><rect height="17.2363" opacity="0" width="17.1875" x="0" y="0"></rect><path d="M6.36719 17.2363C6.78711 17.2363 7.11914 17.0508 7.35352 16.6895L16.582 2.1582C16.7578 1.875 16.8262 1.66016 16.8262 1.43555C16.8262 0.898438 16.4746 0.546875 15.9375 0.546875C15.5469 0.546875 15.332 0.673828 15.0977 1.04492L6.32812 15.0195L1.77734 9.0625C1.5332 8.7207 1.28906 8.58398 0.9375 8.58398C0.380859 8.58398 0 8.96484 0 9.50195C0 9.72656 0.0976562 9.98047 0.283203 10.2148L5.35156 16.6699C5.64453 17.0508 5.94727 17.2363 6.36719 17.2363Z" fillOpacity="0.85"></path></g>
								</svg>
							) : (
								<svg
									width={14}
									height={14}
									viewBox="0 0 24 24"
									fill="rgba(255, 255, 255, 0.5)"
									xmlns="http://www.w3.org/2000/svg"
									style={{ flexShrink: 0 }}
								>
									<g><rect height="21.2019" opacity="0" width="18.9705" x="0" y="0"></rect><path d="M15.9159 11.1918L8.73817 18.3695C6.87294 20.2445 4.36317 20.059 2.76161 18.4379C1.15028 16.8363 0.964737 14.3461 2.82997 12.4711L12.6249 2.68593C13.7479 1.56288 15.3983 1.40663 16.4725 2.47109C17.537 3.55507 17.3808 5.1957 16.2675 6.31874L6.69716 15.8891C6.21864 16.3871 5.63271 16.2406 5.30067 15.9086C4.96864 15.5668 4.83192 15.0004 5.31044 14.5023L11.9999 7.83241C12.2929 7.52968 12.3124 7.09999 12.0292 6.81679C11.746 6.54335 11.3163 6.56288 11.0233 6.85585L4.31435 13.5648C3.31825 14.5609 3.35732 16.0844 4.23622 16.9633C5.19325 17.9203 6.63857 17.9008 7.64442 16.8949L17.2538 7.28554C19.08 5.45937 19.0018 3.05702 17.41 1.46523C15.8573-0.0875075 13.4159-0.204695 11.5897 1.62148L1.74599 11.475C-0.666122 13.8871-0.480575 17.3344 1.69716 19.5121C3.87489 21.6801 7.32216 21.8656 9.73427 19.4633L16.9608 12.2367C17.244 11.9535 17.244 11.4359 16.9511 11.1723C16.6679 10.8695 16.2089 10.9086 15.9159 11.1918Z" fillOpacity="0.85"></path></g>
								</svg>
							)}
						</div>
					</div>
					{/* Explorer Links */}
					<Divider />
					<div style={{ 
						fontSize: 10, 
						fontWeight: 600, 
						marginBottom: 8,
						opacity: 0.8
					}}>
						View on Explorer
					</div>
					<div
						style={{
							display: 'flex',
							gap: 6,
							flexWrap: 'wrap'
						}}
					>
						<ExplorerLink
							href={getSolanaExplorerUrl(tx.signature, { cluster: clusterName })}
							label="Solana Explorer"
						/>
						<ExplorerLink
							href={getSolscanUrl(tx.signature, { cluster: clusterName })}
							label="Solscan"
						/>
						<ExplorerLink
							href={getXrayUrl(tx.signature)}
							label="XRAY"
						/>
					</div>
					<Divider />

					{/* Transaction Details */}
					<div style={{ 
						display: 'grid', 
						gridTemplateColumns: '1fr 1fr',
						gap: 8,
						marginTop: 8
					}}>
						<DetailRow label="Status" value={tx.status.toUpperCase()} />
						<DetailRow label="Cluster" value={tx.cluster} />
						
						{tx.feePayer && (
							<DetailRow 
								label="Fee Payer" 
								value={<code style={{ fontSize: 9 }}>{formatSignature(tx.feePayer, 6)}</code>}
							/>
						)}
						
						<DetailRow 
							label="Timestamp" 
							value={new Date(tx.timestamp).toLocaleString()} 
						/>
					</div>

					{/* Metadata Section */}
					<>
						<Divider />
						<div style={{ 
							fontSize: 10, 
							fontWeight: 600, 
							marginBottom: 8,
							opacity: 0.8
						}}>
							Transaction Details
						</div>
						{hasMetadata ? (
							<div style={{ 
								display: 'grid', 
								gridTemplateColumns: '1fr 1fr',
								gap: 8
							}}>
								{metadata.fee !== undefined && (
									<DetailRow 
										label="Fee" 
										value={`${(metadata.fee / 1_000_000_000).toFixed(6)} SOL`} 
									/>
								)}
								{metadata.computeUnits !== undefined && (
									<DetailRow 
										label="Compute Units" 
										value={metadata.computeUnits.toLocaleString()} 
									/>
								)}
								{metadata.slot !== undefined && (
									<DetailRow 
										label="Slot" 
										value={metadata.slot.toLocaleString()} 
									/>
								)}
								{metadata.blockTime !== undefined && (
									<DetailRow 
										label="Block Time" 
										value={new Date(metadata.blockTime * 1000).toLocaleString()} 
									/>
								)}
								{metadata.numInstructions !== undefined && (
									<DetailRow 
										label="Instructions" 
										value={metadata.numInstructions} 
									/>
								)}
								{metadata.numSigners !== undefined && (
									<DetailRow 
										label="Signers" 
										value={metadata.numSigners} 
									/>
								)}
								{metadata.version !== undefined && (
									<DetailRow 
										label="Version" 
										value={metadata.version === 'legacy' ? 'Legacy' : `v${metadata.version}`} 
									/>
								)}
								{metadata.confirmationTime !== undefined && (
									<DetailRow 
										label="Confirmation Time" 
										value={`${metadata.confirmationTime}ms`} 
									/>
								)}
							</div>
						) : (
							<div style={{
								padding: '12px',
								backgroundColor: 'rgba(255, 255, 255, 0.02)',
								borderRadius: 6,
								border: '1px solid rgba(255, 255, 255, 0.05)',
								textAlign: 'center'
							}}>
								<div style={{ fontSize: 9, opacity: 0.5 }}>
									No additional transaction details available
								</div>
							</div>
						)}
					</>

					{/* Error Message */}
					{tx.error && (
						<>
							<Divider />
							<div
								style={{
									fontSize: 9,
									color: '#ff6b6b',
									padding: 8,
									backgroundColor: 'rgba(255, 107, 107, 0.1)',
									borderRadius: 6,
									border: '1px solid rgba(255, 107, 107, 0.3)',
									fontFamily: 'monospace',
									whiteSpace: 'pre-wrap',
									wordBreak: 'break-word'
								}}
							>
								<div style={{ fontWeight: 600, marginBottom: 4 }}>❌ Error</div>
								{tx.error}
							</div>
						</>
					)}

				</div>
			)}
		</div>
	)
}

function DetailRow({ 
	label, 
	value 
}: { 
	label: string
	value: React.ReactNode 
}) {
	return (
		<div style={{ fontSize: 10 }}>
			<div style={{ 
				opacity: 0.6, 
				fontSize: 9, 
				marginBottom: 2,
				textTransform: 'uppercase',
				letterSpacing: 0.5
			}}>
				{label}
			</div>
			<div style={{ fontWeight: 500 }}>
				{value}
			</div>
		</div>
	)
}

function Divider() {
	return (
		<div style={{ 
			borderTop: '1px solid rgba(255, 255, 255, 0.1)', 
			margin: '12px 0' 
		}} />
	)
}

function ExplorerLink({
	href,
	label
}: {
	href: string
	label: string
}) {
	const [isHovered, setIsHovered] = useState(false)
	
	return (
		<a
			href={href}
			target="_blank"
			rel="noopener noreferrer"
			style={{
				fontSize: 10,
				color: 'rgba(255, 255, 255, 0.9)',
				textDecoration: 'none',
				padding: '4px 10px',
				backgroundColor: isHovered 
					? 'rgba(255, 255, 255, 0.15)' 
					: 'rgba(255, 255, 255, 0.1)',
				borderRadius: 6,
				border: `1px solid ${isHovered ? 'rgba(255, 255, 255, 0.3)' : 'rgba(255, 255, 255, 0.2)'}`,
				transition: 'all 0.2s ease',
				display: 'inline-flex',
				alignItems: 'center',
				gap: 4,
				fontWeight: 500
			}}
			onMouseEnter={() => setIsHovered(true)}
			onMouseLeave={() => setIsHovered(false)}
		>
			{label}
			<ExternalLinkIcon size={10} color="rgba(255, 255, 255, 0.6)" />
		</a>
	)
}

