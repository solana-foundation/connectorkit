import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ConnectorClient } from './connector-client';
import type { ConnectorConfig } from '../../types/connector';
import type { ConnectorState } from '../../types/connector';
import type { SolanaCluster } from '@wallet-ui/core';

// Mock all dependencies
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
        const { EventEmitter } = await import('./event-emitter');
        const { WalletDetector } = await import('../wallet/detector');
        const { ConnectionManager } = await import('../wallet/connection-manager');
        const { AutoConnector } = await import('../wallet/auto-connector');
        const { ClusterManager } = await import('../cluster/cluster-manager');
        const { HealthMonitor } = await import('../health/health-monitor');
        const { TransactionTracker } = await import('../transaction/transaction-tracker');
        const { DebugMetrics } = await import('../core/debug-metrics');

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
        vi.mocked(EventEmitter).mockImplementation(function () {
            return {
                emit: vi.fn(),
                on: vi.fn(() => vi.fn()),
                off: vi.fn(),
                offAll: vi.fn(),
                getListenerCount: vi.fn(() => 0),
            } as unknown as InstanceType<typeof EventEmitter>;
        });

        vi.mocked(WalletDetector).mockImplementation(function () {
            return {
                initialize: vi.fn(),
                destroy: vi.fn(),
                getDetectedWallets: vi.fn(() => []),
            } as unknown as InstanceType<typeof WalletDetector>;
        });

        vi.mocked(ConnectionManager).mockImplementation(function () {
            return {
                connect: vi.fn(async () => {
                    mockState.connected = true;
                    mockState.connecting = false;
                }),
                disconnect: vi.fn(async () => {
                    mockState.connected = false;
                    mockState.selectedWallet = null;
                }),
                selectAccount: vi.fn(),
            } as unknown as InstanceType<typeof ConnectionManager>;
        });

        vi.mocked(AutoConnector).mockImplementation(function () {
            return {
                initialize: vi.fn(),
                destroy: vi.fn(),
            } as unknown as InstanceType<typeof AutoConnector>;
        });

        vi.mocked(ClusterManager).mockImplementation(function () {
            return {
                setCluster: vi.fn(),
                getCurrentCluster: vi.fn(() => null),
            } as unknown as InstanceType<typeof ClusterManager>;
        });

        vi.mocked(HealthMonitor).mockImplementation(function () {
            return {
                getHealth: vi.fn(() => ({ initialized: true })),
            } as unknown as InstanceType<typeof HealthMonitor>;
        });

        vi.mocked(TransactionTracker).mockImplementation(function () {
            return {
                trackTransaction: vi.fn(),
                getTransactions: vi.fn(() => []),
                clearHistory: vi.fn(),
                getTotalCount: vi.fn(() => 0),
            } as unknown as InstanceType<typeof TransactionTracker>;
        });

        vi.mocked(DebugMetrics).mockImplementation(function () {
            return {
                getMetrics: vi.fn(() => ({})),
                reset: vi.fn(),
                updateListenerCounts: vi.fn(),
            } as unknown as InstanceType<typeof DebugMetrics>;
        });

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
