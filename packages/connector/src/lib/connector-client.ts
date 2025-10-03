import { getWalletsRegistry, type Wallet, type WalletAccount } from './wallet-standard-shim'
import type { SolanaCluster, SolanaClusterId } from '@wallet-ui/core'
import type { StorageAdapter } from './enhanced-storage'

export interface WalletInfo {
	wallet: Wallet
	name: string
	icon?: string
	installed: boolean
	/** Precomputed capability flag for UI convenience */
	connectable?: boolean
}

export interface AccountInfo {
	address: string
	icon?: string
	raw: WalletAccount
}


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
	private unsubscribers: Array<() => void> = []
	private walletChangeUnsub: (() => void) | null = null
	private pollTimer: ReturnType<typeof setInterval> | null = null
	private walletStorage?: StorageAdapter<string | undefined>
	private clusterStorage?: StorageAdapter<SolanaClusterId>

	// ============================================================================
	// Helper Methods
	// ============================================================================

	/**
	 * Convert a Wallet Standard wallet to WalletInfo with capability checks
	 */
	private mapToWalletInfo(wallet: Wallet): WalletInfo {
		const features = (wallet.features as any) || {}
		const hasConnect = Boolean(features['standard:connect'])
		const hasDisconnect = Boolean(features['standard:disconnect'])
		const chains = (wallet as any)?.chains as unknown as string[] | undefined
		const isSolana = Array.isArray(chains) && chains.some(c => typeof c === 'string' && c.includes('solana'))
		const connectable = hasConnect && hasDisconnect && Boolean(isSolana)
		
		return { 
			wallet, 
			name: wallet.name, 
			icon: wallet.icon, 
			installed: true, 
			connectable 
		} satisfies WalletInfo
	}

	/**
	 * Deduplicate wallets by name (keeps first occurrence)
	 */
	private deduplicateWallets(wallets: readonly Wallet[]): Wallet[] {
		return Array.from(new Set(wallets.map(w => w.name)))
			.map(n => wallets.find(w => w.name === n))
			.filter((w): w is Wallet => w !== undefined)
	}

	/**
	 * Convert wallet account to AccountInfo
	 */
	private toAccountInfo(account: any): AccountInfo {
		return {
			address: account.address as string,
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
				name: storedWalletName,
				icon: walletIcon,
				chains: directWallet.chains || ['solana:mainnet', 'solana:devnet', 'solana:testnet'],
				features,
				accounts: directWallet.accounts || []
			}
			
			// Add to state immediately for instant UI feedback
			this.state = {
				...this.state,
				wallets: [{
					wallet,
					name: wallet.name,
					icon: wallet.icon,
					installed: true,
					connectable: true
				}]
			}
			this.notifyImmediate() // Critical for instant UI feedback
			
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
				this.state = {
					...this.state,
					wallets: unique.map(w => this.mapToWalletInfo(w))
				}
				this.notify()
				
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
			if (this.config.debug && ws.length !== this.state.wallets.length) {
				console.log('🔍 ConnectorClient: found wallets:', ws.length)
			}
			
			const unique = this.deduplicateWallets(ws)
			
			// Update wallet list for UI, but don't interfere with connection state
			// This ensures the connect button has access to wallet icons
			this.state = {
				...this.state,
				wallets: unique.map(w => this.mapToWalletInfo(w))
			}
			this.notify()
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
				console.log('🔄 Auto-connect: available wallets =', this.state.wallets.map(w => w.name))
			}
			if (!last) return
			
			const walletFound = this.state.wallets.some(w => w.name === last)
			if (walletFound) {
				if (this.config.debug) {
					console.log('✅ Auto-connect: Found stored wallet, connecting')
				}
				await this.select(last)
			} else {
				// Single shorter retry - wallets usually register within 1-2 seconds
				setTimeout(() => {
					if (this.state.wallets.some(w => w.name === last)) {
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
				const walletAccounts = ((wallet as any)?.accounts ?? []) as any[]
				const nextAccounts = walletAccounts.map(a => this.toAccountInfo(a))
				
				// Only update if we don't have accounts yet or they actually changed
				if (this.state.accounts.length === 0 && nextAccounts.length > 0) {
					this.state = { 
						...this.state, 
						accounts: nextAccounts,
						selectedAccount: this.state.selectedAccount || nextAccounts[0]?.address || null
					}
					this.notify()
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
		const eventsFeature = (wallet.features as any)?.['standard:events']
		if (!eventsFeature?.on) {
			// Fallback: start polling wallet.accounts when events are not available
			this.startPollingWalletAccounts()
			return
		}

		try {
			// Subscribe to change events - but don't interfere with account selection
			this.walletChangeUnsub = eventsFeature.on('change', (properties: any) => {
				// Only handle actual account changes, not selection changes
				const changeAccounts = (properties?.accounts ?? []) as any[]
				if (changeAccounts.length === 0) return
				
				const nextAccounts = changeAccounts.map(a => this.toAccountInfo(a))
				
				// Only update accounts, preserve selected account
				this.state = { 
					...this.state, 
					accounts: nextAccounts.length > 0 ? nextAccounts : this.state.accounts 
				}
				this.notify()
			})
		} catch (error) {
			// Failed to subscribe to wallet events
			// Fallback to polling when event subscription fails
			this.startPollingWalletAccounts()
		}
	}

	async select(walletName: string): Promise<void> {
		if (typeof window === 'undefined') return
		const w = this.state.wallets.find(x => x.name === walletName)
		if (!w) throw new Error(`Wallet ${walletName} not found`)
		this.state = { ...this.state, connecting: true }
		this.notifyImmediate() // Critical UI state - notify immediately
		try {
			const connectFeature = (w.wallet.features as any)['standard:connect']
			if (!connectFeature) throw new Error(`Wallet ${walletName} does not support standard connect`)
				// Force non-silent connection to ensure wallet prompts for account selection
				const result = await connectFeature.connect({ silent: false })
			// Aggregate accounts from result and wallet.accounts (some wallets only return the selected account)
			const walletAccounts = ((w.wallet as any)?.accounts ?? []) as any[]
			const accountMap = new Map<string, any>()
			for (const a of [...walletAccounts, ...result.accounts]) accountMap.set(a.address, a)
			const accounts = Array.from(accountMap.values()).map(a => this.toAccountInfo(a))
				// Prefer a never-before-seen account when reconnecting; otherwise preserve selection
				const previouslySelected = this.state.selectedAccount
				const previousAddresses = new Set(this.state.accounts.map(a => a.address))
				const firstNew = accounts.find(a => !previousAddresses.has(a.address))
				const selected = firstNew?.address ?? previouslySelected ?? accounts[0]?.address ?? null
			
			// Successfully connected to wallet
				this.state = {
					...this.state,
					selectedWallet: w.wallet,
					connected: true,
					connecting: false,
					accounts,
					selectedAccount: selected,
				}
				
				if (this.config.debug) {
					console.log('✅ Connection successful - state updated:', {
						connected: this.state.connected,
						selectedWallet: this.state.selectedWallet?.name,
						selectedAccount: this.state.selectedAccount,
						accountsCount: this.state.accounts.length
					})
				}
				
			this.setStoredWallet(walletName)
			// Subscribe to wallet change events (or start polling if unavailable)
			this.subscribeToWalletEvents()
			this.notifyImmediate() // Critical state change - notify immediately
		} catch (e) {
			this.state = { ...this.state, selectedWallet: null, connected: false, connecting: false, accounts: [], selectedAccount: null }
			this.notifyImmediate() // Critical error state - notify immediately
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
			const disconnectFeature = (wallet.features as any)?.['standard:disconnect']
			if (disconnectFeature?.disconnect) {
				try {
					await disconnectFeature.disconnect()
					// Called wallet disconnect feature
				} catch (error) {
					// Wallet disconnect failed
				}
			}
		}

		this.state = { ...this.state, selectedWallet: null, connected: false, accounts: [], selectedAccount: null }
		this.removeStoredWallet()
		this.notifyImmediate() // Critical state change - notify immediately
		
		// Force wallet discovery after disconnect to show available wallets
		setTimeout(() => {
			if (!this.state.connected) {
			// Re-run wallet discovery
			const walletsApi = getWalletsRegistry()
			const ws = walletsApi.get()
			if (ws.length > 0) {
				const unique = this.deduplicateWallets(ws)
				this.state = {
					...this.state,
					wallets: unique.map(w => this.mapToWalletInfo(w)),
				}
				this.notify()
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
				const feature = (current.features as any)['standard:connect']
				if (feature) {
					const res = await feature.connect()
					const accounts = res.accounts.map((a: any) => this.toAccountInfo(a))
					target = accounts.find((acc: AccountInfo) => acc.address === address)?.raw ?? res.accounts[0]
					this.state = { ...this.state, accounts }
				}
			} catch (error) {
				// Failed to reconnect for account selection
				throw new Error('Failed to reconnect wallet for account selection')
			}
		}
		if (!target) throw new Error('Requested account not available')
		this.state = { ...this.state, selectedAccount: target.address as string }
		this.notify()
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
		const cluster = this.state.clusters.find(c => c.id === clusterId)
		if (!cluster) {
			throw new Error(`Cluster ${clusterId} not found. Available clusters: ${this.state.clusters.map(c => c.id).join(', ')}`)
		}
		
		this.state = { ...this.state, cluster }
		
		// Persist cluster selection if storage is configured
		if (this.clusterStorage) {
			this.clusterStorage.set(clusterId)
		}
		
		this.notifyImmediate() // Critical state change - notify immediately
		
		if (this.config.debug) {
			console.log('🌐 Cluster changed:', { from: this.state.cluster?.id, to: clusterId })
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
}


