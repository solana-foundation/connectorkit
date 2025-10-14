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
 * Options for wallet storage
 */
export interface EnhancedStorageWalletOptions extends BaseEnhancedStorageOptions<string | undefined> {}
