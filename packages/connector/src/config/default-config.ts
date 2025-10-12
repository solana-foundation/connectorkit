import type { ConnectorConfig } from '../types/connector';
import type { SolanaCluster, SolanaClusterId } from '@wallet-ui/core';
import { createSolanaMainnet, createSolanaDevnet, createSolanaTestnet, createSolanaLocalnet } from '@wallet-ui/core';
import {
    createEnhancedStorageAccount,
    createEnhancedStorageCluster,
    createEnhancedStorageWallet,
    EnhancedStorageAdapter,
} from '../lib/adapters/enhanced-storage';
import { toClusterId } from '../utils/network';
import type React from 'react';
import { isAddress } from 'gill';

export interface DefaultConfigOptions {
    /** Application name shown in wallet connection prompts */
    appName: string;
    /** Application URL for wallet connection metadata */
    appUrl?: string;
    /** Enable automatic wallet reconnection on page load */
    autoConnect?: boolean;
    /** Enable debug logging */
    debug?: boolean;
    /** Solana network to connect to (accepts both 'mainnet' and 'mainnet-beta' conventions) */
    network?: 'mainnet' | 'mainnet-beta' | 'devnet' | 'testnet' | 'localnet';
    /** Enable Mobile Wallet Adapter support */
    enableMobile?: boolean;
    /** Custom storage implementation */
    storage?: ConnectorConfig['storage'];
    /** Custom cluster configuration - overrides network if provided */
    clusters?: SolanaCluster[];
    /** Additional custom clusters to add to the default list */
    customClusters?: SolanaCluster[];
    /** Persist cluster selection across sessions */
    persistClusterSelection?: boolean;
    /** Custom storage key for cluster persistence */
    clusterStorageKey?: string;
    /** Enable error boundaries for automatic error handling (default: true) */
    enableErrorBoundary?: boolean;
    /** Maximum retry attempts for error recovery (default: 3) */
    maxRetries?: number;
    /** Custom error handler */
    onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

/** Extended ConnectorConfig with app metadata */
export interface ExtendedConnectorConfig extends ConnectorConfig {
    /** Application name for display and metadata */
    appName?: string;
    /** Application URL for metadata */
    appUrl?: string;
    /** Whether mobile wallet adapter is enabled */
    enableMobile?: boolean;
    /** Selected network for convenience (accepts both 'mainnet' and 'mainnet-beta' conventions) */
    network?: 'mainnet' | 'mainnet-beta' | 'devnet' | 'testnet' | 'localnet';
    /** Error boundary configuration */
    errorBoundary?: {
        /** Enable error boundaries (default: true) */
        enabled?: boolean;
        /** Maximum retry attempts (default: 3) */
        maxRetries?: number;
        /** Custom error handler */
        onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
        /** Custom fallback component */
        fallback?: (error: Error, retry: () => void) => React.ReactNode;
    };
}

/**
 * Creates a default connector configuration with sensible defaults for Solana applications
 */
export function getDefaultConfig(options: DefaultConfigOptions): ExtendedConnectorConfig {
    const {
        appName,
        appUrl,
        autoConnect = true,
        debug,
        network = 'mainnet-beta',
        enableMobile = true,
        storage,
        clusters,
        customClusters = [],
        persistClusterSelection = true,
        clusterStorageKey,
        enableErrorBoundary = true,
        maxRetries = 3,
        onError,
    } = options;

    // Build cluster list using wallet-ui utilities
    const defaultClusters: SolanaCluster[] = clusters ?? [
        createSolanaMainnet(),
        createSolanaDevnet(),
        createSolanaTestnet(),
        ...(network === 'localnet' ? [createSolanaLocalnet()] : []),
        ...(customClusters || []),
    ];

    // Get valid cluster IDs for validation
    const validClusterIds = defaultClusters.map(c => c.id);

    // Create enhanced storage with validation and error handling
    const defaultStorage: ConnectorConfig['storage'] = storage ?? {
        account: new EnhancedStorageAdapter(
            createEnhancedStorageAccount({
                validator: address => {
                    // Validate Solana address format
                    if (!address) return true;
                    return isAddress(address);
                },
                onError: error => {
                    if (debug) {
                        console.error('[Account Storage]', error);
                    }
                    if (onError) {
                        onError(error, {
                            componentStack: 'account-storage',
                        });
                    }
                },
            }),
        ),

        cluster: new EnhancedStorageAdapter(
            createEnhancedStorageCluster({
                key: clusterStorageKey,
                initial: getInitialCluster(network),
                validClusters: persistClusterSelection ? validClusterIds : undefined,
                onError: error => {
                    if (debug) {
                        console.error('[Cluster Storage]', error);
                    }
                    if (onError) {
                        onError(error, {
                            componentStack: 'cluster-storage',
                        });
                    }
                },
            }),
        ),

        wallet: new EnhancedStorageAdapter(
            createEnhancedStorageWallet({
                onError: error => {
                    if (debug) {
                        console.error('[Wallet Storage]', error);
                    }
                    if (onError) {
                        onError(error, {
                            componentStack: 'wallet-storage',
                        });
                    }
                },
            }),
        ),
    };

    const config: ExtendedConnectorConfig = {
        // Core connector config
        autoConnect,
        debug: debug ?? process.env.NODE_ENV === 'development',
        storage: defaultStorage,
        // App metadata (now actually stored and used)
        appName,
        appUrl,
        enableMobile,
        network,
        // Cluster configuration using wallet-ui
        cluster: {
            clusters: defaultClusters,
            persistSelection: persistClusterSelection,
            initialCluster: getInitialCluster(network),
        },
        // Error boundary configuration
        errorBoundary: {
            enabled: enableErrorBoundary,
            maxRetries,
            onError,
        },
    };

    return config;
}

/**
 * Helper to convert network string to cluster ID
 * Uses network utility for consistent translation
 */
function getInitialCluster(
    network: 'mainnet' | 'mainnet-beta' | 'devnet' | 'testnet' | 'localnet' = 'mainnet-beta',
): SolanaClusterId {
    return toClusterId(network);
}

/**
 * Default Mobile Wallet Adapter configuration for Solana applications
 */
export function getDefaultMobileConfig(options: {
    appName: string;
    appUrl?: string;
    network?: 'mainnet' | 'mainnet-beta' | 'devnet' | 'testnet';
}) {
    const baseUrl =
        options.appUrl || (typeof window !== 'undefined' ? window.location.origin : 'https://localhost:3000');

    return {
        appIdentity: {
            name: options.appName,
            uri: baseUrl,
            icon: `${baseUrl}/favicon.ico`,
        },
        cluster: options.network || 'mainnet-beta',
    };
}
