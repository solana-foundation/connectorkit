import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createKitTransactionSigner, createGillTransactionSigner } from './kit-transaction-signer';
import type { TransactionSigner } from './transaction-signer';
import type { SolanaTransaction, TransactionSignerCapabilities } from '../../types/transactions';

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

        const capabilities: TransactionSignerCapabilities = {
            canSign: true,
            canSend: true,
            canSignMessage: false,
            supportsBatchSigning: true,
        };

        const signer = {
            address: mockAddress,
            signTransaction: vi.fn(async (transaction: SolanaTransaction) => transaction),
            signAllTransactions: vi.fn(async (transactions: SolanaTransaction[]) => transactions),
            signAndSendTransaction: vi.fn(async () => 'mock-signature'),
            signAndSendTransactions: vi.fn(async () => ['mock-signature']),
            getCapabilities: vi.fn(() => capabilities),
        } satisfies TransactionSigner;

        mockConnectorSigner = signer;
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
