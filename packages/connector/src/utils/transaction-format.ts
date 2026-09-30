/**
 * Transaction Format Utilities
 *
 * Utilities for detecting and converting between different transaction formats:
 * - web3.js Transaction/VersionedTransaction objects
 * - Serialized Uint8Array (Wallet Standard format)
 * - Other TypedArray formats
 *
 * Note: Uses dynamic imports for @solana/web3.js to avoid bundling it
 * since it's only needed for the compat layer.
 */

import type { Transaction, VersionedTransaction } from '@solana/web3.js';
import type { SolanaTransaction } from '../types/transactions';

/**
 * Check if a value is a web3.js Transaction or VersionedTransaction object
 *
 * @param tx - Value to check
 * @returns True if it's a web3.js transaction object
 */
export function isWeb3jsTransaction(tx: unknown): tx is Transaction | VersionedTransaction {
    // Duck-typing: if it has a serialize method, it's likely a web3.js transaction
    return tx !== null && typeof tx === 'object' && 'serialize' in tx && typeof tx.serialize === 'function';
}

/**
 * Serialize a transaction to Uint8Array format (required for Wallet Standard)
 *
 * @param tx - Transaction to serialize (web3.js object, Uint8Array, or TypedArray)
 * @returns Serialized transaction bytes
 * @throws Error if transaction format is unsupported
 */
export function serializeTransaction(tx: SolanaTransaction): Uint8Array {
    // web3.js Transaction/VersionedTransaction object
    if (isWeb3jsTransaction(tx)) {
        return tx.serialize({
            requireAllSignatures: false,
            verifySignatures: false,
        });
    }

    // Already serialized as Uint8Array
    if (tx instanceof Uint8Array) {
        return tx;
    }

    // Other TypedArray format
    if (ArrayBuffer.isView(tx)) {
        return new Uint8Array(tx.buffer, tx.byteOffset, tx.byteLength);
    }

    throw new Error('Unsupported transaction format - must be Transaction, VersionedTransaction, or Uint8Array');
}

/**
 * Decode a shortvec-encoded (compact-u16) length prefix.
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
 * Determine the version of a fully serialized transaction from its wire bytes.
 *
 * Two wire layouts exist:
 * - Version 1 and later (SIMD-0385) place a discriminator byte with the high
 *   bit set at offset 0 (`0x81` = v1) and move signatures to the transaction
 *   tail, so the version is readable without any parsing.
 * - Legacy and version 0 start with a shortvec signature count followed by the
 *   64-byte signatures; the message that follows starts with a version prefix
 *   byte (`0x80` = v0) or, for legacy, the message header directly.
 *
 * A legacy/v0 transaction can never start with a high-bit byte: that would be
 * a shortvec continuation implying 128+ signatures, which cannot fit inside
 * the transaction size limit.
 *
 * @param bytes - Fully serialized transaction bytes (not a bare message)
 * @returns `'legacy'`, a numeric version (0, 1, …), or `null` when the bytes
 *          are too short or malformed to classify. Never throws.
 */
export function getTransactionVersionFromBytes(bytes: Uint8Array): 'legacy' | number | null {
    if (bytes.length === 0) return null;

    // Discriminator wire format (v1+): version readable at byte 0
    if ((bytes[0] & 0x80) !== 0) {
        return bytes[0] & 0x7f;
    }

    // Legacy/v0 wire format: signature-count shortvec, signatures, then message
    try {
        const { length: numSignatures, bytesConsumed } = decodeShortVecLength(bytes);
        const messageOffset = bytesConsumed + numSignatures * 64;
        if (messageOffset >= bytes.length) return null;
        const firstMessageByte = bytes[messageOffset];
        return (firstMessageByte & 0x80) === 0 ? 'legacy' : firstMessageByte & 0x7f;
    } catch {
        return null;
    }
}

/**
 * Deserialize bytes to a web3.js Transaction or VersionedTransaction object
 * Uses dynamic import to avoid bundling @solana/web3.js
 * Automatically detects legacy vs versioned format
 *
 * Version 1 transactions (SIMD-0296) cannot be represented by web3.js 1.x:
 * stable releases have no v1 support at all (read-only support starts at
 * `1.99.0-beta.0` and only via RPC responses, not wire deserialization), so
 * v1 bytes are rejected with a descriptive error instead of being misparsed.
 *
 * @param bytes - Serialized transaction bytes
 * @returns Transaction or VersionedTransaction object
 * @throws If the bytes are a v1 (or newer) transaction, or fail to deserialize
 */
export async function deserializeToWeb3jsTransaction(bytes: Uint8Array): Promise<Transaction | VersionedTransaction> {
    const version = getTransactionVersionFromBytes(bytes);
    if (typeof version === 'number' && version >= 1) {
        throw new Error(
            `Transaction v${version} (SIMD-0296) cannot be represented as a web3.js transaction object. ` +
                'Keep the transaction as serialized bytes or use @solana/kit codecs instead.',
        );
    }
    if (version === 'legacy' || version === null) {
        // Legacy transaction - use Transaction.from to preserve legacy-only fields.
        // Unclassifiable bytes take this path too and fail inside web3.js.
        const { Transaction } = await import('@solana/web3.js');
        return Transaction.from(bytes);
    }
    // Version 0 transaction
    const { VersionedTransaction } = await import('@solana/web3.js');
    return VersionedTransaction.deserialize(bytes);
}

/**
 * Smart converter that preserves the original format
 * Converts to Wallet Standard format (Uint8Array) and tracks original type
 *
 * @param tx - Transaction in any supported format
 * @returns Object with serialized bytes and format flag
 */
export function prepareTransactionForWallet(tx: SolanaTransaction): { serialized: Uint8Array; wasWeb3js: boolean } {
    const wasWeb3js = isWeb3jsTransaction(tx);
    const serialized = serializeTransaction(tx);
    return { serialized, wasWeb3js };
}

/**
 * Convert signed transaction bytes back to original format if needed
 *
 * When `wasWeb3js` is false the bytes pass through untouched, so v1
 * transactions flow through the wallet-standard path without conversion.
 * (A web3.js caller can never produce v1 bytes, so the v1 rejection in
 * {@link deserializeToWeb3jsTransaction} is unreachable from a well-formed
 * round trip.)
 *
 * @param signedBytes - Signed transaction as Uint8Array
 * @param wasWeb3js - Whether the original was a web3.js object
 * @returns Transaction in appropriate format (async if conversion needed)
 *          Returns Transaction for legacy, VersionedTransaction for versioned, or Uint8Array if not web3js
 */
export async function convertSignedTransaction(
    signedBytes: Uint8Array,
    wasWeb3js: boolean,
): Promise<Transaction | VersionedTransaction | Uint8Array> {
    if (wasWeb3js) {
        return await deserializeToWeb3jsTransaction(signedBytes);
    }
    return signedBytes;
}
