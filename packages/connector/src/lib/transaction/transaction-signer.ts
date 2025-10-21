/**
 * @solana/connector - Transaction Signing Abstraction Layer
 *
 * Provides a clean, unified interface for transaction operations that works
 * across both Wallet Standard and legacy wallet implementations.
 *
 * Inspired by wallet-adapter-compat's transaction signer pattern, this
 * abstraction layer makes it easy to integrate with transaction libraries
 * and provides consistent error handling and capability detection.
 */

import type {
    SolanaTransaction,
    TransactionSignerConfig,
    TransactionSignerCapabilities,
} from '../../types/transactions';
import { prepareTransactionForWallet, convertSignedTransaction } from '../../utils/transaction-format';
import { TransactionValidator } from './transaction-validator';
import { createLogger } from '../utils/secure-logger';
import { TransactionError, ValidationError, Errors } from '../errors';

const logger = createLogger('TransactionSigner');

/**
 * Unified transaction signer interface
 *
 * This interface abstracts wallet-specific transaction signing methods
 * into a consistent API that works across all Wallet Standard wallets.
 *
 * @example
 * ```ts
 * const signer = createTransactionSigner({
 *   wallet: connectedWallet,
 *   account: selectedAccount,
 *   cluster: currentCluster
 * })
 *
 * // Check capabilities before using
 * const caps = signer.getCapabilities()
 * if (!caps.canSend) {
 *   console.warn('Wallet cannot send transactions directly')
 * }
 *
 * // Sign and send a transaction
 * const signature = await signer.signAndSendTransaction(transaction)
 * console.log('Transaction sent:', signature)
 * ```
 */
export interface TransactionSigner {
    /** The wallet address that will sign transactions */
    readonly address: string;

    /**
     * Sign a single transaction without sending it
     * The wallet prompts the user to approve the transaction
     *
     * @param transaction - The transaction to sign
     * @returns The signed transaction
     * @throws {TransactionSignerError} If wallet doesn't support signing or user rejects
     */
    signTransaction(transaction: SolanaTransaction): Promise<SolanaTransaction>;

    /**
     * Sign multiple transactions at once
     * More efficient than signing one-by-one for batch operations
     * Falls back to sequential signing if batch not supported
     *
     * @param transactions - Array of transactions to sign
     * @returns Array of signed transactions in the same order
     * @throws {TransactionSignerError} If signing fails for any transaction
     */
    signAllTransactions(transactions: SolanaTransaction[]): Promise<SolanaTransaction[]>;

    /**
     * Sign and send a transaction in one operation
     * The wallet handles both signing and broadcasting to the network
     *
     * @param transaction - The transaction to sign and send
     * @param options - Optional send options (e.g., skipPreflight)
     * @returns The transaction signature/hash
     * @throws {TransactionSignerError} If sending fails or user rejects
     */
    signAndSendTransaction(
        transaction: SolanaTransaction,
        options?: { skipPreflight?: boolean; maxRetries?: number },
    ): Promise<string>;

    /**
     * Sign and send multiple transactions sequentially
     * Waits for each transaction to be sent before sending the next
     *
     * @param transactions - Array of transactions to sign and send
     * @param options - Optional send options
     * @returns Array of transaction signatures in the same order
     * @throws {TransactionSignerError} If any transaction fails
     */
    signAndSendTransactions(
        transactions: SolanaTransaction[],
        options?: { skipPreflight?: boolean; maxRetries?: number },
    ): Promise<string[]>;

    /**
     * Sign an arbitrary message (for authentication, verification, etc.)
     * Optional: not all wallets support message signing
     *
     * @param message - The message to sign (as Uint8Array)
     * @returns The signature bytes
     * @throws {TransactionSignerError} If wallet doesn't support message signing
     */
    signMessage?(message: Uint8Array): Promise<Uint8Array>;

