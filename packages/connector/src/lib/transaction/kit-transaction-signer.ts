/**
 * @solana/connector - Kit Transaction Signer Adapter
 *
 * Adapter that wraps connector-kit's TransactionSigner to be compatible with
 * @solana/kit TransactionModifyingSigner interface.
 *
 * This enables connector-kit to work seamlessly with modern Solana libraries
 * that expect @solana/kit's signer interface.
 *
 * Uses TransactionModifyingSigner to return fully signed Transaction objects,
 * ensuring the exact bytes the wallet signed are preserved without re-encoding.
 */

import type { TransactionSigner as ConnectorTransactionSigner } from './transaction-signer';
import type { SolanaTransaction } from '../../types/transactions';
import type { Address } from '@solana/addresses';
import { address as createAddress } from '@solana/addresses';
import type { TransactionModifyingSigner } from '@solana/signers';
import type { Transaction, TransactionWithLifetime, TransactionWithinSizeLimit } from '@solana/transactions';
import { getTransactionDecoder, assertIsTransactionWithinSizeLimit } from '@solana/transactions';
import { getBase58Decoder } from '@solana/codecs';
import type { SignatureBytes } from '@solana/keys';
import { isWeb3jsTransaction } from '../../utils/transaction-format';
import { createLogger } from '../utils/secure-logger';

const logger = createLogger('KitTransactionSigner');

/**
 * Interface for transactions that can be serialized to bytes
 */
interface SerializableTransaction {
    serialize(): Uint8Array;
}

/**
 * Type helper for transactions that may include a lifetime constraint (local helper)
 */
type TransactionWithOptionalLifetime<T extends Transaction> = T & {
    lifetimeConstraint?: unknown;
};

/**
 * Encode a number as a shortvec
 * @param value - The number to encode
 * @returns Uint8Array containing the shortvec-encoded value
 */
function encodeShortVecLength(value: number): Uint8Array {
    const bytes: number[] = [];
    let remaining = value;

    while (remaining >= 0x80) {
        bytes.push((remaining & 0x7f) | 0x80);
        remaining >>= 7;
    }
    bytes.push(remaining);

    return new Uint8Array(bytes);
}

/**
 * Decode shortvec-encoded length prefix from serialized transaction
 * @param data - Serialized transaction bytes
 * @returns Object with length value and number of bytes consumed
 */
function decodeShortVecLength(data: Uint8Array): { length: number; bytesConsumed: number } {
    let length = 0;
    let size = 0;

    for (;;) {
        if (size >= data.length) {
            throw new Error('Invalid shortvec encoding: unexpected end of data');
        }
        const byte = data[size];
        length |= (byte & 0x7f) << (size * 7);
        size += 1;

        if ((byte & 0x80) === 0) {
            break;
        }
        if (size > 10) {
            throw new Error('Invalid shortvec encoding: length prefix too long');
        }
    }

    return { length, bytesConsumed: size };
}

/**
 * Parse the message to extract signer information
 * @param messageBytes - The compiled transaction message bytes
 * @returns Object with numSigners and static account addresses
 */
function parseMessageSigners(messageBytes: Uint8Array): {
    numSigners: number;
    staticAccounts: string[];
} {
    let offset = 0;

    if (messageBytes.length < 4) {
        throw new Error('Invalid message: too short for header');
    }

    // Check for version byte (0x80 = version 0)
    if (messageBytes[0] === 0x80) {
        offset = 1; // Skip version byte
    }

    // Read header (3 bytes)
    if (offset + 3 > messageBytes.length) {
        throw new Error('Invalid message: incomplete header');
    }
    const numSignerAccounts = messageBytes[offset];
    const numReadonlySignerAccounts = messageBytes[offset + 1];
    const numReadonlyNonSignerAccounts = messageBytes[offset + 2];
    offset += 3;

    // Read static accounts array
    // Format: shortvec(numAccounts), then 32 bytes per account
    if (offset >= messageBytes.length) {
        throw new Error('Invalid message: no static accounts section');
    }
    const { length: numStaticAccounts, bytesConsumed } = decodeShortVecLength(messageBytes.subarray(offset));
    offset += bytesConsumed;

    // Extract first numSignerAccounts addresses (these are the ones that sign)
    const staticAccounts: string[] = [];
    const base58Decoder = getBase58Decoder();

    for (let i = 0; i < numStaticAccounts && i < numSignerAccounts; i++) {
        if (offset + 32 > messageBytes.length) {
            throw new Error(`Invalid message: incomplete account ${i}`);
        }
        // Each address is 32 bytes
        const accountBytes = messageBytes.subarray(offset, offset + 32);
        // Convert to base58 string using kit's decoder
        const accountAddress = base58Decoder.decode(accountBytes);
        staticAccounts.push(accountAddress);
        offset += 32;
    }

    return {
        numSigners: numSignerAccounts,
        staticAccounts,
    };
}

