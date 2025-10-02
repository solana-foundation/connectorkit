/**
 * @connector-kit/connector - Formatting utilities
 * 
 * Utility functions for formatting addresses, amounts, and other display values
 */

/**
 * Format a Solana address for display
 * 
 * @example
 * formatAddress('7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU')
 * // Returns: '7xKX...gAsU'
 */
export function formatAddress(
  address: string,
  options: { 
    length?: number
    separator?: string 
  } = {}
): string {
  const { length = 4, separator = '...' } = options
  
  if (!address || address.length <= length * 2 + separator.length) {
    return address
  }
  
  return `${address.slice(0, length)}${separator}${address.slice(-length)}`
}

/**
 * Format SOL amount for display
 * Converts lamports to SOL with proper decimal places
 * 
 * @example
 * formatSOL(1000000000) // Returns: '1.0000 SOL'
 * formatSOL(1500000000, { decimals: 2 }) // Returns: '1.50 SOL'
 */
export function formatSOL(
  lamports: number | bigint,
  options: { 
    decimals?: number
    suffix?: boolean 
  } = {}
): string {
  const { decimals = 4, suffix = true } = options
  const sol = Number(lamports) / 1e9
  const formatted = sol.toFixed(decimals)
  return suffix ? `${formatted} SOL` : formatted
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
    decimals?: number
    locale?: string
  } = {}
): string {
  const { decimals, locale = 'en-US' } = options
  
  return new Intl.NumberFormat(locale, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value)
}

/**
 * Truncate text with ellipsis
 * 
 * @example
 * truncate('Hello World', 8) // Returns: 'Hel...rld'
 * truncate('Hello World', 8, 'end') // Returns: 'Hello...'
 */
export function truncate(
  text: string,
  maxLength: number,
  position: 'middle' | 'end' = 'middle'
): string {
  if (!text || text.length <= maxLength) return text
  
  if (position === 'end') {
    return text.slice(0, maxLength - 3) + '...'
  }
  
  // Middle truncation
  const half = Math.floor((maxLength - 3) / 2)
  return text.slice(0, half) + '...' + text.slice(-half)
}

/**
 * Format a transaction signature for display
 * Uses same pattern as address formatting
 */
export function formatSignature(
  signature: string,
  options: { length?: number } = {}
): string {
  return formatAddress(signature, options)
}

/**
 * Format a public key for display
 * Uses same pattern as address formatting
 */
export function formatPublicKey(
  publicKey: string,
  options: { length?: number } = {}
): string {
  return formatAddress(publicKey, options)
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
    minimumDecimals?: number
    maximumDecimals?: number
  } = {}
): string {
  const value = Number(amount) / Math.pow(10, decimals)
  const minDecimals = options.minimumDecimals ?? 0
  const maxDecimals = options.maximumDecimals ?? decimals
  
  return value.toLocaleString('en-US', {
    minimumFractionDigits: minDecimals,
    maximumFractionDigits: maxDecimals,
  })
}

