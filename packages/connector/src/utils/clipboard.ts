/**
 * @connector-kit/connector - Clipboard utilities
 * 
 * Utility functions for copying addresses and other text to clipboard.
 * Compatible with wallet-ui's handleCopyText pattern.
 */

/**
 * Copy text to clipboard
 * Compatible with wallet-ui's handleCopyText but with additional options
 */
export async function copyToClipboard(
  text: string,
  options?: {
    onSuccess?: () => void
    onError?: (error: Error) => void
  }
): Promise<boolean> {
  if (!text) {
    options?.onError?.(new Error('No text provided to copy'))
    return false
  }
  
  if (
    typeof globalThis === 'undefined' ||
    !globalThis.navigator?.clipboard?.writeText
  ) {
    const error = new Error('Clipboard API not available')
    options?.onError?.(error)
    return false
  }

  try {
    await globalThis.navigator.clipboard.writeText(text)
    options?.onSuccess?.()
    return true
  } catch (error) {
    options?.onError?.(error as Error)
    return false
  }
}

/**
 * Copy wallet address to clipboard
 * Convenience wrapper for copyToClipboard
 */
export async function copyAddressToClipboard(
  address: string,
  options?: {
    onSuccess?: () => void
    onError?: (error: Error) => void
  }
): Promise<boolean> {
  return copyToClipboard(address, options)
}