/**
 * Create a full transaction wire format from message bytes and number of required signers
 * Transaction wire format: [shortvec(numSignatures), ...signatureSlots(64 bytes each), messageBytes]
 * @param messageBytes - The compiled transaction message bytes
 * @param numSigners - Number of required signers
 * @returns Properly formatted transaction bytes for wallet signing
 */
function createTransactionBytesForSigning(messageBytes: Uint8Array, numSigners: number): Uint8Array {
    // Encode number of signatures as shortvec
    const numSignaturesBytes = encodeShortVecLength(numSigners);

    // Create empty signature slots (64 bytes of zeros per signer)
    const signatureSlots = new Uint8Array(numSigners * 64);

    // Concatenate: [numSigs, ...emptySigs, message]
    const totalLength = numSignaturesBytes.length + signatureSlots.length + messageBytes.length;
    const transactionBytes = new Uint8Array(totalLength);

    let offset = 0;
    transactionBytes.set(numSignaturesBytes, offset);
    offset += numSignaturesBytes.length;
    transactionBytes.set(signatureSlots, offset);
    offset += signatureSlots.length;
    transactionBytes.set(messageBytes, offset);

    return transactionBytes;
}

/**
 * Extract signature bytes at a specific index from a signed transaction
 * @param signedTx - Signed transaction in any format
 * @param signerIndex - Index of the signer whose signature to extract
 * @param expectedNumSigners - Expected number of signers (for validation)
 * @returns Signature bytes (64 bytes)
 */
function extractSignatureAtIndex(
    signedTx: SolanaTransaction,
    signerIndex: number,
    expectedNumSigners: number,
): Uint8Array {
    if (signedTx instanceof Uint8Array) {
        // Serialized transaction format: [shortvec_length, ...signatures, ...]
        // First decode the shortvec prefix to find where signatures start
        const { length: numSignatures, bytesConsumed } = decodeShortVecLength(signedTx);

        if (numSignatures === 0) {
            throw new Error('No signatures found in serialized transaction');
        }

        if (numSignatures !== expectedNumSigners) {
            logger.warn(`Signature count mismatch - expected ${expectedNumSigners}, found ${numSignatures}`);
        }

        if (signerIndex >= numSignatures) {
            throw new Error(`Signer index ${signerIndex} out of range (transaction has ${numSignatures} signatures)`);
        }

        // Calculate the position of the signature we want
        // Signatures start after the shortvec prefix, each is 64 bytes
        const signatureStart = bytesConsumed + signerIndex * 64;
        const signatureEnd = signatureStart + 64;

        return signedTx.slice(signatureStart, signatureEnd);
    }

    if (isWeb3jsTransaction(signedTx)) {
        // Extract from web3.js transaction object
        // Handle both { signature: Uint8Array | null } and raw Uint8Array formats
        const signatures = (signedTx as unknown as { signatures: Array<Uint8Array | { signature: Uint8Array | null }> })
            .signatures;

        if (!signatures || signatures.length === 0) {
            throw new Error('No signatures found in web3.js transaction');
        }

        if (signerIndex >= signatures.length) {
            throw new Error(
                `Signer index ${signerIndex} out of range (transaction has ${signatures.length} signatures)`,
            );
        }

        const targetSig = signatures[signerIndex];

        // Handle raw Uint8Array
        if (targetSig instanceof Uint8Array) {
            return targetSig;
        }

        // Handle { signature: Uint8Array | null } format
        if (targetSig && typeof targetSig === 'object' && 'signature' in targetSig) {
            if (targetSig.signature) {
                return targetSig.signature;
            }
        }

        throw new Error(`Could not extract signature at index ${signerIndex} from web3.js transaction`);
    }

    throw new Error('Cannot extract signature from transaction format');
}

/**
 * Extract signature bytes from a signed transaction (first signature)
 * @param signedTx - Signed transaction in any format
 * @returns Signature bytes (64 bytes)
 */
