/**
 * Transaction signing abstraction layer
 */

import type {
    SolanaTransaction,
    TransactionSignerConfig,
    TransactionSignerCapabilities,
} from '../../types/transactions';
import type { WalletAccount } from '../../types/wallets';
import { prepareTransactionForWallet, convertSignedTransaction } from '../../utils/transaction-format';
import { getWalletSupportedTransactionVersions } from '../../utils/transaction-versions';
import { TransactionValidator } from './transaction-validator';
import { createLogger } from '../utils/secure-logger';
import { TransactionError, ValidationError, Errors } from '../errors';
import { getBase58Decoder } from '@solana/codecs';

const logger = createLogger('TransactionSigner');

declare const VALIDATED: unique symbol;

/**
 * Serialized transaction bytes that passed {@link TransactionValidator}.
 *
 * Only {@link validateForWallet} produces this type, and the wallet-feature
 * calls below accept nothing else, so no signing path can reach the wallet
 * without validation. The brand is a phantom type: it is erased at runtime.
 *
 * @internal
 */
export type ValidatedWireTransaction = Uint8Array & { readonly [VALIDATED]: true };

type ChainInput = { chain?: string };
type AccountInput = { account: WalletAccount };
type SingleOrBatch = { transactions: ValidatedWireTransaction[] } | { transaction: ValidatedWireTransaction };

/**
 * The Wallet Standard signing features, typed so that transaction bytes must
 * be {@link ValidatedWireTransaction}. Capability detection only checks for
 * the presence of each key.
 *
 * @internal
 */
export interface SigningFeatures {
    'solana:signTransaction'?: {
        signTransaction(input: AccountInput & ChainInput & SingleOrBatch): Promise<unknown>;
    };
    'solana:signAllTransactions'?: {
        signAllTransactions(
            input: AccountInput & ChainInput & { transactions: ValidatedWireTransaction[] },
        ): Promise<unknown>;
    };
    'solana:signAndSendTransaction'?: {
        signAndSendTransaction(
            input: AccountInput &
                ChainInput &
                SingleOrBatch & { options?: { skipPreflight?: boolean; maxRetries?: number } },
        ): Promise<unknown>;
    };
    'solana:signMessage'?: {
        signMessage(input: AccountInput & ChainInput & { message: Uint8Array }): Promise<unknown>;
    };
}

/**
 * Validate a transaction and serialize it for the wallet. The only producer
 * of {@link ValidatedWireTransaction}.
 *
 * @throws ValidationError (INVALID_TRANSACTION) when validation fails
 */
function validateForWallet(
    transaction: SolanaTransaction,
    position?: { index: number; total: number },
): { serialized: ValidatedWireTransaction; wasWeb3js: boolean } {
    const validation = TransactionValidator.validate(transaction);
    if (!validation.valid) {
        logger.error('Transaction validation failed', { errors: validation.errors, ...position });
        throw Errors.invalidTransaction(validation.errors.join(', '), position);
    }

    if (validation.warnings.length > 0) {
        logger.warn('Transaction validation warnings', { warnings: validation.warnings, ...position });
    }

    const { serialized, wasWeb3js } = prepareTransactionForWallet(transaction);
    return { serialized: serialized as ValidatedWireTransaction, wasWeb3js };
}

function signatureBytesToBase58(bytes: Uint8Array): string {
    if (bytes.length !== 64) {
        throw new Error(`Invalid signature length: expected 64 bytes, got ${bytes.length}`);
    }
    return getBase58Decoder().decode(bytes);
}

function extractSignatureString(result: unknown): string {
    if (typeof result === 'string') {
        return result;
    }

    if (result instanceof Uint8Array) {
        return signatureBytesToBase58(result);
    }

    if (Array.isArray(result) && result.length > 0) {
        // Wallet Standard typically returns an array of outputs, e.g. [{ signature: Uint8Array }]
        return extractSignatureString(result[0]);
    }

    if (result && typeof result === 'object') {
        const record = result as Record<string, unknown>;

        if ('signature' in record) {
            return extractSignatureString(record.signature);
        }

        if (Array.isArray(record.signatures) && record.signatures.length > 0) {
            return extractSignatureString(record.signatures[0]);
        }
    }

    throw new Error('Unexpected wallet response format for signAndSendTransaction');
}

