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
import { createLogger } from '../utils/secure-logger';

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

    private initialize(): void {
        if (typeof window === 'undefined') return;
        if (this.initialized) return;

        try {
            this.walletDetector.initialize();

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
        } catch (e) {
            if (this.config.debug) {
                logger.error('Connector initialization failed', { error: e });
            }
        }
    }

    async select(walletName: string): Promise<void> {
        const wallet = this.stateManager
            .getSnapshot()
            .wallets.find((w: WalletInfo) => w.wallet.name === walletName)?.wallet;
        if (!wallet) throw new Error(`Wallet ${walletName} not found`);
        await this.connectionManager.connect(wallet, walletName);
    }

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
        try {
            return getClusterRpcUrl(cluster);
        } catch (error) {
            if (this.config.debug) {
                logger.error('Failed to get RPC URL', { error });
            }
            return null;
        }
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
                try {
                    storage.reset();
                    if (this.config.debug) {
                        logger.debug('Reset storage', { key });
                    }
                } catch (error) {
                    if (this.config.debug) {
                        logger.error('Failed to reset storage', { key, error });
                    }
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

    resetDebugMetrics(): void {
        this.debugMetrics.resetMetrics();
    }

    destroy(): void {
        this.connectionManager.disconnect().catch(() => {});
        this.walletDetector.destroy();
        this.eventEmitter.offAll();
        this.stateManager.clear();
    }
}
