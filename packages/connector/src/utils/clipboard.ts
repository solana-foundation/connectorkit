/**
 * @solana/connector - Enhanced Clipboard Utilities
 *
 * Comprehensive clipboard functionality with validation, formatting, fallbacks,
 * and detailed error reporting for Solana addresses and transaction signatures.
 */

import { isAddress } from 'gill';
import { formatAddress } from './formatting';

/**
 * Types of errors that can occur during clipboard operations
 */
export enum ClipboardErrorType {
    /** Browser doesn't support clipboard API (neither modern nor legacy) */
    NOT_SUPPORTED = 'not_supported',
    /** User denied clipboard permission or browser blocked the operation */
    PERMISSION_DENIED = 'permission_denied',
    /** Running in server-side rendering context (no window/navigator) */
    SSR = 'ssr',
    /** Empty or null value provided */
    EMPTY_VALUE = 'empty_value',
    /** Value failed validation (invalid address/signature format) */
    INVALID_VALUE = 'invalid_value',
    /** Unknown error occurred during copy operation */
    UNKNOWN = 'unknown',
}

/**
 * Detailed result from clipboard operation
 */
export interface ClipboardResult {
    /** Whether the copy operation succeeded */
    success: boolean;
    /** Type of error if operation failed */
    error?: ClipboardErrorType;
    /** Human-readable error message */
    errorMessage?: string;
    /** Whether fallback method (execCommand) was used instead of modern API */
    usedFallback?: boolean;
    /** The actual value that was copied (after formatting) */
    copiedValue?: string;
}

/**
 * Options for clipboard copy operations
 */
export interface CopyOptions {
    /** Callback invoked on successful copy */
    onSuccess?: () => void;
    /** Callback invoked on copy failure */
    onError?: (error: ClipboardErrorType, message: string) => void;
    /** Format to use when copying ('full' = original, 'short' = truncated) */
    format?: 'full' | 'short' | 'custom';
    /** Custom formatter function (only used when format='custom') */
    customFormatter?: (value: string) => string;
    /** Custom validation function */
    validate?: (value: string) => boolean;
    /** Type of value being copied (enables built-in validation) */
    validateType?: 'address' | 'signature' | 'none';
    /** Whether to attempt fallback using execCommand for older browsers */
    useFallback?: boolean;
    /** Number of characters to show on each side when format='short' */
    shortFormatChars?: number;
}

/**
 * Check clipboard API availability
 *
 * @returns Object indicating which clipboard methods are available
 *
 * @example
 * ```ts
 * const { modern, fallback, available } = isClipboardAvailable();
 * if (!available) {
 *   console.warn('Clipboard not supported in this browser');
 * }
 * ```
 */
export function isClipboardAvailable(): {
    /** Modern Clipboard API (navigator.clipboard) is available */
    modern: boolean;
    /** Legacy execCommand fallback is available */
    fallback: boolean;
    /** At least one method is available */
    available: boolean;
} {
    // Check for SSR
    if (typeof window === 'undefined' || typeof document === 'undefined') {
        return { modern: false, fallback: false, available: false };
    }

    const modern = typeof navigator?.clipboard?.writeText === 'function';
    const fallback = typeof document.execCommand === 'function';

    return {
        modern,
        fallback,
        available: modern || fallback,
    };
}

/**
 * Validate a Solana address
 */
function validateAddress(address: string): boolean {
    try {
        return isAddress(address);
    } catch {
        return false;
    }
}

/**
 * Validate a transaction signature (base58, 64 bytes = 88 chars)
 */
function validateSignature(signature: string): boolean {
    if (!signature || typeof signature !== 'string') return false;
    // Solana signatures are 64 bytes encoded in base58 (typically 87-88 chars)
    if (signature.length < 87 || signature.length > 88) return false;
    // Check base58 alphabet
    return /^[1-9A-HJ-NP-Za-km-z]+$/.test(signature);
}

/**
 * Format value based on options
 */