function extractSignatureBytes(result: unknown): Uint8Array {
    if (result instanceof Uint8Array) {
        return result;
    }

    if (Array.isArray(result)) {
        const [first] = result;
        if (!first) {
            throw new Error('Wallet returned empty results array');
        }
        return extractSignatureBytes(first);
    }

    if (result && typeof result === 'object') {
        const record = result as Record<string, unknown>;

        if ('signature' in record) {
            return extractSignatureBytes(record.signature);
        }

        if (Array.isArray(record.signatures) && record.signatures.length > 0) {
            return extractSignatureBytes(record.signatures[0]);
        }
    }

    throw new Error('Unexpected wallet response format for signMessage');
}

export interface TransactionSigner {
    /** The wallet address that will sign transactions */
    readonly address: string;

    signTransaction(transaction: SolanaTransaction): Promise<SolanaTransaction>;

    signAllTransactions(transactions: SolanaTransaction[]): Promise<SolanaTransaction[]>;

    signAndSendTransaction(
        transaction: SolanaTransaction,
        options?: { skipPreflight?: boolean; maxRetries?: number },
    ): Promise<string>;

    signAndSendTransactions(
        transactions: SolanaTransaction[],
        options?: { skipPreflight?: boolean; maxRetries?: number },
    ): Promise<string[]>;

    signMessage?(message: Uint8Array): Promise<Uint8Array>;

    getCapabilities(): TransactionSignerCapabilities;
}

export function createTransactionSigner(config: TransactionSignerConfig): TransactionSigner | null {
    const { wallet, account, cluster, eventEmitter } = config;

    if (!wallet || !account) {
        return null;
    }

    const features = wallet.features as unknown as SigningFeatures;
    const address = account.address as string;

    const capabilities: TransactionSignerCapabilities = {
        canSign: Boolean(features['solana:signTransaction']),
        canSend: Boolean(features['solana:signAndSendTransaction']),
        canSignMessage: Boolean(features['solana:signMessage']),
        supportsBatchSigning: Boolean(features['solana:signAllTransactions']),
        supportedTransactionVersions: getWalletSupportedTransactionVersions(wallet),
    };

    const signer: TransactionSigner = {
        address,

        async signTransaction(transaction: SolanaTransaction): Promise<SolanaTransaction> {
            if (!capabilities.canSign) {
                throw Errors.featureNotSupported('transaction signing');
            }

            const { serialized, wasWeb3js } = validateForWallet(transaction);

            try {
                const signFeature = features['solana:signTransaction']!;

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
                        return convertSignedTransaction(bytes, transaction);
                    }
                }

                if (signedTx instanceof Uint8Array) {
                    return convertSignedTransaction(signedTx, transaction);
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
                // Validate everything before touching the wallet; a ValidationError
                // surfaces directly, as it does for signTransaction.
                const total = transactions.length;
                const serializedTxs = transactions.map(
                    (tx, index) => validateForWallet(tx, { index, total }).serialized,
                );

                try {
                    const signFeature = features['solana:signAllTransactions']!;

                    type SignAllResult =
                        | { signedTransaction: Uint8Array }[] // Wallet Standard format
                        | { signedTransactions: Uint8Array[] }; // Legacy format

                    const result = (await signFeature.signAllTransactions({
                        account,
                        transactions: serializedTxs,
                        ...(cluster ? { chain: cluster.id } : {}),
                    })) as SignAllResult;

                    // Handle both Wallet Standard formats:
                    // 1. Array of { signedTransaction: Uint8Array } (standard format)
                    // 2. Legacy { signedTransactions: Uint8Array[] } format
                    let signedBytesArray: Uint8Array[];

                    if (Array.isArray(result)) {
                        // Standard format: [{ signedTransaction: Uint8Array }, ...]
                        signedBytesArray = result.map(item => item.signedTransaction);
                    } else if ('signedTransactions' in result) {
                        // Legacy format: { signedTransactions: Uint8Array[] }
                        signedBytesArray = result.signedTransactions;
                    } else {
                        throw new Error('Unexpected signAllTransactions response format');
                    }

                    return signedBytesArray.map((signedBytes, index) =>
                        convertSignedTransaction(signedBytes, transactions[index]),
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

            const { serialized } = validateForWallet(transaction);

            try {
                const sendFeature = features['solana:signAndSendTransaction']!;

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

                const signature = extractSignatureString(result);

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
                    const signFeature = features['solana:signMessage']!;
                    const result = await signFeature.signMessage({
                        account,
                        message,
                        ...(cluster ? { chain: cluster.id } : {}),
                    });
                    return extractSignatureBytes(result);
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
 */
export function isTransactionSignerError(error: unknown): error is TransactionSignerError {
    return error instanceof TransactionSignerError || error instanceof TransactionError;
}
