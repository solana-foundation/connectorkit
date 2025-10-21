/**
 * @solana/connector - Transaction Validator
 *
 * Validates transactions before signing to prevent malformed or malicious transactions
 * Helps ensure transaction safety and proper error handling
 */

import type { SolanaTransaction } from '../../types/transactions';
import { createLogger } from '../utils/secure-logger';

const logger = createLogger('TransactionValidator');

/**
 * Maximum transaction size in bytes (Solana network limit)
 * Solana enforces a 1232 byte limit for serialized transactions
 */
export const MAX_TRANSACTION_SIZE = 1232;

/**
 * Minimum reasonable transaction size (empty transaction with signature)
 */
export const MIN_TRANSACTION_SIZE = 64;

/**
 * Result of transaction validation
 */
export interface TransactionValidationResult {
    /** Whether the transaction is valid */
    valid: boolean;
    /** List of validation errors (empty if valid) */
    errors: string[];
    /** List of validation warnings (non-blocking) */
    warnings: string[];
    /** Size of serialized transaction in bytes */
    size?: number;
}

/**
 * Options for transaction validation
 */
export interface TransactionValidationOptions {
    /** Maximum allowed transaction size (default: 1232) */
    maxSize?: number;
    /** Minimum required transaction size (default: 64) */
    minSize?: number;
    /** Whether to check for duplicate signatures */
    checkDuplicateSignatures?: boolean;
    /** Enable strict validation (fails on warnings) */
    strict?: boolean;
}

/**
 * TransactionValidator - Validates Solana transactions before signing
 *
 * Performs safety checks to prevent:
 * - Oversized transactions that will be rejected by the network
 * - Empty or malformed transactions
 * - Transactions that can't be serialized
 * - Potentially malicious transaction patterns
 *
 * @example
 * ```ts
 * const result = TransactionValidator.validate(transaction);
 *
 * if (!result.valid) {
 *   console.error('Invalid transaction:', result.errors);
 *   throw new Error(result.errors.join(', '));
 * }
 *
 * if (result.warnings.length > 0) {
 *   console.warn('Transaction warnings:', result.warnings);
 * }
 * ```
 */
export class TransactionValidator {
    /**
     * Validate a transaction before signing
     *
     * @param transaction - The transaction to validate
     * @param options - Validation options
     * @returns Validation result with errors and warnings
     */
    static validate(
        transaction: SolanaTransaction,
        options: TransactionValidationOptions = {},
    ): TransactionValidationResult {
        const {
            maxSize = MAX_TRANSACTION_SIZE,
            minSize = MIN_TRANSACTION_SIZE,
            checkDuplicateSignatures = true,
            strict = false,
        } = options;

        const errors: string[] = [];
        const warnings: string[] = [];
        let size: number | undefined;

        // Check if transaction exists
        if (!transaction) {
            errors.push('Transaction is null or undefined');
            return { valid: false, errors, warnings };
        }

        // Try to serialize and validate size
        try {
            let serialized: Uint8Array | undefined;

            // Handle web3.js Transaction objects
            if (typeof (transaction as { serialize?: () => Uint8Array }).serialize === 'function') {
                try {
                    serialized = (transaction as { serialize: () => Uint8Array }).serialize();
                } catch (serializeError) {
                    // If serialize fails, it might not be signed yet - this is okay
                    logger.debug('Transaction not yet serializable (may need signing)', {
                        error: serializeError instanceof Error ? serializeError.message : String(serializeError),
                    });
                }
            }
            // Handle already-serialized transactions
            else if (transaction instanceof Uint8Array) {
                serialized = transaction;
            }
            // Handle unknown transaction types
            else {
                errors.push(
                    'Transaction type not recognized - must be a Transaction object with serialize() or Uint8Array',
                );
                return { valid: false, errors, warnings };
            }

            // Validate serialized size if available
            if (serialized) {
                size = serialized.length;

                // Check maximum size
                if (size > maxSize) {
                    errors.push(`Transaction too large: ${size} bytes (max ${maxSize} bytes)`);
                    logger.warn('Transaction exceeds maximum size', { size, maxSize });
                }

                // Check minimum size
                if (size < minSize) {
                    warnings.push(`Transaction is very small: ${size} bytes (min recommended ${minSize} bytes)`);
                }

                // Check for empty transaction
                if (size === 0) {
                    errors.push('Transaction is empty (0 bytes)');
                }

                // Check for suspicious patterns
                if (this.hasSuspiciousPattern(serialized)) {
                    warnings.push('Transaction contains unusual patterns - please review carefully');
                }
            }
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            errors.push(`Transaction validation failed: ${errorMessage}`);
            logger.error('Validation error', { error: errorMessage });
        }

        // Check for duplicate signatures (if transaction has signatures property)
        if (checkDuplicateSignatures && typeof transaction === 'object' && 'signatures' in transaction) {
            const signatures = (transaction as { signatures?: Array<{ publicKey?: unknown }> }).signatures;
            if (Array.isArray(signatures)) {
                const uniqueKeys = new Set(
                    signatures
                        .map(sig => {
                            const pubKey = sig?.publicKey;
                            return pubKey ? String(pubKey) : null;
                        })
                        .filter(Boolean),
                );

                if (uniqueKeys.size < signatures.length) {
                    warnings.push('Transaction contains duplicate signers');
                }
            }
        }

        // In strict mode, treat warnings as errors
        if (strict && warnings.length > 0) {
            errors.push(...warnings.map(w => `Strict mode: ${w}`));
            warnings.length = 0; // Clear warnings since they're now errors
        }

        const valid = errors.length === 0;

        if (!valid) {
            logger.warn('Transaction validation failed', { errors, size });
        } else if (warnings.length > 0) {
            logger.debug('Transaction validation passed with warnings', { warnings, size });
        } else {
            logger.debug('Transaction validation passed', { size });
        }

        return {
            valid,
            errors,
            warnings,
            size,
        };
    }

