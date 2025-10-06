/**
 * @connector-kit/connector - Storage Tab Component
 */

'use client'

import { useState, useMemo } from 'react'
import { Section, Divider, Button } from '../ui-components'
import type { StorageAdapter } from '../../../lib/enhanced-storage'
import type { SolanaClusterId } from '@wallet-ui/core'

interface StorageTabProps {
	client: {
		walletStorage?: StorageAdapter<string | undefined>
		clusterStorage?: StorageAdapter<SolanaClusterId>
	}
	state: any
}

export function StorageTab({ client, state }: StorageTabProps) {
	const [lastClear, setLastClear] = useState<string | null>(null)
	
	// Try to get storage values
	const storedWallet = useMemo<string | null>(() => {
		try {
			const value = client.walletStorage?.get()
			return value ?? null
		} catch {
			return null
		}
	}, [client, lastClear])
	
	const storedCluster = useMemo<string | null>(() => {
		try {
			const value = client.clusterStorage?.get()
			return value ?? null
		} catch {
			return null
		}
	}, [client, lastClear])
	
	const handleClearWallet = () => {
		try {
			client.walletStorage?.set(undefined)
			setLastClear(Date.now().toString())
		} catch (error) {
			console.error('Failed to clear wallet storage:', error)
		}
	}
	
	const handleClearCluster = () => {
		try {
			client.clusterStorage?.set('solana:mainnet')
			setLastClear(Date.now().toString())
		} catch (error) {
			console.error('Failed to clear cluster storage:', error)
		}
	}
	
	const handleClearAll = () => {
		handleClearWallet()
		handleClearCluster()
	}
	
	return (
		<div style={{ height: '100%', overflowY: 'auto' }}>
			<Section title="Persisted State">
				<div style={{ fontSize: 11, lineHeight: 1.8 }}>
					<div>
						Wallet: {storedWallet ? (
							<span style={{ color: '#0f0', fontFamily: 'monospace' }}>"{storedWallet}" ✓</span>
						) : (
							<span style={{ opacity: 0.5 }}>None</span>
						)}
					</div>
					<div>
						Account: {state.selectedAccount ? (
							<span style={{ color: '#0f0', fontFamily: 'monospace', fontSize: 9 }}>
								{state.selectedAccount.length >= 14 
									? `${state.selectedAccount.slice(0, 8)}...${state.selectedAccount.slice(-6)}`
									: state.selectedAccount
								} ✓
							</span>
						) : (
							<span style={{ opacity: 0.5 }}>None</span>
						)}
					</div>
					<div>
						Cluster: {storedCluster ? (
							<span style={{ color: '#0f0', fontFamily: 'monospace' }}>"{storedCluster}" ✓</span>
						) : (
							<span style={{ opacity: 0.5 }}>None</span>
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
			
			<Divider />
			
			<div style={{ fontSize: 9, opacity: 0.5, textAlign: 'center' }}>
				💡 Clearing storage resets auto-connect behavior
			</div>
		</div>
	)
}

