import type { SolanaCluster, SolanaClusterId } from '@wallet-ui/core';
import type { StorageAdapter } from '../../types/storage';
import type { ConnectorConfig } from '../../types/connector';
import type { StateManager } from '../core/state-manager';
import type { EventEmitter } from '../core/event-emitter';

/**
 * ClusterManager - Handles network/cluster management
 *
 * Manages cluster selection, persistence, and state updates.
 */
export class ClusterManager {
    private stateManager: StateManager;
    private eventEmitter: EventEmitter;
    private clusterStorage?: StorageAdapter<SolanaClusterId>;
    private debug: boolean;

    constructor(
        stateManager: StateManager,
        eventEmitter: EventEmitter,
        clusterStorage?: StorageAdapter<SolanaClusterId>,
        config?: ConnectorConfig['cluster'],
        debug = false,
    ) {
        this.stateManager = stateManager;
        this.eventEmitter = eventEmitter;
        this.clusterStorage = clusterStorage;
        this.debug = debug;

        if (config) {
            const clusters = config.clusters ?? [];
            const storedClusterId = this.clusterStorage?.get();
            const initialClusterId = storedClusterId ?? config.initialCluster ?? 'solana:mainnet';
            const initialCluster = clusters.find(c => c.id === initialClusterId) ?? clusters[0] ?? null;

            this.stateManager.updateState({
                cluster: initialCluster,
                clusters,
            });
        }
    }

    /**
     * Set the active cluster (network)
     */
    async setCluster(clusterId: SolanaClusterId): Promise<void> {
        const state = this.stateManager.getSnapshot();
        const previousClusterId = state.cluster?.id || null;
        const cluster = state.clusters.find((c: SolanaCluster) => c.id === clusterId);

        if (!cluster) {
            throw new Error(
                `Cluster ${clusterId} not found. Available clusters: ${state.clusters.map((c: SolanaCluster) => c.id).join(', ')}`,
            );
        }

        this.stateManager.updateState({ cluster }, true);

        if (this.clusterStorage) {
            this.clusterStorage.set(clusterId);
        }

        if (previousClusterId !== clusterId) {
            this.eventEmitter.emit({
                type: 'cluster:changed',
                cluster: clusterId,
                previousCluster: previousClusterId,
                timestamp: new Date().toISOString(),
            });
        }

        if (this.debug) {
            console.log('🌐 Cluster changed:', {
                from: previousClusterId,
                to: clusterId,
            });
        }
    }

    /**
     * Get the currently active cluster
     */
    getCluster(): SolanaCluster | null {
        return this.stateManager.getSnapshot().cluster;
    }

    /**
     * Get all available clusters
     */
    getClusters(): SolanaCluster[] {
        return this.stateManager.getSnapshot().clusters;
    }
}
