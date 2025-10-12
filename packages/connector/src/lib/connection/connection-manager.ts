import type { Wallet, WalletAccount } from '../../types/wallets';
import type { AccountInfo } from '../../types/accounts';
import type { StorageAdapter } from '../../types/storage';
import type { StateManager } from '../core/state-manager';
import type { EventEmitter } from '../core/event-emitter';
import type {
    StandardConnectFeature,
    StandardConnectMethod,
    StandardDisconnectFeature,
    StandardDisconnectMethod,
    StandardEventsFeature,
    StandardEventsOnMethod,
} from '@wallet-standard/features';
import { Address } from 'gill';

/**
 * Type-safe accessor for standard:connect feature
 */
function getConnectFeature(wallet: Wallet): StandardConnectMethod | null {
    const feature = wallet.features['standard:connect'] as StandardConnectFeature['standard:connect'] | undefined;
    return feature?.connect ?? null;
}

/**
 * Type-safe accessor for standard:disconnect feature
 */
function getDisconnectFeature(wallet: Wallet): StandardDisconnectMethod | null {
    const feature = wallet.features['standard:disconnect'] as
        | StandardDisconnectFeature['standard:disconnect']
        | undefined;
    return feature?.disconnect ?? null;
}

/**
 * Type-safe accessor for standard:events feature
 */
function getEventsFeature(wallet: Wallet): StandardEventsOnMethod | null {
    const feature = wallet.features['standard:events'] as StandardEventsFeature['standard:events'] | undefined;
    return feature?.on ?? null;
}

/**
 * ConnectionManager - Handles wallet connection lifecycle
 *
 * Manages connecting, disconnecting, account selection, and wallet event subscriptions.
 */
export class ConnectionManager {
    private stateManager: StateManager;
    private eventEmitter: EventEmitter;
    private walletStorage?: StorageAdapter<string | undefined>;
    private debug: boolean;
    private walletChangeUnsub: (() => void) | null = null;
    private pollTimer: ReturnType<typeof setInterval> | null = null;

    constructor(
        stateManager: StateManager,
        eventEmitter: EventEmitter,
        walletStorage?: StorageAdapter<string | undefined>,
        debug = false,
    ) {
        this.stateManager = stateManager;
        this.eventEmitter = eventEmitter;
        this.walletStorage = walletStorage;
        this.debug = debug;
    }

    /**
     * Connect to a wallet
     */
    async connect(wallet: Wallet, walletName?: string): Promise<void> {
        if (typeof window === 'undefined') return;

        const name = walletName || wallet.name;

        // Emit connecting event
        this.eventEmitter.emit({
            type: 'connecting',
            wallet: name,
            timestamp: new Date().toISOString(),
        });

        this.stateManager.updateState({ connecting: true }, true);

        try {
            const connect = getConnectFeature(wallet);
            if (!connect) throw new Error(`Wallet ${name} does not support standard connect`);

            // Force non-silent connection to ensure wallet prompts for account selection
            const result = await connect({ silent: false });

            // Aggregate accounts from result and wallet.accounts
            const walletAccounts = wallet.accounts;
            const accountMap = new Map<string, WalletAccount>();
            for (const a of [...walletAccounts, ...result.accounts]) accountMap.set(a.address, a);
            const accounts = Array.from(accountMap.values()).map(a => this.toAccountInfo(a));

            // Prefer a never-before-seen account when reconnecting
            const state = this.stateManager.getSnapshot();
            const previouslySelected = state.selectedAccount;
            const previousAddresses = new Set(state.accounts.map((a: AccountInfo) => a.address));
            const firstNew = accounts.find(a => !previousAddresses.has(a.address));
            const selected = firstNew?.address ?? previouslySelected ?? accounts[0]?.address ?? null;

            // Successfully connected to wallet
            this.stateManager.updateState(
                {
                    selectedWallet: wallet,
                    connected: true,
                    connecting: false,
                    accounts,
                    selectedAccount: selected,
                },
                true,
            );

            if (this.debug) {
                console.log('✅ Connection successful - state updated:', {
                    connected: true,
                    selectedWallet: wallet.name,
                    selectedAccount: selected,
                    accountsCount: accounts.length,
                });
            }

            // Emit connection success event
            this.eventEmitter.emit({
                type: 'wallet:connected',
                wallet: name,
                account: selected || '',
                timestamp: new Date().toISOString(),
            });

            // Store wallet for auto-reconnect
            this.walletStorage?.set(name);

            // Subscribe to wallet change events
            this.subscribeToWalletEvents();
        } catch (e) {
            const errorMessage = e instanceof Error ? e.message : String(e);

            // Emit connection failure event
            this.eventEmitter.emit({
                type: 'connection:failed',
                wallet: name,
                error: errorMessage,
                timestamp: new Date().toISOString(),
            });

            // Also emit generic error event
            this.eventEmitter.emit({
                type: 'error',
                error: e instanceof Error ? e : new Error(errorMessage),
                context: 'wallet-connection',
                timestamp: new Date().toISOString(),
            });

            this.stateManager.updateState(
                {
                    selectedWallet: null,
                    connected: false,
                    connecting: false,
                    accounts: [],
                    selectedAccount: null,
                },
                true,
            );

            throw e;
        }
    }

