/**
 * @connector-kit/debugger - Transaction Size Analyzer
 * 
 * Analyzes transaction byte sizes and categorizes them relative to Solana's
 * 1232 byte transaction limit. Provides insights for optimization.
 */

/**
 * Solana's maximum transaction size in bytes
 * Transactions exceeding this will fail to be processed
 */
export const SOLANA_TX_SIZE_LIMIT = 1232;

/**
 * Size categories for transaction efficiency
 */
export type TransactionSizeCategory = 'optimal' | 'moderate' | 'heavy' | 'oversized';

/**
 * Transaction size analysis result
 */
export interface TransactionSizeAnalysis {
    /** Transaction size in bytes */
    sizeInBytes: number;
    /** Percentage of the limit used (0-100+) */
    percentOfLimit: number;
    /** Efficiency category */
    category: TransactionSizeCategory;
    /** Whether transaction exceeds limit */
    exceedsLimit: boolean;
    /** Human-readable status message */
    statusMessage: string;
    /** Color indicator for UI */
    color: string;
    /** Icon/emoji for UI */
    icon: string;
}

/**
 * Analyze transaction size and categorize efficiency
 * 
 * Categories:
 * - optimal: < 500 bytes (40% of limit) - Excellent, no optimization needed
 * - moderate: 500-800 bytes (40-65% of limit) - Good, could be improved
 * - heavy: 800-1232 bytes (65-100% of limit) - Should optimize
 * - oversized: > 1232 bytes - WILL FAIL, must optimize
 * 
 * @param sizeInBytes - Transaction size in bytes
 * @returns Analysis result with categorization and metadata
 */
export function analyzeTransactionSize(sizeInBytes: number): TransactionSizeAnalysis {
    const percentOfLimit = (sizeInBytes / SOLANA_TX_SIZE_LIMIT) * 100;
    const exceedsLimit = sizeInBytes > SOLANA_TX_SIZE_LIMIT;

    let category: TransactionSizeCategory;
    let statusMessage: string;
    let color: string;
    let icon: string;

    if (exceedsLimit) {
        category = 'oversized';
        statusMessage = 'Transaction exceeds limit and will fail';
        color = '#ef4444'; // red
        icon = '❌';
    } else if (sizeInBytes >= 800) {
        category = 'heavy';
        statusMessage = 'Transaction is large, consider optimizing';
        color = '#f59e0b'; // orange
        icon = '⚠️';
    } else if (sizeInBytes >= 500) {
        category = 'moderate';
        statusMessage = 'Transaction size is moderate';
        color = '#eab308'; // yellow
        icon = '⚡';
    } else {
        category = 'optimal';
        statusMessage = 'Transaction size is optimal';
        color = '#22c55e'; // green
        icon = '✅';
    }

    return {
        sizeInBytes,
        percentOfLimit,
        category,
        exceedsLimit,
        statusMessage,
        color,
        icon,
    };
}

/**
 * Extract transaction size from various transaction formats
 * 
 * @param transaction - Transaction in any format (serialized, VersionedTransaction, etc.)
 * @returns Size in bytes, or null if cannot be determined
 */
export function extractTransactionSize(transaction: unknown): number | null {
    try {
        // If already a Uint8Array (serialized)
        if (transaction instanceof Uint8Array) {
            return transaction.byteLength;
        }

        // If it has a serialize method (VersionedTransaction, Transaction)
        if (transaction && typeof transaction === 'object' && 'serialize' in transaction) {
            const serialized = (transaction as { serialize: () => Uint8Array }).serialize();
            return serialized.byteLength;
        }

        // If it's a transaction response with blockTime (from RPC)
        if (transaction && typeof transaction === 'object' && 'transaction' in transaction) {
            const tx = (transaction as { transaction: unknown }).transaction;
            if (tx && typeof tx === 'object' && 'message' in tx) {
                // Try to calculate from message structure
                // This is an approximation based on the message format
                return estimateTransactionSizeFromMessage(tx);
            }
        }

        return null;
    } catch (error) {
        console.warn('Failed to extract transaction size:', error);
        return null;
    }
}

/**
 * Estimate transaction size from parsed transaction message
 * This is an approximation when we only have the parsed structure
 * 
 * @param tx - Parsed transaction object
 * @returns Estimated size in bytes
 */
function estimateTransactionSizeFromMessage(tx: unknown): number | null {
    try {
        if (!tx || typeof tx !== 'object' || !('message' in tx)) {
            return null;
        }

        const message = (tx as { message: unknown }).message;
        if (!message || typeof message !== 'object') {
            return null;
        }

        let size = 0;

        // Compact array length prefix (1-3 bytes, typically 1)
        size += 1;

        // Signatures (64 bytes each) - assume 1 signature for now
        const numSignatures = 1;
        size += numSignatures * 64;

        // Message header (3 bytes)
        size += 3;

        // Account keys
        if ('accountKeys' in message && Array.isArray((message as { accountKeys: unknown[] }).accountKeys)) {
            const accountKeys = (message as { accountKeys: unknown[] }).accountKeys;
            // Compact array length prefix
            size += 1;
            // Each account key is 32 bytes
            size += accountKeys.length * 32;
        }

        // Recent blockhash (32 bytes)
        size += 32;

        // Instructions - rough estimate
        if ('instructions' in message && Array.isArray((message as { instructions: unknown[] }).instructions)) {
            const instructions = (message as { instructions: unknown[] }).instructions;
            // Compact array length prefix
            size += 1;
            // Each instruction: program index (1) + accounts count (1) + accounts indices (N) + data length (1) + data (N)
            instructions.forEach(ix => {
                size += 1; // program index
                if (ix && typeof ix === 'object') {
                    if ('accounts' in ix && Array.isArray((ix as { accounts: unknown[] }).accounts)) {
                        const accounts = (ix as { accounts: unknown[] }).accounts;
                        size += 1; // accounts length prefix
                        size += accounts.length; // account indices (1 byte each)
                    }
                    if ('data' in ix) {
                        const data = (ix as { data: unknown }).data;
                        if (typeof data === 'string') {
                            // Base58 or base64 encoded, rough estimate
                            size += 1; // data length prefix
                            size += Math.floor(data.length / 2); // rough decode estimate
                        } else if (data instanceof Uint8Array) {
                            size += 1; // data length prefix
                            size += data.length;
                        }
                    }
                }
            });
        }

        return size;
    } catch (error) {
        console.warn('Failed to estimate transaction size:', error);
        return null;
    }
}

/**
 * Check if a transaction should show optimization suggestions
 * 
 * @param analysis - Transaction size analysis
 * @returns True if transaction would benefit from optimization
 */
export function shouldShowOptimizationSuggestion(analysis: TransactionSizeAnalysis): boolean {
    // Show suggestions for transactions that are heavy or oversized
    return analysis.category === 'heavy' || analysis.category === 'oversized';
}

/**
 * Get a user-friendly size display string
 * 
 * @param sizeInBytes - Size in bytes
 * @returns Formatted string like "660 bytes" or "1.2 KB"
 */
export function formatTransactionSize(sizeInBytes: number): string {
    if (sizeInBytes < 1024) {
        return `${sizeInBytes} bytes`;
    }
    return `${(sizeInBytes / 1024).toFixed(2)} KB`;
}

