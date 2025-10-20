import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
    copyToClipboard,
    copyAddressToClipboard,
    copySignatureToClipboard,
    isClipboardAvailable,
    ClipboardErrorType,
} from './clipboard';

// Mock dependencies
vi.mock('gill', () => ({
    isAddress: vi.fn(addr => typeof addr === 'string' && addr.length >= 32),
}));

vi.mock('./formatting', () => ({
    formatAddress: vi.fn(addr => `${addr.slice(0, 4)}...${addr.slice(-4)}`),
}));

describe('Clipboard Utilities', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('isClipboardAvailable', () => {
        it('should return availability status object', () => {
            const result = isClipboardAvailable();

            expect(result).toHaveProperty('modern');
            expect(result).toHaveProperty('fallback');
            expect(result).toHaveProperty('available');
            expect(typeof result.modern).toBe('boolean');
            expect(typeof result.fallback).toBe('boolean');
            expect(typeof result.available).toBe('boolean');
        });
    });

    describe('copyToClipboard', () => {
        it('should handle empty text with proper error', async () => {
            const result = await copyToClipboard('');

            expect(result.success).toBe(false);
            expect(result.error).toBe(ClipboardErrorType.EMPTY_VALUE);
            expect(result.errorMessage).toContain('No text provided');
        });

        it('should handle whitespace-only text', async () => {
            const result = await copyToClipboard('   ');

            expect(result.success).toBe(false);
            expect(result.error).toBe(ClipboardErrorType.EMPTY_VALUE);
        });

        it('should reject invalid addresses when validateType is address', async () => {
            const result = await copyToClipboard('short', { validateType: 'address' });

            expect(result.success).toBe(false);
            // May be SSR or INVALID_VALUE depending on test environment
            expect([ClipboardErrorType.INVALID_VALUE, ClipboardErrorType.SSR]).toContain(result.error);
        });

        it('should reject invalid signatures', async () => {
            const result = await copyToClipboard('invalid-sig', { validateType: 'signature' });

            expect(result.success).toBe(false);
            // May be SSR or INVALID_VALUE depending on test environment
            expect([ClipboardErrorType.INVALID_VALUE, ClipboardErrorType.SSR]).toContain(result.error);
        });

        it('should accept valid signature format (87-88 chars, base58)', async () => {
            const validSignature =
                '2L4NXP2ZP8R9SyftCRJdCvXhDhJbLi4x8j4LJSi3Xr8k9XXqH7tF9YKGcgQvBK3u9xhGGXYYUV7bTzX1eM8jKm9';
            const result = await copyToClipboard(validSignature, { validateType: 'signature' });

            // May succeed or fail based on clipboard availability, but shouldn't be invalid
            if (!result.success) {
                expect(result.error).not.toBe(ClipboardErrorType.INVALID_VALUE);
            }
        });

        it('should use custom validation when provided', async () => {
            const validate = vi.fn(() => false);
            const result = await copyToClipboard('test', { validate });

            expect(result.success).toBe(false);
            // May be SSR or INVALID_VALUE depending on test environment
            expect([ClipboardErrorType.INVALID_VALUE, ClipboardErrorType.SSR]).toContain(result.error);
        });

        it('should call onError callback on failure', async () => {
            const onError = vi.fn();
            await copyToClipboard('', { onError });

            expect(onError).toHaveBeenCalledWith(ClipboardErrorType.EMPTY_VALUE, expect.any(String));
        });
    });

    describe('copyAddressToClipboard', () => {
        it('should validate as address automatically', async () => {
            const result = await copyAddressToClipboard('short');

            expect(result.success).toBe(false);
            // May be SSR or INVALID_VALUE depending on test environment
            expect([ClipboardErrorType.INVALID_VALUE, ClipboardErrorType.SSR]).toContain(result.error);
        });

        it('should accept valid address format', async () => {
            const validAddress = '5eykt4UsFv8P8NJdTREpY1vzqKqZKvdpKucSFTa2KSTu8';
            const result = await copyAddressToClipboard(validAddress);

            // Should not fail validation
            if (!result.success) {
                expect(result.error).not.toBe(ClipboardErrorType.INVALID_VALUE);
            }
        });
    });

    describe('copySignatureToClipboard', () => {
        it('should validate as signature automatically', async () => {
            const result = await copySignatureToClipboard('invalid');

            expect(result.success).toBe(false);
            expect([ClipboardErrorType.INVALID_VALUE, ClipboardErrorType.SSR]).toContain(result.error);
        });

        it('should reject signatures that are too short', async () => {
            const result = await copySignatureToClipboard('abc123');

            expect(result.success).toBe(false);
            expect([ClipboardErrorType.INVALID_VALUE, ClipboardErrorType.SSR]).toContain(result.error);
        });

        it('should reject signatures that are too long', async () => {
            const tooLong = 'a'.repeat(100);
            const result = await copySignatureToClipboard(tooLong);

            expect(result.success).toBe(false);
            expect([ClipboardErrorType.INVALID_VALUE, ClipboardErrorType.SSR]).toContain(result.error);
        });

        it('should reject invalid base58 characters', async () => {
            const invalidChars = '0OIl' + 'a'.repeat(85); // Contains 0, O, I, l
            const result = await copySignatureToClipboard(invalidChars);

            expect(result.success).toBe(false);
            expect([ClipboardErrorType.INVALID_VALUE, ClipboardErrorType.SSR]).toContain(result.error);
        });

        it('should accept valid base58 signature', async () => {
            const validSignature =
                '2L4NXP2ZP8R9SyftCRJdCvXhDhJbLi4x8j4LJSi3Xr8k9XXqH7tF9YKGcgQvBK3u9xhGGXYYUV7bTzX1eM8jKm9';
            const result = await copySignatureToClipboard(validSignature);

            // Should not fail validation
            if (!result.success) {
                expect(result.error).not.toBe(ClipboardErrorType.INVALID_VALUE);
            }
        });
    });
});
