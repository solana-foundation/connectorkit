/**
 * @solana/connector - Formatting utilities
 *
 * Unified utility functions for formatting addresses, amounts, and other display values
 * Consolidates both fast (number-based) and precise (bigint-based) formatting options
 */

import { lamportsToSol, LAMPORTS_PER_SOL } from '../lib/kit-utils';

/**
 * Format a Solana address for display
 *
 * @example
 * formatAddress('7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU')
 * // Returns: '7xKX...gAsU'
 *
 * @example
 * formatAddress('7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU', { length: 6 })
 * // Returns: '7xKXtg...osgAsU'
 */
export function formatAddress(
    address: string,
    options: {
        length?: number;
        separator?: string;
    } = {},
): string {
    const { length = 4, separator = '...' } = options;

    if (!address || address.length <= length * 2 + separator.length) {
        return address;
    }

    return `${address.slice(0, length)}${separator}${address.slice(-length)}`;
}

/**
 * Format SOL amount for display
 * Supports both precise bigint and fast number arithmetic
 *
 * @param lamports - Amount in lamports (number or bigint)
 * @param options - Formatting options
 * @param options.decimals - Number of decimal places (default: 4)
 * @param options.suffix - Add 'SOL' suffix (default: true)
 * @param options.fast - Use fast number arithmetic for amounts < 9000 SOL (default: false)
 *
 * @example
 * formatSOL(1000000000n) // Returns: '1.0000 SOL' (precise)
 * formatSOL(1000000000, { fast: true }) // Returns: '1.0000 SOL' (fast)
 * formatSOL(1500000000, { decimals: 2 }) // Returns: '1.50 SOL'
 */
export function formatSOL(
    lamports: number | bigint,
    options: {
        decimals?: number;
        suffix?: boolean;
        fast?: boolean;
    } = {},
): string {
    const { decimals = 4, suffix = true, fast = false } = options;

    // Fast path for small numbers (< 2^53 lamports ~9000 SOL)
    if (fast && typeof lamports === 'number') {
        const sol = lamports / LAMPORTS_PER_SOL;
        const formatted = sol.toFixed(decimals);
        return suffix ? `${formatted} SOL` : formatted;
    }

    // Precise path: convert to number and format with proper decimals
    // This ensures trailing zeros are included
    const lamportsBigInt = typeof lamports === 'bigint' ? lamports : BigInt(lamports);
    const sol = Number(lamportsBigInt) / LAMPORTS_PER_SOL;
    const formatted = sol.toFixed(decimals);
    return suffix ? `${formatted} SOL` : formatted;
}

/**
 * Format a number with thousands separators
 *
 * @example
 * formatNumber(1234567.89) // Returns: '1,234,567.89'
 */
export function formatNumber(
    value: number,
    options: {
        decimals?: number;
        locale?: string;
    } = {},
): string {
    const { decimals, locale = 'en-US' } = options;

    return new Intl.NumberFormat(locale, {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
    }).format(value);
}

/**
 * Truncate text with ellipsis
 *
 * @param text - Text to truncate
 * @param maxLength - Maximum length including ellipsis
 * @param position - Where to truncate: 'middle' or 'end' (default: 'middle')
 *
 * @example
 * truncate('Hello World', 8) // Returns: 'He...ld'
 * truncate('Hello World', 8, 'end') // Returns: 'Hello...'
 * truncate('Short', 10) // Returns: 'Short' (no truncation needed)
 */
export function truncate(text: string, maxLength: number, position: 'middle' | 'end' = 'middle'): string {
    if (!text || text.length <= maxLength) return text;

    if (position === 'end') {
        return text.slice(0, maxLength - 3) + '...';
    }

    // Middle truncation
    const half = Math.floor((maxLength - 3) / 2);
    return text.slice(0, half) + '...' + text.slice(-half);
}

/**
 * Format token amount with proper decimals
 *
 * @example
 * formatTokenAmount(1000000, 6) // Returns: '1.000000'
 */
