import { getWalletsRegistry, type Wallet, type WalletAccount } from './wallet-standard-shim'
import type { SolanaCluster, SolanaClusterId } from '@wallet-ui/core'
import type { StorageAdapter } from './enhanced-storage'
import { Address, debug, Signature } from 'gill'
import type {
	StandardConnectFeature,
	StandardConnectMethod,
	StandardDisconnectFeature,
	StandardDisconnectMethod,
	StandardEventsFeature,
	StandardEventsOnMethod
} from '@wallet-standard/features'

// ============================================================================
// Type-safe feature accessors
// ============================================================================

/**
 * Type-safe accessor for standard:connect feature
 */
function getConnectFeature(wallet: Wallet): StandardConnectMethod | null {
	const feature = wallet.features['standard:connect'] as StandardConnectFeature['standard:connect'] | undefined
	return feature?.connect ?? null
}

/**
 * Type-safe accessor for standard:disconnect feature
 */
function getDisconnectFeature(wallet: Wallet): StandardDisconnectMethod | null {
	const feature = wallet.features['standard:disconnect'] as StandardDisconnectFeature['standard:disconnect'] | undefined
	return feature?.disconnect ?? null
}

/**
 * Type-safe accessor for standard:events feature
 */
function getEventsFeature(wallet: Wallet): StandardEventsOnMethod | null {
	const feature = wallet.features['standard:events'] as StandardEventsFeature['standard:events'] | undefined
	return feature?.on ?? null
}

/**
 * Check if wallet has a specific feature
 */
function hasFeature(wallet: Wallet, featureName: string): boolean {
	return featureName in wallet.features && (wallet.features as Record<string, unknown>)[featureName] !== undefined
}

export interface WalletInfo {
	wallet: Wallet
	installed: boolean
	/** Precomputed capability flag for UI convenience */
	connectable?: boolean
}

export interface AccountInfo {
	address: Address
	icon?: string
	raw: WalletAccount
}

/**
 * Health check information for connector diagnostics
 * Useful for debugging, monitoring, and support
 */
export interface ConnectorHealth {
	/** Whether the connector has been initialized */
	initialized: boolean
	/** Whether Wallet Standard registry is available */
	walletStandardAvailable: boolean
	/** Whether localStorage/storage is available */
	storageAvailable: boolean
	/** Number of wallets currently detected */
	walletsDetected: number
	/** List of errors encountered during initialization or operation */
	errors: string[]
	/** Current connection state */
	connectionState: {
		connected: boolean
		connecting: boolean
		hasSelectedWallet: boolean
		hasSelectedAccount: boolean
	}
	/** Timestamp of health check */
	timestamp: string
}

/**
 * Performance and debug metrics for monitoring
 * Useful for identifying performance issues and optimization opportunities
 */
export interface ConnectorDebugMetrics {
	/** Total number of state updates that resulted in actual changes */
	stateUpdates: number
	/** Number of state updates that were skipped (no changes detected) */
	noopUpdates: number
	/** Percentage of updates that were optimized away */
	optimizationRate: number
	/** Number of active event listeners */
	eventListenerCount: number
	/** Number of state subscribers */
	subscriptionCount: number
	/** Average time taken for state updates (in milliseconds) */
	avgUpdateTimeMs: number
	/** Timestamp of last state update */
	lastUpdateTime: number
}

/**
 * Transaction activity record for debugging and monitoring
 */
export interface TransactionActivity {
	/** Transaction signature */
	signature: Signature
	/** When the transaction was sent */
	timestamp: string
	/** Transaction status */
	status: 'pending' | 'confirmed' | 'failed'
	/** Error message if failed */
	error?: string
	/** Cluster where transaction was sent */
	cluster: string
	/** Fee payer address */
	feePayer?: Address
	/** Method used (signAndSendTransaction, sendTransaction, etc) */
	method: string
	/** Additional metadata */
	metadata?: Record<string, any>
}

/**
 * Debug state with transaction history
 */
export interface ConnectorDebugState extends ConnectorDebugMetrics {
	/** Recent transaction activity (limited by maxTransactions) */
	transactions: TransactionActivity[]
	/** Total transactions tracked in this session */
	totalTransactions: number
}

/**
 * Event types emitted by the connector
 * Use these for analytics, logging, and custom behavior
 */
export type ConnectorEvent =
	| { type: 'wallet:connected'; wallet: string; account: string; timestamp: string }
	| { type: 'wallet:disconnected'; timestamp: string }
	| { type: 'wallet:changed'; wallet: string; timestamp: string }
	| { type: 'account:changed'; account: string; timestamp: string }
	| { type: 'cluster:changed'; cluster: string; previousCluster: string | null; timestamp: string }
	| { type: 'wallets:detected'; count: number; timestamp: string }
	| { type: 'error'; error: Error; context: string; timestamp: string }
	| { type: 'connecting'; wallet: string; timestamp: string }
	| { type: 'connection:failed'; wallet: string; error: string; timestamp: string }
	| { type: 'transaction:tracked'; signature: string; status: TransactionActivity['status']; timestamp: string }
	| { type: 'transaction:updated'; signature: string; status: TransactionActivity['status']; timestamp: string }

/**
 * Event listener function type
 */
export type ConnectorEventListener = (event: ConnectorEvent) => void


export interface ConnectorState {
	wallets: WalletInfo[]
	selectedWallet: Wallet | null
	connected: boolean
	connecting: boolean
	accounts: AccountInfo[]
	selectedAccount: string | null
	cluster: SolanaCluster | null
	clusters: SolanaCluster[]
}

type Listener = (s: ConnectorState) => void

