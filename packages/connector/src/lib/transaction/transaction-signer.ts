/**
 * @connector-kit/connector - Transaction Signing Abstraction Layer
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
                throw new TransactionSignerError(
                    'Wallet does not support transaction signing',
                    'FEATURE_NOT_SUPPORTED',
                );
            }

            try {
                const signFeature = features['solana:signTransaction'];

                const { serialized, wasWeb3js } = prepareTransactionForWallet(transaction);

                console.log('🔍 signTransaction input:', {
                    wasWeb3js,
                    serializedLength: serialized.length,
                    serializedType: serialized.constructor.name,
                    accountAddress: account?.address,
                    hasAccount: !!account,
                });

                let result: Record<string, unknown>;
                let usedFormat = '';

                try {
                    console.log('🔍 Trying array format: transactions: [Uint8Array]');
                    result = (await signFeature.signTransaction({
                        account,
                        transactions: [serialized],
                        ...(cluster ? { chain: cluster.id } : {}),
                    })) as Record<string, unknown>;
                    usedFormat = 'array';
                } catch (err1: unknown) {
                    const error1 = err1 instanceof Error ? err1 : new Error(String(err1));
                    console.log('⚠️ Array format failed:', error1.message);
                    try {
                        console.log('🔍 Trying singular format: transaction: Uint8Array');
                        result = (await signFeature.signTransaction({
                            account,
                            transaction: serialized,
                            ...(cluster ? { chain: cluster.id } : {}),
                        })) as Record<string, unknown>;
                        usedFormat = 'singular';
                    } catch (err2: unknown) {
                        const error2 = err2 instanceof Error ? err2 : new Error(String(err2));
                        console.log('⚠️ Singular format also failed:', error2.message);
                        throw error2;
                    }
                }

                console.log('✅ Wallet signed successfully using format:', usedFormat, 'Result:', result);

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

                console.log('🔍 Extracted signed transaction:', {
                    hasSignedTx: !!signedTx,
                    signedTxType: signedTx?.constructor?.name,
                    signedTxLength: signedTx?.length,
                    isUint8Array: signedTx instanceof Uint8Array,
                    hasSerialize: typeof signedTx?.serialize === 'function',
                    objectKeys: signedTx ? Object.keys(signedTx) : [],
                    signedTxValue: signedTx,
                });

                if (signedTx && typeof signedTx.serialize === 'function') {
                    console.log('✅ Wallet returned web3.js object directly, no conversion needed');
                    return signedTx;
                }

                if (signedTx && signedTx.signedTransaction) {
                    console.log('✅ Found signedTransaction property');
                    const bytes = signedTx.signedTransaction;
                    if (bytes instanceof Uint8Array) {
                        return await convertSignedTransaction(bytes, wasWeb3js);
                    }
                }

                if (signedTx instanceof Uint8Array) {
                    return await convertSignedTransaction(signedTx, wasWeb3js);
                }

                console.error('❌ Unexpected wallet response:', {
                    type: typeof signedTx,
                    constructor: signedTx?.constructor?.name,
                    keys: Object.keys(signedTx || {}),
                    fullObject: signedTx,
                });

                throw new Error('Wallet returned unexpected format - not a Transaction or Uint8Array');
            } catch (error) {
                throw new TransactionSignerError(
                    `Failed to sign transaction: ${error instanceof Error ? error.message : 'Unknown error'}`,
                    'SIGNING_FAILED',
                    error as Error,
                );
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
                    throw new TransactionSignerError(
                        `Failed to sign transactions in batch: ${error instanceof Error ? error.message : 'Unknown error'}`,
                        'SIGNING_FAILED',
                        error as Error,
                    );
                }
            }

            if (!capabilities.canSign) {
                throw new TransactionSignerError(
                    'Wallet does not support transaction signing',
                    'FEATURE_NOT_SUPPORTED',
                );
            }

            const signed: SolanaTransaction[] = [];
            for (let i = 0; i < transactions.length; i++) {
                try {
                    const signedTx = await signer.signTransaction(transactions[i]);
                    signed.push(signedTx);
                } catch (error) {
                    throw new TransactionSignerError(
                        `Failed to sign transaction ${i + 1} of ${transactions.length}: ${error instanceof Error ? error.message : 'Unknown error'}`,
                        'SIGNING_FAILED',
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
                throw new TransactionSignerError(
                    'Wallet does not support sending transactions',
                    'FEATURE_NOT_SUPPORTED',
                );
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
                throw new TransactionSignerError(
                    `Failed to send transaction: ${error instanceof Error ? error.message : 'Unknown error'}`,
                    'SEND_FAILED',
                    error as Error,
                );
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
                throw new TransactionSignerError(
                    'Wallet does not support sending transactions',
                    'FEATURE_NOT_SUPPORTED',
                );
            }

            const signatures: string[] = [];

            for (let i = 0; i < transactions.length; i++) {
                try {
                    const sig = await signer.signAndSendTransaction(transactions[i], options);
                    signatures.push(sig);
                } catch (error) {
                    throw new TransactionSignerError(
                        `Failed to send transaction ${i + 1} of ${transactions.length}: ${error instanceof Error ? error.message : 'Unknown error'}`,
                        'SEND_FAILED',
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
                    throw new TransactionSignerError(
                        `Failed to sign message: ${error instanceof Error ? error.message : 'Unknown error'}`,
                        'SIGNING_FAILED',
                        error as Error,
                    );
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
 * Custom error class for transaction signer operations
 * Provides structured error information for better error handling
 *
 * @example
 * ```ts
 * try {
 *   await signer.signTransaction(tx)
 * } catch (error) {
 *   if (error instanceof TransactionSignerError) {
 *     switch (error.code) {
 *       case 'WALLET_NOT_CONNECTED':
 *         showConnectWalletPrompt()
 *         break
 *       case 'FEATURE_NOT_SUPPORTED':
 *         showUnsupportedFeatureMessage()
 *         break
 *       case 'SIGNING_FAILED':
 *         showSigningErrorMessage(error.message)
 *         break
 *       case 'SEND_FAILED':
 *         showSendErrorMessage(error.message)
 *         break
 *     }
 *   }
 * }
 * ```
 */
export class TransactionSignerError extends Error {
    /**
     * @param message - Human-readable error message
     * @param code - Error code for programmatic handling
     * @param originalError - The underlying error that caused this failure
     */
    constructor(
        message: string,
        public readonly code: 'WALLET_NOT_CONNECTED' | 'FEATURE_NOT_SUPPORTED' | 'SIGNING_FAILED' | 'SEND_FAILED',
        public readonly originalError?: Error,
    ) {
        super(message);
        this.name = 'TransactionSignerError';

        if (Error.captureStackTrace) {
            Error.captureStackTrace(this, TransactionSignerError);
        }
    }
}

/**
 * Type guard to check if an error is a TransactionSignerError
 *
 * @param error - The error to check
 * @returns True if error is a TransactionSignerError
 *
 * @example
 * ```ts
 * try {
 *   await signer.signTransaction(tx)
 * } catch (error) {
 *   if (isTransactionSignerError(error)) {
 *     console.error('Signing error code:', error.code)
 *   }
 * }
 * ```
 */
export function isTransactionSignerError(error: unknown): error is TransactionSignerError {
    return error instanceof TransactionSignerError;
}