export function formatTokenAmount(
    amount: number | bigint,
    decimals: number,
    options: {
        minimumDecimals?: number;
        maximumDecimals?: number;
    } = {},
): string {
    const value = Number(amount) / Math.pow(10, decimals);
    const minDecimals = options.minimumDecimals ?? 0;
    const maxDecimals = options.maximumDecimals ?? decimals;

    return value.toLocaleString('en-US', {
        minimumFractionDigits: minDecimals,
        maximumFractionDigits: maxDecimals,
    });
}

// ============================================================================
// BigInt-Safe Formatting Utilities
// ============================================================================

/**
 * Maximum safe integer for JavaScript (2^53 - 1)
 */
const MAX_SAFE_INTEGER = BigInt(Number.MAX_SAFE_INTEGER);

/**
 * Check if a bigint is safe to convert to a number without precision loss
 */
function isSafeInteger(value: bigint): boolean {
    return value >= -MAX_SAFE_INTEGER && value <= MAX_SAFE_INTEGER;
}

/**
 * Split a bigint into whole and fractional parts as strings.
 * This avoids precision loss by using string manipulation.
 *
 * @param amount - The bigint amount in smallest units
 * @param decimals - Number of decimal places
 * @returns Object with whole and fractional parts as strings
 */
function splitBigIntDecimals(amount: bigint, decimals: number): { whole: string; fraction: string } {
    if (decimals <= 0) {
        return { whole: amount.toString(), fraction: '' };
    }

    const str = amount.toString();
    const isNegative = str.startsWith('-');
    const absStr = isNegative ? str.slice(1) : str;

    if (absStr.length <= decimals) {
        // Pad with leading zeros
        const padded = absStr.padStart(decimals, '0');
        return {
            whole: isNegative ? '-0' : '0',
            fraction: padded,
        };
    }

    const splitPoint = absStr.length - decimals;
    return {
        whole: (isNegative ? '-' : '') + absStr.slice(0, splitPoint),
        fraction: absStr.slice(splitPoint),
    };
}

/**
 * Format a bigint balance with decimals, avoiding Number precision loss.
 * Uses string manipulation for precision beyond Number.MAX_SAFE_INTEGER.
 *
 * @param amount - The bigint amount in smallest units
 * @param decimals - Number of decimal places for the token
 * @param options - Formatting options
 * @returns Formatted string representation
 *
 * @example
 * // Small amounts (uses Number for speed)
 * formatBigIntBalance(1000000n, 6) // Returns: '1'
 *
 * @example
 * // Large amounts (uses string manipulation for precision)
 * formatBigIntBalance(12345678901234567890n, 18) // Returns: '12.345678901234567890'
 *
 * @example
 * // With options
 * formatBigIntBalance(1500000n, 6, { maxDecimals: 2 }) // Returns: '1.5'
 */
export function formatBigIntBalance(
    amount: bigint,
    decimals: number,
    options: {
        /** Maximum number of decimal places to show (default: min(decimals, 6)) */
        maxDecimals?: number;
        /** Minimum number of decimal places to show (default: 0) */
        minDecimals?: number;
        /** Locale for number formatting (default: undefined, uses browser locale) */
        locale?: string;
        /** Whether to use grouping separators like commas (default: true) */
        useGrouping?: boolean;
    } = {},
): string {
    const {
        maxDecimals = Math.min(decimals, 6),
        minDecimals = 0,
        locale,
        useGrouping = true,
    } = options;

    // Fast path: if the amount is safe to convert to Number, use native formatting
    if (isSafeInteger(amount)) {
        const value = Number(amount) / Math.pow(10, decimals);
        return value.toLocaleString(locale, {
            minimumFractionDigits: minDecimals,
            maximumFractionDigits: maxDecimals,
            useGrouping,
        });
    }

    // Slow path: use string manipulation for large numbers
    const { whole, fraction } = splitBigIntDecimals(amount, decimals);

    // Truncate fraction to maxDecimals
    let truncatedFraction = fraction.slice(0, maxDecimals);

    // Remove trailing zeros (but keep at least minDecimals)
    while (truncatedFraction.length > minDecimals && truncatedFraction.endsWith('0')) {
        truncatedFraction = truncatedFraction.slice(0, -1);
    }

    // Pad to minDecimals if needed
    truncatedFraction = truncatedFraction.padEnd(minDecimals, '0');

    // Format whole part with grouping
    let formattedWhole = whole;
    if (useGrouping) {
        const isNegative = whole.startsWith('-');
        const absWhole = isNegative ? whole.slice(1) : whole;

        // Add thousands separators
        const parts: string[] = [];
        for (let i = absWhole.length; i > 0; i -= 3) {
            parts.unshift(absWhole.slice(Math.max(0, i - 3), i));
        }

        formattedWhole = (isNegative ? '-' : '') + parts.join(',');
    }

    if (truncatedFraction.length === 0) {
        return formattedWhole;
    }

    return `${formattedWhole}.${truncatedFraction}`;
}

