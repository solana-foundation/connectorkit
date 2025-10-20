/**
 * Mock storage adapter for testing
 * 
 * Provides an in-memory implementation of the StorageAdapter interface
 */

import type { StorageAdapter } from '../../types/storage';

export class MockStorageAdapter<T> implements StorageAdapter<T> {
    private storage = new Map<string, T>();
    private key: string;
    private defaultValue: T | undefined;

    constructor(key: string, defaultValue?: T) {
        this.key = key;
        this.defaultValue = defaultValue;
        if (defaultValue !== undefined) {
            this.storage.set(key, defaultValue);
        }
    }

    get(): T {
        const value = this.storage.get(this.key);
        return (value !== undefined ? value : this.defaultValue) as T;
    }

    set(value: T): void {
        this.storage.set(this.key, value);
    }

    remove(): void {
        this.storage.delete(this.key);
    }

    clear(): void {
        this.storage.clear();
    }

    // Test helper methods
    has(): boolean {
        return this.storage.has(this.key);
    }

    reset(value?: T): void {
        this.storage.clear();
        if (value !== undefined) {
            this.storage.set(this.key, value);
        }
    }

    getAllKeys(): string[] {
        return Array.from(this.storage.keys());
    }
}

/**
 * Create a mock storage adapter factory
 */
export function createMockStorageFactory() {
    const adapters = new Map<string, MockStorageAdapter<unknown>>();

    return {
        create: <T>(key: string, defaultValue?: T): MockStorageAdapter<T> => {
            if (!adapters.has(key)) {
                adapters.set(key, new MockStorageAdapter(key, defaultValue));
            }
            return adapters.get(key) as MockStorageAdapter<T>;
        },
        clear: () => {
            adapters.forEach((adapter) => adapter.reset());
        },
        getAll: () => adapters,
    };
}

/**
 * Mock localStorage for browser environment tests
 */
export class MockLocalStorage implements Storage {
    private storage = new Map<string, string>();

    get length(): number {
        return this.storage.size;
    }

    clear(): void {
        this.storage.clear();
    }

    getItem(key: string): string | null {
        return this.storage.get(key) ?? null;
    }

    key(index: number): string | null {
        return Array.from(this.storage.keys())[index] ?? null;
    }

    removeItem(key: string): void {
        this.storage.delete(key);
    }

    setItem(key: string, value: string): void {
        this.storage.set(key, value);
    }
}