function extractSignature(signedTx: SolanaTransaction): Uint8Array {
    if (signedTx instanceof Uint8Array) {
        // Serialized transaction format: [shortvec_length, ...signatures, ...]
        // First decode the shortvec prefix to find where signatures start
        const { length: numSignatures, bytesConsumed } = decodeShortVecLength(signedTx);

        if (numSignatures === 0) {
            throw new Error('No signatures found in serialized transaction');
        }

        // Extract first 64-byte signature after the shortvec prefix
        const signatureStart = bytesConsumed;
        return signedTx.slice(signatureStart, signatureStart + 64);
    }

    if (isWeb3jsTransaction(signedTx)) {
        // Extract from web3.js transaction object
        // Handle both { signature: Uint8Array | null } and raw Uint8Array formats
        const signatures = (signedTx as unknown as { signatures: Array<Uint8Array | { signature: Uint8Array | null }> })
            .signatures;

        if (!signatures || signatures.length === 0) {
            throw new Error('No signatures found in web3.js transaction');
        }

        const firstSig = signatures[0];

        // Handle raw Uint8Array
        if (firstSig instanceof Uint8Array) {
            return firstSig;
        }

        // Handle { signature: Uint8Array | null } format
        if (firstSig && typeof firstSig === 'object' && 'signature' in firstSig) {
            if (firstSig.signature) {
                return firstSig.signature;
            }
        }

        throw new Error('Could not extract signature from web3.js transaction');
    }

    throw new Error('Cannot extract signature from transaction format');
}

/**
 * Create a kit-compatible TransactionPartialSigner from connector-kit's TransactionSigner
 *
 * This adapter allows connector-kit to work with modern Solana libraries that use
 * @solana/kit's signer interfaces.
 *
 * @param connectorSigner - Connector-kit's TransactionSigner instance
 * @returns Kit-compatible TransactionModifyingSigner
 *
 * @example
 * ```typescript
 * import { createTransactionSigner } from '@solana/connector';
 * import { createKitTransactionSigner } from '@solana/connector';
 *
 * const connectorSigner = createTransactionSigner({ wallet, account });
 * const kitSigner = createKitTransactionSigner(connectorSigner);
 *
 * // Now compatible with @solana/kit libraries
 * const instruction = getTransferSolInstruction({
 *   source: kitSigner,
 *   destination: address('...'),
 *   amount: 1000000n
 * });
 * ```
 */
