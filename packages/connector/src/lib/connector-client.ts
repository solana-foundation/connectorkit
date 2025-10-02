import { getWallets } from '@wallet-standard/app'

import type { Wallet } from '@wallet-standard/base'
import type { SolanaCluster } from '@wallet-ui/core'

export interface WalletInfo {
	wallet: Wallet
	name: string
	icon?: string
	installed: boolean
	/** Precomputed capability flag for UI convenience */
	connectable?: boolean
}

import type { WalletAccount } from '@wallet-standard/base'

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
}

type Listener = (s: ConnectorState) => void

export interface ConnectorConfig {
	autoConnect?: boolean
	debug?: boolean
	storage?: {
		getItem: (k: string) => string | null
		setItem: (k: string, v: string) => void
		removeItem: (k: string) => void
	}
	
	/** Enhanced cluster configuration using wallet-ui */
	cluster?: {
		clusters?: SolanaCluster[]
		persistSelection?: boolean
	}
}

const STORAGE_KEY = 'arc-connector:lastWallet'

export class ConnectorClient {
	private state: ConnectorState
	private listeners = new Set<Listener>()
	private unsubscribers: Array<() => void> = []
	private walletChangeUnsub: (() => void) | null = null
	private pollTimer: ReturnType<typeof setInterval> | null = null

	constructor(private config: ConnectorConfig = {}) {
		this.state = {
			wallets: [],
			selectedWallet: null,
			connected: false,
			connecting: false,
			accounts: [],
			selectedAccount: null,
		}
		this.initialize()
	}

	private getStorage(): ConnectorConfig['storage'] | null {
		if (this.config.storage) return this.config.storage
		if (typeof window !== 'undefined' && window.localStorage) {
			return {
				getItem: (k: string) => window.localStorage.getItem(k),
				setItem: (k: string, v: string) => window.localStorage.setItem(k, v),
				removeItem: (k: string) => window.localStorage.removeItem(k),
			}
		}
		return null
	}

	private initialize() {
		if (typeof window === 'undefined') return
		try {
			const walletsApi = getWallets()
			const update = () => {
				const ws = walletsApi.get()
				const unique = Array.from(new Set(ws.map(w => w.name)))
				  .map(n => ws.find(w => w.name === n))
				  .filter((w): w is Wallet => w !== undefined)
				this.state = {
					...this.state,
					wallets: unique.map(w => {
						const features = (w.features as any) || {}
						const hasConnect = Boolean(features['standard:connect'])
						const hasDisconnect = Boolean(features['standard:disconnect'])
						const chains = (w as any)?.chains as unknown as string[] | undefined
						const isSolana = Array.isArray(chains) && chains.some(c => typeof c === 'string' && c.includes('solana'))
						const connectable = hasConnect && hasDisconnect && Boolean(isSolana)
						return { wallet: w, name: w.name, icon: w.icon, installed: true, connectable } satisfies WalletInfo
					}),
				}
				this.notify()
			}
			update()
			this.unsubscribers.push(walletsApi.on('register', update))
			this.unsubscribers.push(walletsApi.on('unregister', update))
			if (this.config.autoConnect) setTimeout(() => this.attemptAutoConnect(), 100)
		} catch (e) {
			// Init failed silently
		}
	}

	private async attemptAutoConnect() {
		try {
			const last = this.getStorage()?.getItem(STORAGE_KEY)
			if (!last) return
			if (this.state.wallets.some(w => w.name === last)) await this.select(last)
		} catch (e) {
			this.getStorage()?.removeItem(STORAGE_KEY)
		}
	}

	subscribe(l: Listener) {
		this.listeners.add(l)
		return () => this.listeners.delete(l)
	}

	getSnapshot(): ConnectorState {
		return this.state
	}

	private notify() {
		this.listeners.forEach(l => l(this.state))
	}

