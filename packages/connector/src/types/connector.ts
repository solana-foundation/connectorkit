/**
 * Connector state, configuration, and diagnostic types
 */

import type { SolanaCluster, SolanaClusterId } from '@wallet-ui/core';
import type { StorageAdapter } from './storage';
import type { WalletInfo } from './wallets';
import type { AccountInfo } from './accounts';
import type { Wallet } from './wallets';
import type { Address } from '@solana/addresses';
import type { WalletConnectConfig } from './walletconnect';

/**
 * CoinGecko API configuration for price fetching.
 *
 * Rate Limits (as of 2024):
 * - Free tier (no API key): 10-30 requests/minute (varies by endpoint)
 * - Demo tier (free API key): 30 requests/minute
 * - Paid tiers: Higher limits based on plan
 *
 * @see https://docs.coingecko.com/reference/introduction
 */
export interface CoinGeckoConfig {
    /**
     * CoinGecko API key for higher rate limits.
     * Get a free Demo API key at https://www.coingecko.com/en/api/pricing
     * - Without key: ~10-30 requests/minute (public rate limit)
     * - With Demo key: 30 requests/minute
     */
    apiKey?: string;

    /**
     * Whether the API key is for the Pro API (api.coingecko.com with x-cg-pro-api-key header)
     * or the Demo API (api.coingecko.com with x-cg-demo-api-key header).
     * @default false (uses Demo API header)
     */
    isPro?: boolean;

    /**
     * Maximum number of retry attempts when rate limited (429 response).
     * @default 3
     */
    maxRetries?: number;

    /**
     * Base delay in milliseconds for exponential backoff.
     * Actual delay = baseDelay * 2^attempt + random jitter
     * @default 1000 (1 second)
     */
    baseDelay?: number;

    /**
     * Maximum total timeout in milliseconds for all retry attempts combined.
     * Prevents blocking the caller for too long.
     * @default 30000 (30 seconds)
     */
    maxTimeout?: number;
}

/**
 * Core connector state
 */
export interface ConnectorState {
    wallets: WalletInfo[];
    selectedWallet: Wallet | null;
    connected: boolean;
    connecting: boolean;
    accounts: AccountInfo[];
    selectedAccount: Address | null;
    cluster: SolanaCluster | null;
    clusters: SolanaCluster[];
}

/**
 * State change listener function type
 */
export type Listener = (s: ConnectorState) => void;

/**
 * Connector configuration options
 */
export interface ConnectorConfig {
    autoConnect?: boolean;
    debug?: boolean;
    /** Storage configuration using enhanced storage adapters */
    storage?: {
        account: StorageAdapter<string | undefined>;
        cluster: StorageAdapter<SolanaClusterId>;
        wallet: StorageAdapter<string | undefined>;
    };

    /** Enhanced cluster configuration using wallet-ui */
    cluster?: {
        clusters?: SolanaCluster[];
        persistSelection?: boolean;
        initialCluster?: SolanaClusterId;
    };

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
     */
    coingecko?: CoinGeckoConfig;

    /**
     * WalletConnect configuration for connecting via QR code / deep link.
     * When enabled, a "WalletConnect" wallet is registered in the Wallet Standard registry.
     * @see https://docs.walletconnect.network/wallet-sdk/chain-support/solana
     */
    walletConnect?: WalletConnectConfig;
}

/**
 * Health check information for connector diagnostics
 * Useful for debugging, monitoring, and support
 */
export interface ConnectorHealth {
    /** Whether the connector has been initialized */
    initialized: boolean;
    /** Whether Wallet Standard registry is available */
    walletStandardAvailable: boolean;
    /** Whether localStorage/storage is available */
    storageAvailable: boolean;
    /** Number of wallets currently detected */
    walletsDetected: number;
    /** List of errors encountered during initialization or operation */
    errors: string[];
    /** Current connection state */
    connectionState: {
        connected: boolean;
        connecting: boolean;
        hasSelectedWallet: boolean;
        hasSelectedAccount: boolean;
    };
    /** Timestamp of health check */
    timestamp: string;
}

/**
 * Performance and debug metrics for monitoring
 * Useful for identifying performance issues and optimization opportunities
 */
export interface ConnectorDebugMetrics {
    /** Total number of state updates that resulted in actual changes */
    stateUpdates: number;
    /** Number of state updates that were skipped (no changes detected) */
    noopUpdates: number;
    /** Percentage of updates that were optimized away */
    optimizationRate: number;
    /** Number of active event listeners */
    eventListenerCount: number;
    /** Number of state subscribers */
    subscriptionCount: number;
    /** Average time taken for state updates (in milliseconds) */
    avgUpdateTimeMs: number;
    /** Timestamp of last state update */
    lastUpdateTime: number;
}

/**
 * Debug state with transaction history
 */
export interface ConnectorDebugState extends ConnectorDebugMetrics {
    /** Recent transaction activity (limited by maxTransactions) */
    transactions: import('./transactions').TransactionActivity[];
    /** Total transactions tracked in this session */
    totalTransactions: number;
}
