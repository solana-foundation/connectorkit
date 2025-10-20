import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ConnectorClient } from './connector-client';
import type { ConnectorConfig } from '../../types/connector';

// Mock all dependencies
vi.mock('./state-manager');
vi.mock('./event-emitter');
vi.mock('../connection/wallet-detector');
vi.mock('../connection/connection-manager');
vi.mock('../connection/auto-connector');
vi.mock('../cluster/cluster-manager');
vi.mock('../health/health-monitor');
vi.mock('../transaction/transaction-tracker');
vi.mock('../core/debug-metrics');
vi.mock('../utils/secure-logger', () => ({
    createLogger: vi.fn(() => ({ info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() })),
}));

describe('ConnectorClient', () => {
    let client: ConnectorClient;
    let config: ConnectorConfig;

    beforeEach(async () => {
        vi.clearAllMocks();

        // Import mocks
        const { StateManager } = await import('./state-manager');
        const { EventEmitter } = await import('./event-emitter');
        const { WalletDetector } = await import('../connection/wallet-detector');
        const { ConnectionManager } = await import('../connection/connection-manager');
        const { AutoConnector } = await import('../connection/auto-connector');
        const { ClusterManager } = await import('../cluster/cluster-manager');
        const { HealthMonitor } = await import('../health/health-monitor');
        const { TransactionTracker } = await import('../transaction/transaction-tracker');
        const { DebugMetrics } = await import('../core/debug-metrics');

        // Setup StateManager mock with proper state management
        const mockState = {
            wallets: [],
            connected: false,
            selectedWallet: null,
            accounts: [],
            selectedAccount: null,
            connecting: false,
            cluster: null,
            clusters: [],
        };
        let stateListeners: Function[] = [];

        vi.mocked(StateManager).mockImplementation(
            () =>
                ({
                    getSnapshot: vi.fn(() => mockState),
                    updateState: vi.fn(updates => {
                        Object.assign(mockState, updates);
                        stateListeners.forEach(l => l());
                    }),
                    subscribe: vi.fn(listener => {
                        stateListeners.push(listener);
                        return () => {
                            stateListeners = stateListeners.filter(l => l !== listener);
                        };
                    }),
                }) as any,
        );

        vi.mocked(EventEmitter).mockImplementation(
            () =>
                ({
                    emit: vi.fn(),
                    on: vi.fn(() => vi.fn()),
                }) as any,
        );

        vi.mocked(WalletDetector).mockImplementation(
            () =>
                ({
                    initialize: vi.fn(),
                    destroy: vi.fn(),
                    getDetectedWallets: vi.fn(() => []),
                }) as any,
        );

        vi.mocked(ConnectionManager).mockImplementation(
            () =>
                ({
                    connect: vi.fn(async () => {
                        mockState.connected = true;
                        mockState.connecting = false;
                    }),
                    disconnect: vi.fn(async () => {
                        mockState.connected = false;
                        mockState.selectedWallet = null;
                    }),
                    selectAccount: vi.fn(),
                }) as any,
        );

        vi.mocked(AutoConnector).mockImplementation(
            () =>
                ({
                    initialize: vi.fn(),
                    destroy: vi.fn(),
                }) as any,
        );

        vi.mocked(ClusterManager).mockImplementation(
            () =>
                ({
                    setCluster: vi.fn(),
                    getCurrentCluster: vi.fn(() => null),
                }) as any,
        );

        vi.mocked(HealthMonitor).mockImplementation(
            () =>
                ({
                    getHealth: vi.fn(() => ({ initialized: true })),
                }) as any,
        );

        vi.mocked(TransactionTracker).mockImplementation(
            () =>
                ({
                    trackTransaction: vi.fn(),
                    getTransactions: vi.fn(() => []),
                    clearHistory: vi.fn(),
                }) as any,
        );

        vi.mocked(DebugMetrics).mockImplementation(
            () =>
                ({
                    getMetrics: vi.fn(() => ({})),
                    reset: vi.fn(),
                }) as any,
        );

        config = {
            clusters: [
                { id: 'solana:mainnet', name: 'Mainnet', rpcUrl: 'https://api.mainnet.solana.com' },
                { id: 'solana:devnet', name: 'Devnet', rpcUrl: 'https://api.devnet.solana.com' },
            ],
        };

        client = new ConnectorClient(config);
    });

    describe('initialization', () => {
        it('should initialize with default state', () => {
            const state = client.getSnapshot();

            expect(state.connected).toBe(false);
            expect(state.wallets).toEqual([]);
            expect(state.selectedWallet).toBeNull();
        });
    });

    describe('state management', () => {
        it('should allow subscribing to state changes', () => {
            const listener = vi.fn();
            const unsubscribe = client.subscribe(listener);

            expect(typeof unsubscribe).toBe('function');
            expect(listener).not.toHaveBeenCalled(); // Not called on subscribe
        });

        it('should get current state snapshot', () => {
            const snapshot = client.getSnapshot();

            expect(snapshot).toHaveProperty('wallets');
            expect(snapshot).toHaveProperty('connected');
            expect(snapshot).toHaveProperty('selectedWallet');
            expect(snapshot).toHaveProperty('accounts');
            expect(snapshot).toHaveProperty('cluster');
        });
    });

    describe('event system', () => {
        it('should register event listeners', () => {
            const listener = vi.fn();
            const unsubscribe = client.on('wallet:connected', listener);

            expect(typeof unsubscribe).toBe('function');
        });
    });

    describe('health monitoring', () => {
        it('should return health status', () => {
            const health = client.getHealth();

            expect(health).toHaveProperty('initialized');
        });
    });

    describe('cleanup', () => {
        it('should have destroy method for cleanup', () => {
            expect(typeof client.destroy).toBe('function');
        });
    });
});
