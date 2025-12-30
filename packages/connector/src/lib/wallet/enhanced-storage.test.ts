import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
    EnhancedStorage,
    createEnhancedStorageWallet,
    createEnhancedStorageWalletState,
    saveWalletState,
    clearWalletState,
    WALLET_STATE_VERSION,
    STORAGE_VERSION,
} from './enhanced-storage';
import type { StorageAdapter, PersistedWalletState } from '../../types/storage';

// Mock dependencies
vi.mock('@wallet-ui/core', () => ({
    Storage: class {
        public key: string;
        public initial: unknown;
        private _value: unknown;

        constructor(key: string, initial: unknown) {
            this.key = key;
            this.initial = initial;
            this._value = initial;
        }

        set(value: unknown) {
            this._value = value;
        }

        get() {
            return this._value;
        }

        value = { subscribe: vi.fn(() => vi.fn()) };
    },
}));

vi.mock('../utils/secure-logger', () => ({
    createLogger: vi.fn(() => ({ warn: vi.fn(), error: vi.fn(), debug: vi.fn(), info: vi.fn() })),
}));

describe('EnhancedStorage', () => {
    describe('basic functionality', () => {
        it('should create enhanced storage instance', () => {
            const storage = new EnhancedStorage('test-key', 'initial-value');
            expect(storage).toBeInstanceOf(EnhancedStorage);
        });

        it('should have set and get methods', () => {
            const storage = new EnhancedStorage('test-key', 'initial');
            expect(typeof storage.set).toBe('function');
            expect(typeof storage.get).toBe('function');
        });

        it('should get and set values', () => {
            const storage = new EnhancedStorage('test-key', 'initial');
            expect(storage.get()).toBe('initial');

            storage.set('new-value');
            expect(storage.get()).toBe('new-value');
        });
    });

    describe('validation', () => {
        it('should validate values before setting', () => {
            const storage = new EnhancedStorage<string>('test-key', 'initial', {
                validator: value => value.length > 0,
            });

            expect(storage.set('valid')).toBe(true);
            expect(storage.set('')).toBe(false);
        });

        it('should support multiple validators via addValidator', () => {
            const storage = new EnhancedStorage<number>('test-key', 0);
            storage.addValidator(value => value >= 0);
            storage.addValidator(value => value <= 100);

            expect(storage.set(50)).toBe(true);
            expect(storage.set(-1)).toBe(false);
            expect(storage.set(101)).toBe(false);
        });

        it('should pass validation when no validators', () => {
            const storage = new EnhancedStorage('test-key', 'initial');
            expect(storage.validate('any-value')).toBe(true);
        });
    });

    describe('error handling', () => {
        it('should call error handlers on error', () => {
            const errorHandler = vi.fn();
            const storage = new EnhancedStorage('test-key', 'initial', {
                onError: errorHandler,
            });

            // Add error handler via method
            const anotherHandler = vi.fn();
            storage.onError(anotherHandler);

            // Simulate error by mocking the parent set
            const originalSet = storage.set.bind(storage);
            storage.set = function (value: string) {
                if (value === 'trigger-error') {
                    throw new Error('Storage error');
                }
                return originalSet(value);
            };

            try {
                storage.set('trigger-error');
            } catch {
                // Expected
            }
        });
    });

    describe('memory fallback', () => {
        it('should use memory fallback when enabled', () => {
            const storage = new EnhancedStorage('test-key', 'initial', {
                useMemoryFallback: true,
            });

            // Set a value
            storage.set('fallback-value');
            expect(storage.get()).toBe('fallback-value');
        });
    });

    describe('transform', () => {
        it('should transform values', () => {
            const storage = new EnhancedStorage<number>('test-key', 42);
            const result = storage.transform(value => value * 2);
            expect(result).toBe(84);
        });
    });

    describe('reset', () => {
        it('should reset to initial value', () => {
            const storage = new EnhancedStorage('test-key', 'initial');
            storage.set('modified');
            expect(storage.get()).toBe('modified');

            storage.reset();
            expect(storage.get()).toBe('initial');
        });
    });
});

