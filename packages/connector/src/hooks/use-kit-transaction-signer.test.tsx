import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import type { SolanaCluster } from '@wallet-ui/core';
import {
    AccountRole,
    address,
    appendTransactionMessageInstruction,
    blockhash,
    compileTransaction,
    createTransactionMessage,
    generateKeyPair,
    getAddressFromPublicKey,
    getTransactionDecoder,
    getTransactionEncoder,
    partiallySignTransaction,
    pipe,
    setTransactionMessageConfig,
    setTransactionMessageFeePayer,
    setTransactionMessageLifetimeUsingBlockhash,
    verifySignature,
} from '@solana/kit';
import { useKitTransactionSigner, useGillTransactionSigner } from './use-kit-transaction-signer';
import { ConnectorProvider, useConnector } from '../ui/connector-provider';
import { createMockPhantomWallet } from '../__tests__/mocks/wallet-standard-mock';
import { createMockWalletAccount, TEST_ADDRESSES } from '../__tests__/fixtures/accounts';
import type { ReactNode } from 'react';

vi.mock('../ui/connector-provider', async importOriginal => {
    const actual = await importOriginal<typeof import('../ui/connector-provider')>();
    return { ...actual, useConnector: vi.fn() };
});

function connectorState(cluster: SolanaCluster | null, overrides: Record<string, unknown> = {}) {
    const account = createMockWalletAccount(TEST_ADDRESSES.ACCOUNT_1, {
        chains: ['solana:mainnet', 'solana:devnet', 'solana:testnet'],
        features: ['solana:signTransaction'],
    });
    const wallet = createMockPhantomWallet({ accounts: [account], features: ['solana:signTransaction'] });
    return {
        connected: true,
        selectedWallet: wallet,
        selectedAccount: TEST_ADDRESSES.ACCOUNT_1,
        accounts: [{ address: TEST_ADDRESSES.ACCOUNT_1, raw: account }],
        cluster,
        ...overrides,
    } as unknown as ReturnType<typeof useConnector>;
}

const DEVNET_CLUSTER = {
    id: 'solana:devnet',
    label: 'Devnet',
    url: 'https://api.devnet.solana.com',
} as SolanaCluster;

/**
 * Connector state around a wallet that really signs: it decodes the wire
 * bytes with kit's codec, signs the message with its own key, and re-encodes,
 * filling only its own signature slot. Any failure therefore comes from the
 * connector's signer path, not the wallet.
 */
async function signingConnectorState() {
    const keyPair = await generateKeyPair();
    const walletAddress = await getAddressFromPublicKey(keyPair.publicKey);
    const received: Uint8Array[] = [];

    const account = createMockWalletAccount(walletAddress, {
        chains: ['solana:devnet'],
        features: ['solana:signTransaction'],
    });
    const wallet = createMockPhantomWallet({ accounts: [account], features: ['solana:signTransaction'] });
    (wallet.features as Record<string, unknown>)['solana:signTransaction'] = {
        version: '1.0.0',
        supportedTransactionVersions: ['legacy', 0, 1],
        signTransaction: (...inputs: { transaction: Uint8Array }[]) =>
            Promise.all(
                inputs.map(async ({ transaction }) => {
                    received.push(transaction);
                    const signed = await partiallySignTransaction(
                        [keyPair],
                        getTransactionDecoder().decode(transaction),
                    );
                    return { signedTransaction: new Uint8Array(getTransactionEncoder().encode(signed)) };
                }),
            ),
    };

    const state = {
        connected: true,
        selectedWallet: wallet,
        selectedAccount: walletAddress,
        accounts: [{ address: walletAddress, raw: account }],
        cluster: DEVNET_CLUSTER,
    } as unknown as ReturnType<typeof useConnector>;

    return { keyPair, received, state, walletAddress };
}

function compileV1Transaction(feePayer: string, options: { dataBytes?: number; signer?: string } = {}) {
    const message = pipe(
        createTransactionMessage({ version: 1 }),
        m => setTransactionMessageFeePayer(address(feePayer), m),
        m =>
            setTransactionMessageLifetimeUsingBlockhash(
                { blockhash: blockhash('GfVcyD4kkTrj4bKc7WA9sZCin9JDbdT4Zkd3EittNR1W'), lastValidBlockHeight: 0n },
                m,
            ),
        m =>
            appendTransactionMessageInstruction(
                {
                    accounts: options.signer
                        ? [{ address: address(options.signer), role: AccountRole.READONLY_SIGNER }]
                        : [],
                    data: new Uint8Array(options.dataBytes ?? 0).fill(1),
                    programAddress: address('MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr'),
                },
                m,
            ),
        m =>
            setTransactionMessageConfig(
                { computeUnitLimit: 200_000, loadedAccountsDataSizeLimit: 1_024, priorityFeeLamports: 5_000n },
                m,
            ),
    );
    return compileTransaction(message);
}

