/**
 * Tests for Transaction Signer
 *
 * Comprehensive tests for the transaction signing abstraction layer
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createTransactionSigner, isTransactionSignerError, TransactionSignerError } from './transaction-signer';
import type { TransactionSignerConfig } from '../../types/transactions';
import type { WalletStandardAccount, WalletStandardWallet } from '../adapters/wallet-standard-shim';
import type { SolanaCluster } from '@wallet-ui/core';
import type { SignatureBytes } from '@solana/keys';
import { signatureBytesToBase58 } from '../kit/signer-utils';

describe('Transaction Signer', () => {
    let mockWallet: WalletStandardWallet;
    let mockAccount: WalletStandardAccount;
    let mockTransaction: Uint8Array;

    beforeEach(() => {
        mockTransaction = new Uint8Array([1, 2, 3, 4, 5]);

        mockAccount = {
            address: '5VERv8NMvzbJMEkV8xnrLkEaWRtSz9CosKDYjCJjBRnbJLgp8uirBgmQpjKhoR4tjF3ZpRzrFmBV6UjKdiSZkQUW',
            publicKey: new Uint8Array(32),
            chains: ['solana:mainnet'],
            features: [],
        } as WalletStandardAccount;

        mockWallet = {
            name: 'Mock Wallet',
            icon: 'data:image/svg+xml',
            version: '1.0.0',
            accounts: [mockAccount],
            chains: ['solana:mainnet'],
            features: {
                'solana:signTransaction': {
                    signTransaction: vi.fn().mockResolvedValue({
                        signedTransactions: [new Uint8Array([6, 7, 8, 9, 10])],
                    }),
                },
                'solana:signAllTransactions': {
                    signAllTransactions: vi.fn().mockResolvedValue({
                        signedTransactions: [new Uint8Array([6, 7, 8, 9, 10]), new Uint8Array([11, 12, 13, 14, 15])],
                    }),
                },
                'solana:signAndSendTransaction': {
                    signAndSendTransaction: vi.fn().mockResolvedValue({
                        signature: 'mockSignature123',
                    }),
                },
                'solana:signMessage': {
                    signMessage: vi.fn().mockResolvedValue({
                        signatures: [new Uint8Array([20, 21, 22])],
                    }),
                },
            },
        } as unknown as WalletStandardWallet;
    });

    afterEach(() => {
        vi.clearAllMocks();
    });

    describe('createTransactionSigner', () => {
        it('should create a transaction signer with wallet and account', () => {
            const config: TransactionSignerConfig = {
                wallet: mockWallet,
                account: mockAccount,
            };

            const signer = createTransactionSigner(config);

            expect(signer).toBeDefined();
            expect(signer).not.toBeNull();
            expect(signer!.address).toBe(mockAccount.address);
        });

        it('should return null if wallet is missing', () => {
            const config: TransactionSignerConfig = {
                wallet: null as unknown as TransactionSignerConfig['wallet'],
                account: mockAccount,
            };

            const signer = createTransactionSigner(config);

            expect(signer).toBeNull();
        });

        it('should return null if account is missing', () => {
            const config: TransactionSignerConfig = {
                wallet: mockWallet,
                account: null as unknown as TransactionSignerConfig['account'],
            };

            const signer = createTransactionSigner(config);

            expect(signer).toBeNull();
        });

        it('should include cluster if provided', () => {
            const config: TransactionSignerConfig = {
                wallet: mockWallet,
                account: mockAccount,
                cluster: {
                    id: 'solana:devnet',
                    label: 'Devnet',
                    url: 'https://api.devnet.solana.com',
                } satisfies SolanaCluster,
            };

            const signer = createTransactionSigner(config);

            expect(signer).toBeDefined();
        });

        it('should include eventEmitter if provided', () => {
            const mockEmitter = { emit: vi.fn() } satisfies NonNullable<TransactionSignerConfig['eventEmitter']>;

            const config: TransactionSignerConfig = {
                wallet: mockWallet,
                account: mockAccount,
                eventEmitter: mockEmitter,
            };

            const signer = createTransactionSigner(config);

            expect(signer).toBeDefined();
        });
    });

    describe('getCapabilities', () => {
        it('should detect all capabilities when all features present', () => {
            const config: TransactionSignerConfig = {
                wallet: mockWallet,
                account: mockAccount,
            };

            const signer = createTransactionSigner(config)!;
            const capabilities = signer.getCapabilities();

            expect(capabilities.canSign).toBe(true);
            expect(capabilities.canSend).toBe(true);
            expect(capabilities.canSignMessage).toBe(true);
            expect(capabilities.supportsBatchSigning).toBe(true);
        });

        it('should detect missing sign capability', () => {
            const walletWithoutSign = {
                ...mockWallet,
                features: {
                    'solana:signAndSendTransaction': mockWallet.features['solana:signAndSendTransaction'],
                },
            } as unknown as WalletStandardWallet;

            const config: TransactionSignerConfig = {
                wallet: walletWithoutSign,
                account: mockAccount,
            };

            const signer = createTransactionSigner(config)!;
            const capabilities = signer.getCapabilities();

            expect(capabilities.canSign).toBe(false);
            expect(capabilities.canSend).toBe(true);
        });

        it('should detect missing send capability', () => {
            const walletWithoutSend = {
                ...mockWallet,
                features: {
                    'solana:signTransaction': mockWallet.features['solana:signTransaction'],
                },
            } as unknown as WalletStandardWallet;

            const config: TransactionSignerConfig = {
                wallet: walletWithoutSend,
                account: mockAccount,
            };

            const signer = createTransactionSigner(config)!;
            const capabilities = signer.getCapabilities();

            expect(capabilities.canSign).toBe(true);
            expect(capabilities.canSend).toBe(false);
        });

        it('should detect missing message signing capability', () => {
            const walletWithoutMessage = {
                ...mockWallet,
                features: {
                    'solana:signTransaction': mockWallet.features['solana:signTransaction'],
                    'solana:signAndSendTransaction': mockWallet.features['solana:signAndSendTransaction'],
                },
            } as unknown as WalletStandardWallet;

            const config: TransactionSignerConfig = {
                wallet: walletWithoutMessage,
                account: mockAccount,
            };

            const signer = createTransactionSigner(config)!;
            const capabilities = signer.getCapabilities();

            expect(capabilities.canSignMessage).toBe(false);
        });

        it('should detect missing batch signing capability', () => {
            const walletWithoutBatch = {
                ...mockWallet,
                features: {
                    'solana:signTransaction': mockWallet.features['solana:signTransaction'],
                },
            } as unknown as WalletStandardWallet;

            const config: TransactionSignerConfig = {
                wallet: walletWithoutBatch,
                account: mockAccount,
            };

            const signer = createTransactionSigner(config)!;
            const capabilities = signer.getCapabilities();

            expect(capabilities.supportsBatchSigning).toBe(false);
        });
    });

    describe('signTransaction', () => {
        it('should sign a single transaction', async () => {
            const config: TransactionSignerConfig = {
                wallet: mockWallet,
                account: mockAccount,
            };

            const signer = createTransactionSigner(config)!;
            const signedTx = await signer.signTransaction(mockTransaction);

            expect(signedTx).toBeDefined();
            expect(signedTx).toBeInstanceOf(Uint8Array);
            expect(mockWallet.features['solana:signTransaction'].signTransaction).toHaveBeenCalled();
        });

        it('should throw error if signing not supported', async () => {
            const walletWithoutSign = {
                ...mockWallet,
                features: {},
            } as unknown as WalletStandardWallet;

            const config: TransactionSignerConfig = {
                wallet: walletWithoutSign,
                account: mockAccount,
            };

            const signer = createTransactionSigner(config)!;

            await expect(signer.signTransaction(mockTransaction)).rejects.toThrow();
        });

        it('should validate transaction before signing', async () => {
            const config: TransactionSignerConfig = {
                wallet: mockWallet,
                account: mockAccount,
            };

            const signer = createTransactionSigner(config)!;

            // Transaction validator should be called internally
            await signer.signTransaction(mockTransaction);

            // Verify the feature was called (which means validation passed)
            expect(mockWallet.features['solana:signTransaction'].signTransaction).toHaveBeenCalled();
        });
    });

    describe('signAllTransactions', () => {
        it('should sign multiple transactions at once', async () => {
            const config: TransactionSignerConfig = {
                wallet: mockWallet,
                account: mockAccount,
            };

            const signer = createTransactionSigner(config)!;
            const transactions = [mockTransaction, new Uint8Array([2, 3, 4, 5, 6])];

            const signedTxs = await signer.signAllTransactions(transactions);

            expect(signedTxs).toBeDefined();
            expect(Array.isArray(signedTxs)).toBe(true);
            expect(signedTxs.length).toBe(2);
            expect(mockWallet.features['solana:signAllTransactions'].signAllTransactions).toHaveBeenCalled();
        });

        it('should fallback to sequential signing if batch not supported', async () => {
            const walletWithoutBatch = {
                ...mockWallet,
                features: {
                    'solana:signTransaction': mockWallet.features['solana:signTransaction'],
                },
            } as unknown as WalletStandardWallet;

            const config: TransactionSignerConfig = {
                wallet: walletWithoutBatch,
                account: mockAccount,
            };

            const signer = createTransactionSigner(config)!;
            const transactions = [mockTransaction, new Uint8Array([2, 3, 4, 5, 6])];

            const signedTxs = await signer.signAllTransactions(transactions);

            expect(signedTxs).toBeDefined();
            expect(signedTxs.length).toBe(2);
            // Should have called signTransaction twice (sequential fallback)
            expect(walletWithoutBatch.features['solana:signTransaction'].signTransaction).toHaveBeenCalledTimes(2);
        });

        it('should handle empty array', async () => {
            const config: TransactionSignerConfig = {
                wallet: mockWallet,
                account: mockAccount,
            };

            const signer = createTransactionSigner(config)!;
            const signedTxs = await signer.signAllTransactions([]);

            expect(signedTxs).toEqual([]);
        });
    });

    describe('signAndSendTransaction', () => {
        it('should sign and send a transaction', async () => {
            const config: TransactionSignerConfig = {
                wallet: mockWallet,
                account: mockAccount,
            };

            const signer = createTransactionSigner(config)!;
            const signature = await signer.signAndSendTransaction(mockTransaction);

            expect(signature).toBe('mockSignature123');
            expect(mockWallet.features['solana:signAndSendTransaction'].signAndSendTransaction).toHaveBeenCalled();
        });

        it('should return a base58 signature when wallet returns Wallet Standard output array', async () => {
            // Wallet Standard Solana signAndSendTransaction returns an array of outputs:
            //   [{ signature: Uint8Array }]
            // Our signer should convert signature bytes to base58 string.
            const signatureBytes = new Uint8Array(64).fill(7) as SignatureBytes;
            const expectedSignature = signatureBytesToBase58(signatureBytes);

            const walletWithWalletStandardResult = {
                ...mockWallet,
                features: {
                    ...mockWallet.features,
                    'solana:signAndSendTransaction': {
                        signAndSendTransaction: vi.fn().mockResolvedValue([{ signature: signatureBytes }]),
                    },
                },
            } as unknown as WalletStandardWallet;

            const config: TransactionSignerConfig = {
                wallet: walletWithWalletStandardResult,
                account: mockAccount,
            };

            const signer = createTransactionSigner(config)!;
            const signature = await signer.signAndSendTransaction(mockTransaction);

            // Current bug: this comes back as "[object Object]" because the result is coerced to a string.
            // This expectation intentionally reproduces the issue as a failing test prior to the fix.
            expect(signature).toBe(expectedSignature);
        });

        it('should throw error if send not supported', async () => {
            const walletWithoutSend = {
                ...mockWallet,
                features: {
                    'solana:signTransaction': mockWallet.features['solana:signTransaction'],
                },
            } as unknown as WalletStandardWallet;

            const config: TransactionSignerConfig = {
                wallet: walletWithoutSend,
                account: mockAccount,
            };

            const signer = createTransactionSigner(config)!;

            await expect(signer.signAndSendTransaction(mockTransaction)).rejects.toThrow();
        });

        it('should accept send options', async () => {
            const config: TransactionSignerConfig = {
                wallet: mockWallet,
                account: mockAccount,
            };

            const signer = createTransactionSigner(config)!;
            const options = { skipPreflight: true, maxRetries: 5 };

            await signer.signAndSendTransaction(mockTransaction, options);

            expect(mockWallet.features['solana:signAndSendTransaction'].signAndSendTransaction).toHaveBeenCalled();
        });
    });

    describe('signAndSendTransactions', () => {
        it('should sign and send multiple transactions sequentially', async () => {
            const config: TransactionSignerConfig = {
                wallet: mockWallet,
                account: mockAccount,
            };

            const signer = createTransactionSigner(config)!;
            const transactions = [mockTransaction, new Uint8Array([2, 3, 4, 5, 6])];

            const signatures = await signer.signAndSendTransactions(transactions);

            expect(signatures).toBeDefined();
            expect(Array.isArray(signatures)).toBe(true);
            expect(signatures.length).toBe(2);
        });

        it('should handle empty array', async () => {
            const config: TransactionSignerConfig = {
                wallet: mockWallet,
                account: mockAccount,
            };

            const signer = createTransactionSigner(config)!;
            const signatures = await signer.signAndSendTransactions([]);

            expect(signatures).toEqual([]);
        });
    });

    describe('signMessage', () => {
        it('should sign a message if supported', async () => {
            // Update mock to return signature format (not signedMessage)
            const updatedWallet = {
                ...mockWallet,
                features: {
                    ...mockWallet.features,
                    'solana:signMessage': {
                        signMessage: vi.fn().mockResolvedValue({
                            signature: new Uint8Array([20, 21, 22]),
                        }),
                    },
                },
            } as unknown as WalletStandardWallet;

            const config: TransactionSignerConfig = {
                wallet: updatedWallet,
                account: mockAccount,
            };

            const signer = createTransactionSigner(config)!;
            const message = new Uint8Array([1, 2, 3]);

            const signature = await signer.signMessage!(message);

            expect(signature).toBeDefined();
            expect(signature).toBeInstanceOf(Uint8Array);
            expect(updatedWallet.features['solana:signMessage'].signMessage).toHaveBeenCalled();
        });

        it('should be undefined if message signing not supported', () => {
            const walletWithoutMessage = {
                ...mockWallet,
                features: {
                    'solana:signTransaction': mockWallet.features['solana:signTransaction'],
                },
            } as unknown as WalletStandardWallet;

            const config: TransactionSignerConfig = {
                wallet: walletWithoutMessage,
                account: mockAccount,
            };

            const signer = createTransactionSigner(config)!;

            expect(signer.signMessage).toBeUndefined();
        });
    });

    describe('TransactionSignerError', () => {
        it('should create error with message and code', () => {
            const error = new TransactionSignerError('Test message', 'SIGNING_FAILED');

            expect(error.code).toBe('SIGNING_FAILED');
            expect(error.message).toBe('Test message');
            expect(error.name).toBe('TransactionSignerError');
        });

        it('should be instance of Error', () => {
            const error = new TransactionSignerError('Test message', 'SIGNING_FAILED');

            expect(error).toBeInstanceOf(Error);
            expect(error).toBeInstanceOf(TransactionSignerError);
        });

        it('should accept originalError parameter', () => {
            const originalError = new Error('Original');
            // TransactionSignerError constructor accepts originalError
            expect(() => {
                new TransactionSignerError('Test message', 'SIGNING_FAILED', originalError);
            }).not.toThrow();
        });
    });

    describe('isTransactionSignerError', () => {
        it('should return true for TransactionSignerError', () => {
            const error = new TransactionSignerError('Test message', 'SIGNING_FAILED');

            expect(isTransactionSignerError(error)).toBe(true);
        });

        it('should return false for regular Error', () => {
            const error = new Error('Test message');

            expect(isTransactionSignerError(error)).toBe(false);
        });

        it('should return false for non-errors', () => {
            expect(isTransactionSignerError(null)).toBe(false);
            expect(isTransactionSignerError(undefined)).toBe(false);
            expect(isTransactionSignerError('string')).toBe(false);
            expect(isTransactionSignerError(123)).toBe(false);
            expect(isTransactionSignerError({})).toBe(false);
        });
    });

    describe('error scenarios', () => {
        it('should handle wallet rejection', async () => {
            const walletWithRejection = {
                ...mockWallet,
                features: {
                    'solana:signTransaction': {
                        signTransaction: vi.fn().mockRejectedValue(new Error('User rejected')),
                    },
                },
            } as unknown as WalletStandardWallet;

            const config: TransactionSignerConfig = {
                wallet: walletWithRejection,
                account: mockAccount,
            };

            const signer = createTransactionSigner(config)!;

            await expect(signer.signTransaction(mockTransaction)).rejects.toThrow();
        });

        it('should handle network errors', async () => {
            const walletWithNetworkError = {
                ...mockWallet,
                features: {
                    'solana:signAndSendTransaction': {
                        signAndSendTransaction: vi.fn().mockRejectedValue(new Error('Network error')),
                    },
                },
            } as unknown as WalletStandardWallet;

            const config: TransactionSignerConfig = {
                wallet: walletWithNetworkError,
                account: mockAccount,
            };

            const signer = createTransactionSigner(config)!;

            // Error gets wrapped with standard message
            await expect(signer.signAndSendTransaction(mockTransaction)).rejects.toThrow();
        });
    });

    describe('address property', () => {
        it('should expose wallet address', () => {
            const config: TransactionSignerConfig = {
                wallet: mockWallet,
                account: mockAccount,
            };

            const signer = createTransactionSigner(config)!;

            expect(signer.address).toBe(mockAccount.address);
        });

        it('should be defined as readonly in TypeScript', () => {
            const config: TransactionSignerConfig = {
                wallet: mockWallet,
                account: mockAccount,
            };

            const signer = createTransactionSigner(config)!;

            // Type system enforces readonly, but runtime JS doesn't throw
            // This test verifies the address property exists and is correct
            expect(signer.address).toBeDefined();
            expect(typeof signer.address).toBe('string');
        });
    });
});