    /**
     * Check for suspicious patterns in serialized transaction
     * This is a heuristic check to detect potentially malicious transactions
     *
     * @param serialized - Serialized transaction bytes
     * @returns True if suspicious patterns detected
     */
    private static hasSuspiciousPattern(serialized: Uint8Array): boolean {
        // Check for all zeros (potentially uninitialized)
        const allZeros = serialized.every(byte => byte === 0);
        if (allZeros) return true;

        // Check for all 0xFF (potentially malicious padding)
        const allFF = serialized.every(byte => byte === 0xff);
        if (allFF) return true;

        // Check for unusual repetition (>50% of bytes are the same)
        const byteCounts = new Map<number, number>();
        for (const byte of serialized) {
            byteCounts.set(byte, (byteCounts.get(byte) || 0) + 1);
        }

        const maxCount = Math.max(...Array.from(byteCounts.values()));
        const repetitionRatio = maxCount / serialized.length;

        if (repetitionRatio > 0.5) {
            return true;
        }

        return false;
    }

    /**
     * Quick validation check - returns true if valid, throws on error
     * Useful for inline validation
     *
     * @param transaction - Transaction to validate
     * @param options - Validation options
     * @throws Error if validation fails
     *
     * @example
     * ```ts
     * TransactionValidator.assertValid(transaction);
     * // Continues if valid, throws if invalid
     * await signer.signTransaction(transaction);
     * ```
     */
    static assertValid(transaction: SolanaTransaction, options?: TransactionValidationOptions): void {
        const result = this.validate(transaction, options);

        if (!result.valid) {
            throw new Error(`Transaction validation failed: ${result.errors.join(', ')}`);
        }

        if (result.warnings.length > 0) {
            logger.warn('Transaction validation warnings', { warnings: result.warnings });
        }
    }

    /**
     * Batch validate multiple transactions
     * More efficient than validating one-by-one
     *
     * @param transactions - Array of transactions to validate
     * @param options - Validation options
     * @returns Array of validation results
     */
    static validateBatch(
        transactions: SolanaTransaction[],
        options?: TransactionValidationOptions,
    ): TransactionValidationResult[] {
        return transactions.map((tx, index) => {
            logger.debug(`Validating transaction ${index + 1}/${transactions.length}`);
            return this.validate(tx, options);
        });
    }
}