export interface ConnectorConfig {
	autoConnect?: boolean
	debug?: boolean
	/** Storage configuration using enhanced storage adapters */
	storage?: {
				account: StorageAdapter<string | undefined>
				cluster: StorageAdapter<SolanaClusterId>
				wallet: StorageAdapter<string | undefined>
		  }
	
	/** Enhanced cluster configuration using wallet-ui */
	cluster?: {
		clusters?: SolanaCluster[]
		persistSelection?: boolean
		initialCluster?: SolanaClusterId
	}
}


export class ConnectorClient {
	private state: ConnectorState
	private listeners = new Set<Listener>()
	private eventListeners = new Set<ConnectorEventListener>()
	private unsubscribers: Array<() => void> = []
	private walletChangeUnsub: (() => void) | null = null
	private pollTimer: ReturnType<typeof setInterval> | null = null
	private walletStorage?: StorageAdapter<string | undefined>
	private clusterStorage?: StorageAdapter<SolanaClusterId>
	
	// Debug metrics tracking
	private debugMetrics = {
		stateUpdates: 0,
		noopUpdates: 0,
		updateTimes: [] as number[],
		lastUpdateTime: 0
	}

	// Transaction tracking
	private transactions: TransactionActivity[] = []
	private totalTransactions = 0
	private maxTransactions = 20 // Keep last 20 transactions

	// ============================================================================
	// Helper Methods
	// ============================================================================

	/**
	 * Optimized state update with structural sharing
	 * Only updates if values actually changed
	 * 
	 * This prevents unnecessary React re-renders by using deep equality checks
	 * for arrays and objects, and only updating state when values truly differ.
	 */
	private updateState(updates: Partial<ConnectorState>, immediate = false): void {
		const startTime = performance.now()
		let hasChanges = false
		const nextState = { ...this.state }
		
		for (const [key, value] of Object.entries(updates)) {
			const stateKey = key as keyof ConnectorState
			const currentValue = nextState[stateKey]

			// Array comparison (wallets, accounts, clusters)
			if (Array.isArray(value) && Array.isArray(currentValue)) {
				// Use type assertion for array comparison since we have mixed array types
				if (!this.arraysEqual(value as readonly unknown[], currentValue as readonly unknown[])) {
					// Type assertion needed for dynamic key assignment
					(nextState as any)[stateKey] = value
					hasChanges = true
				}
			}
			// Object comparison (wallet, cluster)
			else if (
				value &&
				typeof value === 'object' &&
				currentValue &&
				typeof currentValue === 'object'
			) {
				if (!this.objectsEqual(value, currentValue)) {
					// Type assertion needed for dynamic key assignment
					(nextState as any)[stateKey] = value
					hasChanges = true
				}
			}
			// Primitive comparison (strings, booleans, numbers)
			else if (currentValue !== value) {
				// Type assertion needed for dynamic key assignment
				(nextState as any)[stateKey] = value
				hasChanges = true
			}
		}
		
		// Track metrics
		const updateTime = performance.now() - startTime
		this.debugMetrics.updateTimes.push(updateTime)
		// Keep last 100 update times for average calculation
		if (this.debugMetrics.updateTimes.length > 100) {
			this.debugMetrics.updateTimes.shift()
		}
		this.debugMetrics.lastUpdateTime = Date.now()
		
		// Only update state and notify if there are actual changes
		if (hasChanges) {
			this.debugMetrics.stateUpdates++
			this.state = nextState
			
			// Log state changes in debug mode
			if (this.config.debug) {
				console.log('[Connector] State updated:', Object.keys(updates).join(', '))
			}
			
			if (immediate) {
				this.notifyImmediate()
			} else {
				this.notify()
			}
		} else {
			this.debugMetrics.noopUpdates++
			
			if (this.config.debug) {
				// Debug logging for no-op updates
				console.log('[Connector] State update skipped (no changes):', Object.keys(updates).join(', '))
			}
		}
	}

	/**
	 * Fast array equality check for wallet/account arrays
	 */
	private arraysEqual<T>(a: readonly T[], b: readonly T[]): boolean {
		if (a.length !== b.length) return false

		// For wallet arrays, compare by name
		if (a[0] && typeof a[0] === 'object' && 'name' in a[0] && b[0] && typeof b[0] === 'object' && 'name' in b[0]) {
			return a.every((item, i) => {
				const aItem = item as { name: string }
				const bItem = b[i] as { name: string }
				return aItem.name === bItem?.name
			})
		}

		// For account arrays, compare by address
		if (a[0] && typeof a[0] === 'object' && 'address' in a[0] && b[0] && typeof b[0] === 'object' && 'address' in b[0]) {
			return a.every((item, i) => {
				const aItem = item as { address: string }
				const bItem = b[i] as { address: string }
				return aItem.address === bItem?.address
			})
		}

		// Fallback to reference equality
		return a === b
	}

	/**
	 * Deep equality check for objects
	 * Used to prevent unnecessary state updates when object contents haven't changed
	 */
	private objectsEqual(a: unknown, b: unknown): boolean {
		// Reference equality (fast path)
		if (a === b) return true

		// Null/undefined checks
		if (!a || !b) return false
		if (typeof a !== 'object' || typeof b !== 'object') return false

		// Get keys
		const keysA = Object.keys(a)
		const keysB = Object.keys(b)

		// Different number of keys
		if (keysA.length !== keysB.length) return false

		// Compare each key's value (shallow comparison for nested objects)
		return keysA.every(key => (a as Record<string, unknown>)[key] === (b as Record<string, unknown>)[key])
	}

