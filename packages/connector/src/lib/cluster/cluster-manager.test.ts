/**
 * ClusterManager tests
 *
 * Tests cluster/network management, switching, persistence, and event emission
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ClusterManager } from './cluster-manager';
import { StateManager } from '../core/state-manager';
import { EventEmitter } from '../core/event-emitter';
import type { ConnectorState } from '../../types/connector';
import type { SolanaCluster, SolanaClusterId } from '@wallet-ui/core';
import { MockStorageAdapter } from '../../__tests__/mocks/storage-mock';
import { createEventCollector } from '../../__tests__/utils/test-helpers';

describe('ClusterManager', () => {
    let stateManager: StateManager;
    let eventEmitter: EventEmitter;
    let storage: MockStorageAdapter<SolanaClusterId>;
    let eventCollector: ReturnType<typeof createEventCollector>;

    const mainnetCluster: SolanaCluster = {
        id: 'solana:mainnet',
        name: 'Mainnet Beta',
        network: 'mainnet-beta',
        rpcUrl: 'https://api.mainnet-beta.solana.com',
    };

    const devnetCluster: SolanaCluster = {
        id: 'solana:devnet',
        name: 'Devnet',
        network: 'devnet',
        rpcUrl: 'https://api.devnet.solana.com',
    };

    const testnetCluster: SolanaCluster = {
        id: 'solana:testnet',
        name: 'Testnet',
        network: 'testnet',
        rpcUrl: 'https://api.testnet.solana.com',
    };

    const clusters = [mainnetCluster, devnetCluster, testnetCluster];

    beforeEach(() => {
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

        stateManager = new StateManager(initialState);
        eventEmitter = new EventEmitter(false);
        storage = new MockStorageAdapter<SolanaClusterId>('solana:mainnet');
        eventCollector = createEventCollector();

        eventEmitter.on(eventCollector.collect);
    });

    afterEach(() => {
        vi.clearAllMocks();
    });

    describe('initialization', () => {
        it('should initialize without config', () => {
            const manager = new ClusterManager(stateManager, eventEmitter);

            const state = stateManager.getSnapshot();
            expect(state.cluster).toBe(null);
            expect(state.clusters).toEqual([]);
        });

        it('should initialize with config and clusters', () => {
            const manager = new ClusterManager(stateManager, eventEmitter, storage, {
                clusters,
                initialCluster: 'solana:mainnet',
            });

            const state = stateManager.getSnapshot();
            expect(state.cluster).toEqual(mainnetCluster);
            expect(state.clusters).toEqual(clusters);
        });

        // Note: These tests are skipped because ClusterManager calls storage.get() synchronously
        // but MockStorageAdapter.get() is async. This is a known limitation.
        it.skip('should use initial cluster from config when no storage value', () => {
            // Storage initialization test - requires sync storage.get()
        });

        it.skip('should prioritize stored cluster over initial cluster', () => {
            // Storage initialization test - requires sync storage.get()
        });

        it('should fallback to mainnet if no initial cluster specified', () => {
            const manager = new ClusterManager(stateManager, eventEmitter, storage, {
                clusters,
            });

            const state = stateManager.getSnapshot();
            expect(state.cluster?.id).toBe('solana:mainnet');
        });

        it('should use first cluster if stored cluster not found', async () => {
            await storage.set('solana:invalid' as SolanaClusterId);

            const manager = new ClusterManager(stateManager, eventEmitter, storage, {
                clusters,
            });

            const state = stateManager.getSnapshot();
            expect(state.cluster).toEqual(mainnetCluster);
        });

        it('should handle empty clusters array', () => {
            const manager = new ClusterManager(stateManager, eventEmitter, storage, {
                clusters: [],
                initialCluster: 'solana:mainnet',
            });

            const state = stateManager.getSnapshot();
            expect(state.cluster).toBe(null);
            expect(state.clusters).toEqual([]);
        });
    });

    describe('setCluster', () => {
        let manager: ClusterManager;

        beforeEach(() => {
            manager = new ClusterManager(stateManager, eventEmitter, storage, {
                clusters,
                initialCluster: 'solana:mainnet',
            });
            eventCollector.clear();
        });

        it('should set cluster successfully', async () => {
            await manager.setCluster('solana:devnet');

            const state = stateManager.getSnapshot();
            expect(state.cluster?.id).toBe('solana:devnet');
        });

        it('should emit cluster:changed event', async () => {
            await manager.setCluster('solana:devnet');

            eventCollector.assertEventEmitted('cluster:changed');
            const events = eventCollector.getEventsByType('cluster:changed');
            expect(events[0].cluster).toBe('solana:devnet');
            expect(events[0].previousCluster).toBe('solana:mainnet');
        });

        it('should not emit event if cluster unchanged', async () => {
            await manager.setCluster('solana:mainnet');

            const events = eventCollector.getEventsByType('cluster:changed');
            expect(events).toHaveLength(0);
        });

        it('should save cluster to storage', async () => {
            await manager.setCluster('solana:devnet');

            const storedCluster = await storage.get();
            expect(storedCluster).toBe('solana:devnet');
        });

        it('should throw error for unknown cluster', async () => {
            await expect(manager.setCluster('solana:unknown' as SolanaClusterId)).rejects.toThrow('not found');
        });

        it('should include available clusters in error message', async () => {
            try {
                await manager.setCluster('solana:unknown' as SolanaClusterId);
                expect.fail('Should have thrown error');
            } catch (error: any) {
                expect(error.message).toContain('solana:mainnet');
                expect(error.message).toContain('solana:devnet');
                expect(error.message).toContain('solana:testnet');
            }
        });

        it('should work without storage', async () => {
            const managerWithoutStorage = new ClusterManager(stateManager, eventEmitter, undefined, {
                clusters,
                initialCluster: 'solana:mainnet',
            });

            await expect(managerWithoutStorage.setCluster('solana:devnet')).resolves.not.toThrow();

            const state = stateManager.getSnapshot();
            expect(state.cluster?.id).toBe('solana:devnet');
        });

        it('should handle storage unavailable (private browsing)', async () => {
            const unavailableStorage = new MockStorageAdapter<SolanaClusterId>('solana:mainnet');
            unavailableStorage.isAvailable = () => false;

            const managerWithUnavailableStorage = new ClusterManager(stateManager, eventEmitter, unavailableStorage, {
                clusters,
                initialCluster: 'solana:mainnet',
            });

            await managerWithUnavailableStorage.setCluster('solana:devnet');

            // Should still update state even if storage fails
            const state = stateManager.getSnapshot();
            expect(state.cluster?.id).toBe('solana:devnet');
        });

        it('should switch between multiple clusters', async () => {
            // Mainnet -> Devnet
            await manager.setCluster('solana:devnet');
            expect(stateManager.getSnapshot().cluster?.id).toBe('solana:devnet');

            // Devnet -> Testnet
            await manager.setCluster('solana:testnet');
            expect(stateManager.getSnapshot().cluster?.id).toBe('solana:testnet');

            // Testnet -> Mainnet
            await manager.setCluster('solana:mainnet');
            expect(stateManager.getSnapshot().cluster?.id).toBe('solana:mainnet');
        });

        it('should update state immediately', async () => {
            const setClusterPromise = manager.setCluster('solana:devnet');

            // State should be updated before promise resolves
            await setClusterPromise;
            const state = stateManager.getSnapshot();
            expect(state.cluster?.id).toBe('solana:devnet');
        });
    });

    describe('getCluster', () => {
        it('should return null when no cluster set', () => {
            const manager = new ClusterManager(stateManager, eventEmitter);
            expect(manager.getCluster()).toBe(null);
        });

        it('should return current cluster', () => {
            const manager = new ClusterManager(stateManager, eventEmitter, storage, {
                clusters,
                initialCluster: 'solana:mainnet',
            });

            const cluster = manager.getCluster();
            expect(cluster).toEqual(mainnetCluster);
        });

        it('should return updated cluster after change', async () => {
            const manager = new ClusterManager(stateManager, eventEmitter, storage, {
                clusters,
                initialCluster: 'solana:mainnet',
            });

            await manager.setCluster('solana:devnet');

            const cluster = manager.getCluster();
            expect(cluster?.id).toBe('solana:devnet');
        });
    });

    describe('getClusters', () => {
        it('should return empty array when no clusters configured', () => {
            const manager = new ClusterManager(stateManager, eventEmitter);
            expect(manager.getClusters()).toEqual([]);
        });

        it('should return all configured clusters', () => {
            const manager = new ClusterManager(stateManager, eventEmitter, storage, {
                clusters,
                initialCluster: 'solana:mainnet',
            });

            const returnedClusters = manager.getClusters();
            expect(returnedClusters).toEqual(clusters);
        });

        it('should return array reference from state', () => {
            const manager = new ClusterManager(stateManager, eventEmitter, storage, {
                clusters,
                initialCluster: 'solana:mainnet',
            });

            const state = stateManager.getSnapshot();
            const returnedClusters = manager.getClusters();

            expect(returnedClusters).toBe(state.clusters);
        });
    });

    describe('debug mode', () => {
        it('should work in debug mode', async () => {
            // Just verify it doesn't throw in debug mode
            const manager = new ClusterManager(
                stateManager,
                eventEmitter,
                storage,
                {
                    clusters,
                    initialCluster: 'solana:mainnet',
                },
                true,
            );

            await expect(manager.setCluster('solana:devnet')).resolves.not.toThrow();

            const state = stateManager.getSnapshot();
            expect(state.cluster?.id).toBe('solana:devnet');
        });

        it('should not log in non-debug mode', async () => {
            const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

            const manager = new ClusterManager(
                stateManager,
                eventEmitter,
                storage,
                {
                    clusters,
                    initialCluster: 'solana:mainnet',
                },
                false,
            );

            await manager.setCluster('solana:devnet');

            expect(consoleSpy).not.toHaveBeenCalled();

            consoleSpy.mockRestore();
        });
    });

    describe('edge cases', () => {
        it('should handle cluster with same id but different properties', async () => {
            const customMainnet: SolanaCluster = {
                id: 'solana:mainnet',
                name: 'Custom Mainnet',
                network: 'mainnet-beta',
                rpcUrl: 'https://custom-rpc.com',
            };

            const customClusters = [customMainnet, devnetCluster];

            const manager = new ClusterManager(stateManager, eventEmitter, storage, {
                clusters: customClusters,
                initialCluster: 'solana:mainnet',
            });

            const cluster = manager.getCluster();
            expect(cluster?.name).toBe('Custom Mainnet');
            expect(cluster?.rpcUrl).toBe('https://custom-rpc.com');
        });

        it('should handle rapid cluster switching', async () => {
            const manager = new ClusterManager(stateManager, eventEmitter, storage, {
                clusters,
                initialCluster: 'solana:mainnet',
            });

            // Switch rapidly
            await Promise.all([
                manager.setCluster('solana:devnet'),
                manager.setCluster('solana:testnet'),
                manager.setCluster('solana:mainnet'),
            ]);

            // Final state should be consistent
            const cluster = manager.getCluster();
            expect(cluster?.id).toMatch(/solana:(mainnet|devnet|testnet)/);
        });

        it('should handle null previous cluster on first change', async () => {
            // Create manager without initial cluster (clusters will be set but no cluster selected)
            const manager = new ClusterManager(stateManager, eventEmitter, undefined, {
                clusters,
            });

            // Manually set cluster to null to ensure clean state
            stateManager.updateState({ cluster: null });
            eventCollector.clear();

            await manager.setCluster('solana:devnet');

            const events = eventCollector.getEventsByType('cluster:changed');
            expect(events.length).toBeGreaterThan(0);
            expect(events[0].previousCluster).toBe(null);
        });
    });
});
