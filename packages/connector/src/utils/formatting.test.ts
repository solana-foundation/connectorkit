/**
 * Formatting utilities tests
 *
 * Tests address, SOL amount, and number formatting functions
 */

import { describe, it, expect } from 'vitest';
import {
    formatAddress,
    formatSOL,
    formatNumber,
    truncate,
    formatTokenAmount,
    formatBigIntBalance,
    formatLamportsToSolSafe,
    formatBigIntUsd,
    formatTokenBalanceSafe,
} from './formatting';
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

// ============================================================================
// BigInt-Safe Formatting Tests
// ============================================================================

describe('formatBigIntBalance', () => {
    it('should format small bigint amounts', () => {
        const formatted = formatBigIntBalance(1000000n, 6);
        expect(formatted).toBe('1');
    });

    it('should format with decimals', () => {
        const formatted = formatBigIntBalance(1500000n, 6, { maxDecimals: 2, minDecimals: 2 });
        expect(formatted).toBe('1.50');
    });

    it('should handle zero', () => {
        const formatted = formatBigIntBalance(0n, 6);
        expect(formatted).toBe('0');
    });

    it('should handle amounts smaller than 1', () => {
        const formatted = formatBigIntBalance(500000n, 6, { maxDecimals: 6 });
        expect(formatted).toBe('0.5');
    });

    it('should handle amounts with leading zeros in fraction', () => {
        const formatted = formatBigIntBalance(100n, 6, { maxDecimals: 6 });
        expect(formatted).toBe('0.0001');
    });

    it('should format with thousands separators by default', () => {
        const formatted = formatBigIntBalance(1234567000000n, 6);
        expect(formatted).toBe('1,234,567');
    });

    it('should respect useGrouping: false', () => {
        const formatted = formatBigIntBalance(1234567000000n, 6, { useGrouping: false });
        expect(formatted).toBe('1234567');
    });

    it('should truncate decimals to maxDecimals', () => {
        const formatted = formatBigIntBalance(1234567n, 6, { maxDecimals: 2 });
        expect(formatted).toBe('1.23');
    });

    it('should pad to minDecimals', () => {
        const formatted = formatBigIntBalance(1000000n, 6, { minDecimals: 4 });
        expect(formatted).toBe('1.0000');
    });

    it('should handle 9 decimal tokens (SOL)', () => {
        const formatted = formatBigIntBalance(1500000000n, 9, { maxDecimals: 4 });
        expect(formatted).toBe('1.5');
    });

    it('should handle large amounts within safe integer range', () => {
        // 9000 SOL in lamports - still within safe range
        const formatted = formatBigIntBalance(9000000000000n, 9, { maxDecimals: 2 });
        expect(formatted).toBe('9,000');
    });

    it('should handle amounts beyond Number.MAX_SAFE_INTEGER', () => {
        // 100 trillion tokens (10^14) with 6 decimals
        const largeAmount = 100_000_000_000_000_000_000n; // 10^20
        const formatted = formatBigIntBalance(largeAmount, 6, { useGrouping: false });
        expect(formatted).toBe('100000000000000');
    });

    it('should handle negative amounts', () => {
        const formatted = formatBigIntBalance(-1500000n, 6, { maxDecimals: 2 });
        expect(formatted).toBe('-1.5');
    });

    it('should handle 0 decimals', () => {
        const formatted = formatBigIntBalance(12345n, 0);
        expect(formatted).toBe('12,345');
    });
});

describe('formatLamportsToSolSafe', () => {
    it('should format lamports to SOL', () => {
        const formatted = formatLamportsToSolSafe(1000000000n);
        expect(formatted).toBe('1');
    });

    it('should format with suffix', () => {
        const formatted = formatLamportsToSolSafe(1000000000n, { suffix: true });
        expect(formatted).toBe('1 SOL');
    });

    it('should respect maxDecimals', () => {
        const formatted = formatLamportsToSolSafe(1500000000n, { maxDecimals: 2 });
        expect(formatted).toBe('1.5');
    });

    it('should handle zero lamports', () => {
        const formatted = formatLamportsToSolSafe(0n, { suffix: true });
        expect(formatted).toBe('0 SOL');
    });

    it('should handle small amounts', () => {
        const formatted = formatLamportsToSolSafe(1000n, { maxDecimals: 9 });
        expect(formatted).toBe('0.000001');
    });

    it('should handle large amounts', () => {
        const formatted = formatLamportsToSolSafe(1000000000000n, { maxDecimals: 2, suffix: true });
        expect(formatted).toBe('1,000 SOL');
    });
});

describe('formatBigIntUsd', () => {
    it('should format USD value', () => {
        const formatted = formatBigIntUsd(1000000000n, 9, 150.5);
        expect(formatted).toMatch(/\$150\.50/);
    });

    it('should handle zero amount', () => {
        const formatted = formatBigIntUsd(0n, 9, 150.5);
        expect(formatted).toMatch(/\$0\.00/);
    });

    it('should handle fractional token amounts', () => {
        const formatted = formatBigIntUsd(500000000n, 9, 100); // 0.5 SOL at $100
        expect(formatted).toMatch(/\$50\.00/);
    });

    it('should handle small USD values', () => {
        const formatted = formatBigIntUsd(1000n, 9, 150); // 0.000001 SOL at $150
        expect(formatted).toMatch(/\$0\.00/);
    });

    it('should handle large token amounts', () => {
        const formatted = formatBigIntUsd(10000000000000n, 9, 150); // 10,000 SOL at $150
        expect(formatted).toMatch(/1,500,000\.00/);
    });
});

describe('formatTokenBalanceSafe', () => {
    it('should format token balance', () => {
        const formatted = formatTokenBalanceSafe(1000000n, 6);
        expect(formatted).toBe('1');
    });

    it('should respect maxDecimals', () => {
        const formatted = formatTokenBalanceSafe(1234567n, 6, { maxDecimals: 2 });
        expect(formatted).toBe('1.23');
    });

    it('should default maxDecimals to min(decimals, 6)', () => {
        // For 9 decimals, max should be 6
        const formatted = formatTokenBalanceSafe(1234567890n, 9);
        expect(formatted).toBe('1.234568');
    });
});
