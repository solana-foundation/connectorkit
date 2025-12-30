import type { ConnectorConfig, CoinGeckoConfig } from '../types/connector';
import type { WalletConnectConfig } from '../types/walletconnect';
import type { SolanaCluster, SolanaClusterId } from '@wallet-ui/core';
import { createSolanaMainnet, createSolanaDevnet, createSolanaTestnet, createSolanaLocalnet } from '@wallet-ui/core';
import {
    createEnhancedStorageAccount,
    createEnhancedStorageCluster,
    createEnhancedStorageWallet,
    EnhancedStorageAdapter,
    EnhancedStorage,
} from '../lib/wallet/enhanced-storage';
import { toClusterId } from '../utils/network';
import type React from 'react';
import { isAddress } from '@solana/addresses';
import { DEFAULT_MAX_RETRIES } from '../lib/constants';
import { createLogger } from '../lib/utils/secure-logger';

const logger = createLogger('DefaultConfig');

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
    /**
     * Image proxy URL prefix for token images.
     * When set, token image URLs will be transformed to: `${imageProxy}${encodeURIComponent(originalUrl)}`
     * This prevents direct image fetching which can leak user IPs to untrusted hosts.
     * @example '/_next/image?w=64&q=75&url=' // Next.js Image Optimization
     * @example '/cdn-cgi/image/width=64,quality=75/' // Cloudflare Image Resizing
     */
    imageProxy?: string;
    /**
     * Optional mapping from program IDs to human-readable program names.
     * Used to enrich transaction history (e.g. showing `Jupiter` instead of a raw program address).
     */
    programLabels?: Record<string, string>;
    /**
     * CoinGecko API configuration for token price fetching.
     * Configure API key for higher rate limits and retry behavior for 429 responses.
     * @see https://docs.coingecko.com/reference/introduction for rate limit details
     */
    coingecko?: CoinGeckoConfig;
    /**
     * WalletConnect configuration for connecting via QR code / deep link.
     * When enabled, a "WalletConnect" wallet appears in the wallet list.
     * 
     * Can be:
     * - `true` to enable with auto-detected project ID from NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID env var
     * - An object with optional overrides (projectId, metadata, etc.)
     * - `undefined` or `false` to disable
     * 
     * When using `true` or minimal config, the following are auto-configured:
     * - `projectId`: Read from NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID
     * - `metadata.name`: Uses appName
     * - `metadata.url`: Uses appUrl or window.location.origin
     * - `metadata.description`: Auto-generated from appName
     * - `metadata.icons`: Uses appUrl/icon.svg
     * - `getCurrentChain`: Auto-reads from cluster storage
     * - `onDisplayUri/onSessionEstablished/onSessionDisconnected`: Auto-wired by AppProvider
     * 
     * @example
     * ```ts
     * // Simplest - just enable it (reads project ID from env)
     * getDefaultConfig({ appName: 'My App', walletConnect: true })
     * 
     * // With explicit project ID
     * getDefaultConfig({ 
     *   appName: 'My App', 
     *   walletConnect: { projectId: 'my-project-id' } 
     * })
     * ```
     * 
     * @see https://docs.walletconnect.network/wallet-sdk/chain-support/solana
     */
    walletConnect?: boolean | SimplifiedWalletConnectConfig;
}

/**
 * Simplified WalletConnect configuration
 * Most fields are auto-generated from appName/appUrl if not provided
 */
