/**
 * Storage-related types
 */

import type { SolanaClusterId } from '@wallet-ui/core';

/**
 * Storage adapter interface for connector persistence
 */
export interface StorageAdapter<T> {
    get(): T;
    set(value: T): void;
    subscribe?(callback: (value: T) => void): () => void;
}

/**
 * Base options for enhanced storage instances
 */
export interface BaseEnhancedStorageOptions<T> {
    /** Storage key */
    key?: string;
    /** Initial value */
    initial?: T;
    /** Custom error handler for storage failures */
    onError?: (error: Error) => void;
}

/**
 * Options for creating enhanced storage instances with validation
 */
export interface StorageOptions<T> extends BaseEnhancedStorageOptions<T> {
    /** Validate before setting values */
    validator?: (value: T) => boolean;
    /** Use memory storage if localStorage unavailable (SSR) */
    useMemoryFallback?: boolean;
}

/**
 * Options for account storage
 */
export interface EnhancedStorageAccountOptions extends BaseEnhancedStorageOptions<string | undefined> {
    validator?: (value: string | undefined) => boolean;
}

/**
 * Options for cluster storage
 */
export interface EnhancedStorageClusterOptions extends BaseEnhancedStorageOptions<SolanaClusterId> {
    validClusters?: SolanaClusterId[];
}

/**
 * Options for wallet storage (legacy)
 */
export interface EnhancedStorageWalletOptions extends BaseEnhancedStorageOptions<string | undefined> {}

// ============================================================================
// vNext Wallet State Storage Types
// ============================================================================

/**
 * Persisted wallet state for vNext auto-connect.
 * Stores connector ID instead of wallet name for stability.
 */
export interface PersistedWalletState {
    /** Storage format version for future migrations */
    version: number;
    /** Stable connector ID (e.g., 'wallet-standard:phantom') */
    connectorId: string;
    /** Last selected account address */
    lastAccount?: string;
    /** Whether auto-connect is enabled for this wallet */
    autoConnect: boolean;
    /** Timestamp of last connection */
    lastConnected?: string;
}

/**
 * Options for vNext wallet state storage
 */
export interface EnhancedStorageWalletStateOptions extends BaseEnhancedStorageOptions<PersistedWalletState | null> {
    /** Migration handler for legacy wallet name storage */
    migrateLegacy?: (legacyWalletName: string) => string | null;
}
