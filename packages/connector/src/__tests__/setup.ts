if (typeof globalThis === 'undefined') {
    (global as any).globalThis = global;
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