export interface SimplifiedWalletConnectConfig {
    /**
     * WalletConnect Cloud project ID.
     * If not provided, reads from NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID env var.
     */
    projectId?: string;
    /**
     * Optional metadata overrides. Merged with auto-generated metadata.
     */
    metadata?: Partial<WalletConnectConfig['metadata']>;
    /**
     * Default chain. Defaults to 'solana:mainnet'.
     */
    defaultChain?: WalletConnectConfig['defaultChain'];
    /**
     * Optional relay URL override.
     */
    relayUrl?: string;
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
    /**
     * Image proxy URL prefix for token images.
     * When set, token image URLs will be transformed to: `${imageProxy}${encodeURIComponent(originalUrl)}`
     * This prevents direct image fetching which can leak user IPs to untrusted hosts.
     */
    imageProxy?: string;
    /**
     * Optional mapping from program IDs to human-readable program names.
     * Used to enrich transaction history (e.g. showing `Jupiter` instead of a raw program address).
     */
    programLabels?: Record<string, string>;
    /**
     * CoinGecko API configuration for token price fetching.
     */
    coingecko?: CoinGeckoConfig;
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
        maxRetries = DEFAULT_MAX_RETRIES,
        onError,
        imageProxy,
        programLabels,
        coingecko,
        walletConnect,
    } = options;

    const defaultClusters: SolanaCluster[] = clusters ?? [
        createSolanaMainnet(),
        createSolanaDevnet(),
        createSolanaTestnet(),
        ...(network === 'localnet' ? [createSolanaLocalnet()] : []),
        ...(customClusters || []),
    ];

    const validClusterIds = defaultClusters.map(c => c.id);

    const accountStorage = createEnhancedStorageAccount({
        validator: address => {
            if (!address) return true;
            return isAddress(address);
        },
        onError: error => {
            if (debug) {
                logger.error('Account Storage error', { error });
            }
            if (onError) {
                onError(error, {
                    componentStack: 'account-storage',
                });
            }
        },
    });

    const clusterStorage = createEnhancedStorageCluster({
        key: clusterStorageKey,
        initial: getInitialCluster(network),
        validClusters: persistClusterSelection ? validClusterIds : undefined,
        onError: error => {
            if (debug) {
                logger.error('Cluster Storage error', { error });
            }
            if (onError) {
                onError(error, {
                    componentStack: 'cluster-storage',
                });
            }
        },
    });

    const walletStorage = createEnhancedStorageWallet({
        onError: error => {
            if (debug) {
                logger.error('Wallet Storage error', { error });
            }
            if (onError) {
                onError(error, {
                    componentStack: 'wallet-storage',
                });
            }
        },
    });

    // Migrate old storage keys to new versioned format (v1)
    // This allows seamless upgrades from old versions without losing user data
    if (typeof window !== 'undefined') {
        // Old keys (pre-v1): 'connector-kit:account', 'connector-kit:wallet', 'connector-kit:cluster'
        // New keys (v1):     'connector-kit:v1:account', 'connector-kit:v1:wallet', 'connector-kit:v1:cluster'
        const oldAccountKey = 'connector-kit:account';
        const oldWalletKey = 'connector-kit:wallet';
        const oldClusterKey = clusterStorageKey || 'connector-kit:cluster';

        EnhancedStorage.migrate(oldAccountKey, accountStorage);
        EnhancedStorage.migrate(oldWalletKey, walletStorage);
        EnhancedStorage.migrate(oldClusterKey, clusterStorage);
    }

    const defaultStorage: ConnectorConfig['storage'] = storage ?? {
        account: new EnhancedStorageAdapter(accountStorage),
        cluster: new EnhancedStorageAdapter(clusterStorage),
        wallet: new EnhancedStorageAdapter(walletStorage),
    };

    // Compute the actual cluster storage key (same logic as createEnhancedStorageCluster)
    const actualClusterStorageKey = clusterStorageKey ?? 'connector-kit:v1:cluster';

    // Build WalletConnect config from simplified options
    const walletConnectConfig = buildWalletConnectConfig(walletConnect, appName, appUrl, actualClusterStorageKey);

    const config: ExtendedConnectorConfig = {
        autoConnect,
        debug: debug ?? process.env.NODE_ENV === 'development',
        storage: defaultStorage,
        appName,
        appUrl,
        enableMobile,
        network,
        cluster: {
            clusters: defaultClusters,
            persistSelection: persistClusterSelection,
            initialCluster: getInitialCluster(network),
        },
        errorBoundary: {
            enabled: enableErrorBoundary,
            maxRetries,
            onError,
        },
        imageProxy,
        programLabels,
        coingecko,
        walletConnect: walletConnectConfig,
    };

    return config;
}

/**
 * Build full WalletConnect config from simplified options
 */
function buildWalletConnectConfig(
    walletConnect: boolean | SimplifiedWalletConnectConfig | undefined,
    appName: string,
    appUrl?: string,
    clusterStorageKey?: string,
): WalletConnectConfig | undefined {
    // Disabled
    if (!walletConnect) return undefined;

    // Get project ID from config or environment
    const configProjectId = typeof walletConnect === 'object' ? walletConnect.projectId : undefined;
    const envProjectId = typeof process !== 'undefined' 
        ? process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID 
        : undefined;
    const projectId = configProjectId || envProjectId;

    // If no project ID available, WalletConnect is disabled
    if (!projectId) {
        if (typeof walletConnect === 'object' || walletConnect === true) {
            logger.warn('WalletConnect enabled but no project ID found. Set NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID or provide projectId in config.');
        }
        return undefined;
    }

    // Determine origin for metadata
    const origin = appUrl || (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000');

    // Get custom metadata if provided
    const customMetadata = typeof walletConnect === 'object' ? walletConnect.metadata : undefined;
    const customDefaultChain = typeof walletConnect === 'object' ? walletConnect.defaultChain : undefined;
    const customRelayUrl = typeof walletConnect === 'object' ? walletConnect.relayUrl : undefined;

    return {
        enabled: true,
        projectId,
        metadata: {
            name: customMetadata?.name ?? appName,
            description: customMetadata?.description ?? `${appName} - Powered by ConnectorKit`,
            url: customMetadata?.url ?? origin,
            icons: customMetadata?.icons ?? [`${origin}/icon.svg`],
        },
        defaultChain: customDefaultChain ?? 'solana:mainnet',
        relayUrl: customRelayUrl,
        // Auto-sync with cluster storage
        getCurrentChain: () => {
            if (typeof window === 'undefined') return 'solana:mainnet';
            const storageKey = clusterStorageKey || 'connector-kit:v1:cluster';
            try {
                const stored = localStorage.getItem(storageKey);
                if (stored) {
                    const id = JSON.parse(stored) as string;
                    if (id === 'solana:mainnet' || id === 'solana:devnet' || id === 'solana:testnet') {
                        return id;
                    }
                }
            } catch {
                // Ignore parse errors
            }
            return customDefaultChain ?? 'solana:mainnet';
        },
        // Note: onDisplayUri, onSessionEstablished, onSessionDisconnected are auto-wired by AppProvider
    };
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
