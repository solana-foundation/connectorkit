import { describe, it, expect, vi } from 'vitest';
import { installPolyfills, isPolyfillInstalled, isCryptoAvailable, getPolyfillStatus } from './polyfills';

// Mock dependencies
vi.mock('@solana/webcrypto-ed25519-polyfill', () => ({
    install: vi.fn(),
}));

vi.mock('./secure-logger', () => ({
    createLogger: vi.fn(() => ({ info: vi.fn(), warn: vi.fn() })),
}));

describe('Polyfills', () => {
    it('should install polyfills', () => {
        expect(() => installPolyfills()).not.toThrow();
    });

    it('should check if polyfills installed', () => {
        const installed = isPolyfillInstalled();
        expect(typeof installed).toBe('boolean');
    });

    it('should check crypto availability', () => {
        const available = isCryptoAvailable();
        expect(typeof available).toBe('boolean');
    });

    it('should get polyfill status', () => {
        const status = getPolyfillStatus();
        expect(status).toHaveProperty('installed');
        expect(status).toHaveProperty('cryptoAvailable');
        expect(status).toHaveProperty('environment');
    });
});
