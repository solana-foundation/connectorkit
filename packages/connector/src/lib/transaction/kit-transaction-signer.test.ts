import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createKitTransactionSigner, createGillTransactionSigner } from './kit-transaction-signer';
import type { TransactionSigner } from './transaction-signer';

// Mock dependencies
vi.mock('@solana/transactions', () => ({
    getTransactionDecoder: vi.fn(() => ({ decode: vi.fn() })),
    assertIsTransactionWithinSizeLimit: vi.fn(),
}));

vi.mock('@solana/codecs', () => ({
    getBase58Decoder: vi.fn(() => ({ decode: vi.fn(() => 'mock-address') })),
}));

vi.mock('@solana/keys', () => ({}));

vi.mock('@solana/addresses', () => ({
    address: vi.fn((addr: string) => addr),
}));

vi.mock('../utils/secure-logger', () => ({
    createLogger: vi.fn(() => ({ warn: vi.fn(), debug: vi.fn(), error: vi.fn() })),
}));

vi.mock('../../utils/transaction-format', () => ({
    isWeb3jsTransaction: vi.fn(() => false),
}));

describe('KitTransactionSigner', () => {
    let mockConnectorSigner: TransactionSigner;
    let mockAddress: string;

    beforeEach(() => {
        vi.clearAllMocks();

        mockAddress = 'HMJfh9P8FEF5eVHp3XypYWThUYCQ9sWNZZQQxVP2jjr1';

        mockConnectorSigner = {
            address: mockAddress,
            modifyAndSignTransactions: vi.fn(async (transactions: any[]) => {
                return transactions.map(tx => ({
                    messageBytes: tx.messageBytes || new Uint8Array([1, 2, 3]),
                    signatures: { [mockAddress]: new Uint8Array(64).fill(1) },
                }));
            }),
            signAllTransactions: vi.fn(async (transactions: any[]) => transactions),
        } as any;
    });

    describe('createKitTransactionSigner', () => {
        it('should create kit transaction signer', () => {
            const signer = createKitTransactionSigner(mockConnectorSigner);

            expect(signer).toHaveProperty('address');
            expect(signer).toHaveProperty('modifyAndSignTransactions');
            expect(typeof signer.modifyAndSignTransactions).toBe('function');
        });

        it('should handle missing address', () => {
            const signerWithoutAddress = { ...mockConnectorSigner, address: '' };
            expect(() => createKitTransactionSigner(signerWithoutAddress)).not.toThrow();
        });

        it('should preserve address from connector signer', () => {
            const signer = createKitTransactionSigner(mockConnectorSigner);
            expect(signer?.address).toBe(mockAddress);
        });

        it('should have modifyAndSignTransactions method', () => {
            const signer = createKitTransactionSigner(mockConnectorSigner);
            expect(typeof signer.modifyAndSignTransactions).toBe('function');
        });

        it('should handle empty transaction array', async () => {
            const signer = createKitTransactionSigner(mockConnectorSigner);
            const result = await signer.modifyAndSignTransactions([]);
            expect(result).toEqual([]);
        });
    });

    describe('createGillTransactionSigner (deprecated alias)', () => {
        it('should be an alias to createKitTransactionSigner', () => {
            expect(createGillTransactionSigner).toBe(createKitTransactionSigner);
        });
    });
});

