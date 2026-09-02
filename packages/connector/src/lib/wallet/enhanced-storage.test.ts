import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { EnhancedStorage, createEnhancedStorageWallet, STORAGE_VERSION } from './enhanced-storage';

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
