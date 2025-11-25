/**
 * Connector state, configuration, and diagnostic types
 */

import type { SolanaCluster, SolanaClusterId } from '@wallet-ui/core';
import type { StorageAdapter } from './storage';
import type { WalletInfo } from './wallets';
import type { AccountInfo } from './accounts';
import type { Wallet } from './wallets';
import type { Address } from '@solana/addresses';

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
