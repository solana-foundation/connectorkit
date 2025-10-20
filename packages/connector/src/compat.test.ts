/**
 * Tests for Wallet Adapter Compatibility layer (compat.ts)
 *
 * Verifies the compatibility bridge with @solana/wallet-adapter interface
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createWalletAdapterCompat, useWalletAdapterCompat } from './compat';
import type { TransactionSigner } from './lib/transaction/transaction-signer';

describe('Wallet Adapter Compatibility (compat.ts)', () => {
    describe('exports', () => {
        it('should export createWalletAdapterCompat function', () => {
            expect(createWalletAdapterCompat).toBeDefined();
            expect(typeof createWalletAdapterCompat).toBe('function');
        });

        it('should export useWalletAdapterCompat hook', () => {
            expect(useWalletAdapterCompat).toBeDefined();
            expect(typeof useWalletAdapterCompat).toBe('function');
        });
    });

    describe('createWalletAdapterCompat', () => {
        let mockSigner: TransactionSigner;
        let mockDisconnect: ReturnType<typeof vi.fn>;

        beforeEach(() => {
            mockDisconnect = vi.fn().mockResolvedValue(undefined);
            mockSigner = {
                address: 'TestAddress123',
                signTransaction: vi.fn(),
                signAllTransactions: vi.fn(),
                signAndSendTransaction: vi.fn(),
                signMessage: vi.fn(),
            } as unknown as TransactionSigner;
        });

        describe('with connected signer', () => {
            it('should create adapter with connected state', () => {
                const adapter = createWalletAdapterCompat(mockSigner, {
                    disconnect: mockDisconnect,
                });

                expect(adapter.connected).toBe(true);
                expect(adapter.publicKey).toBe('TestAddress123');
                expect(adapter.connecting).toBe(false);
                expect(adapter.disconnecting).toBe(false);
            });

            it('should expose signTransaction method', () => {
                const adapter = createWalletAdapterCompat(mockSigner, {
                    disconnect: mockDisconnect,
                });

                expect(adapter.signTransaction).toBeDefined();
                expect(typeof adapter.signTransaction).toBe('function');
            });

            it('should expose signAllTransactions method', () => {
                const adapter = createWalletAdapterCompat(mockSigner, {
                    disconnect: mockDisconnect,
                });

                expect(adapter.signAllTransactions).toBeDefined();
                expect(typeof adapter.signAllTransactions).toBe('function');
            });

            it('should expose sendTransaction method', () => {
                const adapter = createWalletAdapterCompat(mockSigner, {
                    disconnect: mockDisconnect,
                });

                expect(adapter.sendTransaction).toBeDefined();
                expect(typeof adapter.sendTransaction).toBe('function');
            });

            it('should expose connect method', () => {
                const adapter = createWalletAdapterCompat(mockSigner, {
                    disconnect: mockDisconnect,
                });

                expect(adapter.connect).toBeDefined();
                expect(typeof adapter.connect).toBe('function');
            });

            it('should expose disconnect method', () => {
                const adapter = createWalletAdapterCompat(mockSigner, {
                    disconnect: mockDisconnect,
                });

                expect(adapter.disconnect).toBeDefined();
                expect(typeof adapter.disconnect).toBe('function');
            });

            it('should optionally expose signMessage method', () => {
                const adapter = createWalletAdapterCompat(mockSigner, {
                    disconnect: mockDisconnect,
                });

                expect(adapter.signMessage).toBeDefined();
                expect(typeof adapter.signMessage).toBe('function');
            });
        });

        describe('with null signer', () => {
            it('should create adapter with disconnected state', () => {
                const adapter = createWalletAdapterCompat(null, {
                    disconnect: mockDisconnect,
                });

                expect(adapter.connected).toBe(false);
                expect(adapter.publicKey).toBe(null);
                expect(adapter.connecting).toBe(false);
                expect(adapter.disconnecting).toBe(false);
            });

            it('should have all required methods even when disconnected', () => {
                const adapter = createWalletAdapterCompat(null, {
                    disconnect: mockDisconnect,
                });

                expect(adapter.signTransaction).toBeDefined();
                expect(adapter.signAllTransactions).toBeDefined();
                expect(adapter.sendTransaction).toBeDefined();
                expect(adapter.connect).toBeDefined();
                expect(adapter.disconnect).toBeDefined();
            });
        });

        describe('with custom options', () => {
            it('should accept transformTransaction option', () => {
                const transformTransaction = vi.fn(tx => tx);

                const adapter = createWalletAdapterCompat(mockSigner, {
                    disconnect: mockDisconnect,
                    transformTransaction,
                });

                expect(adapter).toBeDefined();
                expect(adapter.connected).toBe(true);
            });

            it('should accept onError option', () => {
                const onError = vi.fn();

                const adapter = createWalletAdapterCompat(mockSigner, {
                    disconnect: mockDisconnect,
                    onError,
                });

                expect(adapter).toBeDefined();
                expect(adapter.connected).toBe(true);
            });
        });

        describe('interface compatibility', () => {
            it('should match WalletAdapterCompatible interface', () => {
                const adapter = createWalletAdapterCompat(mockSigner, {
                    disconnect: mockDisconnect,
                });

                // Verify all required interface properties exist
                const requiredProps = [
                    'publicKey',
                    'connected',
                    'connecting',
                    'disconnecting',
                    'signTransaction',
                    'signAllTransactions',
                    'sendTransaction',
                    'connect',
                    'disconnect',
                ];

                for (const prop of requiredProps) {
                    expect(adapter).toHaveProperty(prop);
                }
            });

            it('should be usable with Jupiter and other integrations', () => {
                const adapter = createWalletAdapterCompat(mockSigner, {
                    disconnect: mockDisconnect,
                });

                // Verify the adapter structure matches what Jupiter expects
                expect(adapter.publicKey).toBeDefined();
                expect(adapter.connected).toBe(true);
                expect(typeof adapter.signTransaction).toBe('function');
                expect(typeof adapter.sendTransaction).toBe('function');
            });
        });
    });

    describe('useWalletAdapterCompat hook', () => {
        it('should be a function (React hook)', () => {
            expect(typeof useWalletAdapterCompat).toBe('function');
        });

        // Note: Full hook testing requires React environment
        // This is tested in integration tests with actual React components
    });

    describe('no circular dependencies', () => {
        it('should import without errors', () => {
            // ESM modules are already imported at the top of this file
            // If there were circular dependencies, the import would fail
            expect(createWalletAdapterCompat).toBeDefined();
            expect(useWalletAdapterCompat).toBeDefined();
        });
    });

    describe('integration with connector-kit', () => {
        it('should work with connector-kit types', () => {
            // Verify that the compat layer properly types TransactionSigner
            const mockSigner = {
                address: 'TestAddress',
                signTransaction: vi.fn(),
                signAllTransactions: vi.fn(),
                signAndSendTransaction: vi.fn(),
            } as unknown as TransactionSigner;

            const adapter = createWalletAdapterCompat(mockSigner, {
                disconnect: vi.fn(),
            });

            expect(adapter.publicKey).toBe('TestAddress');
            expect(adapter.connected).toBe(true);
        });
    });
});
