import type { ConnectorHealth } from '../../types/connector';
import type { StorageAdapter } from '../../types/storage';
import type { SolanaClusterId } from '@wallet-ui/core';
import type { StateManager } from '../core/state-manager';
import { getWalletsRegistry } from '../adapters/wallet-standard-shim';

/**
 * HealthMonitor - Provides connector diagnostics and health checks
 *
 * Useful for debugging, monitoring, and support.
 */
export class HealthMonitor {
    private stateManager: StateManager;
    private walletStorage?: StorageAdapter<string | undefined>;
    private clusterStorage?: StorageAdapter<SolanaClusterId>;
    private isInitialized: () => boolean;

    constructor(
        stateManager: StateManager,
        walletStorage?: StorageAdapter<string | undefined>,
        clusterStorage?: StorageAdapter<SolanaClusterId>,
        isInitialized?: () => boolean,
    ) {
        this.stateManager = stateManager;
        this.walletStorage = walletStorage;
        this.clusterStorage = clusterStorage;
        this.isInitialized = isInitialized ?? (() => true);
    }

    /**
     * Check connector health and availability
     */
    getHealth(): ConnectorHealth {
        const errors: string[] = [];

        // Check Wallet Standard availability
        let walletStandardAvailable = false;
        try {
            const registry = getWalletsRegistry();
            walletStandardAvailable = Boolean(registry && typeof registry.get === 'function');

            if (!walletStandardAvailable) {
                errors.push('Wallet Standard registry not properly initialized');
            }
        } catch (error) {
            errors.push(`Wallet Standard error: ${error instanceof Error ? error.message : 'Unknown error'}`);
            walletStandardAvailable = false;
        }

        // Check storage availability
        let storageAvailable = false;
        try {
            // Check if storage adapters are configured
            if (!this.walletStorage || !this.clusterStorage) {
                errors.push('Storage adapters not configured');
                storageAvailable = false;
            } else {
                // Check if the storage adapters have isAvailable method (EnhancedStorage)
                if ('isAvailable' in this.walletStorage && typeof this.walletStorage.isAvailable === 'function') {
                    storageAvailable = this.walletStorage.isAvailable();
                } else if (typeof window !== 'undefined') {
                    // Fallback: check localStorage availability
                    try {
                        const testKey = '__connector_storage_test__';
                        window.localStorage.setItem(testKey, 'test');
                        window.localStorage.removeItem(testKey);
                        storageAvailable = true;
                    } catch {
                        storageAvailable = false;
                    }
                }

                if (!storageAvailable) {
                    errors.push('localStorage unavailable (private browsing mode or quota exceeded)');
                }
            }
        } catch (error) {
            errors.push(`Storage error: ${error instanceof Error ? error.message : 'Unknown error'}`);
            storageAvailable = false;
        }

        // Validate connection state consistency
        const state = this.stateManager.getSnapshot();

        if (state.connected && !state.selectedWallet) {
            errors.push('Inconsistent state: marked as connected but no wallet selected');
        }

        if (state.connected && !state.selectedAccount) {
            errors.push('Inconsistent state: marked as connected but no account selected');
        }

        if (state.connecting && state.connected) {
            errors.push('Inconsistent state: both connecting and connected flags are true');
        }

        return {
            initialized: this.isInitialized(),
            walletStandardAvailable,
            storageAvailable,
            walletsDetected: state.wallets.length,
            errors,
            connectionState: {
                connected: state.connected,
                connecting: state.connecting,
                hasSelectedWallet: Boolean(state.selectedWallet),
                hasSelectedAccount: Boolean(state.selectedAccount),
            },
            timestamp: new Date().toISOString(),
        };
    }
}