export function createKitTransactionSigner<TAddress extends string = string>(
    connectorSigner: ConnectorTransactionSigner,
): TransactionModifyingSigner<TAddress> {
    const signerAddress = createAddress(connectorSigner.address) as Address<TAddress>;

    return {
        address: signerAddress,

        async modifyAndSignTransactions(
            transactions: readonly (Transaction | (Transaction & TransactionWithLifetime))[],
        ): Promise<readonly (Transaction & TransactionWithinSizeLimit & TransactionWithLifetime)[]> {
            // Wallets need full wire format to simulate/display transactions
            // Format: [1-byte: num_sigs, ...64-byte sig slots, ...messageBytes]
            // Note: For single-signer transactions, num_sigs = 1 (encoded as 0x01)

            // Prepare transaction data for wallet signing
            const transactionData = transactions.map(tx => {
                const messageBytes = new Uint8Array(tx.messageBytes);
                // Derive the required signature count from the message header, not from the
                // current signature dictionary (which is often empty pre-signing).
                const { numSigners } = parseMessageSigners(messageBytes);

                // Create full transaction wire format for wallet
                const wireFormat = createTransactionBytesForSigning(messageBytes, numSigners);

                logger.debug('Preparing wire format for wallet', {
                    signerAddress,
                    messageBytesLength: messageBytes.length,
                    wireFormatLength: wireFormat.length,
                    structure: {
                        numSigsByte: wireFormat[0],
                        firstSigSlotPreview: Array.from(wireFormat.slice(1, 17)),
                        messageBytesStart: wireFormat.length - messageBytes.length,
                    },
                });

                return {
                    originalTransaction: tx,
                    messageBytes,
                    wireFormat,
                };
            });

            // Send full wire format to wallet for signing
            const transactionsForWallet = transactionData.map(data => data.wireFormat);
            const signedTransactions = await connectorSigner.signAllTransactions(transactionsForWallet);

            // Extract signatures and return full Transaction objects
            return signedTransactions.map((signedTx, index) => {
                const { originalTransaction, wireFormat } = transactionData[index];

                try {
                    // Get bytes from the signed transaction
                    let signedTxBytes: Uint8Array;

                    if (signedTx instanceof Uint8Array) {
                        signedTxBytes = signedTx;
                    } else if (isWeb3jsTransaction(signedTx)) {
                        const txObj = signedTx as SerializableTransaction;
                        if (typeof txObj.serialize === 'function') {
                            signedTxBytes = txObj.serialize();
                        } else {
                            throw new Error('Web3.js transaction without serialize method');
                        }
                    } else {
                        throw new Error('Unknown signed transaction format');
                    }

                    logger.debug('Wallet returned signed transaction', {
                        returnedLength: signedTxBytes.length,
                        sentLength: wireFormat.length,
                        lengthsMatch: signedTxBytes.length === wireFormat.length,
                        signedFirstBytes: Array.from(signedTxBytes.slice(0, 20)),
                        sentFirstBytes: Array.from(wireFormat.slice(0, 20)),
                    });

                    // If wallet modified the transaction (different length), we MUST use the wallet's version
                    // because the signature is computed over the MODIFIED messageBytes
                    if (signedTxBytes.length !== wireFormat.length) {
                        logger.warn('Wallet modified transaction! Using wallet version', {
                            originalLength: wireFormat.length,
                            modifiedLength: signedTxBytes.length,
                            difference: signedTxBytes.length - wireFormat.length,
                        });

                        // Decode the wallet's signed transaction and use it entirely
                        const decoder = getTransactionDecoder();
                        const walletTransaction = decoder.decode(signedTxBytes);

                        // Preserve lifetimeConstraint from original if present
                        const originalWithLifetime =
                            originalTransaction as TransactionWithOptionalLifetime<Transaction>;
                        const result = {
                            ...walletTransaction,
                            ...(originalWithLifetime.lifetimeConstraint
                                ? {
                                      lifetimeConstraint: originalWithLifetime.lifetimeConstraint,
                                  }
                                : {}),
                        };

                        logger.debug('Using modified transaction from wallet', {
                            modifiedMessageBytesLength: walletTransaction.messageBytes.length,
                            signatures: Object.keys(walletTransaction.signatures),
                        });

                        // Assert transaction is within size limit (Kit 5.x requirement)
                        assertIsTransactionWithinSizeLimit(result);
                        return result as Transaction & TransactionWithinSizeLimit & TransactionWithLifetime;
                    }

                    // Wallet didn't modify - use original messageBytes with wallet signature
                    const extractedSignatureBytes = extractSignature(signedTxBytes);
                    // Convert to base58 for logging (signature is always 64 bytes)
                    const base58Decoder = getBase58Decoder();
                    const signatureBase58 = base58Decoder.decode(extractedSignatureBytes);

                    logger.debug('Extracted signature from wallet (unmodified)', {
                        signerAddress,
                        signatureLength: extractedSignatureBytes.length,
                        signatureBase58, // Human-readable signature for debugging/logging
                    });

                    // Cast the extracted bytes as SignatureBytes (we know it's 64 bytes from the wallet)
                    const typedSignatureBytes = extractedSignatureBytes as SignatureBytes;

                    const signedTransaction = {
                        ...originalTransaction,
                        signatures: Object.freeze({
                            ...originalTransaction.signatures,
                            [signerAddress]: typedSignatureBytes,
                        }),
                    };

                    // Assert transaction is within size limit (Kit 5.x requirement)
                    assertIsTransactionWithinSizeLimit(signedTransaction);
                    return signedTransaction as Transaction & TransactionWithinSizeLimit & TransactionWithLifetime;
                } catch (error) {
                    logger.error('Failed to decode signed transaction', { error });
                    // Return original transaction with assertions if decode fails
                    assertIsTransactionWithinSizeLimit(originalTransaction);
                    return originalTransaction as Transaction & TransactionWithinSizeLimit & TransactionWithLifetime;
                }
            }) as readonly (Transaction & TransactionWithinSizeLimit & TransactionWithLifetime)[];
        },
    };
}

/**
 * @deprecated Use `createKitTransactionSigner` instead. This alias is provided for backward compatibility.
 */
export const createGillTransactionSigner = createKitTransactionSigner;
