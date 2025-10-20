import { describe, it, expect, vi } from 'vitest';

// Mock logger
vi.mock('../lib/utils/secure-logger', () => ({
    createLogger: vi.fn(() => ({ warn: vi.fn() })),
}));

describe('Debug Panel (Deprecated)', () => {
    it('should import without errors', async () => {
        await expect(import('./debug-panel')).resolves.toBeDefined();
    });
});