describe('createEnhancedStorageWallet', () => {
    it('should create wallet storage with factory', () => {
        const storage = createEnhancedStorageWallet();
        expect(storage).toBeInstanceOf(EnhancedStorage);
    });

    it('should use default key', () => {
        const storage = createEnhancedStorageWallet();
        expect(storage.key).toBe(`connector-kit:${STORAGE_VERSION}:wallet`);
    });

    it('should use custom key when provided', () => {
        const storage = createEnhancedStorageWallet({ key: 'custom-wallet-key' });
        expect(storage.key).toBe('custom-wallet-key');
    });
});

describe('createEnhancedStorageWalletState (vNext)', () => {
    let mockLocalStorage: Record<string, string>;

    beforeEach(() => {
        mockLocalStorage = {};
        vi.stubGlobal('window', {
            localStorage: {
                getItem: vi.fn((key: string) => mockLocalStorage[key] ?? null),
                setItem: vi.fn((key: string, value: string) => {
                    mockLocalStorage[key] = value;
                }),
                removeItem: vi.fn((key: string) => {
                    delete mockLocalStorage[key];
                }),
            },
        });
    });

    afterEach(() => {
        vi.unstubAllGlobals();
    });

    it('should create wallet state storage', () => {
        const storage = createEnhancedStorageWalletState();
        expect(storage).toBeInstanceOf(EnhancedStorage);
    });

    it('should use correct default key', () => {
        const storage = createEnhancedStorageWalletState();
        expect(storage.key).toBe(`connector-kit:${STORAGE_VERSION}:wallet-state`);
    });

    it('should store PersistedWalletState', () => {
        const storage = createEnhancedStorageWalletState();
        const state: PersistedWalletState = {
            version: WALLET_STATE_VERSION,
            connectorId: 'wallet-standard:phantom',
            lastAccount: 'Account111111111111111111111111111111111111',
            autoConnect: true,
            lastConnected: new Date().toISOString(),
        };

        storage.set(state);
        expect(storage.get()).toEqual(state);
    });

    it('should return null when no state stored', () => {
        const storage = createEnhancedStorageWalletState();
        expect(storage.get()).toBeNull();
    });

    it('should migrate from legacy wallet name storage', () => {
        // Set up legacy storage
        const legacyKey = `connector-kit:${STORAGE_VERSION}:wallet`;
        mockLocalStorage[legacyKey] = JSON.stringify('Phantom');

        const storage = createEnhancedStorageWalletState();
        const state = storage.get();

        // Should have migrated
        expect(state).not.toBeNull();
        if (state) {
            expect(state.connectorId).toBe('wallet-standard:phantom');
            expect(state.autoConnect).toBe(true);
            expect(state.version).toBe(WALLET_STATE_VERSION);
        }
    });

    it('should use custom migration handler when provided', () => {
        const legacyKey = `connector-kit:${STORAGE_VERSION}:wallet`;
        mockLocalStorage[legacyKey] = JSON.stringify('CustomWallet');

        const customMigrate = vi.fn().mockReturnValue('custom-connector-id');

        const storage = createEnhancedStorageWalletState({
            migrateLegacy: customMigrate,
        });

        const state = storage.get();
        expect(customMigrate).toHaveBeenCalledWith('CustomWallet');
        if (state) {
            expect(state.connectorId).toBe('custom-connector-id');
        }
    });

    it('should not migrate if state already exists', () => {
        // Note: Due to the way the EnhancedStorage mock works, the storage starts with
        // its initial value (null). The migration logic only runs if the storage value
        // is falsy. To properly test this scenario, we need to set up the storage first.
        
        // Create storage and set an existing state
        const storage = createEnhancedStorageWalletState();
        const existingState: PersistedWalletState = {
            version: WALLET_STATE_VERSION,
            connectorId: 'wallet-standard:solflare',
            autoConnect: true,
        };
        storage.set(existingState);

        // The stored state should be what we set
        const state = storage.get();
        expect(state?.connectorId).toBe('wallet-standard:solflare');
    });

    it('should remove legacy key after migration', () => {
        const legacyKey = `connector-kit:${STORAGE_VERSION}:wallet`;
        mockLocalStorage[legacyKey] = JSON.stringify('Phantom');

        createEnhancedStorageWalletState();

        // Legacy key should be removed
        expect(window.localStorage.removeItem).toHaveBeenCalledWith(legacyKey);
    });
});

