/**
 * @connector-kit/connector - Lightweight formatting utilities
 * 
 * Optimized versions for common cases without BigInt overhead
 * For complex cases, use the full formatting utilities
 */

/**
 * Fast address formatting for display (lightweight version)
 * 
 * @example
 * formatAddressSimple('7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU')
 * // Returns: '7xKX...gAsU'
 */
export function formatAddressSimple(address: string, length = 4): string {
  if (!address || address.length <= length * 2 + 3) {
    return address
  }
  return `${address.slice(0, length)}...${address.slice(-length)}`
}

/**
 * Fast SOL formatting for common amounts (lightweight version)
 * Uses number arithmetic - suitable for amounts < 2^53 lamports (~9000 SOL)
 * For larger amounts or precise rounding, use formatSOL from full utils
 * 
 * @example
 * formatSOLSimple(1000000000) // Returns: '1.0000 SOL'
 * formatSOLSimple(1500000000, 2) // Returns: '1.50 SOL'
 */
export function formatSOLSimple(
  lamports: number,
  decimals = 4,
  suffix = true
): string {
  const sol = lamports / 1_000_000_000
  const formatted = sol.toFixed(decimals)
  return suffix ? `${formatted} SOL` : formatted
}

/**
 * Fast number formatting with thousands separators (lightweight version)
 * 
 * @example
 * formatNumberSimple(1234567.89) // Returns: '1,234,567.89'
 */
export function formatNumberSimple(value: number, decimals?: number): string {
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value)
}

/**
 * Fast truncate text (lightweight version)
 * 
 * @example
 * truncateSimple('Hello World', 8) // Returns: 'He...ld'
 */
export function truncateSimple(text: string, maxLength: number): string {
  if (!text || text.length <= maxLength) return text
  const half = Math.floor((maxLength - 3) / 2)
  return text.slice(0, half) + '...' + text.slice(-half)
}

