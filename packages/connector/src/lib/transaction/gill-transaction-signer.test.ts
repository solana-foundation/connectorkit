import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createGillTransactionSigner } from './gill-transaction-signer';
import type { TransactionSigner } from './transaction-signer';

// Mock dependencies
vi.mock('gill', () => ({
    getTransactionDecoder: vi.fn(() => ({ decode: vi.fn() })),
    getSignatureFromBytes: vi.fn(() => 'mock-signature'),
    address: vi.fn((addr: string) => addr),
}));

vi.mock('../utils/secure-logger', () => ({
    createLogger: vi.fn(() => ({ warn: vi.fn(), debug: vi.fn(), error: vi.fn() })),
}));

vi.mock('../../utils/transaction-format', () => ({
    isWeb3jsTransaction: vi.fn(() => false),
}));

describe('GillTransactionSigner', () => {
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

    describe('createGillTransactionSigner', () => {
        it('should create gill transaction signer', () => {
            const signer = createGillTransactionSigner(mockConnectorSigner);

            expect(signer).toHaveProperty('address');
            expect(signer).toHaveProperty('modifyAndSignTransactions');
            expect(typeof signer.modifyAndSignTransactions).toBe('function');
        });

        it('should handle missing address', () => {
            const signerWithoutAddress = { ...mockConnectorSigner, address: '' };
            expect(() => createGillTransactionSigner(signerWithoutAddress)).not.toThrow();
        });

        it('should preserve address from connector signer', () => {
            const signer = createGillTransactionSigner(mockConnectorSigner);
            expect(signer?.address).toBe(mockAddress);
        });

        it('should have modifyAndSignTransactions method', () => {
            const signer = createGillTransactionSigner(mockConnectorSigner);
            expect(typeof signer.modifyAndSignTransactions).toBe('function');
        });

        it('should handle empty transaction array', async () => {
            const signer = createGillTransactionSigner(mockConnectorSigner);
            const result = await signer.modifyAndSignTransactions([]);
            expect(result).toEqual([]);
        });
    });
});