	/**
	 * Convert a Wallet Standard wallet to WalletInfo with capability checks
	 */
	private mapToWalletInfo(wallet: Wallet): WalletInfo {
		const hasConnect = hasFeature(wallet, 'standard:connect')
		const hasDisconnect = hasFeature(wallet, 'standard:disconnect')
		const isSolana = Array.isArray(wallet.chains) && wallet.chains.some(c => typeof c === 'string' && c.includes('solana'))
		const connectable = hasConnect && hasDisconnect && isSolana

		return {
			wallet,
			installed: true,
			connectable
		} satisfies WalletInfo
	}

	/**
	 * Deduplicate wallets by name (keeps first occurrence)
	 * Optimized: O(n) complexity using Map
	 */
	private deduplicateWallets(wallets: readonly Wallet[]): Wallet[] {
		const seen = new Map<string, Wallet>()
		for (const wallet of wallets) {
			if (!seen.has(wallet.name)) {
				seen.set(wallet.name, wallet)
			}
		}
		return Array.from(seen.values())
	}

	/**
	 * Convert wallet account to AccountInfo
	 */
	private toAccountInfo(account: WalletAccount): AccountInfo {
		return {
			address: account.address as Address,
			icon: account.icon,
			raw: account
		}
	}

	// ============================================================================
	// Constructor & Initialization
	// ============================================================================

	constructor(private config: ConnectorConfig = {}) {
		const clusterConfig = config.cluster
		const clusters = clusterConfig?.clusters ?? []
		
		// Set up storage adapters
		if (this.config.storage) {
			this.walletStorage = this.config.storage.wallet
			this.clusterStorage = this.config.storage.cluster
		}
		
		// Determine initial cluster from storage or config
		const storedClusterId = this.clusterStorage?.get()
		const initialClusterId = storedClusterId ?? clusterConfig?.initialCluster ?? 'solana:mainnet'
		const initialCluster = clusters.find(c => c.id === initialClusterId) ?? clusters[0] ?? null
		
		this.state = {
			wallets: [],
			selectedWallet: null,
			connected: false,
			connecting: false,
			accounts: [],
			selectedAccount: null,
			cluster: initialCluster,
			clusters,
		}
		
		this.initialize()
	}

	/** Helper: Get wallet name from storage */
	private getStoredWallet(): string | null {
		return this.walletStorage?.get() ?? null
	}

	/** Helper: Save wallet name to storage */
	private setStoredWallet(walletName: string): void {
		this.walletStorage?.set(walletName)
	}

	/** Helper: Remove wallet name from storage */
	private removeStoredWallet(): void {
		this.walletStorage?.set(undefined)
	}

	/**
	 * Check if a specific wallet is available immediately via direct window object detection
	 * This enables instant reconnection without waiting for wallet standard
	 */
	private isWalletAvailableDirectly(walletName: string): any {
		if (typeof window === 'undefined') return null
		
		const name = walletName.toLowerCase()
		
		// Check common wallet injection patterns
		const checks = [
			() => (window as any)[name],           // window.phantom, window.backpack
			() => (window as any)[`${name}Wallet`], // window.phantomWallet
			() => (window as any).solana,          // Legacy Phantom injection
			() => {
				// Check for wallet in window keys
				const keys = Object.keys(window).filter(k => k.toLowerCase().includes(name))
				return keys.length > 0 ? (window as any)[keys[0]] : null
			}
		]
		
		for (const check of checks) {
			try {
				const result = check()
				if (result && typeof result === 'object') {
					// Verify it looks like a wallet (has standard methods or legacy methods)
					const hasStandardConnect = result.features?.['standard:connect']
					const hasLegacyConnect = typeof result.connect === 'function'
					if (hasStandardConnect || hasLegacyConnect) {
						return result
					}
				}
			} catch (e) {
				continue
			}
		}
		
		return null
	}