    /**
     * Get the signer's capabilities
     * Use this to conditionally enable/disable features in your UI
     *
     * @returns Object describing what this signer can do
     */
    getCapabilities(): TransactionSignerCapabilities;
}

/**
 * Create a transaction signer from a Wallet Standard wallet
 *
 * This factory function creates a TransactionSigner instance that bridges
 * Wallet Standard features to a clean, consistent API.
 *
 * @param config - Configuration including wallet, account, and optional cluster
 * @returns TransactionSigner instance, or null if wallet/account invalid
 *
 * @example
 * ```ts
 * // Basic usage
 * const signer = createTransactionSigner({
 *   wallet: connectedWallet,
 *   account: selectedAccount
 * })
 *
 * if (!signer) {
 *   console.error('Failed to create signer - wallet or account missing')
 *   return
 * }
 *
 * // Use the signer
 * try {
 *   const sig = await signer.signAndSendTransaction(tx)
 *   console.log('Success:', sig)
 * } catch (error) {
 *   if (error instanceof TransactionSignerError) {
 *     console.error('Signing error:', error.code, error.message)
 *   }
 * }
 * ```
 */
export function createTransactionSigner(config: TransactionSignerConfig): TransactionSigner | null {
    const { wallet, account, cluster, eventEmitter } = config;

    if (!wallet || !account) {
        return null;
    }

    const features = wallet.features as Record<string, Record<string, (...args: unknown[]) => unknown>>;
    const address = account.address as string;

    const capabilities: TransactionSignerCapabilities = {
        canSign: Boolean(features['solana:signTransaction']),
        canSend: Boolean(features['solana:signAndSendTransaction']),
        canSignMessage: Boolean(features['solana:signMessage']),
        supportsBatchSigning: Boolean(features['solana:signAllTransactions']),
    };

    // Build the signer interface
    const signer: TransactionSigner = {
        address,

        async signTransaction(transaction: SolanaTransaction): Promise<SolanaTransaction> {
            if (!capabilities.canSign) {
                throw Errors.featureNotSupported('transaction signing');
            }

            // Validate transaction before signing
            const validation = TransactionValidator.validate(transaction);
            if (!validation.valid) {
                logger.error('Transaction validation failed', { errors: validation.errors });
                throw Errors.invalidTransaction(validation.errors.join(', '));
            }

            if (validation.warnings.length > 0) {
                logger.warn('Transaction validation warnings', { warnings: validation.warnings });
            }

            try {
                const signFeature = features['solana:signTransaction'];

                const { serialized, wasWeb3js } = prepareTransactionForWallet(transaction);

                logger.debug('Signing transaction', {
                    wasWeb3js,
                    serializedLength: serialized.length,
                    serializedType: serialized.constructor.name,
                    accountAddress: account?.address,
                    hasAccount: !!account,
                });

                let result: Record<string, unknown>;
                let usedFormat = '';

                try {
                    logger.debug('Trying array format: transactions: [Uint8Array]');
                    result = (await signFeature.signTransaction({
                        account,
                        transactions: [serialized],
                        ...(cluster ? { chain: cluster.id } : {}),
                    })) as Record<string, unknown>;
                    usedFormat = 'array';
                } catch (err1: unknown) {
                    const error1 = err1 instanceof Error ? err1 : new Error(String(err1));
                    logger.debug('Array format failed, trying singular format', { error: error1.message });
                    try {
                        logger.debug('Trying singular format: transaction: Uint8Array');
                        result = (await signFeature.signTransaction({
                            account,
                            transaction: serialized,
                            ...(cluster ? { chain: cluster.id } : {}),
                        })) as Record<string, unknown>;
                        usedFormat = 'singular';
                    } catch (err2: unknown) {
                        const error2 = err2 instanceof Error ? err2 : new Error(String(err2));
                        logger.error('Both array and singular formats failed', { error: error2.message });
                        throw error2;
                    }
                }

                logger.debug('Wallet signed successfully', { format: usedFormat });

                let signedTx;
                if (Array.isArray(result.signedTransactions) && result.signedTransactions[0]) {
                    signedTx = result.signedTransactions[0];
                } else if (result.signedTransaction) {
                    signedTx = result.signedTransaction;
                } else if (Array.isArray(result) && result[0]) {
                    signedTx = result[0];
                } else if (result instanceof Uint8Array) {
                    signedTx = result;
                } else {
                    throw new Error(`Unexpected wallet response format: ${JSON.stringify(Object.keys(result))}`);
                }

                logger.debug('Extracted signed transaction', {
                    hasSignedTx: !!signedTx,
                    signedTxType: signedTx?.constructor?.name,
                    signedTxLength: signedTx?.length,
                    isUint8Array: signedTx instanceof Uint8Array,
                    hasSerialize: typeof signedTx?.serialize === 'function',
                });

                if (signedTx && typeof signedTx.serialize === 'function') {
                    logger.debug('Wallet returned web3.js object directly, no conversion needed');
                    return signedTx;
                }

                if (signedTx && signedTx.signedTransaction) {
                    logger.debug('Found signedTransaction property');
                    const bytes = signedTx.signedTransaction;
                    if (bytes instanceof Uint8Array) {
                        return await convertSignedTransaction(bytes, wasWeb3js);
                    }
                }

                if (signedTx instanceof Uint8Array) {
                    return await convertSignedTransaction(signedTx, wasWeb3js);
                }

                logger.error('Unexpected wallet response format', {
                    type: typeof signedTx,
                    constructor: signedTx?.constructor?.name,
                });

                throw new ValidationError(
                    'INVALID_FORMAT',
                    'Wallet returned unexpected format - not a Transaction or Uint8Array',
                );
            } catch (error) {
                throw Errors.signingFailed(error as Error);
            }
        },

        async signAllTransactions(transactions: SolanaTransaction[]): Promise<SolanaTransaction[]> {
            if (transactions.length === 0) {
                return [];
            }

            if (capabilities.supportsBatchSigning) {
                try {
                    const signFeature = features['solana:signAllTransactions'];

                    const prepared = transactions.map(tx => prepareTransactionForWallet(tx));
                    const serializedTxs = prepared.map(p => p.serialized);
                    const wasWeb3js = prepared[0].wasWeb3js;

                    const result = (await signFeature.signAllTransactions({
                        account,
                        transactions: serializedTxs,
                        ...(cluster ? { chain: cluster.id } : {}),
                    })) as { signedTransactions: Uint8Array[] };

                    return await Promise.all(
                        result.signedTransactions.map((signedBytes: Uint8Array) =>
                            convertSignedTransaction(signedBytes, wasWeb3js),
                        ),
                    );
                } catch (error) {
                    throw new TransactionError(
                        'SIGNING_FAILED',
                        `Failed to sign transactions in batch`,
                        { count: transactions.length },
                        error as Error,
                    );
                }
            }

            if (!capabilities.canSign) {
                throw Errors.featureNotSupported('transaction signing');
            }

            const signed: SolanaTransaction[] = [];
            for (let i = 0; i < transactions.length; i++) {
                try {
                    const signedTx = await signer.signTransaction(transactions[i]);
                    signed.push(signedTx);
                } catch (error) {
                    throw new TransactionError(
                        'SIGNING_FAILED',
                        `Failed to sign transaction ${i + 1} of ${transactions.length}`,
                        { index: i, total: transactions.length },
                        error as Error,
                    );
                }
            }

            return signed;
        },

        async signAndSendTransaction(
            transaction: SolanaTransaction,
            options?: { skipPreflight?: boolean; maxRetries?: number },
        ): Promise<string> {
            if (!capabilities.canSend) {
                throw Errors.featureNotSupported('sending transactions');
            }

            try {
                const sendFeature = features['solana:signAndSendTransaction'];

                const { serialized } = prepareTransactionForWallet(transaction);

                // Emit preparing event for debugger
                if (eventEmitter) {
                    eventEmitter.emit({
                        type: 'transaction:preparing',
                        transaction: serialized,
                        size: serialized.length,
                        timestamp: new Date().toISOString(),
                    });
                }

                const inputBase = {
                    account,
                    ...(cluster ? { chain: cluster.id } : {}),
                    ...(options ? { options } : {}),
                };

                // Emit signing event
                if (eventEmitter) {
                    eventEmitter.emit({
                        type: 'transaction:signing',
                        timestamp: new Date().toISOString(),
                    });
                }

                let result: { signature?: string } | string;

                try {
                    result = (await sendFeature.signAndSendTransaction({
                        ...inputBase,
                        transactions: [serialized],
                    })) as { signature?: string } | string;
                } catch (err1: unknown) {
                    result = (await sendFeature.signAndSendTransaction({
                        ...inputBase,
                        transaction: serialized,
                    })) as { signature?: string } | string;
                }

                const signature = typeof result === 'object' && result.signature ? result.signature : String(result);

                // Emit sent event
                if (eventEmitter) {
                    eventEmitter.emit({
                        type: 'transaction:sent',
                        signature,
                        timestamp: new Date().toISOString(),
                    });
                }

                return signature;
            } catch (error) {
                throw new TransactionError('SEND_FAILED', 'Failed to send transaction', undefined, error as Error);
            }
        },

        async signAndSendTransactions(
            transactions: SolanaTransaction[],
            options?: { skipPreflight?: boolean; maxRetries?: number },
        ): Promise<string[]> {
            if (transactions.length === 0) {
                return [];
            }

            if (!capabilities.canSend) {
                throw Errors.featureNotSupported('sending transactions');
            }

            const signatures: string[] = [];

            for (let i = 0; i < transactions.length; i++) {
                try {
                    const sig = await signer.signAndSendTransaction(transactions[i], options);
                    signatures.push(sig);
                } catch (error) {
                    throw new TransactionError(
                        'SEND_FAILED',
                        `Failed to send transaction ${i + 1} of ${transactions.length}`,
                        { index: i, total: transactions.length },
                        error as Error,
                    );
                }
            }

            return signatures;
        },

        ...(capabilities.canSignMessage && {
            async signMessage(message: Uint8Array): Promise<Uint8Array> {
                try {
                    const signFeature = features['solana:signMessage'];
                    const result = (await signFeature.signMessage({
                        account,
                        message,
                        ...(cluster ? { chain: cluster.id } : {}),
                    })) as { signature: Uint8Array };
                    return result.signature;
                } catch (error) {
                    throw new TransactionError('SIGNING_FAILED', 'Failed to sign message', undefined, error as Error);
                }
            },
        }),

        getCapabilities(): TransactionSignerCapabilities {
            return { ...capabilities };
        },
    };

    return signer;
}

/**
 * @deprecated Use TransactionError from '../errors' instead
 * Kept for backward compatibility
 *
 * Custom error class for transaction signer operations
 * Provides structured error information for better error handling
 */
export class TransactionSignerError extends TransactionError {
    constructor(
        message: string,
        code: 'WALLET_NOT_CONNECTED' | 'FEATURE_NOT_SUPPORTED' | 'SIGNING_FAILED' | 'SEND_FAILED',
        originalError?: Error,
    ) {
        // Map old codes to new system
        const newCode = code === 'WALLET_NOT_CONNECTED' ? 'FEATURE_NOT_SUPPORTED' : code;
        super(newCode, message, undefined, originalError);
        this.name = 'TransactionSignerError';
    }
}

/**
 * @deprecated Use isTransactionError from '../errors' instead
 * Kept for backward compatibility
 *
 * Type guard to check if an error is a TransactionSignerError
 */
export function isTransactionSignerError(error: unknown): error is TransactionSignerError {
    return error instanceof TransactionSignerError || error instanceof TransactionError;
}
