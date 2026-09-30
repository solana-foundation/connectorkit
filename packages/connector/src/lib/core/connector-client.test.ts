import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ConnectorClient } from './connector-client';
import type { ConnectorConfig } from '../../types/connector';
import type { ConnectorState } from '../../types/connector';
import type { StateManager } from './state-manager';
import type { SolanaCluster } from '@wallet-ui/core';

const registerWalletConnectWallet = vi.hoisted(() => vi.fn());

// Mock all dependencies
vi.mock('./event-emitter');
vi.mock('../wallet/kit-wallet-core');
vi.mock('../wallet/walletconnect', () => ({ registerWalletConnectWallet }));
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
        const { KitWalletCore } = await import('../wallet/kit-wallet-core');
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

        vi.mocked(KitWalletCore).mockImplementation(function () {
            return {
                start: vi.fn(),
                setChain: vi.fn(async () => {}),
                destroy: vi.fn(),
                getConnectorById: vi.fn(() => undefined),
                connectWallet: vi.fn(async () => {
                    mockState.connected = true;
                    mockState.connecting = false;
                }),
                connectByName: vi.fn(async () => {
                    mockState.connected = true;
                    mockState.connecting = false;
                }),
                disconnect: vi.fn(async () => {
                    mockState.connected = false;
                    mockState.selectedWallet = null;
                }),
                selectAccount: vi.fn(async () => {}),
            } as unknown as InstanceType<typeof KitWalletCore>;
        });

        vi.mocked(ClusterManager).mockImplementation(function () {
            return {
                setCluster: vi.fn(),
                getCluster: vi.fn(() => null),
                getCurrentCluster: vi.fn(() => null),
                getServerCluster: vi.fn(() => undefined),
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

        it('should keep the server snapshot pinned to pre-initialization state', () => {
            const serverSnapshot = client.getServerSnapshot();
            const stateManager = (client as unknown as { stateManager: StateManager }).stateManager;

            stateManager.updateState({ connecting: true });

            // React reads the server snapshot while hydrating, so live wallet
            // activity must not leak into it or the markup diverges.
            expect(client.getSnapshot().connecting).toBe(true);
            expect(client.getServerSnapshot()).toBe(serverSnapshot);
            expect(serverSnapshot.connecting).toBe(false);
        });
    });

    describe('cluster switching', () => {
        it('setCluster resolves without awaiting the wallet chain swap', async () => {
            const { KitWalletCore } = await import('../wallet/kit-wallet-core');
            const kitCore = vi.mocked(KitWalletCore).mock.results[0].value as {
                setChain: ReturnType<typeof vi.fn>;
            };
            // A wallet that never answers its silent reconnect must not hang
            // the cluster switch.
            kitCore.setChain.mockReturnValue(new Promise(() => {}));

            await expect(client.setCluster('solana:devnet')).resolves.toBeUndefined();
            expect(kitCore.setChain).toHaveBeenCalled();
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

        it('re-initializes the wallet core after destroy (StrictMode remount)', async () => {
            const { KitWalletCore } = await import('../wallet/kit-wallet-core');
            const kitCore = vi.mocked(KitWalletCore).mock.results[0].value as {
                start: ReturnType<typeof vi.fn>;
                destroy: ReturnType<typeof vi.fn>;
            };
            expect(kitCore.start).toHaveBeenCalledTimes(1);

            // StrictMode runs mount → cleanup (destroy) → mount (initialize)
            // against the same ref-held client instance.
            client.destroy();
            (client as unknown as { initialize: () => void }).initialize();

            expect(kitCore.destroy).toHaveBeenCalledTimes(1);
            expect(kitCore.start).toHaveBeenCalledTimes(2);
        });

        it('discards a WalletConnect registration that resolves after destroy and re-init', async () => {
            const resolvers: Array<(registration: { unregister: ReturnType<typeof vi.fn> }) => void> = [];
            registerWalletConnectWallet.mockImplementation(() => new Promise(resolve => resolvers.push(resolve)));

            const wcClient = new ConnectorClient({ walletConnect: { enabled: true, projectId: 'test' } });
            await vi.waitFor(() => expect(registerWalletConnectWallet).toHaveBeenCalledTimes(1));

            // Destroy while the first registration is still in flight, then
            // re-initialize (StrictMode remount) — starting a second one.
            wcClient.destroy();
            (wcClient as unknown as { initialize: () => void }).initialize();
            await vi.waitFor(() => expect(registerWalletConnectWallet).toHaveBeenCalledTimes(2));

            // The stale first registration must be unregistered, not tracked.
            const stale = { unregister: vi.fn() };
            resolvers[0](stale);
            await vi.waitFor(() => expect(stale.unregister).toHaveBeenCalledTimes(1));

            // The current lifecycle's registration is tracked and cleaned up
            // by the next destroy.
            const current = { unregister: vi.fn() };
            resolvers[1](current);
            await vi.waitFor(() =>
                expect((wcClient as unknown as { walletConnectRegistration: unknown }).walletConnectRegistration).toBe(
                    current,
                ),
            );
            expect(current.unregister).not.toHaveBeenCalled();

            wcClient.destroy();
            expect(current.unregister).toHaveBeenCalledTimes(1);
        });
    });
});