function formatValue(value: string, options: CopyOptions): string {
    const { format = 'full', customFormatter, shortFormatChars = 4 } = options;

    if (format === 'custom' && customFormatter) {
        try {
            return customFormatter(value);
        } catch {
            // If custom formatter throws, fall back to original value
            return value;
        }
    }

    if (format === 'short') {
        // Use formatAddress for address-like strings, otherwise truncate manually
        if (value.length > 32 && value.length < 50) {
            return formatAddress(value, { length: shortFormatChars });
        }
        // For signatures or other long strings
        if (value.length > shortFormatChars * 2) {
            return `${value.slice(0, shortFormatChars)}...${value.slice(-shortFormatChars)}`;
        }
    }

    return value;
}

/**
 * Fallback copy method using deprecated execCommand
 * Only used for older browsers that don't support Clipboard API
 */
function copyUsingFallback(text: string): boolean {
    try {
        const textArea = document.createElement('textarea');
        textArea.value = text;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        textArea.style.top = '-999999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();

        const successful = document.execCommand('copy');
        document.body.removeChild(textArea);

        return successful;
    } catch {
        return false;
    }
}

/**
 * Copy text to clipboard with comprehensive error handling and features
 *
 * @param text - Text to copy to clipboard
 * @param options - Configuration options for copy operation
 * @returns Promise resolving to detailed result object
 *
 * @example Basic usage
 * ```ts
 * const result = await copyToClipboard('5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp...');
 * if (result.success) {
 *   console.log('Copied!');
 * }
 * ```
 *
 * @example With validation and formatting
 * ```ts
 * const result = await copyToClipboard(address, {
 *   validateType: 'address',
 *   format: 'short',
 *   onSuccess: () => toast.success('Address copied!'),
 *   onError: (type, msg) => toast.error(msg)
 * });
 * ```
 *
 * @example Custom formatting
 * ```ts
 * const result = await copyToClipboard(signature, {
 *   format: 'custom',
 *   customFormatter: (sig) => `Signature: ${sig}`,
 *   onSuccess: () => setCopied(true)
 * });
 * ```
 */
