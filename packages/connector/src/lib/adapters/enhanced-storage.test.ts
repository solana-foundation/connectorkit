import { describe, it, expect, vi } from 'vitest';
import { EnhancedStorage, createEnhancedStorageWallet } from './enhanced-storage';

// Mock dependencies
vi.mock('@wallet-ui/core', () => ({
    Storage: class {
        constructor(
            public key: string,
            public initial: unknown,
        ) {}
        set(_value: unknown) {}
        get() {
            return this.initial;
        }
        value = { subscribe: vi.fn(() => vi.fn()) };
    },
}));

vi.mock('../utils/secure-logger', () => ({
    createLogger: vi.fn(() => ({ warn: vi.fn(), error: vi.fn(), debug: vi.fn() })),
}));

describe('EnhancedStorage', () => {
    it('should create enhanced storage instance', () => {
        const storage = new EnhancedStorage('test-key', 'initial-value');
        expect(storage).toBeInstanceOf(EnhancedStorage);
    });

    it('should have set and get methods', () => {
        const storage = new EnhancedStorage('test-key', 'initial');
        expect(typeof storage.set).toBe('function');
        expect(typeof storage.get).toBe('function');
    });

    it('should create wallet storage with factory', () => {
        const storage = createEnhancedStorageWallet();
        expect(storage).toBeInstanceOf(EnhancedStorage);
    });
});
