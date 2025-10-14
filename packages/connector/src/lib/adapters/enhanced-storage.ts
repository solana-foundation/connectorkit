/**
 * @connector-kit/connector - Enhanced Storage
 *
 * Extended version of @wallet-ui/core Storage with additional features:
 * - Validation hooks
 * - Error handling and recovery
 * - SSR/memory fallback
 * - Transform utilities
 * - Migration support
 * - Storage availability checks
 */

import { Storage as WalletUiStorage } from '@wallet-ui/core';
import type { SolanaClusterId } from '@wallet-ui/core';
import type {
    StorageOptions,
    StorageAdapter,
    EnhancedStorageAccountOptions,
    EnhancedStorageClusterOptions,
    EnhancedStorageWalletOptions,
} from '../../types/storage';

/**
 * Storage version for migration support
 * Increment when making breaking changes to storage format
 */
export const STORAGE_VERSION = 'v1';

/**
 * Enhanced version of wallet-ui's Storage class
 * Extends the base Storage with validation, error handling, and SSR support
 */
export class EnhancedStorage<T> extends WalletUiStorage<T> {
    private errorHandlers: Set<(error: Error) => void> = new Set();
    private validators: ((value: T) => boolean)[] = [];
    private memoryFallback: T;

    constructor(
        key: string,
        initial: T,
        private options?: StorageOptions<T>,
    ) {
        super(key, initial);
        this.memoryFallback = initial;

        if (options?.onError) {
            this.errorHandlers.add(options.onError);
        }
        if (options?.validator) {
            this.validators.push(options.validator);
        }
    }

    /**
     * Enhanced set with validation and error handling
     * @returns boolean indicating success
     */
    override set(value: T): boolean {
        try {
            if (!this.validate(value)) {
                console.warn(`[EnhancedStorage] Validation failed for key: ${this.key}`);
                return false;
            }

            super.set(value);

            this.memoryFallback = value;
            return true;
        } catch (error) {
            this.handleError(error as Error);

            if (this.options?.useMemoryFallback) {
                this.memoryFallback = value;
                return true;
            }

            return false;
        }
    }

    /**
     * Enhanced get with error handling and fallback
     */
    override get(): T {
        try {
            return super.get();
        } catch (error) {
            this.handleError(error as Error);

            if (this.options?.useMemoryFallback) {
                return this.memoryFallback;
            }

            return this.initial;
        }
    }

    /**
     * Validate a value against all registered validators
     */
    validate(value: T): boolean {
        return this.validators.every(validator => validator(value));
    }

    /**
     * Add a validation rule (chainable)
     *
     * @example
     * ```ts
     * storage
     *   .addValidator((addr) => addr?.length === 44)
     *   .addValidator((addr) => addr?.startsWith('5'))
     * ```
     */
    addValidator(validator: (value: T) => boolean): this {
        this.validators.push(validator);
        return this;
    }

    /**
     * Add error handler (chainable)
     */
    onError(handler: (error: Error) => void): this {
        this.errorHandlers.add(handler);
        return this;
    }

    /**
     * Transform the stored value
     *
     * @example
     * ```ts
     * const formatted = storage.transform(
     *   (address) => address ? formatAddress(address) : ''
     * )
     * ```
     */
    transform<U>(transformer: (value: T) => U): U {
        return transformer(this.get());
    }

    /**
     * Reset to initial value
     */
    reset(): void {
        this.set(this.initial);
    }

    /**
     * Clear storage (remove from localStorage)
     */
    clear(): void {
        try {
            if (typeof window !== 'undefined' && window.localStorage) {
                window.localStorage.removeItem(this.key);
            }
            this.reset();
        } catch (error) {
            this.handleError(error as Error);
        }
    }

    /**
     * Check if storage is available (not in private mode, quota not exceeded)
     */
    isAvailable(): boolean {
        try {
            if (typeof window === 'undefined') return false;
            const testKey = `__storage_test_${this.key}__`;
            window.localStorage.setItem(testKey, 'test');
            window.localStorage.removeItem(testKey);
            return true;
        } catch {
            return false;
        }
    }

