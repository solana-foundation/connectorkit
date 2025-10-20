/**
 * Formatting utilities tests
 *
 * Tests address, SOL amount, and number formatting functions
 */

import { describe, it, expect } from 'vitest';
import { formatAddress, formatSOL, formatNumber, truncate, formatTokenAmount } from './formatting';
import { TEST_ADDRESSES } from '../__tests__/fixtures/accounts';

describe('formatAddress', () => {
    it('should format address with default length', () => {
        const formatted = formatAddress(TEST_ADDRESSES.ACCOUNT_1);
        expect(formatted).toBe('HMJf...jjr1');
    });

    it('should format address with custom length', () => {
        const formatted = formatAddress(TEST_ADDRESSES.ACCOUNT_1, { length: 6 });
        expect(formatted).toBe('HMJfh9...P2jjr1');
    });

    it('should format address with custom separator', () => {
        const formatted = formatAddress(TEST_ADDRESSES.ACCOUNT_1, { separator: '…' });
        expect(formatted).toBe('HMJf…jjr1');
    });

    it('should return short addresses unchanged', () => {
        const shortAddress = 'short';
        const formatted = formatAddress(shortAddress);
        expect(formatted).toBe('short');
    });

    it('should handle empty string', () => {
        const formatted = formatAddress('');
        expect(formatted).toBe('');
    });

    it('should handle addresses exactly at threshold', () => {
        const address = '12345678'; // 4+3+4 = 11, length 8
        const formatted = formatAddress(address);
        expect(formatted).toBe('12345678');
    });
});

describe('formatSOL', () => {
    it('should format lamports to SOL with default decimals', () => {
        const formatted = formatSOL(1000000000n);
        expect(formatted).toBe('1.0000 SOL');
    });

    it('should format lamports with custom decimals', () => {
        const formatted = formatSOL(1500000000n, { decimals: 2 });
        expect(formatted).toBe('1.50 SOL');
    });

    it('should format without suffix', () => {
        const formatted = formatSOL(1000000000n, { suffix: false });
        expect(formatted).toBe('1.0000');
    });

    it('should handle zero lamports', () => {
        const formatted = formatSOL(0n);
        expect(formatted).toBe('0.0000 SOL');
    });

    it('should handle small amounts', () => {
        const formatted = formatSOL(1000n, { decimals: 6 });
        expect(formatted).toBe('0.000001 SOL');
    });

    it('should handle large amounts', () => {
        const formatted = formatSOL(1000000000000n, { decimals: 2 });
        expect(formatted).toBe('1000.00 SOL');
    });

    it('should use fast path for numbers when specified', () => {
        const formatted = formatSOL(1000000000, { fast: true });
        expect(formatted).toBe('1.0000 SOL');
    });

    it('should handle number input', () => {
        const formatted = formatSOL(1000000000);
        expect(formatted).toBe('1.0000 SOL');
    });
});

describe('formatNumber', () => {
    it('should format number with thousands separators', () => {
        const formatted = formatNumber(1234567.89);
        expect(formatted).toBe('1,234,567.89');
    });

    it('should format with specific decimals', () => {
        const formatted = formatNumber(1234.5, { decimals: 2 });
        expect(formatted).toBe('1,234.50');
    });

    it('should handle zero', () => {
        const formatted = formatNumber(0);
        expect(formatted).toBe('0');
    });

    it('should handle negative numbers', () => {
        const formatted = formatNumber(-1234.56);
        expect(formatted).toBe('-1,234.56');
    });

    it('should handle small numbers', () => {
        const formatted = formatNumber(0.123, { decimals: 3 });
        expect(formatted).toBe('0.123');
    });

    it('should handle large numbers', () => {
        const formatted = formatNumber(1234567890);
        expect(formatted).toBe('1,234,567,890');
    });

    it('should respect locale', () => {
        const formatted = formatNumber(1234.56, { locale: 'de-DE', decimals: 2 });
        // German locale uses . for thousands and , for decimals
        expect(formatted).toMatch(/1\.234,56|1234,56/);
    });
});

describe('truncate', () => {
    it('should truncate in middle by default', () => {
        const truncated = truncate('Hello World', 8);
        expect(truncated).toBe('He...ld');
    });

    it('should truncate at end when specified', () => {
        const truncated = truncate('Hello World', 8, 'end');
        expect(truncated).toBe('Hello...');
    });

    it('should return text unchanged if shorter than maxLength', () => {
        const truncated = truncate('Short', 10);
        expect(truncated).toBe('Short');
    });

    it('should handle empty string', () => {
        const truncated = truncate('', 5);
        expect(truncated).toBe('');
    });

    it('should handle exact length match', () => {
        const text = '12345';
        const truncated = truncate(text, 5);
        expect(truncated).toBe('12345');
    });

    it('should handle very short maxLength', () => {
        const truncated = truncate('Hello World', 5);
        expect(truncated).toBe('H...d');
    });

    it('should handle middle truncation with even maxLength', () => {
        const truncated = truncate('1234567890', 8);
        expect(truncated).toBe('12...90');
    });

    it('should handle middle truncation with odd maxLength', () => {
        const truncated = truncate('1234567890', 9);
        // With maxLength 9: (9-3)/2 = 3, so we get 3 chars from start and 3 from end
        expect(truncated).toBe('123...890');
    });
});

describe('formatTokenAmount', () => {
    it('should format token amount with proper decimals', () => {
        const formatted = formatTokenAmount(1000000, 6);
        expect(formatted).toBe('1');
    });

    it('should handle custom minimum decimals', () => {
        const formatted = formatTokenAmount(1000000, 6, { minimumDecimals: 2 });
        expect(formatted).toBe('1.00');
    });

    it('should handle custom maximum decimals', () => {
        const formatted = formatTokenAmount(1234567, 6, { maximumDecimals: 2 });
        expect(formatted).toBe('1.23');
    });

    it('should handle zero amount', () => {
        const formatted = formatTokenAmount(0, 6);
        expect(formatted).toBe('0');
    });

    it('should handle large amounts', () => {
        const formatted = formatTokenAmount(1000000000000, 6);
        expect(formatted).toBe('1,000,000');
    });

    it('should handle bigint input', () => {
        const formatted = formatTokenAmount(1000000n, 6);
        expect(formatted).toBe('1');
    });

    it('should handle fractional amounts', () => {
        const formatted = formatTokenAmount(1500000, 6, { minimumDecimals: 2 });
        expect(formatted).toBe('1.50');
    });

    it('should handle 9 decimal tokens (common for SPL tokens)', () => {
        const formatted = formatTokenAmount(1000000000, 9);
        expect(formatted).toBe('1');
    });

    it('should handle 0 decimal tokens', () => {
        const formatted = formatTokenAmount(100, 0);
        expect(formatted).toBe('100');
    });
});
