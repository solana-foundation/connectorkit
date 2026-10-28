/**
 * Transaction Format Utilities
 *
 * Utilities for detecting and converting between different transaction formats:
 * - web3.js Transaction/VersionedTransaction objects
 * - Serialized Uint8Array (Wallet Standard format)
 * - Other TypedArray formats
 *
 * @solana/web3.js is only referenced as a type. Signed bytes are rehydrated
 * through the class of the caller's own transaction object, so apps that never
 * install web3.js (it is an optional peer) bundle without resolving it.
 *
 * Both web3.js 1.x and 3.x are supported. 3.x makes `Transaction.serialize()`
 * asynchronous, so serialization here is awaited (a no-op on 1.x).
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
 * Async because web3.js 3.x makes `Transaction.serialize()` return a
 * promise (1.x and `VersionedTransaction` stay synchronous); awaiting the
 * result handles both majors uniformly.
 *
 * @param tx - Transaction to serialize (web3.js object, Uint8Array, or TypedArray)
 * @returns Serialized transaction bytes
 * @throws Error if transaction format is unsupported
 */
export async function serializeTransaction(tx: SolanaTransaction): Promise<Uint8Array> {
    // web3.js Transaction/VersionedTransaction object
    if (isWeb3jsTransaction(tx)) {
        const serialized: unknown = await tx.serialize({
            requireAllSignatures: false,
            verifySignatures: false,
        });
        if (!(serialized instanceof Uint8Array)) {
            throw new Error('Transaction serialize() did not produce a Uint8Array');
        }
        return serialized;
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
 * Deserialize bytes to the same web3.js class as `original`
 *
 * The class is read from the caller's own transaction object rather than
 * imported, so the connector never loads @solana/web3.js itself: a web3.js
 * object can only reach this function from an app that already has web3.js.
 * `Transaction` rehydrates via its static `from`, `VersionedTransaction` via
 * its static `deserialize`.
 *
 * Version 1 transactions (SIMD-0296) are only representable on web3.js 3.x,
 * whose `VersionedTransaction.deserialize` understands the v1 wire format.
 * web3.js 1.x stable has no v1 support at all (read-only support starts at
 * `1.99.0-beta.0` and only via RPC responses, not wire deserialization).
 * Since the module is never imported, v1 support is detected by rehydrating
 * through `original`'s class and checking that the result reports version 1
 * and re-serializes to the same bytes; anything else is rejected with a
 * descriptive error instead of being misparsed.
 *
 * @param bytes - Serialized transaction bytes
 * @param original - The web3.js transaction the bytes were signed from
 * @returns A new instance of `original`'s class holding the signed bytes
 * @throws If the bytes are a v1 (or newer) transaction that `original`'s
 *         class cannot represent, or if they fail to deserialize
 */
export function deserializeToWeb3jsTransaction(
    bytes: Uint8Array,
    original: Transaction | VersionedTransaction,
): Transaction | VersionedTransaction {
    const version = getTransactionVersionFromBytes(bytes);
    const web3jsClass = original.constructor as Partial<{
        from(bytes: Uint8Array): Transaction;
        deserialize(bytes: Uint8Array): VersionedTransaction;
    }>;
    if (typeof version === 'number' && version >= 1) {
        const deserialize = web3jsClass.deserialize;
        const rehydrated = typeof deserialize === 'function' ? tryDeserializeV1(deserialize, bytes) : null;
        if (rehydrated && rehydrated.version === version && bytesEqual(rehydrated.serialize(), bytes)) {
            return rehydrated;
        }
        throw new Error(
            `Transaction v${version} (SIMD-0296) cannot be represented by this web3.js transaction class. ` +
                'Use a VersionedTransaction on @solana/web3.js 3.x, keep the transaction as serialized bytes, ' +
                'or use @solana/kit codecs instead.',
        );
    }
    if (typeof web3jsClass.from === 'function') {
        return web3jsClass.from(bytes);
    }
    if (typeof web3jsClass.deserialize === 'function') {
        return web3jsClass.deserialize(bytes);
    }
    throw new Error('Unsupported transaction object - expected a web3.js Transaction or VersionedTransaction');
}

function tryDeserializeV1(
    deserialize: (bytes: Uint8Array) => VersionedTransaction,
    bytes: Uint8Array,
): VersionedTransaction | null {
    try {
        return deserialize(bytes);
    } catch {
        // web3.js 1.x reads the 0x81 discriminator as a shortvec continuation
        // byte and fails (or misparses) here; the caller reports it.
        return null;
    }
}

function bytesEqual(a: Uint8Array, b: Uint8Array): boolean {
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
        if (a[i] !== b[i]) return false;
    }
    return true;
}

/**
 * Smart converter that preserves the original format
 * Converts to Wallet Standard format (Uint8Array) and tracks original type
 *
 * @param tx - Transaction in any supported format
 * @returns Object with serialized bytes and format flag
 */
export async function prepareTransactionForWallet(
    tx: SolanaTransaction,
): Promise<{ serialized: Uint8Array; wasWeb3js: boolean }> {
    const wasWeb3js = isWeb3jsTransaction(tx);
    const serialized = await serializeTransaction(tx);
    return { serialized, wasWeb3js };
}

/**
 * Convert signed transaction bytes back to the format of the original transaction
 *
 * When `original` is not a web3.js object the bytes pass through untouched, so v1
 * transactions flow through the wallet-standard path without conversion.
 * (A web3.js 1.x caller can never produce v1 bytes, so the v1 rejection in
 * {@link deserializeToWeb3jsTransaction} is unreachable from a well-formed 1.x
 * round trip; a 3.x caller's v1 `VersionedTransaction` round-trips.)
 *
 * @param signedBytes - Signed transaction as Uint8Array
 * @param original - The transaction that was handed to the wallet for signing
 * @returns An instance of `original`'s web3.js class, or the bytes if `original` was not web3.js
 */
export function convertSignedTransaction(
    signedBytes: Uint8Array,
    original: SolanaTransaction,
): Transaction | VersionedTransaction | Uint8Array {
    if (isWeb3jsTransaction(original)) {
        return deserializeToWeb3jsTransaction(signedBytes, original);
    }
    return signedBytes;
}
