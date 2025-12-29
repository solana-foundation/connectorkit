/**
 * Tests for WalletConnect Wallet Standard Shim
 *
 * Tests the wallet shim using mocked transport (no real WalletConnect network)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createWalletConnectWallet } from './create-walletconnect-wallet';
import type { WalletConnectConfig, WalletConnectTransport } from '../../../types/walletconnect';
import { getBase58Encoder } from '@solana/codecs';

/**
 * Create a mock transport for testing purposes
 */
function createMockWalletConnectTransport(
    mockImplementation: Partial<WalletConnectTransport> = {},
): WalletConnectTransport {
    let connected = false;

    const defaultTransport: WalletConnectTransport = {
        async connect(): Promise<void> {
            connected = true;
        },
        async disconnect(): Promise<void> {
            connected = false;
        },
        async request<T = unknown>(): Promise<T> {
            throw new Error('Mock transport: request not implemented');
        },
        isConnected(): boolean {
            return connected;
        },
    };

    return {
        ...defaultTransport,
        ...mockImplementation,
    };
}

// Test fixtures
const TEST_PUBKEY = 'HMJfh9P8FEF5eVHp3XypYWThUYCQ9sWNZZQQxVP2jjr1';
const TEST_PUBKEY_2 = 'BPFLoaderUpgradeab1e11111111111111111111111';
const TEST_SIGNATURE = '2Lb1KQHWfbV3pWMqXZveFWqneSyhH95YsgCENRWnArSkLydjN1M42oB82zSd6BBdGkM9pE6sQLQf1gyBh8KWM2c4';

// Create a minimal valid config
function createTestConfig(overrides: Partial<WalletConnectConfig> = {}): WalletConnectConfig {
    return {
        enabled: true,
        projectId: 'test-project-id',
        metadata: {
            name: 'Test App',
            description: 'Test Description',
            url: 'https://test.com',
            icons: ['https://test.com/icon.png'],
        },
        ...overrides,
    };
}

