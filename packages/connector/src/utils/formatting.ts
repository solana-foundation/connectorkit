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
 * Uses bigint arithmetic to preserve precision for large values
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
  
  // Convert to bigint if number
  const lamportsBigInt = typeof lamports === 'number' ? BigInt(lamports) : lamports
  
  const LAMPORTS_PER_SOL = BigInt(1_000_000_000)
  
  // Handle negative values
  const isNegative = lamportsBigInt < 0n
  const absoluteLamports = isNegative ? -lamportsBigInt : lamportsBigInt
  
  // Get integer SOL and fractional lamports
  let integerSol = absoluteLamports / LAMPORTS_PER_SOL
  const fractionalLamports = absoluteLamports % LAMPORTS_PER_SOL
  
  // Convert fractional part to string (always 9 digits for lamports)
  const fractionalStr = fractionalLamports.toString().padStart(9, '0')
  
  // Get the decimal part we want to display
  let decimalPart = fractionalStr.slice(0, decimals)
  
  // Round if there's a next digit and it's >= 5
  if (decimals < 9 && decimals > 0) {
    const nextDigit = parseInt(fractionalStr[decimals] || '0', 10)
    if (nextDigit >= 5) {
      // Round up the decimal part
      let roundedDecimal = BigInt(decimalPart) + 1n
      decimalPart = roundedDecimal.toString().padStart(decimals, '0')
      
      // Handle overflow (e.g., 0.9999 rounded up becomes 1.0000)
      if (decimalPart.length > decimals) {
        integerSol = integerSol + 1n
        decimalPart = '0'.repeat(decimals)
      }
    }
  }
  
  // Build the formatted string
  const sign = isNegative ? '-' : ''
  const formatted = decimals > 0 
    ? `${sign}${integerSol}.${decimalPart}`
    : `${sign}${integerSol}`
  
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
 * truncate('Hello World', 8) // Returns: 'He...ld'
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

