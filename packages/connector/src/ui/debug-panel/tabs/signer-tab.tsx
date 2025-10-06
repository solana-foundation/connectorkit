/**
 * @connector-kit/connector - Signer Tab Component
 */

'use client'

import { Section, Divider } from '../ui-components'

interface SignerTabProps {
	signer: any
	ready: boolean
	capabilities: {
		canSign: boolean
		canSend: boolean
		canSignMessage: boolean
		supportsBatchSigning: boolean
	}
	address: string | null
}

export function SignerTab({ signer, ready, capabilities, address }: SignerTabProps) {
	return (
		<div style={{ height: '100%', overflowY: 'auto' }}>
			<Section title="Status">
				<div style={{ fontSize: 12, fontWeight: 600, marginBottom: 4 }}>
					{ready ? (
						<span style={{ color: '#0f0' }}>✅ Ready</span>
					) : (
						<span style={{ color: '#f00' }}>❌ Not Available</span>
					)}
				</div>
				{address && (
					<div style={{ 
						fontFamily: 'monospace',
						fontSize: 10,
						opacity: 0.7
					}}>
						{address}
					</div>
				)}
			</Section>
			
			<Divider />
			
			<Section title="Capabilities">
				<div style={{ fontSize: 10, lineHeight: 1.8 }}>
					<div>{capabilities.canSign ? '✓' : '✗'} Sign Transactions</div>
					<div>{capabilities.canSend ? '✓' : '✗'} Send Transactions</div>
					<div>{capabilities.canSignMessage ? '✓' : '✗'} Sign Messages</div>
					<div>{capabilities.supportsBatchSigning ? '✓' : '✗'} Batch Signing</div>
				</div>
			</Section>
			
			{!ready && (
				<>
					<Divider />
					<div style={{ 
						padding: 8,
						backgroundColor: 'rgba(255, 165, 0, 0.1)',
						borderRadius: 4,
						border: '1px solid rgba(255, 165, 0, 0.3)',
						fontSize: 10
					}}>
						💡 Connect a wallet to enable transaction signing
					</div>
				</>
			)}
		</div>
	)
}

