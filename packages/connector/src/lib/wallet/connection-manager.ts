import type { Wallet, WalletAccount, WalletName } from '../../types/wallets';
import type { AccountInfo } from '../../types/accounts';
import type { StorageAdapter } from '../../types/storage';
import type {
    WalletConnectorId,
    ConnectOptions,
    WalletStatus,
    WalletSession,
    SessionAccount,
} from '../../types/session';
import { INITIAL_WALLET_STATUS } from '../../types/session';
import { BaseCollaborator } from '../core/base-collaborator';
import type {
    StandardConnectFeature,
    StandardConnectMethod,
    StandardDisconnectFeature,
    StandardDisconnectMethod,
    StandardEventsFeature,
    StandardEventsOnMethod,
} from '@wallet-standard/features';
import type { Address } from '@solana/addresses';
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
    private connectAttemptId = 0;
    private pendingWallet: Wallet | null = null;
    private pendingWalletName: string | null = null;

    constructor(
        stateManager: import('../core/state-manager').StateManager,
        eventEmitter: import('../core/event-emitter').EventEmitter,
        walletStorage?: StorageAdapter<string | undefined>,
        debug = false,
    ) {
        super({ stateManager, eventEmitter, debug }, 'ConnectionManager');
        this.walletStorage = walletStorage;
    }

    // ========================================================================
    // vNext Connection Methods (connector-id based, silent-first)
    // ========================================================================

    /**
     * Connect to a wallet using the vNext API with silent-first support.
     *
     * @param wallet - Wallet Standard wallet instance
     * @param connectorId - Stable connector identifier
     * @param options - Connection options (silent mode, preferred account, etc.)
     */
    async connectWallet(wallet: Wallet, connectorId: WalletConnectorId, options?: ConnectOptions): Promise<void> {
        if (typeof window === 'undefined') return;

        const attemptId = ++this.connectAttemptId;
        this.pendingWallet = wallet;
        this.pendingWalletName = wallet.name;

        const { silent = false, allowInteractiveFallback = true, preferredAccount } = options ?? {};

        // Set wallet status to connecting
        this.updateWalletStatus({
            status: 'connecting',
            connectorId,
        });

        this.stateManager.updateState({ connecting: true }, true);

        this.eventEmitter.emit({
            type: 'connecting',
            wallet: wallet.name as WalletName,
            timestamp: new Date().toISOString(),
        });

        try {
            const connect = getConnectFeature(wallet);
            if (!connect) throw new Error(`Wallet ${wallet.name} does not support standard connect`);

            // Attempt silent connection first if requested
            let result;
            if (silent) {
                try {
                    result = await connect({ silent: true });
                    if (attemptId !== this.connectAttemptId) throw new Error('Connection cancelled');

                    // Check if silent connect returned accounts
                    const hasAccounts = result.accounts.length > 0 || wallet.accounts.length > 0;
                    if (!hasAccounts && allowInteractiveFallback) {
                        this.log('Silent connect returned no accounts, trying interactive...');
                        result = await connect({ silent: false });
                    } else if (!hasAccounts) {
                        throw new Error('Silent connection failed: no accounts returned');
                    }
                } catch (silentError) {
                    if (attemptId !== this.connectAttemptId) throw new Error('Connection cancelled');

                    if (allowInteractiveFallback) {
                        this.log('Silent connect failed, trying interactive...', silentError);
                        result = await connect({ silent: false });
                    } else {
                        throw silentError;
                    }
                }
            } else {
                result = await connect({ silent: false });
            }

            if (attemptId !== this.connectAttemptId) throw new Error('Connection cancelled');

            // Merge accounts from wallet and connect result
            const walletAccounts = wallet.accounts;
            const accountMap = new Map<string, WalletAccount>();
            for (const a of [...walletAccounts, ...result.accounts]) accountMap.set(a.address, a);

            const sessionAccounts: SessionAccount[] = Array.from(accountMap.values()).map(a => ({
                address: a.address as Address,
                label: a.label,
                account: a,
            }));

            const legacyAccounts = sessionAccounts.map(a => this.toAccountInfo(a.account));

            // Select account: preferredAccount > first new account > first account
            let selectedAccount = sessionAccounts[0];
            if (preferredAccount) {
                const preferred = sessionAccounts.find(a => a.address === preferredAccount);
                if (preferred) selectedAccount = preferred;
            }

            // Create session
            const session = this.createSession(wallet, connectorId, sessionAccounts, selectedAccount);

            // Update wallet status to connected
            this.updateWalletStatus({
                status: 'connected',
                session,
                connectorId,
                accounts: sessionAccounts,
                selectedAccount,
            });

            // Also update legacy state fields for backwards compatibility
            this.stateManager.updateState(
                {
                    selectedWallet: wallet,
                    connected: true,
                    connecting: false,
                    accounts: legacyAccounts,
                    selectedAccount: selectedAccount?.address ?? null,
                },
                true,
            );

            this.log('✅ Connection successful (vNext)', {
                connectorId,
                selectedAccount: selectedAccount?.address,
                accountsCount: sessionAccounts.length,
            });

            if (selectedAccount) {
                this.eventEmitter.emit({
                    type: 'wallet:connected',
                    wallet: wallet.name as WalletName,
                    account: selectedAccount.address,
                    timestamp: new Date().toISOString(),
                });
            }

            // Save wallet to storage
            if (this.walletStorage) {
                const isAvailable =
                    !('isAvailable' in this.walletStorage) ||
                    typeof this.walletStorage.isAvailable !== 'function' ||
                    this.walletStorage.isAvailable();

                if (isAvailable) {
                    this.walletStorage.set(wallet.name);
                }
            }

            this.subscribeToWalletEventsVNext(wallet, connectorId);
        } catch (e) {
            if (attemptId !== this.connectAttemptId) throw e;

            const errorMessage = e instanceof Error ? e.message : String(e);
            const error = e instanceof Error ? e : new Error(errorMessage);

            // Update wallet status to error
            this.updateWalletStatus({
                status: 'error',
                error,
                connectorId,
                recoverable: this.isRecoverableError(error),
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

            this.eventEmitter.emit({
                type: 'connection:failed',
                wallet: wallet.name as WalletName,
                error: errorMessage,
                timestamp: new Date().toISOString(),
            });

            throw e;
        } finally {
            if (this.pendingWallet === wallet) {
                this.pendingWallet = null;
                this.pendingWalletName = null;
            }
        }
    }

    /**
     * Create a WalletSession object
     */
    private createSession(
        wallet: Wallet,
        connectorId: WalletConnectorId,
        accounts: SessionAccount[],
        selectedAccount: SessionAccount,
    ): WalletSession {
        const listeners = new Set<(accounts: SessionAccount[]) => void>();

        return {
            connectorId,
            accounts,
            selectedAccount,
            onAccountsChanged: (listener: (accounts: SessionAccount[]) => void) => {
                listeners.add(listener);
                return () => listeners.delete(listener);
            },
            selectAccount: (address: Address) => {
                const account = accounts.find(a => a.address === address);
                if (account) {
                    this.selectAccount(address);
                }
            },
        };
    }

    /**
     * Update wallet status in state
     */
    private updateWalletStatus(status: WalletStatus): void {
        this.stateManager.updateState({ wallet: status });
    }

    /**
     * Subscribe to wallet events (vNext version with improved account change handling)
     */
    private subscribeToWalletEventsVNext(wallet: Wallet, connectorId: WalletConnectorId): void {
        if (this.walletChangeUnsub) {
            this.walletChangeUnsub();
            this.walletChangeUnsub = null;
        }
        this.stopPollingWalletAccounts();

        const eventsOn = getEventsFeature(wallet);
        if (!eventsOn) {
            this.startPollingWalletAccountsVNext(wallet, connectorId);
            return;
        }

        try {
            this.walletChangeUnsub = eventsOn('change', properties => {
                const changeAccounts = properties?.accounts ?? [];
                this.handleAccountsChanged(changeAccounts, connectorId, wallet);
            });
        } catch (error) {
            this.startPollingWalletAccountsVNext(wallet, connectorId);
        }
    }

    /**
     * Handle accounts changed event with proper validation
     */
    private handleAccountsChanged(
        newAccounts: readonly WalletAccount[],
        connectorId: WalletConnectorId,
        wallet: Wallet,
    ): void {
        const state = this.getState();

        // If no accounts, disconnect
        if (newAccounts.length === 0) {
            this.log('No accounts available, disconnecting...');
            this.disconnect();
            return;
        }

        const sessionAccounts: SessionAccount[] = newAccounts.map(a => ({
            address: a.address as Address,
            label: a.label,
            account: a,
        }));

        const legacyAccounts = sessionAccounts.map(a => this.toAccountInfo(a.account));

        // Check if selected account is still available
        const currentSelected = state.selectedAccount;
        let selectedAccount = sessionAccounts.find(a => a.address === currentSelected);

        // If selected account is gone, select first available
        if (!selectedAccount) {
            selectedAccount = sessionAccounts[0];
            this.eventEmitter.emit({
                type: 'account:changed',
                account: selectedAccount.address,
                timestamp: new Date().toISOString(),
            });
        }

        // Update session in wallet status
        if (state.wallet.status === 'connected') {
            const session = this.createSession(wallet, connectorId, sessionAccounts, selectedAccount);
            this.updateWalletStatus({
                status: 'connected',
                session,
                connectorId,
                accounts: sessionAccounts,
                selectedAccount,
            });
        }

        // Update legacy state
        this.stateManager.updateState({
            accounts: legacyAccounts,
            selectedAccount: selectedAccount.address,
        });
    }

    /**
     * Start polling wallet accounts (vNext version)
     */
    private startPollingWalletAccountsVNext(wallet: Wallet, connectorId: WalletConnectorId): void {
        if (this.pollTimer) return;

        this.pollAttempts = 0;

        const poll = () => {
            if (this.pollAttempts >= MAX_POLL_ATTEMPTS) {
                this.stopPollingWalletAccounts();
                this.log('Stopped wallet polling after max attempts');
                return;
            }

            try {
                const walletAccounts = wallet.accounts;
                if (walletAccounts.length > 0) {
                    this.handleAccountsChanged(walletAccounts, connectorId, wallet);
                    this.pollAttempts = 0; // Reset on success
                }
            } catch (error) {
                this.log('Wallet polling error:', error);
            }

            this.pollAttempts++;
            const intervalIndex = Math.min(this.pollAttempts, POLL_INTERVALS_MS.length - 1);
            const interval = POLL_INTERVALS_MS[intervalIndex];
            this.pollTimer = setTimeout(poll, interval);
        };

        poll();
    }

    /**
     * Check if an error is recoverable
     */
    private isRecoverableError(error: Error): boolean {
        const message = error.message.toLowerCase();
        return (
            message.includes('user rejected') ||
            message.includes('user denied') ||
            message.includes('cancelled') ||
            message.includes('canceled')
        );
    }

    // ========================================================================
    // Legacy Connection Methods (kept for backwards compatibility)
    // ========================================================================

    /**
     * Connect to a wallet (legacy API)
     * @deprecated Use connectWallet() instead
     */
    async connect(wallet: Wallet, walletName?: string): Promise<void> {
        if (typeof window === 'undefined') return;

        const name = walletName || wallet.name;
        const attemptId = ++this.connectAttemptId;
        this.pendingWallet = wallet;
        this.pendingWalletName = name;

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
            if (attemptId !== this.connectAttemptId) {
                throw new Error('Connection cancelled');
            }

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

            // Only emit wallet:connected event if we have a valid account
            // The event type requires a non-null Address
            if (selected) {
                this.eventEmitter.emit({
                    type: 'wallet:connected',
                    wallet: name as WalletName,
                    account: selected as Address,
                    timestamp: new Date().toISOString(),
                });
            } else {
                this.log('⚠️ Connection succeeded but no account available', {
                    wallet: wallet.name,
                    accountsCount: accounts.length,
                });
            }

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
            // If this connect attempt was superseded/cancelled, do not mutate state here.
            // The cancel path is handled by disconnect().
            if (attemptId !== this.connectAttemptId) {
                throw e;
            }

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
        } finally {
            if (this.pendingWallet === wallet && this.pendingWalletName === name) {
                this.pendingWallet = null;
                this.pendingWalletName = null;
            }
        }
    }

    /**
     * Disconnect from wallet
     */
    async disconnect(): Promise<void> {
        // Invalidate any in-flight connect attempt so it can't update state later.
        this.connectAttemptId++;

        if (this.walletChangeUnsub) {
            this.walletChangeUnsub();
            this.walletChangeUnsub = null;
        }
        this.stopPollingWalletAccounts();

        const wallet = this.getState().selectedWallet ?? this.pendingWallet;
        this.pendingWallet = null;
        this.pendingWalletName = null;

        // Update wallet status to disconnected (vNext)
        this.updateWalletStatus(INITIAL_WALLET_STATUS);

        // Update legacy state immediately so UI is never stuck in a "connecting" state.
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

        // Attempt wallet disconnect after state is reset; don't block UI.
        if (wallet) {
            const disconnect = getDisconnectFeature(wallet);
            if (disconnect) {
                try {
                    await disconnect();
                } catch {
                    // ignore disconnect errors during cancellation
                }
            }
        }
    }

    /**
     * Select a different account
     */
    async selectAccount(address: string): Promise<void> {
        const state = this.getState();
        const current = state.selectedWallet;
        if (!current) throw new Error('No wallet connected');

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

        this.stateManager.updateState({ selectedAccount: target.address as Address });

        this.eventEmitter.emit({
            type: 'account:changed',
            account: target.address as Address,
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
            this.walletChangeUnsub();
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
