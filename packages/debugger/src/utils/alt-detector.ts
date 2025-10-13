/**
 * @connector-kit/debugger - ALT Usage Detector
 * 
 * Detects when transactions use Address Lookup Tables and analyzes
 * the compression achieved.
 */

/**
 * ALT usage detection result
 */
export interface ALTUsageInfo {
    /** Whether transaction uses ALT */
    usesALT: boolean;
    /** Transaction version (0 = versioned with ALT support, legacy = no ALT) */
    version: 'legacy' | 0;
    /** Address of the lookup table(s) used */
    lookupTableAddresses: string[];
    /** Number of addresses resolved from lookup table(s) */
    numAddressesFromALT: number;
    /** Estimated bytes saved by using ALT */
    estimatedBytesSaved: number;
    /** Compression ratio achieved (e.g., 1.87 means 1.87:1) */
    compressionRatio: number | null;
}

/**
 * Detect if a transaction uses Address Lookup Tables
 * 
 * ALTs are only supported in versioned transactions (v0).
 * They include addressTableLookups in the message which reference
 * external lookup table accounts.
 * 
 * @param transaction - Transaction object (from RPC response)
 * @returns ALT usage information
 */
export function detectALTUsage(transaction: unknown): ALTUsageInfo {
    const defaultResult: ALTUsageInfo = {
        usesALT: false,
        version: 'legacy',
        lookupTableAddresses: [],
        numAddressesFromALT: 0,
        estimatedBytesSaved: 0,
        compressionRatio: null,
    };

    try {
        if (!transaction || typeof transaction !== 'object') {
            return defaultResult;
        }

        // Navigate to the transaction message
        let message: unknown;
        if ('transaction' in transaction) {
            const tx = (transaction as { transaction: unknown }).transaction;
            if (tx && typeof tx === 'object' && 'message' in tx) {
                message = (tx as { message: unknown }).message;
            }
        } else if ('message' in transaction) {
            message = (transaction as { message: unknown }).message;
        }

        if (!message || typeof message !== 'object') {
            return defaultResult;
        }

        // Check transaction version
        let version: 'legacy' | 0 = 'legacy';
        if ('version' in transaction) {
            const versionValue = (transaction as { version: unknown }).version;
            if (versionValue === 0 || versionValue === '0') {
                version = 0;
            }
        }

        // Check for addressTableLookups in the message
        const hasAddressTableLookups =
            'addressTableLookups' in message &&
            Array.isArray((message as { addressTableLookups: unknown[] }).addressTableLookups) &&
            (message as { addressTableLookups: unknown[] }).addressTableLookups.length > 0;

        if (!hasAddressTableLookups) {
            return {
                ...defaultResult,
                version,
            };
        }

        // Extract lookup table information
        const addressTableLookups = (message as { addressTableLookups: unknown[] }).addressTableLookups;

        const lookupTableAddresses: string[] = [];
        let numAddressesFromALT = 0;

        addressTableLookups.forEach(lookup => {
            if (lookup && typeof lookup === 'object') {
                // Get the lookup table account address
                if ('accountKey' in lookup) {
                    const accountKey = (lookup as { accountKey: unknown }).accountKey;
                    if (typeof accountKey === 'string') {
                        lookupTableAddresses.push(accountKey);
                    } else if (accountKey && typeof accountKey === 'object' && 'toBase58' in accountKey) {
                        lookupTableAddresses.push(
                            String((accountKey as { toBase58: () => string }).toBase58()),
                        );
                    }
                }

                // Count addresses from writable and readonly indices
                if ('writableIndexes' in lookup && Array.isArray((lookup as { writableIndexes: unknown[] }).writableIndexes)) {
                    numAddressesFromALT += (lookup as { writableIndexes: unknown[] }).writableIndexes.length;
                }
                if ('readonlyIndexes' in lookup && Array.isArray((lookup as { readonlyIndexes: unknown[] }).readonlyIndexes)) {
                    numAddressesFromALT += (lookup as { readonlyIndexes: unknown[] }).readonlyIndexes.length;
                }
            }
        });

        // Calculate estimated bytes saved
        // Each address from ALT: saves 31 bytes (32 byte address → 1 byte index)
        // Minus ALT overhead: ~33 bytes per table
        const ALT_OVERHEAD_PER_TABLE = 33;
        const BYTES_SAVED_PER_ADDRESS = 31;
        const totalSavings = numAddressesFromALT * BYTES_SAVED_PER_ADDRESS;
        const totalOverhead = lookupTableAddresses.length * ALT_OVERHEAD_PER_TABLE;
        const estimatedBytesSaved = Math.max(0, totalSavings - totalOverhead);

        // Calculate compression ratio if we have the transaction size
        let compressionRatio: number | null = null;
        if ('meta' in transaction && transaction.meta && typeof transaction.meta === 'object') {
            // Try to get the actual transaction size
            // This is approximate since we don't have the original size
            const currentSize = estimateCurrentTransactionSize(message);
            if (currentSize > 0) {
                const originalSize = currentSize + estimatedBytesSaved;
                compressionRatio = originalSize / currentSize;
            }
        }

        return {
            usesALT: true,
            version,
            lookupTableAddresses,
            numAddressesFromALT,
            estimatedBytesSaved,
            compressionRatio,
        };
    } catch (error) {
        console.warn('Failed to detect ALT usage:', error);
        return defaultResult;
    }
}