	/**
	 * Attempt instant auto-connection using direct wallet detection
	 * This bypasses wallet standard initialization for maximum speed
	 */
	private async attemptInstantAutoConnect(): Promise<boolean> {
		const storedWalletName = this.getStoredWallet()
		if (!storedWalletName) return false
		
		const directWallet = this.isWalletAvailableDirectly(storedWalletName)
		if (!directWallet) return false
		
		if (this.config.debug) {
			console.log('⚡ Instant auto-connect: found', storedWalletName, 'directly in window')
		}
		
		try {
			// Create proper features object for direct wallet
			const features: any = {}
			
			// Map direct wallet methods to wallet standard features
			if (directWallet.connect) {
				features['standard:connect'] = {
					connect: async (options: any = {}) => {
						// Try connection
						const result = await directWallet.connect(options)
						
						if (this.config.debug) {
							console.log('🔍 Direct wallet connect result:', result)
							console.log('🔍 Direct wallet publicKey property:', directWallet.publicKey)
						}
						
						// Strategy 1: Check if result has proper wallet standard format
						if (result && result.accounts && Array.isArray(result.accounts)) {
							return result // Already wallet standard format
						}
						
						// Strategy 2: Check if result has legacy publicKey format  
						if (result && result.publicKey && typeof result.publicKey.toString === 'function') {
							return {
								accounts: [{
									address: result.publicKey.toString(),
									publicKey: result.publicKey.toBytes ? result.publicKey.toBytes() : new Uint8Array(),
									chains: ['solana:mainnet', 'solana:devnet', 'solana:testnet'],
									features: []
								}]
							}
						}
						
						// Strategy 3: Legacy wallet pattern - publicKey on wallet object (Solflare, etc.)
						if (directWallet.publicKey && typeof directWallet.publicKey.toString === 'function') {
							const address = directWallet.publicKey.toString()
							if (this.config.debug) {
								console.log('🔧 Using legacy wallet pattern - publicKey from wallet object')
							}
							return {
								accounts: [{
									address,
									publicKey: directWallet.publicKey.toBytes ? directWallet.publicKey.toBytes() : new Uint8Array(),
									chains: ['solana:mainnet', 'solana:devnet', 'solana:testnet'],
									features: []
								}]
							}
						}
						
						// Strategy 4: Check if result itself is a publicKey
						if (result && typeof result.toString === 'function' && result.toString().length > 30) {
							return {
								accounts: [{
									address: result.toString(),
									publicKey: result.toBytes ? result.toBytes() : new Uint8Array(),
									chains: ['solana:mainnet', 'solana:devnet', 'solana:testnet'],
									features: []
								}]
							}
						}
						
						// No valid account found
						if (this.config.debug) {
							console.error('❌ Legacy wallet: No valid publicKey found in any expected location')
						}
						return { accounts: [] }
					}
				}
			}
			if (directWallet.disconnect) {
				features['standard:disconnect'] = {
					disconnect: directWallet.disconnect.bind(directWallet)
				}
			}
			if (directWallet.signTransaction) {
				features['standard:signTransaction'] = {
					signTransaction: directWallet.signTransaction.bind(directWallet)
				}
			}
			if (directWallet.signMessage) {
				features['standard:signMessage'] = {
					signMessage: directWallet.signMessage.bind(directWallet)
				}
			}
			
			// If wallet already has proper features, use them
			if (directWallet.features) {
				Object.assign(features, directWallet.features)
			}
			
			// Create a minimal wallet object for immediate connection
			// Check multiple common icon property locations
			const walletIcon = directWallet.icon || 
							  directWallet._metadata?.icon ||
							  directWallet.adapter?.icon ||
							  directWallet.metadata?.icon ||
							  (directWallet as any).iconUrl ||
							  undefined
			
			const wallet: Wallet = {
				version: '1.0.0' as const,
				name: storedWalletName,
				icon: walletIcon,
				chains: directWallet.chains || ['solana:mainnet', 'solana:devnet', 'solana:testnet'],
				features,
				accounts: directWallet.accounts || []
			}
			
			// Add to state immediately for instant UI feedback
			this.updateState({
				wallets: [{
					wallet,
					installed: true,
					connectable: true
				}]
			}, true) // Use immediate notification
			
			// Connect immediately
			if (this.config.debug) {
				console.log('🔄 Attempting to connect to', storedWalletName, 'via instant auto-connect')
			}
			
			await this.select(storedWalletName)
			
			if (this.config.debug) {
				console.log('✅ Instant auto-connect successful for', storedWalletName)
			}
			
			// Force wallet list update after successful connection to get proper icons
			setTimeout(() => {
				const walletsApi = getWalletsRegistry()
				const ws = walletsApi.get()
				
				if (this.config.debug) {
					console.log('🔍 Checking for wallet standard update:', {
						wsLength: ws.length,
						currentWalletsLength: this.state.wallets.length,
						shouldUpdate: ws.length > 1
					})
				}
				
			if (ws.length > 1) { // Only update if we have more wallets than just our connected one
				const unique = this.deduplicateWallets(ws)
				this.updateState({
					wallets: unique.map(w => this.mapToWalletInfo(w))
				})
				
				console.log('🎨 Updated wallet list after instant connection, now have', this.state.wallets.length, 'wallets with icons')
			} else {
				console.log('⚠️ Wallet standard not ready yet, wallet list not updated')
			}
			}, 500) // Faster icon update
			
			return true
			
		} catch (error) {
			if (this.config.debug) {
				console.error('❌ Instant auto-connect failed for', storedWalletName + ':', error instanceof Error ? error.message : error)
			}
			return false
		}
	}

	private initialized = false
	
	private initialize() {
		if (typeof window === 'undefined') return
		// Prevent double initialization
		if (this.initialized) return
		this.initialized = true
		
		try {
			// Try instant auto-connect FIRST (for reconnection speed)
			// But delay slightly to avoid hydration mismatch
			if (this.config.autoConnect) {
				setTimeout(() => {
					this.attemptInstantAutoConnect().then(success => {
						if (!success) {
							// Fallback to standard detection if instant connection failed
							setTimeout(() => this.attemptAutoConnect(), 200)
						}
					})
				}, 100) // Small delay to avoid hydration issues
			}
			
		const walletsApi = getWalletsRegistry()
		const update = () => {
			const ws = walletsApi.get()
			const previousCount = this.state.wallets.length
			const newCount = ws.length
			
			if (this.config.debug && newCount !== previousCount) {
				console.log('🔍 ConnectorClient: found wallets:', newCount)
			}
			
			const unique = this.deduplicateWallets(ws)
			
			// Update wallet list for UI, but don't interfere with connection state
			// This ensures the connect button has access to wallet icons
			this.updateState({
				wallets: unique.map(w => this.mapToWalletInfo(w))
			})
			
			// Emit wallet detection event if count changed
			if (newCount !== previousCount && newCount > 0) {
				this.emit({
					type: 'wallets:detected',
					count: newCount,
					timestamp: new Date().toISOString()
				})
			}
		}
			
			// Initial update for wallet discovery
			update()
			
			// Subscribe to wallet changes for discovery (not critical for reconnection)
			this.unsubscribers.push(walletsApi.on('register', update))
			this.unsubscribers.push(walletsApi.on('unregister', update))
			
			// Minimal wallet discovery - only if instant connection failed
			if (!this.state.connected) {
				setTimeout(() => {
					if (!this.state.connected) {
					update()
				}
				}, 1000)
			}
		} catch (e) {
			// Init failed silently
		}
	}

