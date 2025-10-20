import type { SolanaCluster, SolanaClusterId } from '@wallet-ui/core';
import type { StorageAdapter } from '../../types/storage';
import type { ConnectorConfig } from '../../types/connector';
import { BaseCollaborator } from '../core/base-collaborator';
import { Errors } from '../errors';

/**
 * ClusterManager - Handles network/cluster management
 *
 * Manages cluster selection, persistence, and state updates.
 */
export class ClusterManager extends BaseCollaborator {
    private clusterStorage?: StorageAdapter<SolanaClusterId>;

    constructor(
        stateManager: import('../core/state-manager').StateManager,
        eventEmitter: import('../core/event-emitter').EventEmitter,
        clusterStorage?: StorageAdapter<SolanaClusterId>,
        config?: ConnectorConfig['cluster'],
        debug = false,
    ) {
        super({ stateManager, eventEmitter, debug }, 'ClusterManager');
        this.clusterStorage = clusterStorage;

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
        const state = this.getState();
        const previousClusterId = state.cluster?.id || null;
        const cluster = state.clusters.find((c: SolanaCluster) => c.id === clusterId);

        if (!cluster) {
            throw Errors.clusterNotFound(
                clusterId,
                state.clusters.map((c: SolanaCluster) => c.id),
            );
        }

        this.stateManager.updateState({ cluster }, true);

        // Save cluster to storage (if available)
        if (this.clusterStorage) {
            const isAvailable =
                !('isAvailable' in this.clusterStorage) ||
                typeof this.clusterStorage.isAvailable !== 'function' ||
                this.clusterStorage.isAvailable();

            if (isAvailable) {
                this.clusterStorage.set(clusterId);
            } else {
                this.log('Storage not available (private browsing?), skipping cluster persistence');
            }
        }

        if (previousClusterId !== clusterId) {
            this.eventEmitter.emit({
                type: 'cluster:changed',
                cluster: clusterId,
                previousCluster: previousClusterId,
                timestamp: new Date().toISOString(),
            });
        }

        this.log('🌐 Cluster changed:', { from: previousClusterId, to: clusterId });
    }

    /**
     * Get the currently active cluster
     */
    getCluster(): SolanaCluster | null {
        return this.getState().cluster;
    }

    /**
     * Get all available clusters
     */
    getClusters(): SolanaCluster[] {
        return this.getState().clusters;
    }
}