    /**
     * Disconnect from wallet
     */
    async disconnect(): Promise<void> {
        // Cleanup wallet event listener
        if (this.walletChangeUnsub) {
            try {
                this.walletChangeUnsub();
            } catch {}
            this.walletChangeUnsub = null;
        }
        this.stopPollingWalletAccounts();

        // Call wallet's disconnect feature if available
        const wallet = this.stateManager.getSnapshot().selectedWallet;
        if (wallet) {
            const disconnect = getDisconnectFeature(wallet);
            if (disconnect) {
                try {
                    await disconnect();
                } catch (error) {
                    // Wallet disconnect failed silently
                }
            }
        }

        this.stateManager.updateState(
            {
                selectedWallet: null,
                connected: false,
                accounts: [],
                selectedAccount: null,
            },
            true,
        );

        // Emit disconnection event
        this.eventEmitter.emit({
            type: 'wallet:disconnected',
            timestamp: new Date().toISOString(),
        });

        // Remove stored wallet
        this.walletStorage?.set(undefined);
    }

    /**
     * Select a different account
     */
    async selectAccount(address: string): Promise<void> {
        const state = this.stateManager.getSnapshot();
        const current = state.selectedWallet;
        if (!current) throw new Error('No wallet connected');

        let target = state.accounts.find((acc: AccountInfo) => acc.address === address)?.raw ?? null;

        if (!target) {
            try {
                const connect = getConnectFeature(current);
                if (connect) {
                    const res = await connect();
                    const accounts = res.accounts.map(a => this.toAccountInfo(a));
                    target = accounts.find((acc: AccountInfo) => acc.address === address)?.raw ?? res.accounts[0];
                    this.stateManager.updateState({ accounts });
                }
            } catch (error) {
                throw new Error('Failed to reconnect wallet for account selection');
            }
        }

        if (!target) throw new Error('Requested account not available');
        this.stateManager.updateState({ selectedAccount: target.address as string });
    }

    /**
     * Convert wallet account to AccountInfo
     */
    private toAccountInfo(account: WalletAccount): AccountInfo {
        return {
            address: account.address as Address,
            icon: account.icon,
            raw: account,
        };
    }

    /**
     * Subscribe to wallet change events
     */
    private subscribeToWalletEvents(): void {
        // Cleanup existing subscription if present
        if (this.walletChangeUnsub) {
            try {
                this.walletChangeUnsub();
            } catch {}
            this.walletChangeUnsub = null;
        }
        this.stopPollingWalletAccounts();

        const wallet = this.stateManager.getSnapshot().selectedWallet;
        if (!wallet) return;

        // Check if wallet supports standard:events feature
        const eventsOn = getEventsFeature(wallet);
        if (!eventsOn) {
            // Fallback: start polling wallet.accounts when events are not available
            this.startPollingWalletAccounts();
            return;
        }

        try {
            // Subscribe to change events
            this.walletChangeUnsub = eventsOn('change', properties => {
                // Only handle actual account changes
                const changeAccounts = properties?.accounts ?? [];
                if (changeAccounts.length === 0) return;

                const nextAccounts = changeAccounts.map(a => this.toAccountInfo(a));

                // Only update accounts, preserve selected account
                if (nextAccounts.length > 0) {
                    this.stateManager.updateState({
                        accounts: nextAccounts,
                    });
                }
            });
        } catch (error) {
            // Fallback to polling when event subscription fails
            this.startPollingWalletAccounts();
        }
    }

    /**
     * Start polling wallet accounts (fallback when events not available)
     */
    private startPollingWalletAccounts(): void {
        if (this.pollTimer) return;
        const wallet = this.stateManager.getSnapshot().selectedWallet;
        if (!wallet) return;

        this.pollTimer = setInterval(() => {
            try {
                const state = this.stateManager.getSnapshot();
                const walletAccounts = wallet.accounts;
                const nextAccounts = walletAccounts.map((a: WalletAccount) => this.toAccountInfo(a));

                // Only update if we don't have accounts yet or they actually changed
                if (state.accounts.length === 0 && nextAccounts.length > 0) {
                    this.stateManager.updateState({
                        accounts: nextAccounts,
                        selectedAccount: state.selectedAccount || nextAccounts[0]?.address || null,
                    });
                }
            } catch (error) {
                // Error during account polling - ignore
            }
        }, 3000);
    }

    /**
     * Stop polling wallet accounts
     */
    private stopPollingWalletAccounts(): void {
        if (this.pollTimer) {
            clearInterval(this.pollTimer);
            this.pollTimer = null;
        }
    }

    /**
     * Get stored wallet name
     */
    getStoredWallet(): string | null {
        return this.walletStorage?.get() ?? null;
    }
}