	private async attemptAutoConnect() {
		try {
			// Skip if already connected (e.g., via instant auto-connect)
			if (this.state.connected) {
				if (this.config.debug) {
					console.log('🔄 Auto-connect: Already connected, skipping fallback auto-connect')
				}
				return
			}
			
			const last = this.getStoredWallet()
			if (this.config.debug) {
				console.log('🔄 Auto-connect: stored wallet =', last)
				console.log('🔄 Auto-connect: available wallets =', this.state.wallets.map(w => w.wallet.name))
			}
			if (!last) return
			
			const walletFound = this.state.wallets.some(w => w.wallet.name === last)
			if (walletFound) {
				if (this.config.debug) {
					console.log('✅ Auto-connect: Found stored wallet, connecting')
				}
				await this.select(last)
			} else {
				// Single shorter retry - wallets usually register within 1-2 seconds
				setTimeout(() => {
					if (this.state.wallets.some(w => w.wallet.name === last)) {
						if (this.config.debug) {
							console.log('✅ Auto-connect: Retry successful')
						}
						this.select(last).catch(console.error)
					}
				}, 1000) // Reduced from 2000ms to 1000ms
			}
		} catch (e) {
			if (this.config.debug) {
				console.error('❌ Auto-connect failed:', e)
			}
			this.removeStoredWallet()
		}
	}

	subscribe(l: Listener) {
		this.listeners.add(l)
		return () => this.listeners.delete(l)
	}

	getSnapshot(): ConnectorState {
		return this.state
	}

	private notifyTimeout?: ReturnType<typeof setTimeout>

	private notify() {
		// Debounce notifications to reduce React re-renders
		if (this.notifyTimeout) {
			clearTimeout(this.notifyTimeout)
		}
		
		this.notifyTimeout = setTimeout(() => {
			this.listeners.forEach(l => l(this.state))
			this.notifyTimeout = undefined
		}, 16) // One frame delay - smooth but responsive
	}
	
	private notifyImmediate() {
		// For critical updates that need immediate notification
		if (this.notifyTimeout) {
			clearTimeout(this.notifyTimeout)
			this.notifyTimeout = undefined
		}
		this.listeners.forEach(l => l(this.state))
	}

	private startPollingWalletAccounts() {
		if (this.pollTimer) return
		const wallet = this.state.selectedWallet
		if (!wallet) return

		// Simple polling - don't mess with account selection if we have one
		this.pollTimer = setInterval(() => {
			try {
				const walletAccounts = wallet.accounts
				const nextAccounts = walletAccounts.map(a => this.toAccountInfo(a))

				// Only update if we don't have accounts yet or they actually changed
				if (this.state.accounts.length === 0 && nextAccounts.length > 0) {
					this.updateState({
						accounts: nextAccounts,
						selectedAccount: this.state.selectedAccount || nextAccounts[0]?.address || null
					})
				}
			} catch (error) {
				// Error during account polling - ignore
			}
		}, 3000) // Less frequent polling
	}

	private stopPollingWalletAccounts() {
		if (this.pollTimer) {
			clearInterval(this.pollTimer)
			this.pollTimer = null
		}
	}

	private subscribeToWalletEvents() {
		// Cleanup existing subscription if present
		if (this.walletChangeUnsub) {
			try { this.walletChangeUnsub() } catch {}
			this.walletChangeUnsub = null
		}
		this.stopPollingWalletAccounts()

		const wallet = this.state.selectedWallet
		if (!wallet) return

		// Check if wallet supports standard:events feature
		const eventsOn = getEventsFeature(wallet)
		if (!eventsOn) {
			// Fallback: start polling wallet.accounts when events are not available
			this.startPollingWalletAccounts()
			return
		}

		try {
			// Subscribe to change events - but don't interfere with account selection
			this.walletChangeUnsub = eventsOn('change', (properties) => {
				// Only handle actual account changes, not selection changes
				const changeAccounts = properties?.accounts ?? []
				if (changeAccounts.length === 0) return

				const nextAccounts = changeAccounts.map(a => this.toAccountInfo(a))

				// Only update accounts, preserve selected account
				if (nextAccounts.length > 0) {
					this.updateState({
						accounts: nextAccounts
					})
				}
			})
		} catch (error) {
			// Failed to subscribe to wallet events
			// Fallback to polling when event subscription fails
			this.startPollingWalletAccounts()
		}
	}