export async function copyToClipboard(text: string, options: CopyOptions = {}): Promise<ClipboardResult> {
    const { onSuccess, onError, validate, validateType = 'none', useFallback = true } = options;

    // Validate input
    if (!text || typeof text !== 'string' || text.trim() === '') {
        const error = ClipboardErrorType.EMPTY_VALUE;
        const message = 'No text provided to copy';
        onError?.(error, message);
        return { success: false, error, errorMessage: message };
    }

    // Check SSR
    if (typeof window === 'undefined' || typeof navigator === 'undefined') {
        const error = ClipboardErrorType.SSR;
        const message = 'Clipboard not available in server-side rendering context';
        onError?.(error, message);
        return { success: false, error, errorMessage: message };
    }

    // Run validation if specified
    if (validate && !validate(text)) {
        const error = ClipboardErrorType.INVALID_VALUE;
        const message = 'Value failed custom validation';
        onError?.(error, message);
        return { success: false, error, errorMessage: message };
    }

    // Built-in validation based on type
    if (validateType === 'address' && !validateAddress(text)) {
        const error = ClipboardErrorType.INVALID_VALUE;
        const message = 'Invalid Solana address format';
        onError?.(error, message);
        return { success: false, error, errorMessage: message };
    }

    if (validateType === 'signature' && !validateSignature(text)) {
        const error = ClipboardErrorType.INVALID_VALUE;
        const message = 'Invalid transaction signature format';
        onError?.(error, message);
        return { success: false, error, errorMessage: message };
    }

    // Format value if needed
    const formattedValue = formatValue(text, options);

    // Check clipboard availability
    const availability = isClipboardAvailable();

    if (!availability.available) {
        const error = ClipboardErrorType.NOT_SUPPORTED;
        const message = 'Clipboard API not supported in this browser';
        onError?.(error, message);
        return { success: false, error, errorMessage: message };
    }

    // Try modern Clipboard API first
    if (availability.modern) {
        try {
            await navigator.clipboard.writeText(formattedValue);
            onSuccess?.();
            return { success: true, copiedValue: formattedValue };
        } catch (err) {
            // Check if it's a permission error
            const isPermissionError =
                err instanceof Error &&
                (err.name === 'NotAllowedError' || err.message.toLowerCase().includes('permission'));

            if (isPermissionError) {
                const error = ClipboardErrorType.PERMISSION_DENIED;
                const message = 'Clipboard permission denied by user or browser';
                onError?.(error, message);
                return { success: false, error, errorMessage: message };
            }

            // If modern API fails and fallback is enabled, try execCommand
            if (useFallback && availability.fallback) {
                const fallbackSuccess = copyUsingFallback(formattedValue);
                if (fallbackSuccess) {
                    onSuccess?.();
                    return { success: true, usedFallback: true, copiedValue: formattedValue };
                }
            }

            const error = ClipboardErrorType.UNKNOWN;
            const message = err instanceof Error ? err.message : 'Failed to copy to clipboard';
            onError?.(error, message);
            return { success: false, error, errorMessage: message };
        }
    }

    // Use fallback if modern API not available
    if (useFallback && availability.fallback) {
        const fallbackSuccess = copyUsingFallback(formattedValue);
        if (fallbackSuccess) {
            onSuccess?.();
            return { success: true, usedFallback: true, copiedValue: formattedValue };
        }

        const error = ClipboardErrorType.UNKNOWN;
        const message = 'Failed to copy using fallback method';
        onError?.(error, message);
        return { success: false, error, errorMessage: message };
    }

    // Should never reach here, but handle it
    const error = ClipboardErrorType.NOT_SUPPORTED;
    const message = 'No clipboard method available';
    onError?.(error, message);
    return { success: false, error, errorMessage: message };
}

/**
 * Copy a Solana wallet address to clipboard with automatic validation
 *
 * @param address - Solana wallet address (base58 encoded public key)
 * @param options - Copy options (validateType will be set to 'address' automatically)
 * @returns Promise resolving to result object
 *
 * @example
 * ```tsx
 * function AddressButton({ address }: { address: string }) {
 *   const [copied, setCopied] = useState(false);
 *
 *   const handleCopy = async () => {
 *     const result = await copyAddressToClipboard(address, {
 *       format: 'short',
 *       onSuccess: () => {
 *         setCopied(true);
 *         setTimeout(() => setCopied(false), 2000);
 *       }
 *     });
 *   };
 *
 *   return (
 *     <button onClick={handleCopy}>
 *       {formatAddress(address)} {copied && '✓'}
 *     </button>
 *   );
 * }
 * ```
 */
export async function copyAddressToClipboard(
    address: string,
    options?: Omit<CopyOptions, 'validateType'>,
): Promise<ClipboardResult> {
    return copyToClipboard(address, {
        ...options,
        validateType: 'address',
    });
}

/**
 * Copy a transaction signature to clipboard with automatic validation
 *
 * @param signature - Solana transaction signature (base58 encoded, 64 bytes)
 * @param options - Copy options (validateType will be set to 'signature' automatically)
 * @returns Promise resolving to result object
 *
 * @example
 * ```tsx
 * function TransactionRow({ signature }: { signature: string }) {
 *   return (
 *     <button
 *       onClick={async () => {
 *         const result = await copySignatureToClipboard(signature, {
 *           onSuccess: () => toast.success('Signature copied!'),
 *           onError: (type, msg) => toast.error(msg)
 *         });
 *       }}
 *     >
 *       Copy Signature
 *     </button>
 *   );
 * }
 * ```
 */
export async function copySignatureToClipboard(
    signature: string,
    options?: Omit<CopyOptions, 'validateType'>,
): Promise<ClipboardResult> {
    return copyToClipboard(signature, {
        ...options,
        validateType: 'signature',
    });
}