/**
 * Estimate current transaction size from message structure
 * This is a rough approximation
 * 
 * @param message - Transaction message
 * @returns Estimated size in bytes
 */
function estimateCurrentTransactionSize(message: unknown): number {
    if (!message || typeof message !== 'object') {
        return 0;
    }

    let size = 0;

    // Signatures (assume 1)
    size += 1 + 64; // compact array prefix + signature

    // Message header
    size += 3;

    // Account keys
    if ('accountKeys' in message && Array.isArray((message as { accountKeys: unknown[] }).accountKeys)) {
        const accountKeys = (message as { accountKeys: unknown[] }).accountKeys;
        size += 1; // compact array prefix
        size += accountKeys.length * 32; // each key is 32 bytes
    }

    // Recent blockhash
    size += 32;

    // Instructions (rough estimate)
    if ('instructions' in message && Array.isArray((message as { instructions: unknown[] }).instructions)) {
        const instructions = (message as { instructions: unknown[] }).instructions;
        size += 1; // compact array prefix
        size += instructions.length * 10; // rough average per instruction
    }

    // Address table lookups (if present)
    if ('addressTableLookups' in message && Array.isArray((message as { addressTableLookups: unknown[] }).addressTableLookups)) {
        const lookups = (message as { addressTableLookups: unknown[] }).addressTableLookups;
        size += 1; // compact array prefix
        size += lookups.length * 35; // rough estimate per lookup
    }

    return size;
}

/**
 * Format ALT usage for display
 * 
 * @param usage - ALT usage info
 * @returns Human-readable summary
 */
export function formatALTUsage(usage: ALTUsageInfo): string {
    if (!usage.usesALT) {
        return 'No ALT used';
    }

    const parts: string[] = [];

    if (usage.numAddressesFromALT > 0) {
        parts.push(`${usage.numAddressesFromALT} addresses from ALT`);
    }

    if (usage.estimatedBytesSaved > 0) {
        parts.push(`~${usage.estimatedBytesSaved} bytes saved`);
    }

    if (usage.compressionRatio !== null && usage.compressionRatio > 1) {
        parts.push(`${usage.compressionRatio.toFixed(2)}:1 compression`);
    }

    return parts.join(' • ');
}

/**
 * Check if a transaction is a versioned transaction (v0)
 * Versioned transactions are required to use ALTs
 * 
 * @param transaction - Transaction object
 * @returns True if versioned (v0)
 */
export function isVersionedTransaction(transaction: unknown): boolean {
    if (!transaction || typeof transaction !== 'object') {
        return false;
    }

    if ('version' in transaction) {
        const version = (transaction as { version: unknown }).version;
        return version === 0 || version === '0';
    }

    // Check if it has addressTableLookups (only in v0)
    if ('message' in transaction) {
        const message = (transaction as { message: unknown }).message;
        if (message && typeof message === 'object' && 'addressTableLookups' in message) {
            return true;
        }
    }

    return false;
}

