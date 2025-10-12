/**
 * @connector-kit/connector - Gill/Kit Transaction Signer Adapter
 *
 * Adapter that wraps connector-kit's TransactionSigner to be compatible with
 * gill (@solana/kit) TransactionModifyingSigner interface.
 *
 * This enables connector-kit to work seamlessly with modern Solana libraries
 * that expect @solana/kit's signer interface.
 *
 * Uses TransactionModifyingSigner to return fully signed Transaction objects,
 * ensuring the exact bytes the wallet signed are preserved without re-encoding.
 */

import type { TransactionSigner as ConnectorTransactionSigner } from './transaction-signer';
import type { SolanaTransaction } from '../../types/transactions';
import {
    Address,
    TransactionModifyingSigner,
    Transaction,
    address as createAddress,
    getBase58Decoder,
    getTransactionDecoder,
} from 'gill';
import { isWeb3jsTransaction } from '../../utils/transaction-format';

/**
 * Interface for transactions that can be serialized to bytes
 */
interface SerializableTransaction {
    serialize(): Uint8Array;
}

/**
 * Type helper for transactions that may include a lifetime constraint
 */
type TransactionWithLifetime<T extends Transaction> = T & {
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
        const byte = data[size];
        length |= (byte & 0x7f) << (size * 7);
        size += 1;

        if ((byte & 0x80) === 0) {
            break;
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

    // Check for version byte (0x80 = version 0)
    if (messageBytes[0] === 0x80) {
        offset = 1; // Skip version byte
    }

    // Read header (3 bytes)
    const numSignerAccounts = messageBytes[offset];
    const numReadonlySignerAccounts = messageBytes[offset + 1];
    const numReadonlyNonSignerAccounts = messageBytes[offset + 2];
    offset += 3;

    // Read static accounts array
    // Format: shortvec(numAccounts), then 32 bytes per account
    const { length: numStaticAccounts, bytesConsumed } = decodeShortVecLength(messageBytes.subarray(offset));
    offset += bytesConsumed;

    // Extract first numSignerAccounts addresses (these are the ones that sign)
    const staticAccounts: string[] = [];
    const base58Decoder = getBase58Decoder();

    for (let i = 0; i < numStaticAccounts && i < numSignerAccounts; i++) {
        // Each address is 32 bytes
        const accountBytes = messageBytes.subarray(offset, offset + 32);
        // Convert to base58 string using gill's decoder
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
            console.warn(`⚠️ Gill: Signature count mismatch - expected ${expectedNumSigners}, found ${numSignatures}`);
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
 * Create a gill-compatible TransactionPartialSigner from connector-kit's TransactionSigner
 *
 * This adapter allows connector-kit to work with modern Solana libraries that use
 * @solana/kit's signer interfaces (gill, etc.)
 *
 * @param connectorSigner - Connector-kit's TransactionSigner instance
 * @returns Gill-compatible TransactionPartialSigner
 *
 * @example
 * ```typescript
 * import { createTransactionSigner } from '@connector-kit/connector';
 * import { createGillTransactionSigner } from '@connector-kit/connector/gill';
 *
 * const connectorSigner = createTransactionSigner({ wallet, account });
 * const gillSigner = createGillTransactionSigner(connectorSigner);
 *
 * // Now compatible with gill libraries
 * const instruction = getTransferSolInstruction({
 *   source: gillSigner,
 *   destination: address('...'),
 *   amount: 1000000n
 * });
 * ```
 */
export function createGillTransactionSigner<TAddress extends string = string>(
    connectorSigner: ConnectorTransactionSigner,
): TransactionModifyingSigner<TAddress> {
    const signerAddress = createAddress(connectorSigner.address) as Address<TAddress>;

    return {
        address: signerAddress,

        async modifyAndSignTransactions<T extends Transaction>(transactions: readonly T[]): Promise<readonly T[]> {
            // Wallets need full wire format to simulate/display transactions
            // Format: [1-byte: num_sigs, ...64-byte sig slots, ...messageBytes]
            // Note: For single-signer transactions, num_sigs = 1 (encoded as 0x01)

            // Prepare transaction data for wallet signing
            const transactionData = transactions.map(tx => {
                const messageBytes = new Uint8Array(tx.messageBytes);
                const numSigners = Object.keys(tx.signatures).length;

                // Create full transaction wire format for wallet
                const wireFormat = createTransactionBytesForSigning(messageBytes, numSigners);

                console.log('🔍 Gill: Preparing wire format for wallet', {
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

                    console.log('🔍 Gill: Wallet returned signed transaction', {
                        returnedLength: signedTxBytes.length,
                        sentLength: wireFormat.length,
                        lengthsMatch: signedTxBytes.length === wireFormat.length,
                        signedFirstBytes: Array.from(signedTxBytes.slice(0, 20)),
                        sentFirstBytes: Array.from(wireFormat.slice(0, 20)),
                    });

                    // If wallet modified the transaction (different length), we MUST use the wallet's version
                    // because the signature is computed over the MODIFIED messageBytes
                    if (signedTxBytes.length !== wireFormat.length) {
                        console.warn('⚠️ Gill: Wallet modified transaction! Using wallet version.', {
                            originalLength: wireFormat.length,
                            modifiedLength: signedTxBytes.length,
                            difference: signedTxBytes.length - wireFormat.length,
                        });

                        // Decode the wallet's signed transaction and use it entirely
                        const decoder = getTransactionDecoder();
                        const walletTransaction = decoder.decode(signedTxBytes);

                        // Preserve lifetimeConstraint from original if present
                        const originalWithLifetime = originalTransaction as TransactionWithLifetime<T>;
                        const result = {
                            ...walletTransaction,
                            ...(originalWithLifetime.lifetimeConstraint
                                ? {
                                      lifetimeConstraint: originalWithLifetime.lifetimeConstraint,
                                  }
                                : {}),
                        } as T;

                        console.log('✅ Gill: Using modified transaction from wallet', {
                            modifiedMessageBytesLength: walletTransaction.messageBytes.length,
                            signatures: Object.keys(walletTransaction.signatures),
                        });

                        return result;
                    }

                    // Wallet didn't modify - use original messageBytes with wallet signature
                    const signatureBytes = extractSignature(signedTxBytes);

                    console.log('✅ Gill: Extracted signature from wallet (unmodified)', {
                        signerAddress,
                        signatureLength: signatureBytes.length,
                    });

                    const signedTransaction = {
                        ...originalTransaction,
                        signatures: Object.freeze({
                            ...originalTransaction.signatures,
                            [signerAddress]: signatureBytes,
                        }),
                    } as T;

                    return signedTransaction;
                } catch (error) {
                    console.error('❌ Gill: Failed to decode signed transaction:', error);
                    // Return original transaction with no signatures if decode fails
                    return originalTransaction as T;
                }
            }) as readonly T[];
        },
    };
}