	private startPollingWalletAccounts() {
		if (this.pollTimer) return
		const wallet = this.state.selectedWallet
		if (!wallet) return
		this.pollTimer = setInterval(() => {
			try {
				const walletAccounts = ((wallet as any)?.accounts ?? []) as any[]
				const accountMap = new Map<string, any>()
				for (const a of walletAccounts) accountMap.set(a.address, a)
				const nextAccounts: AccountInfo[] = Array.from(accountMap.values()).map((a: any) => ({ address: a.address as string, icon: a.icon, raw: a }))
				const selectedStillExists = this.state.selectedAccount && nextAccounts.some(acc => acc.address === this.state.selectedAccount)
				const newSelected = selectedStillExists ? this.state.selectedAccount : (nextAccounts[0]?.address ?? null)
				// Only update if changed
				const changed = nextAccounts.length !== this.state.accounts.length || nextAccounts.some((acc, i) => acc.address !== this.state.accounts[i]?.address)
				if (changed) {
					this.state = { ...this.state, accounts: nextAccounts, selectedAccount: newSelected }
					this.notify()
				}
			} catch (error) {
				// Error during account polling
			}
		}, 1500)
	}

	private stopPollingWalletAccounts() {
		if (this.pollTimer) {
			clearInterval(this.pollTimer)
			this.pollTimer = null
		}
	}

	private subscribeToWalletEvents() {
			try {
				if (this.walletChangeUnsub) this.walletChangeUnsub()
			} catch (e) {
				// Error unsubscribing wallet events
			}
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
			// Subscribe to change events
			this.walletChangeUnsub = eventsFeature.on('change', (properties: any) => {
				// Aggregate accounts from event and wallet.accounts (some wallets only include selected account in the event)
				const changeAccounts = (properties?.accounts ?? []) as any[]
				const walletAccounts = ((wallet as any)?.accounts ?? []) as any[]
				const accountMap = new Map<string, any>()
				for (const a of [...walletAccounts, ...changeAccounts]) accountMap.set(a.address, a)
				const nextAccounts: AccountInfo[] = Array.from(accountMap.values()).map((a: any) => ({ address: a.address as string, icon: a.icon, raw: a }))

				// Preserve selection if possible
				const selectedStillExists = this.state.selectedAccount && nextAccounts.some(acc => acc.address === this.state.selectedAccount)
				const newSelected = selectedStillExists ? this.state.selectedAccount : (nextAccounts[0]?.address ?? null)

				this.state = { ...this.state, accounts: nextAccounts, selectedAccount: newSelected }
				this.notify()

				// Wallet accounts changed
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
		this.notify()
		try {
			const connectFeature = (w.wallet.features as any)['standard:connect']
			if (!connectFeature) throw new Error(`Wallet ${walletName} does not support standard connect`)
				// Force non-silent connection to ensure wallet prompts for account selection
				const result = await connectFeature.connect({ silent: false })
				// Aggregate accounts from result and wallet.accounts (some wallets only return the selected account)
				const walletAccounts = ((w.wallet as any)?.accounts ?? []) as any[]
				const accountMap = new Map<string, any>()
				for (const a of [...walletAccounts, ...result.accounts]) accountMap.set(a.address, a)
				const accounts: AccountInfo[] = Array.from(accountMap.values()).map((a: any) => ({ address: a.address as string, icon: a.icon, raw: a }))
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
			this.getStorage()?.setItem(STORAGE_KEY, walletName)
			// Subscribe to wallet change events (or start polling if unavailable)
			this.subscribeToWalletEvents()
			this.notify()
		} catch (e) {
			this.state = { ...this.state, selectedWallet: null, connected: false, connecting: false, accounts: [], selectedAccount: null }
			this.notify()
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
		this.getStorage()?.removeItem(STORAGE_KEY)
		this.notify()
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
					const accounts: AccountInfo[] = res.accounts.map((a: WalletAccount) => ({ address: a.address, icon: a.icon, raw: a }))
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
}