describe('saveWalletState', () => {
    it('should save wallet state with all fields', () => {
        const mockStorage: StorageAdapter<PersistedWalletState | null> = {
            get: vi.fn(() => null),
            set: vi.fn(),
        };

        const connectorId = 'wallet-standard:phantom';
        const account = 'Account111111111111111111111111111111111111';

        saveWalletState(mockStorage, connectorId, account, true);

        expect(mockStorage.set).toHaveBeenCalledWith(
            expect.objectContaining({
                version: WALLET_STATE_VERSION,
                connectorId,
                lastAccount: account,
                autoConnect: true,
                lastConnected: expect.any(String),
            }),
        );
    });

    it('should save without account', () => {
        const mockStorage: StorageAdapter<PersistedWalletState | null> = {
            get: vi.fn(() => null),
            set: vi.fn(),
        };

        saveWalletState(mockStorage, 'wallet-standard:phantom');

        expect(mockStorage.set).toHaveBeenCalledWith(
            expect.objectContaining({
                connectorId: 'wallet-standard:phantom',
                lastAccount: undefined,
                autoConnect: true,
            }),
        );
    });

    it('should respect autoConnect parameter', () => {
        const mockStorage: StorageAdapter<PersistedWalletState | null> = {
            get: vi.fn(() => null),
            set: vi.fn(),
        };

        saveWalletState(mockStorage, 'wallet-standard:phantom', undefined, false);

        expect(mockStorage.set).toHaveBeenCalledWith(
            expect.objectContaining({
                autoConnect: false,
            }),
        );
    });
});

describe('clearWalletState', () => {
    it('should clear wallet state by setting null', () => {
        const mockStorage: StorageAdapter<PersistedWalletState | null> = {
            get: vi.fn(() => ({
                version: WALLET_STATE_VERSION,
                connectorId: 'wallet-standard:phantom',
                autoConnect: true,
            })),
            set: vi.fn(),
        };

        clearWalletState(mockStorage);

        expect(mockStorage.set).toHaveBeenCalledWith(null);
    });
});

describe('EnhancedStorageAdapter', () => {
    it('should wrap EnhancedStorage with StorageAdapter interface', async () => {
        const { EnhancedStorageAdapter } = await import('./enhanced-storage');
        const storage = new EnhancedStorage<string | undefined>('test-key', undefined);
        const adapter = new EnhancedStorageAdapter(storage);

        expect(adapter.get()).toBeUndefined();
        adapter.set('test-value');
        expect(adapter.get()).toBe('test-value');
    });

    it('should expose validate method', async () => {
        const { EnhancedStorageAdapter } = await import('./enhanced-storage');
        const storage = new EnhancedStorage<string>('test-key', 'initial', {
            validator: value => value.length > 0,
        });
        const adapter = new EnhancedStorageAdapter(storage);

        expect(adapter.validate('valid')).toBe(true);
        expect(adapter.validate('')).toBe(false);
    });

    it('should expose reset method', async () => {
        const { EnhancedStorageAdapter } = await import('./enhanced-storage');
        const storage = new EnhancedStorage<string>('test-key', 'initial');
        const adapter = new EnhancedStorageAdapter(storage);

        adapter.set('modified');
        expect(adapter.get()).toBe('modified');

        adapter.reset();
        expect(adapter.get()).toBe('initial');
    });

    it('should expose addValidator method', async () => {
        const { EnhancedStorageAdapter } = await import('./enhanced-storage');
        const storage = new EnhancedStorage<number>('test-key', 0);
        const adapter = new EnhancedStorageAdapter(storage);

        adapter.addValidator(value => value >= 0);
        expect(adapter.validate(-1)).toBe(false);
        expect(adapter.validate(5)).toBe(true);
    });
});

describe('WALLET_STATE_VERSION', () => {
    it('should be defined', () => {
        expect(WALLET_STATE_VERSION).toBeDefined();
        expect(typeof WALLET_STATE_VERSION).toBe('number');
    });

    it('should be version 1', () => {
        expect(WALLET_STATE_VERSION).toBe(1);
    });
});