/**
 * Convert lamports to SOL string representation with BigInt safety.
 *
 * @param lamports - Amount in lamports (bigint)
 * @param options - Formatting options
 * @returns Formatted SOL string
 *
 * @example
 * formatLamportsToSolSafe(1000000000n) // Returns: '1'
 * formatLamportsToSolSafe(1500000000n, { maxDecimals: 4 }) // Returns: '1.5'
 * formatLamportsToSolSafe(1000000000n, { suffix: true }) // Returns: '1 SOL'
 */
export function formatLamportsToSolSafe(
    lamports: bigint,
    options: {
        /** Maximum decimal places (default: 4) */
        maxDecimals?: number;
        /** Minimum decimal places (default: 0) */
        minDecimals?: number;
        /** Add ' SOL' suffix (default: false) */
        suffix?: boolean;
        /** Locale for formatting */
        locale?: string;
    } = {},
): string {
    const { maxDecimals = 4, minDecimals = 0, suffix = false, locale } = options;

    const formatted = formatBigIntBalance(lamports, 9, {
        maxDecimals,
        minDecimals,
        locale,
    });

    return suffix ? `${formatted} SOL` : formatted;
}

/**
 * Format USD value from bigint amount with BigInt safety.
 * Uses the USD price to calculate the value.
 *
 * @param amount - Token amount in smallest units (bigint)
 * @param decimals - Token decimals
 * @param usdPrice - Current USD price per token
 * @param options - Formatting options
 * @returns Formatted USD string
 *
 * @example
 * formatBigIntUsd(1000000000n, 9, 150.50) // Returns: '$150.50'
 */
export function formatBigIntUsd(
    amount: bigint,
    decimals: number,
    usdPrice: number,
    options: {
        /** Locale for formatting (default: undefined) */
        locale?: string;
        /** Currency code (default: 'USD') */
        currency?: string;
    } = {},
): string {
    const { locale, currency = 'USD' } = options;

    // For USD calculation, we need to convert to Number at some point.
    // We use the fractional approach to minimize precision loss.

    // Split into whole and fractional parts
    const { whole, fraction } = splitBigIntDecimals(amount, decimals);

    // Convert whole part (may lose precision for extremely large numbers)
    const wholeNum = parseFloat(whole);

    // Convert fractional part (always safe, < 1)
    const fractionNum = fraction ? parseFloat('0.' + fraction) : 0;

    // Calculate total token amount
    const tokenAmount = wholeNum + fractionNum;

    // Calculate USD value
    const usdValue = tokenAmount * usdPrice;

    return usdValue.toLocaleString(locale, {
        style: 'currency',
        currency,
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    });
}

/**
 * Format a token balance for display with BigInt safety.
 * Convenience wrapper around formatBigIntBalance.
 *
 * @param amount - Token amount in smallest units
 * @param decimals - Token decimals
 * @param options - Formatting options
 * @returns Formatted balance string
 */
export function formatTokenBalanceSafe(
    amount: bigint,
    decimals: number,
    options: {
        maxDecimals?: number;
        locale?: string;
    } = {},
): string {
    return formatBigIntBalance(amount, decimals, {
        maxDecimals: options.maxDecimals ?? Math.min(decimals, 6),
        locale: options.locale,
    });
}
