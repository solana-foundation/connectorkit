/**
 * Global test setup for @solana/connector
 *
 * This file runs before all tests to set up the testing environment,
 * including global mocks and polyfills.
 */

// Polyfill globalThis for older Node.js versions or test environments
// This must be done before any other imports
if (typeof globalThis === 'undefined') {
    (global as any).globalThis = global;
}

// Also ensure it's available in the global scope
if (typeof (global as any).globalThis === 'undefined') {
    (global as any).globalThis = global;
}

import { beforeAll, afterEach, vi } from 'vitest';
import '@testing-library/jest-dom/vitest';

// Mock console methods to reduce noise during tests
const originalConsoleError = console.error;
const originalConsoleWarn = console.warn;

beforeAll(() => {
    // Suppress console errors/warnings during tests unless they're important
    console.error = (...args: unknown[]) => {
        // Allow specific errors through for debugging
        const message = args[0]?.toString() || '';
        if (message.includes('Not implemented')) {
            // Suppress happy-dom "not implemented" warnings
            return;
        }
        originalConsoleError(...args);
    };

    console.warn = (...args: unknown[]) => {
        const message = args[0]?.toString() || '';
        if (message.includes('Not implemented')) {
            return;
        }
        originalConsoleWarn(...args);
    };
});

// Clean up after each test
afterEach(() => {
    // Clear all mocks
    vi.clearAllMocks();

    // Clear all timers
    vi.clearAllTimers();
});

// Global test utilities
export const flushPromises = () => new Promise(resolve => setImmediate(resolve));

export const waitFor = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
