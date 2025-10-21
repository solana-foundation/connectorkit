/**
 * @solana/connector - Browser Compatibility Polyfills
 *
 * Ensures connector works across all browser environments including:
 * - Mobile browsers (iOS Safari, Chrome Mobile, etc.)
 * - Older desktop browsers
 * - Environments with restricted crypto APIs
 *
 * Inspired by wallet-adapter-compat's polyfill strategy
 */

import { install } from '@solana/webcrypto-ed25519-polyfill';
import { createLogger } from './secure-logger';

const logger = createLogger('Polyfills');

/**
 * Tracks whether polyfills have been installed
 * Prevents duplicate installations
 */
let installed = false;

/**
 * Install browser compatibility polyfills
 *
 * This function:
 * - Installs WebCrypto Ed25519 polyfill for signature operations
 * - Is safe to call multiple times (idempotent)
 * - Only runs in browser environments
 * - Fails gracefully if installation errors occur
 *
 * @example
 * ```ts
 * // Automatically called when connector-provider is imported
 * import { ConnectorProvider } from '@solana/connector'
 *
 * // Can also be called manually if needed
 * import { installPolyfills } from '@solana/connector/headless'
 * installPolyfills()
 * ```
 */
export function installPolyfills(): void {
    // Skip if already installed or not in browser
    if (installed || typeof window === 'undefined') {
        return;
    }

    try {
        // Install WebCrypto Ed25519 polyfill
        // This enables signature verification in browsers that don't natively support Ed25519
        install();
        installed = true;

        if (process.env.NODE_ENV === 'development' && logger) {
            logger.info('Browser compatibility polyfills installed');
        }
    } catch (error) {
        // Polyfill installation failed, but don't crash
        // Most modern browsers won't need the polyfill anyway
        if (logger) {
            logger.warn('Failed to install polyfills', { error });
        }

        // Mark as installed anyway to prevent retry loops
        installed = true;
    }
}

/**
 * Check if polyfills have been installed
 * Useful for debugging and health checks
 *
 * @returns True if polyfills are installed, false otherwise
 *
 * @example
 * ```ts
 * import { isPolyfillInstalled } from '@solana/connector/headless'
 *
 * if (!isPolyfillInstalled()) {
 *   console.warn('Polyfills not installed - may have issues on older browsers')
 * }
 * ```
 */
export function isPolyfillInstalled(): boolean {
    return installed;
}

/**
 * Check if WebCrypto API is available
 * Useful for detecting environments with restricted crypto capabilities
 *
 * @returns True if crypto.subtle is available, false otherwise
 *
 * @example
 * ```ts
 * import { isCryptoAvailable } from '@solana/connector/headless'
 *
 * if (!isCryptoAvailable()) {
 *   // Show warning to user about unsupported browser
 * }
 * ```
 */
export function isCryptoAvailable(): boolean {
    if (typeof window === 'undefined') return false;

    try {
        return Boolean(window.crypto && window.crypto.subtle && typeof window.crypto.subtle.sign === 'function');
    } catch {
        return false;
    }
}

/**
 * Get polyfill status information
 * Returns detailed information about polyfill and crypto availability
 *
 * @returns Object with polyfill status details
 *
 * @example
 * ```ts
 * import { getPolyfillStatus } from '@solana/connector/headless'
 *
 * const status = getPolyfillStatus()
 * console.log('Polyfills:', status.installed ? 'installed' : 'not installed')
 * console.log('WebCrypto:', status.cryptoAvailable ? 'available' : 'unavailable')
 * ```
 */
export function getPolyfillStatus(): {
    installed: boolean;
    cryptoAvailable: boolean;
    environment: 'browser' | 'server';
} {
    return {
        installed,
        cryptoAvailable: isCryptoAvailable(),
        environment: typeof window !== 'undefined' ? 'browser' : 'server',
    };
}

/**
 * Reset polyfill installation state
 * ⚠️ FOR TESTING ONLY - Do not use in production code
 * @internal
 */
export function __resetPolyfillsForTesting(): void {
    installed = false;
}
