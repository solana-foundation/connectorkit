/**
 * @connector-kit/connector - Formatting utilities
 *
 * Unified utility functions for formatting addresses, amounts, and other display values
 * Consolidates both fast (number-based) and precise (bigint-based) formatting options
 */

import { lamportsToSol, LAMPORTS_PER_SOL } from 'gill';

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

    // Precise path using gill's lamportsToSol
    const solString = lamportsToSol(lamports, decimals);
    return suffix ? `${solString} SOL` : solString;
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
