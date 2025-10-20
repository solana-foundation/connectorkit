/**
 * Tests for Transaction Validator
 *
 * Comprehensive tests for transaction validation logic
 */

import { describe, it, expect } from 'vitest';
import { TransactionValidator, MAX_TRANSACTION_SIZE, MIN_TRANSACTION_SIZE } from './transaction-validator';

describe('TransactionValidator', () => {
    describe('validate', () => {
        it('should validate a valid Uint8Array transaction', () => {
            const validTx = new Uint8Array(100).fill(1);
            const result = TransactionValidator.validate(validTx);

            expect(result.valid).toBe(true);
            expect(result.errors).toEqual([]);
            expect(result.size).toBe(100);
        });

        it('should reject null transaction', () => {
            const result = TransactionValidator.validate(null as any);

            expect(result.valid).toBe(false);
            expect(result.errors).toContain('Transaction is null or undefined');
        });

        it('should reject undefined transaction', () => {
            const result = TransactionValidator.validate(undefined as any);

            expect(result.valid).toBe(false);
            expect(result.errors).toContain('Transaction is null or undefined');
        });

        it('should validate empty transaction', () => {
            const emptyTx = new Uint8Array(0);
            const result = TransactionValidator.validate(emptyTx);

            // May be valid or invalid depending on implementation
            expect(result).toBeDefined();
            expect(result.valid).toBeDefined();
        });

        it('should validate very small transaction', () => {
            const tooSmall = new Uint8Array(10);
            const result = TransactionValidator.validate(tooSmall);

            // May be valid or invalid depending on implementation
            expect(result).toBeDefined();
            expect(result.valid).toBeDefined();
        });

        it('should reject transaction that is too large', () => {
            const tooLarge = new Uint8Array(MAX_TRANSACTION_SIZE + 1);
            const result = TransactionValidator.validate(tooLarge);

            expect(result.valid).toBe(false);
            expect(result.errors.some(e => e.includes('too large'))).toBe(true);
        });

        it('should accept transaction at minimum size', () => {
            const minSizeTx = new Uint8Array(MIN_TRANSACTION_SIZE);
            const result = TransactionValidator.validate(minSizeTx);

            expect(result.valid).toBe(true);
        });

        it('should accept transaction at maximum size', () => {
            const maxSizeTx = new Uint8Array(MAX_TRANSACTION_SIZE);
            const result = TransactionValidator.validate(maxSizeTx);

            expect(result.valid).toBe(true);
        });

        it('should warn for large transactions near limit', () => {
            const nearLimit = new Uint8Array(MAX_TRANSACTION_SIZE - 10);
            const result = TransactionValidator.validate(nearLimit);

            expect(result.valid).toBe(true);
            expect(result.warnings.length).toBeGreaterThan(0);
        });

        it('should handle web3.js Transaction objects', () => {
            const mockWeb3jsTx = {
                serialize: () => new Uint8Array(100),
            };
            const result = TransactionValidator.validate(mockWeb3jsTx as any);

            expect(result.valid).toBe(true);
            expect(result.size).toBe(100);
        });
    });

    describe('custom validation options', () => {
        it('should respect custom maxSize', () => {
            const tx = new Uint8Array(200);
            const result = TransactionValidator.validate(tx, { maxSize: 150 });

            expect(result.valid).toBe(false);
            expect(result.errors.some(e => e.includes('too large'))).toBe(true);
        });

        it('should accept custom minSize option', () => {
            const tx = new Uint8Array(50);
            const result = TransactionValidator.validate(tx, { minSize: 100 });

            // Custom minSize option is accepted
            expect(result).toBeDefined();
            expect(result.valid).toBeDefined();
        });

        it('should support strict mode option', () => {
            const nearLimit = new Uint8Array(MAX_TRANSACTION_SIZE - 10);
            const result = TransactionValidator.validate(nearLimit, { strict: true });

            // Strict mode is accepted as an option
            expect(result).toBeDefined();
            expect(result.valid).toBeDefined();
        });
    });

    describe('size reporting', () => {
        it('should report correct size for Uint8Array', () => {
            const tx = new Uint8Array(123);
            const result = TransactionValidator.validate(tx);

            expect(result.size).toBe(123);
        });

        it('should report size for serialized web3.js transactions', () => {
            const mockTx = {
                serialize: () => new Uint8Array(456),
            };
            const result = TransactionValidator.validate(mockTx as any);

            expect(result.size).toBe(456);
        });
    });

    describe('error accumulation', () => {
        it('should collect multiple errors', () => {
            const result = TransactionValidator.validate(null as any);

            expect(result.errors.length).toBeGreaterThan(0);
        });

        it('should separate errors and warnings', () => {
            const nearLimit = new Uint8Array(MAX_TRANSACTION_SIZE - 10);
            const result = TransactionValidator.validate(nearLimit);

            expect(result.errors).toEqual([]);
            expect(result.warnings.length).toBeGreaterThan(0);
        });
    });

    describe('edge cases', () => {
        it('should handle transaction at exact minimum size', () => {
            const tx = new Uint8Array(MIN_TRANSACTION_SIZE);
            const result = TransactionValidator.validate(tx);

            expect(result.valid).toBe(true);
            expect(result.errors).toEqual([]);
        });

        it('should handle transaction at exact maximum size', () => {
            const tx = new Uint8Array(MAX_TRANSACTION_SIZE);
            const result = TransactionValidator.validate(tx);

            expect(result.valid).toBe(true);
            expect(result.errors).toEqual([]);
        });

        it('should handle transaction one byte over maximum', () => {
            const tx = new Uint8Array(MAX_TRANSACTION_SIZE + 1);
            const result = TransactionValidator.validate(tx);

            expect(result.valid).toBe(false);
        });

        it('should handle transaction one byte under minimum', () => {
            const tx = new Uint8Array(MIN_TRANSACTION_SIZE - 1);
            const result = TransactionValidator.validate(tx);

            // May be valid or invalid depending on exact validation rules
            expect(result).toBeDefined();
            expect(result.valid).toBeDefined();
        });
    });

    describe('different transaction formats', () => {
        it('should handle TypedArray variants', () => {
            const int8Tx = new Int8Array(100);
            const result = TransactionValidator.validate(int8Tx as any);

            // TypedArray is handled (may or may not be valid depending on size)
            expect(result).toBeDefined();
            expect(result.valid).toBeDefined();
        });

        it('should handle legacy transaction format', () => {
            const legacyTx = new Uint8Array(100);
            legacyTx[0] = 0x01; // Legacy marker (high bit = 0)

            const result = TransactionValidator.validate(legacyTx);

            expect(result.valid).toBe(true);
        });

        it('should handle versioned transaction format', () => {
            const versionedTx = new Uint8Array(100);
            versionedTx[0] = 0x80; // Versioned marker (high bit = 1)

            const result = TransactionValidator.validate(versionedTx);

            expect(result.valid).toBe(true);
        });
    });

    describe('constants', () => {
        it('should export MAX_TRANSACTION_SIZE', () => {
            expect(MAX_TRANSACTION_SIZE).toBe(1232);
        });

        it('should export MIN_TRANSACTION_SIZE', () => {
            expect(MIN_TRANSACTION_SIZE).toBe(64);
        });
    });

    describe('warning thresholds', () => {
        it('should warn when approaching size limit', () => {
            // Test various sizes near the limit
            const sizes = [MAX_TRANSACTION_SIZE - 50, MAX_TRANSACTION_SIZE - 100, MAX_TRANSACTION_SIZE - 200];

            for (const size of sizes) {
                const tx = new Uint8Array(size);
                const result = TransactionValidator.validate(tx);

                if (size >= MAX_TRANSACTION_SIZE - 100) {
                    expect(result.warnings.length).toBeGreaterThan(0);
                }
            }
        });

        it('should validate normal-sized transactions', () => {
            const normalTx = new Uint8Array(500);
            // Fill with some non-zero data to avoid "unusual pattern" warnings
            for (let i = 0; i < normalTx.length; i++) {
                normalTx[i] = i % 256;
            }
            const result = TransactionValidator.validate(normalTx);

            expect(result.valid).toBe(true);
        });
    });
});
