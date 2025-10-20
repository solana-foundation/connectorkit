/**
 * Mock browser APIs for testing
 *
 * Provides mock implementations of window APIs used by the connector
 */

import { vi } from 'vitest';
import { MockLocalStorage } from './storage-mock';

export interface MockClipboard {
    writeText: ReturnType<typeof vi.fn>;
    readText: ReturnType<typeof vi.fn>;
}

export interface MockNavigator {
    clipboard: MockClipboard;
    userAgent: string;
}

/**
 * Create a mock clipboard API
 */
export function createMockClipboard(behavior: 'success' | 'error' = 'success'): MockClipboard {
    let clipboardContent = '';

    return {
        writeText: vi.fn(async (text: string) => {
            if (behavior === 'error') {
                throw new Error('Clipboard write failed');
            }
            clipboardContent = text;
        }),
        readText: vi.fn(async () => {
            if (behavior === 'error') {
                throw new Error('Clipboard read failed');
            }
            return clipboardContent;
        }),
    };
}

/**
 * Create a mock navigator object
 */
export function createMockNavigator(
    options: {
        clipboard?: MockClipboard;
        userAgent?: string;
    } = {},
): MockNavigator {
    return {
        clipboard: options.clipboard ?? createMockClipboard('success'),
        userAgent: options.userAgent ?? 'Mozilla/5.0 (Test Environment)',
    };
}

/**
 * Setup a mock window environment for tests
 */
export function setupMockWindow(
    options: {
        localStorage?: MockLocalStorage;
        navigator?: MockNavigator;
    } = {},
) {
    const mockLocalStorage = options.localStorage ?? new MockLocalStorage();
    const mockNavigator = options.navigator ?? createMockNavigator();

    // Mock window.localStorage
    Object.defineProperty(global, 'localStorage', {
        value: mockLocalStorage,
        writable: true,
        configurable: true,
    });

    // Mock window.navigator
    Object.defineProperty(global, 'navigator', {
        value: mockNavigator,
        writable: true,
        configurable: true,
    });

    return {
        localStorage: mockLocalStorage,
        navigator: mockNavigator,
    };
}

/**
 * Mock window.crypto for tests
 */
export function setupMockCrypto() {
    const mockCrypto = {
        getRandomValues: vi.fn((array: Uint8Array) => {
            for (let i = 0; i < array.length; i++) {
                array[i] = Math.floor(Math.random() * 256);
            }
            return array;
        }),
        subtle: {
            digest: vi.fn(async (algorithm: string, data: BufferSource) => {
                // Simple mock hash
                return new Uint8Array(32).fill(1);
            }),
        },
    };

    Object.defineProperty(global, 'crypto', {
        value: mockCrypto,
        writable: true,
        configurable: true,
    });

    return mockCrypto;
}

/**
 * Cleanup mock window environment
 */
export function cleanupMockWindow() {
    // @ts-expect-error - Deleting global properties for cleanup
    delete global.localStorage;
    // @ts-expect-error - Deleting global properties for cleanup
    delete global.navigator;
    // @ts-expect-error - Deleting global properties for cleanup
    delete global.crypto;
}
