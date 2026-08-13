import { describe, it, expect, beforeEach, vi } from 'vitest';
import { getBase58Decoder } from '@solana/codecs';
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

    describe('signature slot binding', () => {
        it('binds the wallet signature from its own slot, not the fee payer slot 0', async () => {
            // v0 message with two signers: index 0 is the fee payer, index 1 is the
            // connected wallet. The wallet signs a transaction it does not pay fees for.
            const feePayerKey = new Uint8Array(32).fill(0x0a);
            const walletKey = new Uint8Array(32).fill(0x0b);
            const messageBytes = new Uint8Array([0x80, 2, 0, 0, 2, ...feePayerKey, ...walletKey]);

            // Wallet returns the same-length wire tx with only its own slot (index 1)
            // filled; the fee payer slot 0 is still all zeros.
            const numSigners = 2;
            const wireTx = new Uint8Array(1 + numSigners * 64 + messageBytes.length);
            wireTx[0] = numSigners;
            wireTx.set(new Uint8Array(64).fill(0xbb), 1 + 64);
            wireTx.set(messageBytes, 1 + numSigners * 64);

            mockConnectorSigner.signAllTransactions = vi.fn(async () => [wireTx as unknown as SolanaTransaction]);

            vi.mocked(getBase58Decoder).mockReturnValue({
                decode: (bytes: Uint8Array) => {
                    if (bytes.length === 32 && bytes[0] === 0x0a) return 'FeePayer1111111111111111111111111111111111';
                    if (bytes.length === 32 && bytes[0] === 0x0b) return mockAddress;
                    return 'sig-base58';
                },
            } as unknown as ReturnType<typeof getBase58Decoder>);

            const signer = createKitTransactionSigner(mockConnectorSigner);
            const inputTx = { messageBytes, signatures: {} } as unknown as Parameters<
                typeof signer.modifyAndSignTransactions
            >[0][number];
            const [signed] = await signer.modifyAndSignTransactions([inputTx]);

            // The wallet's signature must come from slot 1 (its own), not slot 0.
            expect(Array.from(signed.signatures[mockAddress] as unknown as Uint8Array)).toEqual(
                new Array(64).fill(0xbb),
            );
        });
    });
});
