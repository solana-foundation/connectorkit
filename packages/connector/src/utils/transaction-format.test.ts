/**
 * Tests for Transaction Format Utilities
 *
 * Comprehensive tests for transaction format detection and conversion
 */

import { describe, it, expect, vi } from 'vitest';
import {
    isWeb3jsTransaction,
    serializeTransaction,
    deserializeToWeb3jsTransaction,
    getTransactionVersionFromBytes,
    prepareTransactionForWallet,
    convertSignedTransaction,
} from './transaction-format';
import { createWireTransactionBytes } from '../__tests__/fixtures/transactions';
import type { Transaction, VersionedTransaction } from '@solana/web3.js';

describe('Transaction Format Utilities', () => {
    // Mock transaction bytes (legacy format - first byte high bit = 0)
    const mockLegacyTxBytes = new Uint8Array([
        0x01, // Legacy transaction (high bit = 0)
        0x00,
        0x00,
        0x00,
        0x00,
        0x00,
        0x00,
        0x00,
        0x01,
        0x02,
        0x03,
        0x04,
        0x05,
        0x06,
        0x07,
    ]);

    // Mock versioned transaction bytes (first byte high bit = 1)
    const mockVersionedTxBytes = new Uint8Array([
        0x80, // Versioned transaction (high bit = 1)
        0x00,
        0x00,
        0x00,
        0x00,
        0x00,
        0x00,
        0x00,
        0x01,
        0x02,
        0x03,
        0x04,
        0x05,
        0x06,
        0x07,
    ]);

    describe('isWeb3jsTransaction', () => {
        it('should return true for objects with serialize method', () => {
            const mockTx = {
                serialize: vi.fn(),
            };

            expect(isWeb3jsTransaction(mockTx)).toBe(true);
        });

        it('should return false for null', () => {
            expect(isWeb3jsTransaction(null)).toBe(false);
        });

        it('should return false for undefined', () => {
            expect(isWeb3jsTransaction(undefined)).toBe(false);
        });

        it('should return false for primitives', () => {
            expect(isWeb3jsTransaction(123)).toBe(false);
            expect(isWeb3jsTransaction('string')).toBe(false);
            expect(isWeb3jsTransaction(true)).toBe(false);
        });

        it('should return false for plain objects', () => {
            expect(isWeb3jsTransaction({})).toBe(false);
            expect(isWeb3jsTransaction({ data: 'value' })).toBe(false);
        });

        it('should return false for objects without serialize method', () => {
            expect(isWeb3jsTransaction({ notSerialize: vi.fn() })).toBe(false);
        });

        it('should return false for objects with non-function serialize', () => {
            expect(isWeb3jsTransaction({ serialize: 'not a function' })).toBe(false);
            expect(isWeb3jsTransaction({ serialize: 123 })).toBe(false);
        });

        it('should return true for Uint8Array (has methods)', () => {
            // Note: This might be unexpected but Uint8Array doesn't have serialize method
            expect(isWeb3jsTransaction(new Uint8Array())).toBe(false);
        });
    });

    describe('serializeTransaction', () => {
        it('should serialize web3.js transaction object', () => {
            const mockTx = {
                serialize: vi.fn().mockReturnValue(mockLegacyTxBytes),
            };

            const result = serializeTransaction(mockTx as unknown as Transaction);

            expect(result).toBe(mockLegacyTxBytes);
            expect(mockTx.serialize).toHaveBeenCalledWith({
                requireAllSignatures: false,
                verifySignatures: false,
            });
        });

        it('should return Uint8Array as-is', () => {
            const result = serializeTransaction(mockLegacyTxBytes);
            expect(result).toBe(mockLegacyTxBytes);
        });

        it('should convert other TypedArray to Uint8Array', () => {
            const int8Array = new Int8Array([1, 2, 3, 4, 5]);
            const result = serializeTransaction(int8Array);

            expect(result).toBeInstanceOf(Uint8Array);
            expect(result.length).toBe(5);
            expect(Array.from(result)).toEqual([1, 2, 3, 4, 5]);
        });

        it('should convert Uint16Array to Uint8Array', () => {
            const uint16Array = new Uint16Array([256, 512]);
            const result = serializeTransaction(uint16Array);

            expect(result).toBeInstanceOf(Uint8Array);
        });

        it('should throw error for unsupported formats', () => {
            const invalidInputs: unknown[] = [{}, 'string', 123, null];
            for (const input of invalidInputs) {
                expect(() =>
                    serializeTransaction(input as unknown as Parameters<typeof serializeTransaction>[0]),
                ).toThrow('Unsupported transaction format');
            }
        });

        it('should handle empty Uint8Array', () => {
            const empty = new Uint8Array();
            const result = serializeTransaction(empty);
            expect(result).toBe(empty);
        });

        it('should preserve buffer offset for TypedArray', () => {
            const buffer = new ArrayBuffer(10);
            const view = new Uint8Array(buffer, 2, 5); // offset=2, length=5
            view.fill(42);

            const result = serializeTransaction(view);

            expect(result).toBeInstanceOf(Uint8Array);
            expect(result.length).toBe(5);
            expect(result.every(byte => byte === 42)).toBe(true);
        });
    });

    describe('getTransactionVersionFromBytes', () => {
        it('should classify wire-correct legacy transaction bytes', () => {
            expect(getTransactionVersionFromBytes(createWireTransactionBytes('legacy'))).toBe('legacy');
        });

        it('should classify wire-correct v0 transaction bytes', () => {
            expect(getTransactionVersionFromBytes(createWireTransactionBytes(0))).toBe(0);
        });

        it('should classify wire-correct v1 transaction bytes via the 0x81 discriminator', () => {
            const bytes = createWireTransactionBytes(1);
            expect(bytes[0]).toBe(0x81);
            expect(getTransactionVersionFromBytes(bytes)).toBe(1);
        });

        it('should return null for empty bytes', () => {
            expect(getTransactionVersionFromBytes(new Uint8Array())).toBeNull();
        });

        it('should return null for truncated bytes', () => {
            // Claims one signature but has no room for it or a message
            expect(getTransactionVersionFromBytes(new Uint8Array([0x01, 0x00, 0x00]))).toBeNull();
        });

        it('should read an unknown high-bit first byte as a future-version discriminator', () => {
            // 0xff can never start a legacy/v0 transaction (it would imply a
            // shortvec continuation, i.e. 128+ signatures), so it reads as a
            // discriminator for a future version — which downstream consumers
            // then reject explicitly instead of misparsing.
            expect(getTransactionVersionFromBytes(new Uint8Array(16).fill(0xff))).toBe(127);
        });

        it('should not misclassify a signed transaction by its signature count byte', () => {
            // Regression: the old check read byte 0 (the shortvec signature
            // count, e.g. 0x01) as the message version byte, so every real
            // signed v0 transaction was misrouted to the legacy parser.
            const v0Bytes = createWireTransactionBytes(0);
            expect(v0Bytes[0]).toBe(0x01);
            expect(getTransactionVersionFromBytes(v0Bytes)).toBe(0);
        });
    });

    describe('deserializeToWeb3jsTransaction with wire-correct fixtures', () => {
        it('should deserialize legacy bytes into the Transaction class of the original', async () => {
            const { Transaction } = await import('@solana/web3.js');
            const bytes = createWireTransactionBytes('legacy');
            const result = deserializeToWeb3jsTransaction(bytes, Transaction.from(bytes));
            expect(result).toBeInstanceOf(Transaction);
        });

        it('should deserialize v0 bytes into the VersionedTransaction class of the original', async () => {
            const { VersionedTransaction } = await import('@solana/web3.js');
            const bytes = createWireTransactionBytes(0);
            const result = deserializeToWeb3jsTransaction(bytes, VersionedTransaction.deserialize(bytes));
            expect(result).toBeInstanceOf(VersionedTransaction);
            expect((result as VersionedTransaction).version).toBe(0);
        });

        it('should keep a legacy-message VersionedTransaction as a VersionedTransaction', async () => {
            const { VersionedTransaction } = await import('@solana/web3.js');
            const bytes = createWireTransactionBytes('legacy');
            const result = deserializeToWeb3jsTransaction(bytes, VersionedTransaction.deserialize(bytes));
            expect(result).toBeInstanceOf(VersionedTransaction);
            expect((result as VersionedTransaction).version).toBe('legacy');
        });

        it('should reject v1 bytes with a descriptive error', async () => {
            const { Transaction } = await import('@solana/web3.js');
            const original = Transaction.from(createWireTransactionBytes('legacy'));
            expect(() => deserializeToWeb3jsTransaction(createWireTransactionBytes(1), original)).toThrow(
                /Transaction v1 .*cannot be represented as a web3\.js transaction object/,
            );
        });

        it('should reject objects whose class has neither from nor deserialize', () => {
            const original = { serialize: () => new Uint8Array() } as unknown as Transaction;
            expect(() => deserializeToWeb3jsTransaction(createWireTransactionBytes('legacy'), original)).toThrow(
                /Unsupported transaction object/,
            );
        });
    });

    describe('v1 pass-through', () => {
        it('should pass v1 bytes through convertSignedTransaction untouched when not web3.js', async () => {
            const v1Bytes = createWireTransactionBytes(1);
            const result = convertSignedTransaction(v1Bytes, v1Bytes);
            expect(result).toBe(v1Bytes);
        });

        it('should prepare v1 bytes for the wallet without conversion', () => {
            const v1Bytes = createWireTransactionBytes(1);
            const { serialized, wasWeb3js } = prepareTransactionForWallet(v1Bytes);
            expect(serialized).toBe(v1Bytes);
            expect(wasWeb3js).toBe(false);
        });
    });

    describe('deserializeToWeb3jsTransaction', () => {
        it('should surface web3.js errors for malformed legacy bytes', async () => {
            const { Transaction } = await import('@solana/web3.js');
            const original = Transaction.from(createWireTransactionBytes('legacy'));
            expect(() => deserializeToWeb3jsTransaction(mockLegacyTxBytes, original)).toThrow();
        });

        it('should surface web3.js errors for malformed versioned bytes', async () => {
            const { VersionedTransaction } = await import('@solana/web3.js');
            const original = VersionedTransaction.deserialize(createWireTransactionBytes(0));
            expect(() => deserializeToWeb3jsTransaction(mockVersionedTxBytes, original)).toThrow();
        });

        it('should handle empty bytes', async () => {
            const { Transaction } = await import('@solana/web3.js');
            const original = Transaction.from(createWireTransactionBytes('legacy'));
            expect(() => deserializeToWeb3jsTransaction(new Uint8Array(), original)).toThrow();
        });
    });

    describe('prepareTransactionForWallet', () => {
        it('should prepare web3.js transaction', () => {
            const mockTx = {
                serialize: vi.fn().mockReturnValue(mockLegacyTxBytes),
            };

            const result = prepareTransactionForWallet(mockTx as unknown as Transaction);

            expect(result.serialized).toBe(mockLegacyTxBytes);
            expect(result.wasWeb3js).toBe(true);
        });

        it('should prepare Uint8Array transaction', () => {
            const result = prepareTransactionForWallet(mockLegacyTxBytes);

            expect(result.serialized).toBe(mockLegacyTxBytes);
            expect(result.wasWeb3js).toBe(false);
        });

        it('should prepare TypedArray transaction', () => {
            const int8Array = new Int8Array([1, 2, 3, 4, 5]);
            const result = prepareTransactionForWallet(int8Array);

            expect(result.serialized).toBeInstanceOf(Uint8Array);
            expect(result.wasWeb3js).toBe(false);
        });

        it('should track original format correctly', () => {
            // Web3.js object
            const web3jsResult = prepareTransactionForWallet({
                serialize: vi.fn().mockReturnValue(mockLegacyTxBytes),
            } as unknown as Transaction);
            expect(web3jsResult.wasWeb3js).toBe(true);

            // Uint8Array
            const bytesResult = prepareTransactionForWallet(mockLegacyTxBytes);
            expect(bytesResult.wasWeb3js).toBe(false);
        });
    });

    describe('convertSignedTransaction', () => {
        it('should rehydrate into the web3.js class of the original', async () => {
            const { Transaction } = await import('@solana/web3.js');
            const bytes = createWireTransactionBytes('legacy');
            const result = convertSignedTransaction(bytes, Transaction.from(bytes));

            expect(result).toBeInstanceOf(Transaction);
        });

        it('should return the bytes if the original was not web3.js', () => {
            const result = convertSignedTransaction(mockLegacyTxBytes, mockLegacyTxBytes);

            expect(result).toBe(mockLegacyTxBytes);
            expect(result).toBeInstanceOf(Uint8Array);
        });

        it('should preserve Uint8Array when the original was a TypedArray', () => {
            const originalBytes = new Uint8Array([1, 2, 3, 4, 5]);
            const result = convertSignedTransaction(originalBytes, new Int8Array([1, 2, 3, 4, 5]));

            expect(result).toBe(originalBytes);
        });
    });

    describe('edge cases', () => {
        it('should handle transactions with all zeros', () => {
            const zeros = new Uint8Array(32).fill(0);
            const result = serializeTransaction(zeros);
            expect(result).toBe(zeros);
        });

        it('should handle transactions with all ones', () => {
            const ones = new Uint8Array(32).fill(0xff);
            const result = serializeTransaction(ones);
            expect(result).toBe(ones);
        });

        it('should handle very large transaction bytes', () => {
            const large = new Uint8Array(1024 * 10); // 10KB
            const result = serializeTransaction(large);
            expect(result).toBe(large);
        });

        it('should handle single byte transaction', () => {
            const single = new Uint8Array([0x42]);
            const result = serializeTransaction(single);
            expect(result).toBe(single);
        });
    });

    describe('format preservation', () => {
        it('should round-trip a web3.js transaction through prepare and convert', async () => {
            const { VersionedTransaction } = await import('@solana/web3.js');
            const original = VersionedTransaction.deserialize(createWireTransactionBytes(0));

            const { serialized, wasWeb3js } = prepareTransactionForWallet(original);
            expect(wasWeb3js).toBe(true);

            const result = convertSignedTransaction(serialized, original);
            expect(result).toBeInstanceOf(VersionedTransaction);
            expect(result).not.toBe(original);
        });

        it('should round-trip Uint8Array through prepare and convert', () => {
            const { serialized } = prepareTransactionForWallet(mockLegacyTxBytes);

            const result = convertSignedTransaction(serialized, mockLegacyTxBytes);
            expect(result).toBeInstanceOf(Uint8Array);
            expect(result).toBe(serialized);
        });

        it('should preserve original format flag correctly', () => {
            // Web3.js format
            const { wasWeb3js: web3jsFlag } = prepareTransactionForWallet({
                serialize: vi.fn().mockReturnValue(mockLegacyTxBytes),
            } as unknown as Transaction);
            expect(web3jsFlag).toBe(true);

            // Byte array format
            const { wasWeb3js: bytesFlag } = prepareTransactionForWallet(mockLegacyTxBytes);
            expect(bytesFlag).toBe(false);
        });
    });

    describe('TypedArray variants', () => {
        it('should handle Int8Array', () => {
            const arr = new Int8Array([1, -1, 2, -2]);
            const result = serializeTransaction(arr);
            expect(result).toBeInstanceOf(Uint8Array);
            expect(result.length).toBe(4);
        });

        it('should handle Uint32Array', () => {
            const arr = new Uint32Array([1, 2, 3]);
            const result = serializeTransaction(arr);
            expect(result).toBeInstanceOf(Uint8Array);
        });

        it('should handle Float32Array', () => {
            const arr = new Float32Array([1.5, 2.5, 3.5]);
            const result = serializeTransaction(arr);
            expect(result).toBeInstanceOf(Uint8Array);
        });

        it('should handle DataView', () => {
            const buffer = new ArrayBuffer(8);
            const view = new DataView(buffer);
            view.setUint8(0, 42);

            const result = serializeTransaction(view);
            expect(result).toBeInstanceOf(Uint8Array);
            expect(result[0]).toBe(42);
        });
    });
});
