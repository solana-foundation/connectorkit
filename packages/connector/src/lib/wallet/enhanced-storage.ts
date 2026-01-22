/**
 * Enhanced Storage
 */

import { Storage as WalletUiStorage } from '@wallet-ui/core';
import type { SolanaClusterId } from '@wallet-ui/core';
import type {
    StorageOptions,
    StorageAdapter,
    EnhancedStorageAccountOptions,
    EnhancedStorageClusterOptions,
    EnhancedStorageWalletOptions,
    EnhancedStorageWalletStateOptions,
    PersistedWalletState,
} from '../../types/storage';
import { createConnectorId } from '../../types/session';
import { createLogger } from '../utils/secure-logger';

const logger = createLogger('EnhancedStorage');

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

    override set(value: T): boolean {
        try {
            if (!this.validate(value)) {
                logger.warn('Validation failed', { key: this.key });
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

    validate(value: T): boolean {
        return this.validators.every(validator => validator(value));
    }

    addValidator(validator: (value: T) => boolean): this {
        this.validators.push(validator);
        return this;
    }

    onError(handler: (error: Error) => void): this {
        this.errorHandlers.add(handler);
        return this;
    }

    transform<U>(transformer: (value: T) => U): U {
        return transformer(this.get());
    }

    reset(): void {
        this.set(this.initial);
    }

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
        logger.error('Storage error', { key: this.key, error });
        this.errorHandlers.forEach(handler => {
            try {
                handler(error);
            } catch (err) {
                logger.error('Error in error handler', { error: err });
            }
        });
    }
}

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
//  vNext Wallet State Storage
// ============================================================================

/**
 * Current version of the persisted wallet state format.
 * Increment when making breaking changes to the state structure.
 */
export const WALLET_STATE_VERSION = 1;

/**
 * Create storage for vNext wallet state (connector ID + account + autoconnect).
 * Handles migration from legacy wallet name storage automatically.
 */
export function createEnhancedStorageWalletState(
    options?: EnhancedStorageWalletStateOptions,
): EnhancedStorage<PersistedWalletState | null> {
    const key = options?.key ?? `connector-kit:${STORAGE_VERSION}:wallet-state`;
    const legacyKey = `connector-kit:${STORAGE_VERSION}:wallet`;

    const storage = new EnhancedStorage<PersistedWalletState | null>(key, options?.initial ?? null, {
        onError: options?.onError,
        useMemoryFallback: true,
    });

    // Attempt migration from legacy storage on first access
    if (typeof window !== 'undefined' && storage.isAvailable()) {
        try {
            const existingState = storage.get();
            if (!existingState) {
                // Check for legacy wallet name storage
                const legacyValue = window.localStorage.getItem(legacyKey);
                if (legacyValue) {
                    const legacyWalletName = JSON.parse(legacyValue) as string;
                    if (legacyWalletName && typeof legacyWalletName === 'string') {
                        // Use custom migration handler if provided, otherwise create connector ID from name
                        const connectorId = options?.migrateLegacy
                            ? options.migrateLegacy(legacyWalletName)
                            : createConnectorId(legacyWalletName);

                        if (connectorId) {
                            const migratedState: PersistedWalletState = {
                                version: WALLET_STATE_VERSION,
                                connectorId,
                                autoConnect: true,
                                lastConnected: new Date().toISOString(),
                            };
                            storage.set(migratedState);
                            logger.info('Migrated legacy wallet storage', {
                                from: legacyWalletName,
                                to: connectorId,
                            });

                            // Optionally remove legacy key
                            window.localStorage.removeItem(legacyKey);
                        }
                    }
                }
            }
        } catch (error) {
            logger.warn('Failed to migrate legacy wallet storage', { error });
        }
    }

    return storage;
}

/**
 * Helper to save wallet state after successful connection
 */
export function saveWalletState(
    storage: StorageAdapter<PersistedWalletState | null>,
    connectorId: string,
    account?: string,
    autoConnect = true,
): void {
    const state: PersistedWalletState = {
        version: WALLET_STATE_VERSION,
        connectorId,
        lastAccount: account,
        autoConnect,
        lastConnected: new Date().toISOString(),
    };
    storage.set(state);
}

/**
 * Helper to clear wallet state (on disconnect)
 */
export function clearWalletState(storage: StorageAdapter<PersistedWalletState | null>): void {
    storage.set(null);
}

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