describe('createWalletConnectWallet', () => {
    let config: WalletConnectConfig;
    let mockTransport: WalletConnectTransport;

    beforeEach(() => {
        config = createTestConfig();
        mockTransport = createMockWalletConnectTransport();
    });

    describe('wallet properties', () => {
        it('should create a wallet with correct basic properties', () => {
            const wallet = createWalletConnectWallet(config, mockTransport);

            expect(wallet.version).toBe('1.0.0');
            expect(wallet.name).toBe('WalletConnect');
            expect(wallet.icon).toBeDefined();
            expect(wallet.icon.startsWith('data:image/')).toBe(true);
        });

        it('should support default Solana chains', () => {
            const wallet = createWalletConnectWallet(config, mockTransport);

            expect(wallet.chains).toContain('solana:mainnet');
            expect(wallet.chains).toContain('solana:devnet');
            expect(wallet.chains).toContain('solana:testnet');
        });

        it('should use custom chain when defaultChain is specified', () => {
            config.defaultChain = 'solana:devnet';
            const wallet = createWalletConnectWallet(config, mockTransport);

            expect(wallet.chains).toContain('solana:devnet');
        });

        it('should have required Wallet Standard features', () => {
            const wallet = createWalletConnectWallet(config, mockTransport);

            expect(wallet.features['standard:connect']).toBeDefined();
            expect(wallet.features['standard:disconnect']).toBeDefined();
            expect(wallet.features['standard:events']).toBeDefined();
            expect(wallet.features['solana:signMessage']).toBeDefined();
            expect(wallet.features['solana:signTransaction']).toBeDefined();
            expect(wallet.features['solana:signAllTransactions']).toBeDefined();
            expect(wallet.features['solana:signAndSendTransaction']).toBeDefined();
        });
    });

    describe('standard:connect', () => {
        it('should connect and return accounts', async () => {
            const requestMock = vi.fn().mockResolvedValue([{ pubkey: TEST_PUBKEY }]);
            mockTransport = createMockWalletConnectTransport({ request: requestMock });
            const wallet = createWalletConnectWallet(config, mockTransport);

            const connectFeature = wallet.features['standard:connect'] as {
                connect: (input?: { silent?: boolean }) => Promise<{ accounts: unknown[] }>;
            };

            const result = await connectFeature.connect();

            expect(result.accounts).toHaveLength(1);
            expect(result.accounts[0]).toMatchObject({
                address: TEST_PUBKEY,
            });
        });

        it('should use solana_getAccounts for silent connect', async () => {
            const requestMock = vi.fn().mockResolvedValue([{ pubkey: TEST_PUBKEY }]);
            mockTransport = createMockWalletConnectTransport({ request: requestMock });
            const wallet = createWalletConnectWallet(config, mockTransport);

            const connectFeature = wallet.features['standard:connect'] as {
                connect: (input?: { silent?: boolean }) => Promise<{ accounts: unknown[] }>;
            };

            await connectFeature.connect({ silent: true });

            expect(requestMock).toHaveBeenCalledWith(
                expect.objectContaining({
                    method: 'solana_getAccounts',
                }),
            );
        });

        it('should use solana_requestAccounts for non-silent connect', async () => {
            const requestMock = vi.fn().mockResolvedValue([{ pubkey: TEST_PUBKEY }]);
            mockTransport = createMockWalletConnectTransport({ request: requestMock });
            const wallet = createWalletConnectWallet(config, mockTransport);

            const connectFeature = wallet.features['standard:connect'] as {
                connect: (input?: { silent?: boolean }) => Promise<{ accounts: unknown[] }>;
            };

            await connectFeature.connect({ silent: false });

            expect(requestMock).toHaveBeenCalledWith(
                expect.objectContaining({
                    method: 'solana_requestAccounts',
                }),
            );
        });

        it('should fallback to requestAccounts if getAccounts fails', async () => {
            let callCount = 0;
            const requestMock = vi.fn().mockImplementation(async args => {
                callCount++;
                if (args.method === 'solana_getAccounts') {
                    throw new Error('No session');
                }
                return [{ pubkey: TEST_PUBKEY }];
            });
            mockTransport = createMockWalletConnectTransport({ request: requestMock });
            const wallet = createWalletConnectWallet(config, mockTransport);

            const connectFeature = wallet.features['standard:connect'] as {
                connect: (input?: { silent?: boolean }) => Promise<{ accounts: unknown[] }>;
            };

            const result = await connectFeature.connect({ silent: true });

            expect(callCount).toBe(2);
            expect(result.accounts).toHaveLength(1);
        });

        it('should handle multiple accounts', async () => {
            const requestMock = vi.fn().mockResolvedValue([{ pubkey: TEST_PUBKEY }, { pubkey: TEST_PUBKEY_2 }]);
            mockTransport = createMockWalletConnectTransport({ request: requestMock });
            const wallet = createWalletConnectWallet(config, mockTransport);

            const connectFeature = wallet.features['standard:connect'] as {
                connect: () => Promise<{ accounts: unknown[] }>;
            };

            const result = await connectFeature.connect();

            expect(result.accounts).toHaveLength(2);
        });
    });

    describe('standard:disconnect', () => {
        it('should disconnect and clear accounts', async () => {
            const disconnectMock = vi.fn();
            const requestMock = vi.fn().mockResolvedValue([{ pubkey: TEST_PUBKEY }]);
            mockTransport = createMockWalletConnectTransport({
                disconnect: disconnectMock,
                request: requestMock,
            });
            const wallet = createWalletConnectWallet(config, mockTransport);

            // First connect
            const connectFeature = wallet.features['standard:connect'] as {
                connect: () => Promise<{ accounts: unknown[] }>;
            };
            await connectFeature.connect();

            // Then disconnect
            const disconnectFeature = wallet.features['standard:disconnect'] as {
                disconnect: () => Promise<void>;
            };
            await disconnectFeature.disconnect();

            expect(disconnectMock).toHaveBeenCalled();
        });
    });

    describe('standard:events', () => {
        it('should emit change events when accounts change', async () => {
            const requestMock = vi.fn().mockResolvedValue([{ pubkey: TEST_PUBKEY }]);
            mockTransport = createMockWalletConnectTransport({ request: requestMock });
            const wallet = createWalletConnectWallet(config, mockTransport);

            const eventsFeature = wallet.features['standard:events'] as {
                on: (event: string, listener: (props: unknown) => void) => () => void;
            };

            const listener = vi.fn();
            eventsFeature.on('change', listener);

            // Connect should trigger a change event
            const connectFeature = wallet.features['standard:connect'] as {
                connect: () => Promise<{ accounts: unknown[] }>;
            };
            await connectFeature.connect();

            expect(listener).toHaveBeenCalled();
        });

        it('should return unsubscribe function', () => {
            const wallet = createWalletConnectWallet(config, mockTransport);

            const eventsFeature = wallet.features['standard:events'] as {
                on: (event: string, listener: () => void) => () => void;
            };

            const unsubscribe = eventsFeature.on('change', vi.fn());

            expect(typeof unsubscribe).toBe('function');
        });
    });

    describe('solana:signMessage', () => {
        it('should sign a message and return signature bytes', async () => {
            const requestMock = vi.fn().mockResolvedValue({ signature: TEST_SIGNATURE });
            mockTransport = createMockWalletConnectTransport({ request: requestMock });
            const wallet = createWalletConnectWallet(config, mockTransport);

            const signMessageFeature = wallet.features['solana:signMessage'] as {
                signMessage: (args: { account: { address: string }; message: Uint8Array }) => Promise<
                    { signature: Uint8Array; signedMessage: Uint8Array }[]
                >;
            };

            const message = new Uint8Array([1, 2, 3, 4, 5]);
            const result = await signMessageFeature.signMessage({
                account: { address: TEST_PUBKEY },
                message,
            });

            expect(result).toHaveLength(1);
            expect(result[0].signature).toBeInstanceOf(Uint8Array);
            expect(result[0].signedMessage).toEqual(message);
        });

        it('should send message as base58 to WalletConnect', async () => {
            const requestMock = vi.fn().mockResolvedValue({ signature: TEST_SIGNATURE });
            mockTransport = createMockWalletConnectTransport({ request: requestMock });
            const wallet = createWalletConnectWallet(config, mockTransport);

            const signMessageFeature = wallet.features['solana:signMessage'] as {
                signMessage: (args: { account: { address: string }; message: Uint8Array }) => Promise<unknown>;
            };

            const message = new Uint8Array([1, 2, 3, 4, 5]);
            await signMessageFeature.signMessage({
                account: { address: TEST_PUBKEY },
                message,
            });

            expect(requestMock).toHaveBeenCalledWith(
                expect.objectContaining({
                    method: 'solana_signMessage',
                    params: expect.objectContaining({
                        pubkey: TEST_PUBKEY,
                        // Message should be base58 encoded
                        message: expect.any(String),
                    }),
                }),
            );
        });
    });

    describe('solana:signTransaction', () => {
        // Create a minimal valid serialized transaction for testing
        // This is a simplified mock - real transactions would have proper structure
        function createMockTransaction(): Uint8Array {
            // shortvec(1 signature) + 64 zeros for signature + minimal message
            const tx = new Uint8Array(150);
            tx[0] = 1; // 1 signature required
            // Skip 64 bytes for signature slot
            // Message header at offset 65
            tx[65] = 1; // num required signatures
            tx[66] = 0; // num readonly signed
            tx[67] = 0; // num readonly unsigned
            // shortvec for accounts array
            tx[68] = 1; // 1 account
            // Account pubkey (32 bytes) - use TEST_PUBKEY bytes
            const pubkeyBytes = getBase58Encoder().encode(TEST_PUBKEY);
            tx.set(pubkeyBytes, 69);
            return tx;
        }

        it('should sign transaction when wallet returns full signed transaction', async () => {
            const mockTx = createMockTransaction();
            const signedTxBase64 = btoa(String.fromCharCode(...mockTx));

            const requestMock = vi.fn().mockResolvedValue({
                signature: TEST_SIGNATURE,
                transaction: signedTxBase64,
            });
            mockTransport = createMockWalletConnectTransport({ request: requestMock });
            const wallet = createWalletConnectWallet(config, mockTransport);

            const signTxFeature = wallet.features['solana:signTransaction'] as {
                signTransaction: (args: {
                    account: { address: string };
                    transaction: Uint8Array;
                }) => Promise<{ signedTransaction: Uint8Array }[]>;
            };

            const result = await signTxFeature.signTransaction({
                account: { address: TEST_PUBKEY },
                transaction: mockTx,
            });

            expect(result).toHaveLength(1);
            expect(result[0].signedTransaction).toBeInstanceOf(Uint8Array);
        });

        it('should inject signature when wallet returns only signature', async () => {
            const mockTx = createMockTransaction();

            const requestMock = vi.fn().mockResolvedValue({
                signature: TEST_SIGNATURE,
                // No transaction field - only signature
            });
            mockTransport = createMockWalletConnectTransport({ request: requestMock });
            const wallet = createWalletConnectWallet(config, mockTransport);

            const signTxFeature = wallet.features['solana:signTransaction'] as {
                signTransaction: (args: {
                    account: { address: string };
                    transaction: Uint8Array;
                }) => Promise<{ signedTransaction: Uint8Array }[]>;
            };

            const result = await signTxFeature.signTransaction({
                account: { address: TEST_PUBKEY },
                transaction: mockTx,
            });

            expect(result).toHaveLength(1);
            expect(result[0].signedTransaction).toBeInstanceOf(Uint8Array);
            // The signed transaction should have the signature injected
            expect(result[0].signedTransaction.length).toBe(mockTx.length);
        });

        it('should send transaction as base64 to WalletConnect', async () => {
            const mockTx = createMockTransaction();
            const requestMock = vi.fn().mockResolvedValue({
                signature: TEST_SIGNATURE,
                transaction: btoa(String.fromCharCode(...mockTx)),
            });
            mockTransport = createMockWalletConnectTransport({ request: requestMock });
            const wallet = createWalletConnectWallet(config, mockTransport);

            const signTxFeature = wallet.features['solana:signTransaction'] as {
                signTransaction: (args: {
                    account: { address: string };
                    transaction: Uint8Array;
                }) => Promise<unknown>;
            };

            await signTxFeature.signTransaction({
                account: { address: TEST_PUBKEY },
                transaction: mockTx,
            });

            expect(requestMock).toHaveBeenCalledWith(
                expect.objectContaining({
                    method: 'solana_signTransaction',
                    params: expect.objectContaining({
                        transaction: expect.any(String), // base64
                    }),
                }),
            );
        });
    });

    describe('solana:signAllTransactions', () => {
        function createMockTransaction(): Uint8Array {
            const tx = new Uint8Array(150);
            tx[0] = 1;
            tx[65] = 1;
            tx[66] = 0;
            tx[67] = 0;
            tx[68] = 1;
            const pubkeyBytes = getBase58Encoder().encode(TEST_PUBKEY);
            tx.set(pubkeyBytes, 69);
            return tx;
        }

        it('should sign multiple transactions', async () => {
            const mockTx1 = createMockTransaction();
            const mockTx2 = createMockTransaction();

            const signedTx1Base64 = btoa(String.fromCharCode(...mockTx1));
            const signedTx2Base64 = btoa(String.fromCharCode(...mockTx2));

            const requestMock = vi.fn().mockResolvedValue({
                transactions: [signedTx1Base64, signedTx2Base64],
            });
            mockTransport = createMockWalletConnectTransport({ request: requestMock });
            const wallet = createWalletConnectWallet(config, mockTransport);

            const signAllFeature = wallet.features['solana:signAllTransactions'] as {
                signAllTransactions: (args: {
                    account: { address: string };
                    transactions: Uint8Array[];
                }) => Promise<{ signedTransaction: Uint8Array }[]>;
            };

            const result = await signAllFeature.signAllTransactions({
                account: { address: TEST_PUBKEY },
                transactions: [mockTx1, mockTx2],
            });

            expect(result).toHaveLength(2);
            expect(result[0].signedTransaction).toBeInstanceOf(Uint8Array);
            expect(result[1].signedTransaction).toBeInstanceOf(Uint8Array);
        });

        it('should maintain transaction order', async () => {
            const mockTx1 = createMockTransaction();
            mockTx1[1] = 1; // Mark tx1
            const mockTx2 = createMockTransaction();
            mockTx2[1] = 2; // Mark tx2

            const signedTx1Base64 = btoa(String.fromCharCode(...mockTx1));
            const signedTx2Base64 = btoa(String.fromCharCode(...mockTx2));

            const requestMock = vi.fn().mockResolvedValue({
                transactions: [signedTx1Base64, signedTx2Base64],
            });
            mockTransport = createMockWalletConnectTransport({ request: requestMock });
            const wallet = createWalletConnectWallet(config, mockTransport);

            const signAllFeature = wallet.features['solana:signAllTransactions'] as {
                signAllTransactions: (args: {
                    account: { address: string };
                    transactions: Uint8Array[];
                }) => Promise<{ signedTransaction: Uint8Array }[]>;
            };

            const result = await signAllFeature.signAllTransactions({
                account: { address: TEST_PUBKEY },
                transactions: [mockTx1, mockTx2],
            });

            // Verify order is maintained
            expect(result[0].signedTransaction[1]).toBe(1);
            expect(result[1].signedTransaction[1]).toBe(2);
        });
    });

    describe('solana:signAndSendTransaction', () => {
        function createMockTransaction(): Uint8Array {
            const tx = new Uint8Array(150);
            tx[0] = 1;
            tx[65] = 1;
            tx[66] = 0;
            tx[67] = 0;
            tx[68] = 1;
            const pubkeyBytes = getBase58Encoder().encode(TEST_PUBKEY);
            tx.set(pubkeyBytes, 69);
            return tx;
        }

        it('should sign and send transaction, returning signature', async () => {
            const requestMock = vi.fn().mockResolvedValue({
                signature: TEST_SIGNATURE,
            });
            mockTransport = createMockWalletConnectTransport({ request: requestMock });
            const wallet = createWalletConnectWallet(config, mockTransport);

            const signAndSendFeature = wallet.features['solana:signAndSendTransaction'] as {
                signAndSendTransaction: (args: {
                    account: { address: string };
                    transaction: Uint8Array;
                    options?: { skipPreflight?: boolean };
                }) => Promise<{ signature: Uint8Array }[]>;
            };

            const mockTx = createMockTransaction();
            const result = await signAndSendFeature.signAndSendTransaction({
                account: { address: TEST_PUBKEY },
                transaction: mockTx,
            });

            expect(result).toHaveLength(1);
            expect(result[0].signature).toBeInstanceOf(Uint8Array);
        });

        it('should pass send options to WalletConnect', async () => {
            const requestMock = vi.fn().mockResolvedValue({
                signature: TEST_SIGNATURE,
            });
            mockTransport = createMockWalletConnectTransport({ request: requestMock });
            const wallet = createWalletConnectWallet(config, mockTransport);

            const signAndSendFeature = wallet.features['solana:signAndSendTransaction'] as {
                signAndSendTransaction: (args: {
                    account: { address: string };
                    transaction: Uint8Array;
                    options?: { skipPreflight?: boolean; maxRetries?: number };
                }) => Promise<unknown>;
            };

            const mockTx = createMockTransaction();
            await signAndSendFeature.signAndSendTransaction({
                account: { address: TEST_PUBKEY },
                transaction: mockTx,
                options: { skipPreflight: true, maxRetries: 3 },
            });

            expect(requestMock).toHaveBeenCalledWith(
                expect.objectContaining({
                    method: 'solana_signAndSendTransaction',
                    params: expect.objectContaining({
                        sendOptions: expect.objectContaining({
                            skipPreflight: true,
                            maxRetries: 3,
                        }),
                    }),
                }),
            );
        });
    });
});