    /**
     * Migrate from old key to new key
     *
     * @example
     * ```ts
     * EnhancedStorage.migrate(
     *   'old-connector:account',
     *   createEnhancedStorageAccount()
     * )
     * ```
     */
    static migrate<T>(oldKey: string, newStorage: EnhancedStorage<T>): boolean {
        try {
            if (typeof window === 'undefined') return false;

            const oldValue = window.localStorage.getItem(oldKey);
            if (oldValue) {
                const parsed = JSON.parse(oldValue) as T;
                newStorage.set(parsed);
                window.localStorage.removeItem(oldKey);
                return true;
            }
            return false;
        } catch {
            return false;
        }
    }

    private handleError(error: Error): void {
        console.error(`[EnhancedStorage] Error for key "${this.key}":`, error);
        this.errorHandlers.forEach(handler => {
            try {
                handler(error);
            } catch (err) {
                console.error('[EnhancedStorage] Error in error handler:', err);
            }
        });
    }
}

// ============================================================================
// Factory Functions
// ============================================================================

/**
 * Create a storage instance for wallet account persistence
 *
 * @example
 * ```ts
 * const storage = createEnhancedStorageAccount({
 *   validator: (address) => {
 *     if (!address) return true
 *     return isAddress(address)
 *   }
 * })
 * ```
 */
export function createEnhancedStorageAccount(
    options?: EnhancedStorageAccountOptions,
): EnhancedStorage<string | undefined> {
    const key = options?.key ?? `connector-kit:${STORAGE_VERSION}:account`;
    return new EnhancedStorage(key, options?.initial, {
        validator: options?.validator,
        onError: options?.onError,
        useMemoryFallback: true, // Always fallback for SSR
    });
}

/**
 * Create a storage instance for cluster selection persistence
 *
 * @example
 * ```ts
 * const storage = createEnhancedStorageCluster({
 *   initial: 'solana:mainnet',
 *   validClusters: ['solana:mainnet', 'solana:devnet']
 * })
 * ```
 */
export function createEnhancedStorageCluster(
    options?: EnhancedStorageClusterOptions,
): EnhancedStorage<SolanaClusterId> {
    const key = options?.key ?? `connector-kit:${STORAGE_VERSION}:cluster`;
    const storage = new EnhancedStorage(key, options?.initial ?? 'solana:mainnet', {
        onError: options?.onError,
        useMemoryFallback: true,
    });

    if (options?.validClusters) {
        storage.addValidator(clusterId => options.validClusters!.includes(clusterId));
    }

    return storage;
}

/**
 * Create a storage instance for wallet name persistence
 *
 * @example
 * ```ts
 * const storage = createEnhancedStorageWallet({
 *   onError: (error) => console.error('Wallet storage error:', error)
 * })
 * ```
 */
export function createEnhancedStorageWallet(
    options?: EnhancedStorageWalletOptions,
): EnhancedStorage<string | undefined> {
    const key = options?.key ?? `connector-kit:${STORAGE_VERSION}:wallet`;
    return new EnhancedStorage(key, options?.initial, {
        onError: options?.onError,
        useMemoryFallback: true,
    });
}

// ============================================================================
// Storage Adapter Interface
// ============================================================================

/**
 * Adapter to make EnhancedStorage compatible with StorageAdapter interface
 * Exposes both the basic interface and enhanced methods for advanced usage
 */
export class EnhancedStorageAdapter<T> implements StorageAdapter<T> {
    constructor(private storage: EnhancedStorage<T>) {}

    get(): T {
        return this.storage.get();
    }

    set(value: T): void {
        this.storage.set(value);
    }

    subscribe(callback: (value: T) => void): () => void {
        return this.storage.value.subscribe(callback);
    }

    validate(value: T): boolean {
        return this.storage.validate(value);
    }

    reset(): void {
        this.storage.reset();
    }

    clear(): void {
        this.storage.clear();
    }

    isAvailable(): boolean {
        return this.storage.isAvailable();
    }

    transform<U>(transformer: (value: T) => U): U {
        return this.storage.transform(transformer);
    }

    addValidator(validator: (value: T) => boolean): this {
        this.storage.addValidator(validator);
        return this;
    }

    onError(handler: (error: Error) => void): this {
        this.storage.onError(handler);
        return this;
    }
}
