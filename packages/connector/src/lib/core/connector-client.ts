import type {
    ConnectorState,
    ConnectorConfig,
    ConnectorHealth,
    ConnectorDebugMetrics,
    ConnectorDebugState,
    Listener,
} from '../../types/connector';
import type { TransactionActivity } from '../../types/transactions';
import type { ConnectorEvent, ConnectorEventListener } from '../../types/events';
import type { SolanaClusterId, SolanaCluster } from '@wallet-ui/core';
import type { WalletInfo } from '../../types/wallets';
import { StateManager } from './state-manager';
import { EventEmitter } from './event-emitter';
import { DebugMetrics } from './debug-metrics';
import { WalletDetector } from '../connection/wallet-detector';
import { ConnectionManager } from '../connection/connection-manager';
import { AutoConnector } from '../connection/auto-connector';
import { ClusterManager } from '../cluster/cluster-manager';
import { TransactionTracker } from '../transaction/transaction-tracker';
import { HealthMonitor } from '../health/health-monitor';
import { getClusterRpcUrl } from '../../utils/cluster';
import { AUTO_CONNECT_DELAY_MS, DEFAULT_MAX_TRACKED_TRANSACTIONS } from '../constants';

/**
 * ConnectorClient - Lean coordinator that delegates to specialized collaborators
 *
 * Orchestrates wallet connection, state management, and event handling by wiring
 * together focused collaborators, each with a single responsibility.
 */
export class ConnectorClient {
    private stateManager: StateManager;
    private eventEmitter: EventEmitter;
    private walletDetector: WalletDetector;
    private connectionManager: ConnectionManager;
    private autoConnector: AutoConnector;
    private clusterManager: ClusterManager;
    private transactionTracker: TransactionTracker;
    private debugMetrics: DebugMetrics;
    private healthMonitor: HealthMonitor;
    private initialized = false;
    private config: ConnectorConfig;

    constructor(config: ConnectorConfig = {}) {
        this.config = config;

        const clusterConfig = config.cluster;
        const clusters = clusterConfig?.clusters ?? [];

        const initialState: ConnectorState = {
            wallets: [],
            selectedWallet: null,
            connected: false,
            connecting: false,
            accounts: [],
            selectedAccount: null,
            cluster: null,
            clusters: [],
        };

        this.stateManager = new StateManager(initialState);
        this.eventEmitter = new EventEmitter(config.debug);
        this.debugMetrics = new DebugMetrics();

        this.walletDetector = new WalletDetector(this.stateManager, this.eventEmitter, config.debug ?? false);

        this.connectionManager = new ConnectionManager(
            this.stateManager,
            this.eventEmitter,
            config.storage?.wallet,
            config.debug ?? false,
        );

        this.autoConnector = new AutoConnector(
            this.walletDetector,
            this.connectionManager,
            this.stateManager,
            config.storage?.wallet,
            config.debug ?? false,
        );

        this.clusterManager = new ClusterManager(
            this.stateManager,
            this.eventEmitter,
            config.storage?.cluster,
            config.cluster,
            config.debug ?? false,
        );

        this.transactionTracker = new TransactionTracker(
            this.stateManager,
            this.eventEmitter,
            DEFAULT_MAX_TRACKED_TRANSACTIONS,
            config.debug ?? false,
        );

        this.healthMonitor = new HealthMonitor(
            this.stateManager,
            config.storage?.wallet,
            config.storage?.cluster,
            () => this.initialized,
        );

        this.initialize();
    }

    /**
     * Initialize the connector
     */
    private initialize(): void {
        if (typeof window === 'undefined') return;
        if (this.initialized) return;

        try {
            this.walletDetector.initialize();

            if (this.config.autoConnect) {
                setTimeout(() => {
                    this.autoConnector.attemptAutoConnect().catch(err => {
                        if (this.config.debug) {
                            console.error('Auto-connect error:', err);
                        }
                    });
                }, AUTO_CONNECT_DELAY_MS);
            }

            this.initialized = true;
        } catch (e) {
            if (this.config.debug) {
                console.error('Connector initialization failed:', e);
            }
        }
    }

    // ============================================================================
    // Public API - Delegates to collaborators
    // ============================================================================

    /**
     * Connect to a wallet by name
     */
    async select(walletName: string): Promise<void> {
        const wallet = this.stateManager
            .getSnapshot()
            .wallets.find((w: WalletInfo) => w.wallet.name === walletName)?.wallet;
        if (!wallet) throw new Error(`Wallet ${walletName} not found`);
        await this.connectionManager.connect(wallet, walletName);
    }

    /**
     * Disconnect from the current wallet
     */
    async disconnect(): Promise<void> {
        await this.connectionManager.disconnect();
    }

    /**
     * Select a different account
     */
    async selectAccount(address: string): Promise<void> {
        await this.connectionManager.selectAccount(address);
    }