	async select(walletName: string): Promise<void> {
		if (typeof window === 'undefined') return
		const w = this.state.wallets.find(x => x.wallet.name === walletName)
		if (!w) throw new Error(`Wallet ${walletName} not found`)
		
		// Emit connecting event
		this.emit({
			type: 'connecting',
			wallet: walletName,
			timestamp: new Date().toISOString()
		})
		
		this.updateState({ connecting: true }, true) // Critical UI state - notify immediately
		try {
			const connect = getConnectFeature(w.wallet)
			if (!connect) throw new Error(`Wallet ${walletName} does not support standard connect`)

			// Force non-silent connection to ensure wallet prompts for account selection
			const result = await connect({ silent: false })

			// Aggregate accounts from result and wallet.accounts (some wallets only return the selected account)
			const walletAccounts = w.wallet.accounts
			const accountMap = new Map<string, WalletAccount>()
			for (const a of [...walletAccounts, ...result.accounts]) accountMap.set(a.address, a)
			const accounts = Array.from(accountMap.values()).map(a => this.toAccountInfo(a))
				// Prefer a never-before-seen account when reconnecting; otherwise preserve selection
				const previouslySelected = this.state.selectedAccount
				const previousAddresses = new Set(this.state.accounts.map(a => a.address))
				const firstNew = accounts.find(a => !previousAddresses.has(a.address))
				const selected = firstNew?.address ?? previouslySelected ?? accounts[0]?.address ?? null
			
			// Successfully connected to wallet
			this.updateState({
				selectedWallet: w.wallet,
				connected: true,
				connecting: false,
				accounts,
				selectedAccount: selected,
			}, true) // Critical state change - notify immediately
			
			if (this.config.debug) {
				console.log('✅ Connection successful - state updated:', {
					connected: this.state.connected,
					selectedWallet: this.state.selectedWallet?.name,
					selectedAccount: this.state.selectedAccount,
					accountsCount: this.state.accounts.length
				})
			}
			
			// Emit connection success event
			this.emit({
				type: 'wallet:connected',
				wallet: walletName,
				account: this.state.selectedAccount || '',
				timestamp: new Date().toISOString()
			})
			
			this.setStoredWallet(walletName)
			// Subscribe to wallet change events (or start polling if unavailable)
			this.subscribeToWalletEvents()
		} catch (e) {
			const errorMessage = e instanceof Error ? e.message : String(e)
			
			// Emit connection failure event
			this.emit({
				type: 'connection:failed',
				wallet: walletName,
				error: errorMessage,
				timestamp: new Date().toISOString()
			})
			
			// Also emit generic error event
			this.emit({
				type: 'error',
				error: e instanceof Error ? e : new Error(errorMessage),
				context: 'wallet-connection',
				timestamp: new Date().toISOString()
			})
			this.updateState({
				selectedWallet: null,
				connected: false,
				connecting: false,
				accounts: [],
				selectedAccount: null
			}, true) // Critical error state - notify immediately
			throw e
		}
	}

	async disconnect(): Promise<void> {
		// Cleanup wallet event listener
		if (this.walletChangeUnsub) {
			try { this.walletChangeUnsub() } catch {}
			this.walletChangeUnsub = null
		}
		this.stopPollingWalletAccounts()

		// Call wallet's disconnect feature if available
		const wallet = this.state.selectedWallet
		if (wallet) {
			const disconnect = getDisconnectFeature(wallet)
			if (disconnect) {
				try {
					await disconnect()
					// Called wallet disconnect feature
				} catch (error) {
					// Wallet disconnect failed
				}
			}
		}

		this.updateState({
			selectedWallet: null,
			connected: false,
			accounts: [],
			selectedAccount: null
		}, true) // Critical state change - notify immediately
		
		// Emit disconnection event
		this.emit({
			type: 'wallet:disconnected',
			timestamp: new Date().toISOString()
		})
		
		this.removeStoredWallet()
		
		// Force wallet discovery after disconnect to show available wallets
		setTimeout(() => {
			if (!this.state.connected) {
			// Re-run wallet discovery
			const walletsApi = getWalletsRegistry()
			const ws = walletsApi.get()
			if (ws.length > 0) {
				const unique = this.deduplicateWallets(ws)
				this.updateState({
					wallets: unique.map(w => this.mapToWalletInfo(w))
				})
			}
			}
		}, 100)
	}

	async selectAccount(address: string): Promise<void> {
		const current = this.state.selectedWallet
		if (!current) throw new Error('No wallet connected')
		let target = this.state.accounts.find((acc: AccountInfo) => acc.address === address)?.raw ?? null
		if (!target) {
			try {
				const connect = getConnectFeature(current)
				if (connect) {
					const res = await connect()
					const accounts = res.accounts.map((a) => this.toAccountInfo(a))
					target = accounts.find((acc: AccountInfo) => acc.address === address)?.raw ?? res.accounts[0]
					this.updateState({ accounts })
				}
			} catch (error) {
				// Failed to reconnect for account selection
				throw new Error('Failed to reconnect wallet for account selection')
			}
		}
		if (!target) throw new Error('Requested account not available')
		this.updateState({ selectedAccount: target.address as string })
	}


	// Cleanup any resources (event listeners, timers) created by this client
	destroy(): void {
		// Unsubscribe wallet change listener
		if (this.walletChangeUnsub) {
			try { this.walletChangeUnsub() } catch {}
			this.walletChangeUnsub = null
		}
		// Stop any polling timers
		this.stopPollingWalletAccounts()
		// Unsubscribe from wallets API events
		for (const unsubscribe of this.unsubscribers) {
			try { unsubscribe() } catch {}
		}
		this.unsubscribers = []
		// Clear external store listeners
		this.listeners.clear()
		// Connector destroyed
	}

	/**
	 * Set the active cluster (network)
	 */
	async setCluster(clusterId: SolanaClusterId): Promise<void> {
		const previousClusterId = this.state.cluster?.id || null
		const cluster = this.state.clusters.find(c => c.id === clusterId)
		if (!cluster) {
			throw new Error(`Cluster ${clusterId} not found. Available clusters: ${this.state.clusters.map(c => c.id).join(', ')}`)
		}
		
		this.updateState({ cluster }, true) // Critical state change - notify immediately
		
		// Persist cluster selection if storage is configured
		if (this.clusterStorage) {
			this.clusterStorage.set(clusterId)
		}
		
		// Emit cluster change event (only if actually changed)
		if (previousClusterId !== clusterId) {
			this.emit({
				type: 'cluster:changed',
				cluster: clusterId,
				previousCluster: previousClusterId,
				timestamp: new Date().toISOString()
			})
		}
		
		if (this.config.debug) {
			console.log('🌐 Cluster changed:', { from: previousClusterId, to: clusterId })
		}
	}

