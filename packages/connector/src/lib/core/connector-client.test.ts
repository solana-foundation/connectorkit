import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ConnectorClient } from './connector-client';
import type { ConnectorConfig } from '../../types/connector';
import type { ConnectorState } from '../../types/connector';
import type { Listener } from '../../types/connector';
import type { SolanaCluster } from '@wallet-ui/core';

// Mock all dependencies
vi.mock('./state-manager');
vi.mock('./event-emitter');
vi.mock('../wallet/detector');
vi.mock('../wallet/connection-manager');
vi.mock('../wallet/auto-connector');
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
        const { WalletDetector } = await import('../wallet/detector');
        const { ConnectionManager } = await import('../wallet/connection-manager');
        const { AutoConnector } = await import('../wallet/auto-connector');
        const { ClusterManager } = await import('../cluster/cluster-manager');
        const { HealthMonitor } = await import('../health/health-monitor');
        const { TransactionTracker } = await import('../transaction/transaction-tracker');
        const { DebugMetrics } = await import('../core/debug-metrics');

        // Setup StateManager mock with proper state management
        const mockState: ConnectorState = {
            wallets: [],
            connected: false,
            selectedWallet: null,
            accounts: [],
            selectedAccount: null,
            connecting: false,
            cluster: null,
            clusters: [],
        };
        let stateListeners: Listener[] = [];

        vi.mocked(StateManager).mockImplementation(
            () =>
                ({
                    getSnapshot: vi.fn(() => mockState),
                    updateState: vi.fn(updates => {
                        Object.assign(mockState, updates);
                        stateListeners.forEach(l => l(mockState));
                    }),
                    subscribe: vi.fn(listener => {
                        stateListeners.push(listener);
                        return () => {
                            stateListeners = stateListeners.filter(l => l !== listener);
                        };
                    }),
                    clear: vi.fn(),
                }) as unknown as InstanceType<typeof StateManager>,
        );

        vi.mocked(EventEmitter).mockImplementation(
            () =>
                ({
                    emit: vi.fn(),
                    on: vi.fn(() => vi.fn()),
                    off: vi.fn(),
                    offAll: vi.fn(),
                    getListenerCount: vi.fn(() => 0),
                }) as unknown as InstanceType<typeof EventEmitter>,
        );

        vi.mocked(WalletDetector).mockImplementation(
            () =>
                ({
                    initialize: vi.fn(),
                    destroy: vi.fn(),
                    getDetectedWallets: vi.fn(() => []),
                }) as unknown as InstanceType<typeof WalletDetector>,
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
                }) as unknown as InstanceType<typeof ConnectionManager>,
        );

        vi.mocked(AutoConnector).mockImplementation(
            () =>
                ({
                    initialize: vi.fn(),
                    destroy: vi.fn(),
                }) as unknown as InstanceType<typeof AutoConnector>,
        );

        vi.mocked(ClusterManager).mockImplementation(
            () =>
                ({
                    setCluster: vi.fn(),
                    getCurrentCluster: vi.fn(() => null),
                }) as unknown as InstanceType<typeof ClusterManager>,
        );

        vi.mocked(HealthMonitor).mockImplementation(
            () =>
                ({
                    getHealth: vi.fn(() => ({ initialized: true })),
                }) as unknown as InstanceType<typeof HealthMonitor>,
        );

        vi.mocked(TransactionTracker).mockImplementation(
            () =>
                ({
                    trackTransaction: vi.fn(),
                    getTransactions: vi.fn(() => []),
                    clearHistory: vi.fn(),
                    getTotalCount: vi.fn(() => 0),
                }) as unknown as InstanceType<typeof TransactionTracker>,
        );

        vi.mocked(DebugMetrics).mockImplementation(
            () =>
                ({
                    getMetrics: vi.fn(() => ({})),
                    reset: vi.fn(),
                    updateListenerCounts: vi.fn(),
                }) as unknown as InstanceType<typeof DebugMetrics>,
        );

        config = {
            cluster: {
                clusters: [
                    {
                        id: 'solana:mainnet',
                        label: 'Mainnet',
                        url: 'https://api.mainnet.solana.com',
                    } satisfies SolanaCluster,
                    {
                        id: 'solana:devnet',
                        label: 'Devnet',
                        url: 'https://api.devnet.solana.com',
                    } satisfies SolanaCluster,
                ],
            },
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
            const unsubscribe = client.on(listener);

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