    /**
     * Set the active cluster (network)
     */
    async setCluster(clusterId: SolanaClusterId): Promise<void> {
        await this.clusterManager.setCluster(clusterId);
    }

    /**
     * Get the currently active cluster
     */
    getCluster(): SolanaCluster | null {
        return this.clusterManager.getCluster();
    }

    /**
     * Get all available clusters
     */
    getClusters(): SolanaCluster[] {
        return this.clusterManager.getClusters();
    }

    /**
     * Get the RPC URL for the current cluster
     * @returns RPC URL or null if no cluster is selected
     */
    getRpcUrl(): string | null {
        const cluster = this.clusterManager.getCluster();
        if (!cluster) return null;
        try {
            return getClusterRpcUrl(cluster);
        } catch (error) {
            if (this.config.debug) {
                console.error('Failed to get RPC URL:', error);
            }
            return null;
        }
    }

    /**
     * Subscribe to state changes
     */
    subscribe(listener: Listener): () => void {
        return this.stateManager.subscribe(listener);
    }

    /**
     * Get current state snapshot
     */
    getSnapshot(): ConnectorState {
        return this.stateManager.getSnapshot();
    }

    /**
     * Reset all storage to initial values
     * Useful for "logout", "forget this device", or clearing user data
     *
     * This will:
     * - Clear saved wallet name
     * - Clear saved account address
     * - Reset cluster to initial value (does not clear)
     *
     * Note: This does NOT disconnect the wallet. Call disconnect() separately if needed.
     *
     * @example
     * ```ts
     * // Complete logout flow
     * await client.disconnect();
     * client.resetStorage();
     * ```
     */
    resetStorage(): void {
        if (this.config.debug) {
            console.log('[Connector] Resetting all storage to initial values');
        }

        // Reset each storage adapter
        const storageKeys = ['account', 'wallet', 'cluster'] as const;

        for (const key of storageKeys) {
            const storage = this.config.storage?.[key];

            if (storage && 'reset' in storage && typeof storage.reset === 'function') {
                try {
                    storage.reset();
                    if (this.config.debug) {
                        console.log(`[Connector] Reset ${key} storage`);
                    }
                } catch (error) {
                    if (this.config.debug) {
                        console.error(`[Connector] Failed to reset ${key} storage:`, error);
                    }
                }
            }
        }

        this.eventEmitter.emit({
            type: 'storage:reset',
            timestamp: new Date().toISOString(),
        });
    }

    /**
     * Subscribe to connector events
     */
    on(listener: ConnectorEventListener): () => void {
        return this.eventEmitter.on(listener);
    }

    /**
     * Remove a specific event listener
     */
    off(listener: ConnectorEventListener): void {
        this.eventEmitter.off(listener);
    }

    /**
     * Remove all event listeners
     */
    offAll(): void {
        this.eventEmitter.offAll();
    }

    /**
     * Emit a connector event
     * Internal method used by transaction signer and other components
     * @internal
     */
    emitEvent(event: ConnectorEvent): void {
        this.eventEmitter.emit(event);
    }

    /**
     * Track a transaction for debugging and monitoring
     */
    trackTransaction(activity: Omit<TransactionActivity, 'timestamp' | 'cluster'>): void {
        this.transactionTracker.trackTransaction(activity);
    }

    /**
     * Update transaction status
     */
    updateTransactionStatus(signature: string, status: TransactionActivity['status'], error?: string): void {
        this.transactionTracker.updateStatus(signature, status, error);
    }

    /**
     * Clear transaction history
     */
    clearTransactionHistory(): void {
        this.transactionTracker.clearHistory();
    }

    /**
     * Get connector health and diagnostics
     */
    getHealth(): ConnectorHealth {
        return this.healthMonitor.getHealth();
    }

    /**
     * Get performance and debug metrics
     */
    getDebugMetrics(): ConnectorDebugMetrics {
        const snapshot = this.stateManager.getSnapshot();
        this.debugMetrics.updateListenerCounts(
            this.eventEmitter.getListenerCount(),
            0,
        );
        return this.debugMetrics.getMetrics();
    }

    /**
     * Get debug state including transactions
     */
    getDebugState(): ConnectorDebugState {
        return {
            ...this.getDebugMetrics(),
            transactions: this.transactionTracker.getTransactions(),
            totalTransactions: this.transactionTracker.getTotalCount(),
        };
    }

    /**
     * Reset debug metrics
     */
    resetDebugMetrics(): void {
        this.debugMetrics.resetMetrics();
    }

    /**
     * Cleanup resources
     */
    destroy(): void {
        this.connectionManager.disconnect().catch(() => {});
        this.walletDetector.destroy();
        this.eventEmitter.offAll();
        this.stateManager.clear();
    }
}