	/**
	 * Get the currently active cluster
	 */
	getCluster(): SolanaCluster | null {
		return this.state.cluster
	}

	/**
	 * Get all available clusters
	 */
	getClusters(): SolanaCluster[] {
		return this.state.clusters
	}

	/**
	 * Check connector health and availability
	 * Provides comprehensive diagnostics for debugging and monitoring
	 * 
	 * @returns ConnectorHealth object with detailed status information
	 * 
	 * @example
	 * ```ts
	 * const client = new ConnectorClient(config)
	 * const health = client.getHealth()
	 * 
	 * if (!health.walletStandardAvailable) {
	 *   console.error('Wallet Standard not available - wallets cannot be detected')
	 * }
	 * 
	 * if (health.errors.length > 0) {
	 *   console.error('Connector errors:', health.errors)
	 * }
	 * ```
	 */
	getHealth(): ConnectorHealth {
		const errors: string[] = []
		
		// Check Wallet Standard availability
		let walletStandardAvailable = false
		try {
			const registry = getWalletsRegistry()
			walletStandardAvailable = Boolean(registry && typeof registry.get === 'function')
			
			if (!walletStandardAvailable) {
				errors.push('Wallet Standard registry not properly initialized')
			}
		} catch (error) {
			errors.push(`Wallet Standard error: ${error instanceof Error ? error.message : 'Unknown error'}`)
			walletStandardAvailable = false
		}
		
		// Check storage availability
		let storageAvailable = false
		try {
			// Check if storage adapters are configured
			if (!this.walletStorage || !this.clusterStorage) {
				errors.push('Storage adapters not configured')
				storageAvailable = false
			} else {
				// Check if the storage adapters have isAvailable method (EnhancedStorage)
				if ('isAvailable' in this.walletStorage && typeof this.walletStorage.isAvailable === 'function') {
					storageAvailable = this.walletStorage.isAvailable()
				} else if (typeof window !== 'undefined') {
					// Fallback: check localStorage availability
					try {
						const testKey = '__connector_storage_test__'
						window.localStorage.setItem(testKey, 'test')
						window.localStorage.removeItem(testKey)
						storageAvailable = true
					} catch {
						storageAvailable = false
					}
				}
				
				if (!storageAvailable) {
					errors.push('localStorage unavailable (private browsing mode or quota exceeded)')
				}
			}
		} catch (error) {
			errors.push(`Storage error: ${error instanceof Error ? error.message : 'Unknown error'}`)
			storageAvailable = false
		}
		
		// Validate connection state consistency
		if (this.state.connected && !this.state.selectedWallet) {
			errors.push('Inconsistent state: marked as connected but no wallet selected')
		}
		
		if (this.state.connected && !this.state.selectedAccount) {
			errors.push('Inconsistent state: marked as connected but no account selected')
		}
		
		if (this.state.connecting && this.state.connected) {
			errors.push('Inconsistent state: both connecting and connected flags are true')
		}
		
		return {
			initialized: this.initialized,
			walletStandardAvailable,
			storageAvailable,
			walletsDetected: this.state.wallets.length,
			errors,
			connectionState: {
				connected: this.state.connected,
				connecting: this.state.connecting,
				hasSelectedWallet: Boolean(this.state.selectedWallet),
				hasSelectedAccount: Boolean(this.state.selectedAccount)
			},
			timestamp: new Date().toISOString()
		}
	}

	// ============================================================================
	// Event System
	// ============================================================================

	/**
	 * Subscribe to connector events
	 * 
	 * Use this for analytics, logging, monitoring, or custom behavior.
	 * Events are emitted for all major connector actions like connecting,
	 * disconnecting, account changes, cluster changes, etc.
	 * 
	 * @param listener - Function to call when events occur
	 * @returns Unsubscribe function to stop listening
	 * 
	 * @example
	 * ```ts
	 * // Analytics tracking
	 * const unsubscribe = client.on((event) => {
	 *   if (event.type === 'wallet:connected') {
	 *     analytics.track('Wallet Connected', {
	 *       wallet: event.wallet,
	 *       account: event.account,
	 *       timestamp: event.timestamp
	 *     })
	 *   }
	 * })
	 * 
	 * // Clean up when done
	 * unsubscribe()
	 * ```
	 * 
	 * @example
	 * ```ts
	 * // Logging all events
	 * client.on((event) => {
	 *   console.log('[Connector Event]', event.type, event)
	 * })
	 * ```
	 * 
	 * @example
	 * ```ts
	 * // Custom behavior on connection
	 * client.on((event) => {
	 *   if (event.type === 'wallet:connected') {
	 *     // Fetch user data from backend
	 *     fetchUserProfile(event.account)
	 *   }
	 *   
	 *   if (event.type === 'wallet:disconnected') {
	 *     // Clear user data
	 *     clearUserProfile()
	 *   }
	 * })
	 * ```
	 */
	on(listener: ConnectorEventListener): () => void {
		this.eventListeners.add(listener)
		return () => this.eventListeners.delete(listener)
	}

	/**
	 * Remove a specific event listener
	 * Alternative to using the unsubscribe function returned by on()
	 * 
	 * @param listener - The listener function to remove
	 */
	off(listener: ConnectorEventListener): void {
		this.eventListeners.delete(listener)
	}

	/**
	 * Remove all event listeners
	 * Useful for cleanup or resetting the connector
	 */
	offAll(): void {
		this.eventListeners.clear()
	}

