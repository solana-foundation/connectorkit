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
import type { WalletConnectorId, ConnectOptions } from '../../types/session';
import { INITIAL_WALLET_STATUS } from '../../types/session';
import { StateManager } from './state-manager';
import { EventEmitter } from './event-emitter';
import { DebugMetrics } from './debug-metrics';
import { WalletDetector } from '../wallet/detector';
import { ConnectionManager } from '../wallet/connection-manager';
import { AutoConnector } from '../wallet/auto-connector';
import { ClusterManager } from '../cluster/cluster-manager';
import { TransactionTracker } from '../transaction/transaction-tracker';
import { HealthMonitor } from '../health/health-monitor';
import { getClusterRpcUrl } from '../../utils/cluster';
import { AUTO_CONNECT_DELAY_MS, DEFAULT_MAX_TRACKED_TRANSACTIONS } from '../constants';
import { createLogger } from '../utils/secure-logger';
import { tryCatchSync } from './try-catch';
import type { WalletConnectRegistration } from '../wallet/walletconnect';

const logger = createLogger('ConnectorClient');

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
    private walletConnectRegistration: WalletConnectRegistration | null = null;

    constructor(config: ConnectorConfig = {}) {
        this.config = config;

        const clusterConfig = config.cluster;
        const clusters = clusterConfig?.clusters ?? [];

        const initialState: ConnectorState = {
            // vNext wallet status
            wallet: INITIAL_WALLET_STATUS,
            connectors: [],

            // Legacy fields (for backwards compatibility)
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

    private initialize(): void {
        if (typeof window === 'undefined') return;
        if (this.initialized) return;

        const { error } = tryCatchSync(() => {
            this.walletDetector.initialize();

            // Register WalletConnect wallet if enabled
            if (this.config.walletConnect?.enabled) {
                this.initializeWalletConnect().catch(err => {
                    if (this.config.debug) {
                        logger.error('WalletConnect initialization failed', { error: err });
                    }
                });
            }

            if (this.config.autoConnect) {
                setTimeout(() => {
                    this.autoConnector.attemptAutoConnect().catch(err => {
                        if (this.config.debug) {
                            logger.error('Auto-connect error', { error: err });
                        }
                    });
                }, AUTO_CONNECT_DELAY_MS);
            }

            this.initialized = true;
        });

        if (error && this.config.debug) {
            logger.error('Connector initialization failed', { error });
        }
    }

    /**
     * Initialize WalletConnect integration
     * Dynamically imports and registers the WalletConnect wallet
     */
    private async initializeWalletConnect(): Promise<void> {
        if (!this.config.walletConnect?.enabled) return;

        try {
            // Dynamically import to avoid bundling WalletConnect if not used
            const { registerWalletConnectWallet } = await import('../wallet/walletconnect');
            this.walletConnectRegistration = await registerWalletConnectWallet(this.config.walletConnect);

            if (this.config.debug) {
                logger.info('WalletConnect wallet registered successfully');
            }
        } catch (error) {
            if (this.config.debug) {
                logger.error('Failed to register WalletConnect wallet', { error });
            }
            // Don't throw - WalletConnect is optional functionality
        }
    }

    // ========================================================================
    // vNext Wallet Actions (connector-id based)
    // ========================================================================

    /**
     * Connect to a wallet using its stable connector ID.
     * This is the recommended way to connect in vNext.
     *
     * @param connectorId - Stable connector identifier
     * @param options - Connection options (silent mode, preferred account, etc.)
     */
    async connectWallet(connectorId: WalletConnectorId, options?: ConnectOptions): Promise<void> {
        const connector = this.walletDetector.getConnectorById(connectorId);
        if (!connector) {
            throw new Error(`Connector ${connectorId} not found`);
        }
        await this.connectionManager.connectWallet(connector, connectorId, options);
    }

    /**
     * Disconnect the current wallet session.
     * This is the vNext equivalent of disconnect().
     */
    async disconnectWallet(): Promise<void> {
        await this.connectionManager.disconnect();
    }

    /**
     * Get a connector by its ID (for advanced use cases).
     */
    getConnector(connectorId: WalletConnectorId) {
        return this.walletDetector.getConnectorById(connectorId);
    }

    // ========================================================================
    // Legacy Actions (kept for backwards compatibility)
    // ========================================================================

    /**
     * @deprecated Use `connectWallet(connectorId)` instead.
     */
    async select(walletName: string): Promise<void> {
        const wallet = this.stateManager
            .getSnapshot()
            .wallets.find((w: WalletInfo) => w.wallet.name === walletName)?.wallet;
        if (!wallet) throw new Error(`Wallet ${walletName} not found`);
        await this.connectionManager.connect(wallet, walletName);
    }

    /**
     * @deprecated Use `disconnectWallet()` instead.
     */
    async disconnect(): Promise<void> {
        await this.connectionManager.disconnect();
    }

    async selectAccount(address: string): Promise<void> {
        await this.connectionManager.selectAccount(address);
    }

    async setCluster(clusterId: SolanaClusterId): Promise<void> {
        await this.clusterManager.setCluster(clusterId);
    }

    getCluster(): SolanaCluster | null {
        return this.clusterManager.getCluster();
    }

    getClusters(): SolanaCluster[] {
        return this.clusterManager.getClusters();
    }

    getRpcUrl(): string | null {
        const cluster = this.clusterManager.getCluster();
        if (!cluster) return null;

        const { data, error } = tryCatchSync(() => getClusterRpcUrl(cluster));
        if (error) {
            if (this.config.debug) {
                logger.error('Failed to get RPC URL', { error });
            }
            return null;
        }
        return data;
    }

    subscribe(listener: Listener): () => void {
        return this.stateManager.subscribe(listener);
    }

    getSnapshot(): ConnectorState {
        return this.stateManager.getSnapshot();
    }

    resetStorage(): void {
        if (this.config.debug) {
            logger.info('Resetting all storage to initial values');
        }

        const storageKeys = ['account', 'wallet', 'cluster'] as const;

        for (const key of storageKeys) {
            const storage = this.config.storage?.[key];

            if (storage && 'reset' in storage && typeof storage.reset === 'function') {
                const resetFn = storage.reset as () => void;
                const { error } = tryCatchSync(() => resetFn());
                if (error) {
                    if (this.config.debug) {
                        logger.error('Failed to reset storage', { key, error });
                    }
                } else if (this.config.debug) {
                    logger.debug('Reset storage', { key });
                }
            }
        }

        this.eventEmitter.emit({
            type: 'storage:reset',
            timestamp: new Date().toISOString(),
        });
    }

    on(listener: ConnectorEventListener): () => void {
        return this.eventEmitter.on(listener);
    }

    off(listener: ConnectorEventListener): void {
        this.eventEmitter.off(listener);
    }

    offAll(): void {
        this.eventEmitter.offAll();
    }

    emitEvent(event: ConnectorEvent): void {
        this.eventEmitter.emit(event);
    }

    trackTransaction(activity: Omit<TransactionActivity, 'timestamp' | 'cluster'>): void {
        this.transactionTracker.trackTransaction(activity);
    }

    updateTransactionStatus(signature: string, status: TransactionActivity['status'], error?: string): void {
        this.transactionTracker.updateStatus(signature, status, error);
    }

    clearTransactionHistory(): void {
        this.transactionTracker.clearHistory();
    }

    getHealth(): ConnectorHealth {
        return this.healthMonitor.getHealth();
    }

    getDebugMetrics(): ConnectorDebugMetrics {
        const snapshot = this.stateManager.getSnapshot();
        this.debugMetrics.updateListenerCounts(this.eventEmitter.getListenerCount(), 0);
        return this.debugMetrics.getMetrics();
    }

    getDebugState(): ConnectorDebugState {
        return {
            ...this.getDebugMetrics(),
            transactions: this.transactionTracker.getTransactions(),
            totalTransactions: this.transactionTracker.getTotalCount(),
        };
    }

    /**
     * Get the current connector configuration
     */
    getConfig(): ConnectorConfig {
        return this.config;
    }

    resetDebugMetrics(): void {
        this.debugMetrics.resetMetrics();
    }

    destroy(): void {
        // Unregister WalletConnect wallet if it was registered
        if (this.walletConnectRegistration) {
            try {
                this.walletConnectRegistration.unregister();
                this.walletConnectRegistration = null;
            } catch (error) {
                if (this.config.debug) {
                    logger.warn('Error unregistering WalletConnect wallet', { error });
                }
            }
        }

        this.connectionManager.disconnect().catch(() => {});
        this.walletDetector.destroy();
        this.eventEmitter.offAll();
        this.stateManager.clear();
    }
}
