/**
 * @connector-kit/connector - Wallet Tab Component
 */

'use client'

import { Section, Divider } from '../ui-components'

interface WalletTabProps {
	wallet: any
}

export function WalletTab({ wallet }: WalletTabProps) {
	if (!wallet) {
		return (
			<div style={{ textAlign: 'center', opacity: 0.5, padding: '40px 0', fontSize: 11 }}>
				No wallet connected
			</div>
		)
	}
	
	const features = wallet.features as any || {}
	const featureKeys = Object.keys(features)
	const standardFeatures = featureKeys.filter(k => k.startsWith('standard:'))
	const solanaFeatures = featureKeys.filter(k => k.startsWith('solana:'))
	const otherFeatures = featureKeys.filter(k => !k.includes(':'))
	
	return (
		<div style={{ height: '100%', overflowY: 'auto' }}>
			<Section title="Wallet Info">
				<div style={{ fontWeight: 600, marginBottom: 4 }}>{wallet.name}</div>
				{wallet.icon && (
					<img 
						src={wallet.icon} 
						alt={wallet.name}
						style={{ width: 32, height: 32, borderRadius: 6, marginTop: 4 }}
					/>
				)}
			</Section>
			
			<Divider />
			
			<Section title={`Standard Features (${standardFeatures.length})`}>
				{standardFeatures.length > 0 ? (
					<div style={{ fontSize: 10, lineHeight: 1.6 }}>
						{standardFeatures.map(f => (
							<div key={f}>✓ {f}</div>
						))}
					</div>
				) : (
					<div style={{ fontSize: 10, opacity: 0.5 }}>None</div>
				)}
			</Section>
			
			<Section title={`Solana Features (${solanaFeatures.length})`}>
				{solanaFeatures.length > 0 ? (
					<div style={{ fontSize: 10, lineHeight: 1.6 }}>
						{solanaFeatures.map(f => (
							<div key={f}>✓ {f}</div>
						))}
					</div>
				) : (
					<div style={{ fontSize: 10, opacity: 0.5 }}>None</div>
				)}
			</Section>
			
			{otherFeatures.length > 0 && (
				<Section title={`Other Features (${otherFeatures.length})`}>
					<div style={{ fontSize: 10, lineHeight: 1.6 }}>
						{otherFeatures.map(f => (
							<div key={f}>✓ {f}</div>
						))}
					</div>
				</Section>
			)}
			
			<Divider />
			
			<Section title={`Chains (${wallet.chains?.length || 0})`}>
				{wallet.chains && wallet.chains.length > 0 ? (
					<div style={{ fontSize: 10, lineHeight: 1.6 }}>
						{wallet.chains.map((c: string) => (
							<div key={c}>• {c}</div>
						))}
					</div>
				) : (
					<div style={{ fontSize: 10, opacity: 0.5 }}>None</div>
				)}
			</Section>
			
			<Section title={`Accounts (${wallet.accounts?.length || 0})`}>
				{wallet.accounts && wallet.accounts.length > 0 ? (
					<div style={{ fontSize: 10, lineHeight: 1.6 }}>
						{wallet.accounts.map((acc: any, i: number) => (
							<div key={i} style={{ marginBottom: 4 }}>
								<div style={{ fontFamily: 'monospace' }}>
									{acc.address?.slice(0, 8)}...{acc.address?.slice(-6)}
								</div>
								{acc.features && acc.features.length > 0 && (
									<div style={{ fontSize: 9, opacity: 0.6 }}>
										{acc.features.join(', ')}
									</div>
								)}
							</div>
						))}
					</div>
				) : (
					<div style={{ fontSize: 10, opacity: 0.5 }}>None</div>
				)}
			</Section>
		</div>
	)
}