	/**
	 * Emit an event to all listeners
	 * Internal method - called by connector operations
	 */
	private emit(event: ConnectorEvent): void {
		// Log events in debug mode
		if (this.config.debug) {
			console.log('[Connector Event]', event.type, event)
		}
		
		// Call all event listeners
		this.eventListeners.forEach(listener => {
			try {
				listener(event)
			} catch (error) {
				// Don't let listener errors crash the connector
				console.error('[Connector] Event listener error:', error)
			}
		})
	}

	/**
	 * Get performance and debug metrics
	 * Provides insights into connector performance and optimization effectiveness
	 * 
	 * @returns Debug metrics including update counts, timing, and listener counts
	 * 
	 * @example
	 * ```ts
	 * const metrics = client.getDebugMetrics()
	 * 
	 * console.log('State updates:', metrics.stateUpdates)
	 * console.log('Optimized away:', metrics.noopUpdates)
	 * console.log('Optimization rate:', `${metrics.optimizationRate}%`)
	 * console.log('Avg update time:', `${metrics.avgUpdateTimeMs}ms`)
	 * ```
	 */
	getDebugMetrics(): ConnectorDebugMetrics {
		const totalUpdates = this.debugMetrics.stateUpdates + this.debugMetrics.noopUpdates
		const optimizationRate = totalUpdates > 0 
			? Math.round((this.debugMetrics.noopUpdates / totalUpdates) * 100)
			: 0
		
		const avgUpdateTime = this.debugMetrics.updateTimes.length > 0
			? this.debugMetrics.updateTimes.reduce((a, b) => a + b, 0) / this.debugMetrics.updateTimes.length
			: 0
		
		return {
			stateUpdates: this.debugMetrics.stateUpdates,
			noopUpdates: this.debugMetrics.noopUpdates,
			optimizationRate,
			eventListenerCount: this.eventListeners.size,
			subscriptionCount: this.listeners.size,
			avgUpdateTimeMs: Math.round(avgUpdateTime * 100) / 100, // 2 decimal places
			lastUpdateTime: this.debugMetrics.lastUpdateTime
		}
	}

	/**
	 * Reset debug metrics
	 * Useful for benchmarking specific operations or time periods
	 * 
	 * @example
	 * ```ts
	 * client.resetDebugMetrics()
	 * // ... perform operations ...
	 * const metrics = client.getDebugMetrics()
	 * console.log('Metrics for this period:', metrics)
	 * ```
	 */
	resetDebugMetrics(): void {
		this.debugMetrics = {
			stateUpdates: 0,
			noopUpdates: 0,
			updateTimes: [],
			lastUpdateTime: 0
		}
	}

	// ============================================================================
	// Transaction Tracking
	// ============================================================================

	/**
	 * Track a transaction for debugging and monitoring
	 * Call this from your transaction hooks/utils when sending transactions
	 * 
	 * @example
	 * ```ts
	 * const signature = await wallet.sendTransaction(tx, connection)
	 * client.trackTransaction({
	 *   signature,
	 *   status: 'pending',
	 *   method: 'sendTransaction',
	 *   feePayer: publicKey.toString()
	 * })
	 * ```
	 */
	trackTransaction(activity: Omit<TransactionActivity, 'timestamp' | 'cluster'>): void {
		const fullActivity: TransactionActivity = {
			...activity,
			timestamp: new Date().toISOString(),
			cluster: this.state.cluster?.label || 'unknown'
		}

		this.transactions.unshift(fullActivity)
		if (this.transactions.length > this.maxTransactions) {
			this.transactions.pop()
		}
		this.totalTransactions++

		// Emit event
		this.emit({
			type: 'transaction:tracked',
			signature: fullActivity.signature,
			status: fullActivity.status,
			timestamp: fullActivity.timestamp
		})

		if (this.config.debug) {
			console.log('[Connector] Transaction tracked:', fullActivity)
		}

		// Notify subscribers to update debug panel
		this.notify()
	}

	/**
	 * Update transaction status (e.g., from pending to confirmed/failed)
	 * 
	 * @example
	 * ```ts
	 * // After confirmation
	 * client.updateTransactionStatus(signature, 'confirmed')
	 * 
	 * // On error
	 * client.updateTransactionStatus(signature, 'failed', 'Transaction simulation failed')
	 * ```
	 */
	updateTransactionStatus(
		signature: string,
		status: TransactionActivity['status'],
		error?: string
	): void {
		const tx = this.transactions.find(t => t.signature === signature)
		if (tx) {
			tx.status = status
			if (error) tx.error = error

			// Emit event
			this.emit({
				type: 'transaction:updated',
				signature,
				status,
				timestamp: new Date().toISOString()
			})

			if (this.config.debug) {
				console.log('[Connector] Transaction updated:', { signature, status, error })
			}

			// Notify subscribers
			this.notify()
		}
	}

	/**
	 * Get debug state including transactions
	 * 
	 * @example
	 * ```ts
	 * const state = client.getDebugState()
	 * console.log('Total transactions:', state.totalTransactions)
	 * console.log('Recent transactions:', state.transactions)
	 * ```
	 */
	getDebugState(): ConnectorDebugState {
		return {
			...this.getDebugMetrics(),
			transactions: [...this.transactions],
			totalTransactions: this.totalTransactions
		}
	}

	/**
	 * Clear transaction history
	 * 
	 * @example
	 * ```ts
	 * client.clearTransactionHistory()
	 * ```
	 */
	clearTransactionHistory(): void {
		this.transactions = []
		this.notify()
	}
}


