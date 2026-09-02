import type {
    ConnectorState,
    ConnectorConfig,
    ConnectorHealth,
    ConnectorDebugMetrics,
    ConnectorDebugState,
    Listener,
} from '../../types/connector';
import type { SolanaTransaction, TransactionActivity } from '../../types/transactions';
import type { ConnectorEvent, ConnectorEventListener } from '../../types/events';
import type { SolanaClusterId, SolanaCluster } from '@wallet-ui/core';
import type { WalletConnectorId, ConnectOptions } from '../../types/session';
import { INITIAL_WALLET_STATUS } from '../../types/session';
import { StateManager } from './state-manager';
import { EventEmitter } from './event-emitter';
import { DebugMetrics } from './debug-metrics';
import { KitWalletCore, normalizeWalletChain } from '../wallet/kit-wallet-core';
import { ClusterManager } from '../cluster/cluster-manager';
import { TransactionTracker } from '../transaction/transaction-tracker';
import { HealthMonitor } from '../health/health-monitor';
import { getClusterRpcUrl } from '../../utils/cluster';
import { DEFAULT_MAX_TRACKED_TRANSACTIONS } from '../constants';
import { createLogger } from '../utils/secure-logger';
import { tryCatchSync } from './try-catch';
import type { WalletConnectRegistration } from '../wallet/walletconnect';
import { prepareTransactionForWallet } from '../../utils/transaction-format';

const logger = createLogger('ConnectorClient');

export class ConnectorClient {
    private stateManager: StateManager;
    private eventEmitter: EventEmitter;
    private kitWalletCore: KitWalletCore;
    private clusterManager: ClusterManager;
    private transactionTracker: TransactionTracker;
    private debugMetrics: DebugMetrics;
    private healthMonitor: HealthMonitor;
    private initialized = false;
    private serverSnapshot: ConnectorState;
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

        this.kitWalletCore = new KitWalletCore(this.stateManager, this.eventEmitter, {
            additionalWallets: config.additionalWallets,
            autoConnect: config.autoConnect ?? false,
            debug: config.debug ?? false,
            display: config.wallets,
            walletStorage: config.storage?.wallet,
        });

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

        // ClusterManager restores a persisted cluster in its constructor, which
        // is browser-only, so the live snapshot already diverges from what a
        // server render produced. Roll that one field back.
        const snapshot = this.stateManager.getSnapshot();
        const serverCluster = this.clusterManager.getServerCluster();
        this.serverSnapshot = serverCluster === undefined ? snapshot : { ...snapshot, cluster: serverCluster };

        this.initialize();
    }

    private initialize(): void {
        if (typeof window === 'undefined') return;
        if (this.initialized) return;

        const { error } = tryCatchSync(() => {
            // Discovery, connection lifecycle, persistence, and auto-connect
            // are handled by the kit wallet plugin behind KitWalletCore
            this.kitWalletCore.start(normalizeWalletChain(this.clusterManager.getCluster()?.id));

            // Register WalletConnect wallet if enabled
            if (this.config.walletConnect?.enabled) {
                this.initializeWalletConnect().catch(err => {
                    if (this.config.debug) {
                        logger.error('WalletConnect initialization failed', { error: err });
                    }
                });
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
            const registration = await registerWalletConnectWallet(this.config.walletConnect);

            // destroy() may have run while the import was in flight; a
            // registration completing now would outlive the client and leak.
            if (!this.initialized) {
                registration.unregister();
                return;
            }
            this.walletConnectRegistration = registration;

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
     * @param options - Connection options (preferred account)
     */
    async connectWallet(connectorId: WalletConnectorId, options?: ConnectOptions): Promise<void> {
        await this.kitWalletCore.connectWallet(connectorId, options);
    }

    /**
     * Disconnect the current wallet session.
     * This is the vNext equivalent of disconnect().
     */
    async disconnectWallet(): Promise<void> {
        await this.kitWalletCore.disconnect();
    }

    /**
     * Get a connector by its ID (for advanced use cases).
     */
    getConnector(connectorId: WalletConnectorId) {
        return this.kitWalletCore.getConnectorById(connectorId);
    }

    // ========================================================================
    // Legacy Actions (kept for backwards compatibility)
    // ========================================================================

    /**
     * @deprecated Use `connectWallet(connectorId)` instead.
     */
    async select(walletName: string): Promise<void> {
        await this.kitWalletCore.connectByName(walletName);
    }

    /**
     * @deprecated Use `disconnectWallet()` instead.
     */
    async disconnect(): Promise<void> {
        await this.kitWalletCore.disconnect();
    }

    async selectAccount(address: string): Promise<void> {
        await this.kitWalletCore.selectAccount(address);
    }

    async setCluster(clusterId: SolanaClusterId): Promise<void> {
        await this.clusterManager.setCluster(clusterId);
        // The replacement wallet client's warm-up silently reconnects through
        // the wallet extension, which can take arbitrarily long (the plugin
        // puts no timeout on it), so the cluster switch must not wait on it.
        // KitWalletCore's swap counter discards warm-ups a newer switch or a
        // destroy() has made stale.
        void this.kitWalletCore
            .setChain(normalizeWalletChain(this.clusterManager.getCluster()?.id))
            .catch((error: unknown) => {
                if (this.config.debug) {
                    logger.error('Wallet chain swap failed', { error });
                }
            });
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

    /**
     * State as it stands before wallet discovery, persistence, and auto-connect
     * run — all of which are browser-only. A server render can only ever see
     * this, so React's hydration pass has to see it too: reading live state
     * there renders an in-flight auto-connect (a spinner, a wallet list) into
     * markup the server wrote as idle, and the mismatch throws away the tree.
     * The subscription then delivers live state on the next render.
     */
    getServerSnapshot(): ConnectorState {
        return this.serverSnapshot;
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

    /**
     * Emit a pre-send transaction preview event for devtools.
     *
     * This does not sign or send the transaction. It exists so apps that do not
     * use the connector transaction signer can still surface wire bytes in the
     * debugger (e.g. to simulate before sending).
     */
    previewTransaction(transaction: SolanaTransaction): void {
        const { serialized } = prepareTransactionForWallet(transaction);
        this.eventEmitter.emit({
            type: 'transaction:preparing',
            transaction: serialized,
            size: serialized.length,
            timestamp: new Date().toISOString(),
        });
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

        this.kitWalletCore.destroy();
        this.eventEmitter.offAll();
        this.stateManager.clear();

        // The provider reuses this instance across an unmount/remount cycle
        // (React StrictMode runs one on every dev mount) and re-runs
        // initialize(), which must not early-return against a torn-down core.
        this.initialized = false;
    }
}