describe('useKitTransactionSigner', () => {
    const mockConfig = {
        clusters: [{ id: 'solana:devnet', name: 'Devnet', rpcUrl: 'https://api.devnet.solana.com' }],
    };

    const wrapper = ({ children }: { children: ReactNode }) => (
        <ConnectorProvider config={mockConfig}>{children}</ConnectorProvider>
    );

    beforeEach(() => {
        vi.mocked(useConnector).mockReset();
    });

    it.skip('should return signer and ready status', () => {
        const { result } = renderHook(() => useKitTransactionSigner(), { wrapper });

        expect(result.current).toHaveProperty('signer');
        expect(result.current).toHaveProperty('ready');
        expect(typeof result.current.ready).toBe('boolean');
    });

    it.skip('should return null signer when not ready (no wallet connected)', () => {
        const { result } = renderHook(() => useKitTransactionSigner(), { wrapper });

        expect(result.current.signer).toBeNull();
        expect(result.current.ready).toBe(false);
    });

    describe('chain derivation', () => {
        it('builds a signer for the solana:mainnet-beta cluster id', () => {
            vi.mocked(useConnector).mockReturnValue(
                connectorState({ id: 'solana:mainnet-beta', label: 'Mainnet', url: 'https://rpc.example.com' }),
            );

            const { result } = renderHook(() => useKitTransactionSigner());

            expect(result.current.signer).not.toBeNull();
            expect(result.current.ready).toBe(true);
            expect(result.current.reason).toBeNull();
        });

        it('reports unsupported-chain for a custom cluster instead of silently disabling', () => {
            vi.mocked(useConnector).mockReturnValue(
                connectorState({ id: 'solana:my-fork', label: 'Fork', url: 'https://rpc.example.com' }),
            );

            const { result } = renderHook(() => useKitTransactionSigner());

            expect(result.current.signer).toBeNull();
            expect(result.current.ready).toBe(false);
            expect(result.current.reason).toBe('unsupported-chain');
        });

        it('builds a signer for a custom cluster with an explicit chain override', () => {
            vi.mocked(useConnector).mockReturnValue(
                connectorState({ id: 'solana:my-fork', label: 'Fork', url: 'https://rpc.example.com' }),
            );

            const { result } = renderHook(() => useKitTransactionSigner({ chain: 'solana:mainnet' }));

            expect(result.current.signer).not.toBeNull();
            expect(result.current.reason).toBeNull();
        });

        it('reports disconnected when no wallet is connected', () => {
            vi.mocked(useConnector).mockReturnValue(
                connectorState(
                    { id: 'solana:devnet', label: 'Devnet', url: 'https://api.devnet.solana.com' },
                    {
                        connected: false,
                        selectedWallet: null,
                        accounts: [],
                        selectedAccount: null,
                    },
                ),
            );

            const { result } = renderHook(() => useKitTransactionSigner());

            expect(result.current.signer).toBeNull();
            expect(result.current.reason).toBe('disconnected');
        });
    });

    describe('version 1 (SIMD-0296) signing', () => {
        it('signs a v1 transaction above the legacy 1232-byte limit', async () => {
            const { keyPair, received, state, walletAddress } = await signingConnectorState();
            vi.mocked(useConnector).mockReturnValue(state);
            const { result } = renderHook(() => useKitTransactionSigner());
            const transaction = compileV1Transaction(walletAddress, { dataBytes: 1500 });

            const [signed] = await result.current.signer!.modifyAndSignTransactions([transaction]);

            // The wallet received the v1 wire layout: discriminator first,
            // signatures at the tail.
            expect(received).toHaveLength(1);
            expect(received[0][0]).toBe(0x81);
            expect(received[0].length).toBeGreaterThan(1232);

            expect(signed.messageBytes).toEqual(transaction.messageBytes);
            const signature = signed.signatures[walletAddress];
            expect(signature).toBeTruthy();
            expect(await verifySignature(keyPair.publicKey, signature!, signed.messageBytes)).toBe(true);
        });

        it("binds the wallet's signature to its own slot when it is not the fee payer", async () => {
            const { keyPair, state, walletAddress } = await signingConnectorState();
            vi.mocked(useConnector).mockReturnValue(state);
            const { result } = renderHook(() => useKitTransactionSigner());
            const feePayer = address(TEST_ADDRESSES.ACCOUNT_2);
            const transaction = compileV1Transaction(feePayer, { signer: walletAddress });

            const [signed] = await result.current.signer!.modifyAndSignTransactions([transaction]);

            // Slot 0 belongs to the fee payer and stays empty; the wallet's
            // signature lands under the wallet's address.
            expect(Object.keys(signed.signatures)).toEqual([feePayer, walletAddress]);
            expect(signed.signatures[feePayer]).toBeNull();
            const signature = signed.signatures[walletAddress];
            expect(signature).toBeTruthy();
            expect(await verifySignature(keyPair.publicKey, signature!, signed.messageBytes)).toBe(true);
        });
    });

    describe('useGillTransactionSigner (deprecated alias)', () => {
        it('should be an alias to useKitTransactionSigner', () => {
            expect(useGillTransactionSigner).toBe(useKitTransactionSigner);
        });
    });
});
