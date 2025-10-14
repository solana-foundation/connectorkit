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
            20,
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
                }, 100);
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
