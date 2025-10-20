import type { Wallet, WalletAccount, WalletName } from '../../types/wallets';
import type { AccountInfo } from '../../types/accounts';
import type { StorageAdapter } from '../../types/storage';
import { BaseCollaborator } from '../core/base-collaborator';
import type {
    StandardConnectFeature,
    StandardConnectMethod,
    StandardDisconnectFeature,
    StandardDisconnectMethod,
    StandardEventsFeature,
    StandardEventsOnMethod,
} from '@wallet-standard/features';
import { Address } from 'gill';
import { MAX_POLL_ATTEMPTS, POLL_INTERVALS_MS } from '../constants';

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
export class ConnectionManager extends BaseCollaborator {
    private walletStorage?: StorageAdapter<string | undefined>;
    private walletChangeUnsub: (() => void) | null = null;
    private pollTimer: ReturnType<typeof setTimeout> | null = null;
    private pollAttempts = 0;

    constructor(
        stateManager: import('../core/state-manager').StateManager,
        eventEmitter: import('../core/event-emitter').EventEmitter,
        walletStorage?: StorageAdapter<string | undefined>,
        debug = false,
    ) {
        super({ stateManager, eventEmitter, debug }, 'ConnectionManager');
        this.walletStorage = walletStorage;
    }

    /**
     * Connect to a wallet
     */
    async connect(wallet: Wallet, walletName?: string): Promise<void> {
        if (typeof window === 'undefined') return;

        const name = walletName || wallet.name;

        this.eventEmitter.emit({
            type: 'connecting',
            wallet: name as WalletName,
            timestamp: new Date().toISOString(),
        });

        this.stateManager.updateState({ connecting: true }, true);

        try {
            const connect = getConnectFeature(wallet);
            if (!connect) throw new Error(`Wallet ${name} does not support standard connect`);

            const result = await connect({ silent: false });

            const walletAccounts = wallet.accounts;
            const accountMap = new Map<string, WalletAccount>();
            for (const a of [...walletAccounts, ...result.accounts]) accountMap.set(a.address, a);
            const accounts = Array.from(accountMap.values()).map(a => this.toAccountInfo(a));

            const state = this.getState();
            const previouslySelected = state.selectedAccount;
            const previousAddresses = new Set(state.accounts.map((a: AccountInfo) => a.address));
            const firstNew = accounts.find(a => !previousAddresses.has(a.address));
            const selected = firstNew?.address ?? previouslySelected ?? accounts[0]?.address ?? null;

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

            this.log('✅ Connection successful - state updated:', {
                connected: true,
                selectedWallet: wallet.name,
                selectedAccount: selected,
                accountsCount: accounts.length,
            });

            this.eventEmitter.emit({
                type: 'wallet:connected',
                wallet: name as WalletName,
                account: (selected || '') as any,
                timestamp: new Date().toISOString(),
            });

            // Save wallet name to storage (if available)
            if (this.walletStorage) {
                const isAvailable =
                    !('isAvailable' in this.walletStorage) ||
                    typeof this.walletStorage.isAvailable !== 'function' ||
                    this.walletStorage.isAvailable();

                if (isAvailable) {
                    this.walletStorage.set(name);
                } else {
                    this.log('Storage not available (private browsing?), skipping wallet persistence');
                }
            }

            this.subscribeToWalletEvents();
        } catch (e) {
            const errorMessage = e instanceof Error ? e.message : String(e);

            this.eventEmitter.emit({
                type: 'connection:failed',
                wallet: name as WalletName,
                error: errorMessage,
                timestamp: new Date().toISOString(),
            });

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
        if (this.walletChangeUnsub) {
            try {
                this.walletChangeUnsub();
            } catch {}
            this.walletChangeUnsub = null;
        }
        this.stopPollingWalletAccounts();

        const wallet = this.getState().selectedWallet;
        if (wallet) {
            const disconnect = getDisconnectFeature(wallet);
            if (disconnect) {
                try {
                    await disconnect();
                } catch (error) {}
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

        this.eventEmitter.emit({
            type: 'wallet:disconnected',
            timestamp: new Date().toISOString(),
        });

        // Clear wallet from storage (remove key entirely)
        if (this.walletStorage && 'clear' in this.walletStorage && typeof this.walletStorage.clear === 'function') {
            this.walletStorage.clear();
        } else {
            // Fallback for storage adapters without clear()
            this.walletStorage?.set(undefined);
        }
    }

    /**
     * Select a different account
     */
    async selectAccount(address: string): Promise<void> {
        const state = this.getState();
        const current = state.selectedWallet;
        if (!current) throw new Error('No wallet connected');

        // Basic address validation: check for empty or obviously invalid addresses
        // Note: We use a lenient check to support test addresses
        if (!address || address.length < 5) {
            throw new Error(`Invalid address format: ${address}`);
        }

        let target = state.accounts.find((acc: AccountInfo) => acc.address === address)?.raw ?? null;

        if (!target) {
            // Try to reconnect and refetch accounts
            try {
                const connect = getConnectFeature(current);
                if (connect) {
                    const res = await connect();
                    const accounts = res.accounts.map(a => this.toAccountInfo(a));
                    target = accounts.find((acc: AccountInfo) => acc.address === address)?.raw ?? null;
                    this.stateManager.updateState({ accounts });
                }
            } catch (error) {
                throw new Error('Failed to reconnect wallet for account selection');
            }
        }

        if (!target) throw new Error(`Requested account not available: ${address}`);

        // Update selected account
        this.stateManager.updateState({ selectedAccount: target.address as any });

        // Emit account:changed event
        this.eventEmitter.emit({
            type: 'account:changed',
            account: target.address as any,
            timestamp: new Date().toISOString(),
        });
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
        if (this.walletChangeUnsub) {
            try {
                this.walletChangeUnsub();
            } catch {}
            this.walletChangeUnsub = null;
        }
        this.stopPollingWalletAccounts();

        const wallet = this.getState().selectedWallet;
        if (!wallet) return;

        const eventsOn = getEventsFeature(wallet);
        if (!eventsOn) {
            this.startPollingWalletAccounts();
            return;
        }

        try {
            this.walletChangeUnsub = eventsOn('change', properties => {
                const changeAccounts = properties?.accounts ?? [];
                if (changeAccounts.length === 0) return;

                const nextAccounts = changeAccounts.map(a => this.toAccountInfo(a));

                if (nextAccounts.length > 0) {
                    this.stateManager.updateState({
                        accounts: nextAccounts,
                    });
                }
            });
        } catch (error) {
            this.startPollingWalletAccounts();
        }
    }

    /**
     * Start polling wallet accounts (fallback when events not available)
     * Uses exponential backoff to reduce polling frequency over time
     */
    private startPollingWalletAccounts(): void {
        if (this.pollTimer) return;
        const wallet = this.getState().selectedWallet;
        if (!wallet) return;

        this.pollAttempts = 0;

        const poll = () => {
            // Stop polling after max attempts
            if (this.pollAttempts >= MAX_POLL_ATTEMPTS) {
                this.stopPollingWalletAccounts();
                this.log('Stopped wallet polling after max attempts');
                return;
            }

            try {
                const state = this.getState();
                const walletAccounts = wallet.accounts;
                const nextAccounts = walletAccounts.map((a: WalletAccount) => this.toAccountInfo(a));

                if (state.accounts.length === 0 && nextAccounts.length > 0) {
                    this.stateManager.updateState({
                        accounts: nextAccounts,
                        selectedAccount: state.selectedAccount || nextAccounts[0]?.address || null,
                    });

                    // Reset poll attempts on success
                    this.pollAttempts = 0;
                }
            } catch (error) {
                this.log('Wallet polling error:', error);
            }

            this.pollAttempts++;

            // Get interval with exponential backoff
            const intervalIndex = Math.min(this.pollAttempts, POLL_INTERVALS_MS.length - 1);
            const interval = POLL_INTERVALS_MS[intervalIndex];

            this.pollTimer = setTimeout(poll, interval);
        };

        // Start polling
        poll();
    }

    /**
     * Stop polling wallet accounts
     */
    private stopPollingWalletAccounts(): void {
        if (this.pollTimer) {
            clearTimeout(this.pollTimer);
            this.pollTimer = null;
            this.pollAttempts = 0;
        }
    }

    /**
     * Get stored wallet name
     */
    getStoredWallet(): string | null {
        return this.walletStorage?.get() ?? null;
    }
}
