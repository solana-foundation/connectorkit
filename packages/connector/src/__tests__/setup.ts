if (typeof globalThis === 'undefined') {
    (global as unknown as { globalThis?: unknown }).globalThis = global;
}

// Ensure window is available for React DOM before any imports
// happy-dom should provide this, but ensure it exists early
if (typeof window === 'undefined') {
    // Create a minimal window-like object if happy-dom hasn't initialized yet
    (globalThis as unknown as { window?: unknown }).window = {
        addEventListener: () => {},
        removeEventListener: () => {},
        document: {
            addEventListener: () => {},
            removeEventListener: () => {},
        },
        performance: {
            now: () => Date.now(),
            mark: () => {},
            measure: () => {},
            getEntriesByType: () => [],
            getEntriesByName: () => [],
        },
        location: {
            origin: 'http://localhost:3000',
            href: 'http://localhost:3000',
            protocol: 'http:',
            host: 'localhost:3000',
            hostname: 'localhost',
            port: '3000',
            pathname: '/',
            search: '',
            hash: '',
        },
        navigator: {
            userAgent: 'test',
            wallets: undefined,
        },
    };
} else {
    const win = window as unknown as Record<string, unknown>;
    // Ensure performance API exists
    if (typeof win.performance === 'undefined') {
        win.performance = {
            now: () => Date.now(),
            mark: () => {},
            measure: () => {},
            getEntriesByType: () => [],
            getEntriesByName: () => [],
        };
    }
    // Ensure location exists
    if (typeof win.location === 'undefined') {
        win.location = {
            origin: 'http://localhost:3000',
            href: 'http://localhost:3000',
            protocol: 'http:',
            host: 'localhost:3000',
            hostname: 'localhost',
            port: '3000',
            pathname: '/',
            search: '',
            hash: '',
        };
    }
    // Ensure navigator exists
    if (typeof win.navigator === 'undefined') {
        win.navigator = {
            userAgent: 'test',
            wallets: undefined,
        };
    }
}

import { beforeAll, afterEach, vi } from 'vitest';
import '@testing-library/jest-dom/vitest';

const originalConsoleError = console.error;
const originalConsoleWarn = console.warn;

beforeAll(() => {
    console.error = (...args: unknown[]) => {
        const message = args[0]?.toString() || '';
        if (message.includes('Not implemented')) {
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

afterEach(() => {
    vi.clearAllMocks();
    vi.clearAllTimers();
});
export const flushPromises = () => new Promise(resolve => setImmediate(resolve));

export const waitFor = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
