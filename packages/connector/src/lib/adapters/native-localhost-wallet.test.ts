import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { WalletAccount } from '@wallet-standard/base';
import {
    createNativeLocalhostWallet,
    discoverNativeLocalhostWallet,
    resolveNativeLocalhostConfig,
    type NativeLocalhostDiscoverResponse,
} from './native-localhost-wallet';

const DISCOVERY: NativeLocalhostDiscoverResponse = {
    name: 'Native',
    version: '0.1.0',
    protocolVersion: '1',
    chains: ['solana:mainnet'],
    features: ['solana:signMessage', 'solana:signTransaction'],
};

function jsonResponse(data: unknown, ok = true, status = ok ? 200 : 500): Response {
    return {
        ok,
        status,
        json: vi.fn(async () => data),
    } as unknown as Response;
}

function bytes(length = 32): number[] {
    return Array.from({ length }, (_, index) => index);
}

function signatureBase64(): string {
    return Buffer.from(new Uint8Array([9, 8, 7, 6])).toString('base64');
}

function transactionBase64(): string {
    return Buffer.from(new Uint8Array([6, 7, 8, 9])).toString('base64');
}

describe('native localhost wallet adapter', () => {
    beforeEach(() => {
        vi.stubGlobal('fetch', vi.fn());
    });

    afterEach(() => {
        vi.useRealTimers();
        vi.unstubAllGlobals();
    });

    it('disabled config does not call fetch', async () => {
        await expect(discoverNativeLocalhostWallet()).resolves.toBeNull();
        expect(fetch).not.toHaveBeenCalled();
    });

    it('nativeLocalhost: true probes /v1/discover', async () => {
        vi.mocked(fetch).mockResolvedValueOnce(jsonResponse(DISCOVERY));

        const wallet = await discoverNativeLocalhostWallet(true);

        expect(wallet?.name).toBe('Native');
        expect(fetch).toHaveBeenCalledWith(
            'http://127.0.0.1:51884/v1/discover',
            expect.objectContaining({
                method: 'GET',
                credentials: 'omit',
            }),
        );
    });

    it('{ enabled: false } does not probe', async () => {
        await expect(discoverNativeLocalhostWallet({ enabled: false })).resolves.toBeNull();
        expect(fetch).not.toHaveBeenCalled();
    });

    it('enabled config probes custom port', async () => {
        vi.mocked(fetch).mockResolvedValueOnce(jsonResponse(DISCOVERY));

        await discoverNativeLocalhostWallet({ enabled: true, port: 51885 });

        expect(fetch).toHaveBeenCalledWith(
            'http://127.0.0.1:51885/v1/discover',
            expect.objectContaining({ method: 'GET' }),
        );
    });

    it('failed discovery returns null and does not throw', async () => {
        vi.mocked(fetch).mockRejectedValueOnce(new Error('offline'));

        await expect(discoverNativeLocalhostWallet(true)).resolves.toBeNull();
    });

    it('non-v1 protocol discovery returns null', async () => {
        vi.mocked(fetch).mockResolvedValueOnce(
            jsonResponse({
                ...DISCOVERY,
                protocolVersion: '2',
            }),
        );

        await expect(discoverNativeLocalhostWallet(true)).resolves.toBeNull();
    });

    it('missing required signing features returns null', async () => {
        vi.mocked(fetch).mockResolvedValueOnce(
            jsonResponse({
                ...DISCOVERY,
                features: ['solana:signMessage'],
            }),
        );

        await expect(discoverNativeLocalhostWallet(true)).resolves.toBeNull();
    });

    it('successful discovery creates a wallet named Native when response name is empty', async () => {
        vi.mocked(fetch).mockResolvedValueOnce(jsonResponse({ ...DISCOVERY, name: '' }));

        const wallet = await discoverNativeLocalhostWallet(true);

        expect(wallet?.name).toBe('Native');
        expect(wallet?.accounts).toEqual([]);
    });

    it('successful discovery uses response name when present', async () => {
        vi.mocked(fetch).mockResolvedValueOnce(jsonResponse({ ...DISCOVERY, name: 'Native Dev' }));

        const wallet = await discoverNativeLocalhostWallet(true);

        expect(wallet?.name).toBe('Native Dev');
    });

    it('connect posts origin metadata and converts accounts', async () => {
        const wallet = createNativeLocalhostWallet(DISCOVERY, resolveNativeLocalhostConfig(true));
        vi.mocked(fetch).mockResolvedValueOnce(
            jsonResponse({
                accounts: [
                    {
                        address: 'Account111111111111111111111111111111111',
                        publicKey: bytes(),
                        chains: ['solana:mainnet', 'eip155:1'],
                        features: ['solana:signMessage', 'solana:signTransaction', 'solana:signAndSendTransaction'],
                        label: 'Main',
                    },
                ],
            }),
        );

        const connect = wallet.features['standard:connect'] as {
            connect(input?: { silent?: boolean }): Promise<{ accounts: readonly WalletAccount[] }>;
        };
        const result = await connect.connect({ silent: true });

        expect(result.accounts).toHaveLength(1);
        expect(result.accounts[0].publicKey).toBeInstanceOf(Uint8Array);
        expect(result.accounts[0].chains).toEqual(['solana:mainnet']);
        expect(result.accounts[0].features).toEqual(['solana:signMessage', 'solana:signTransaction']);
        expect(fetch).toHaveBeenCalledWith(
            'http://127.0.0.1:51884/v1/connect',
            expect.objectContaining({
                method: 'POST',
                credentials: 'omit',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    protocolVersion: '1',
                    metadata: { origin: window.location.origin },
                    silent: true,
                }),
            }),
        );
    });

    it('connect emits account change events and disconnect clears accounts', async () => {
        const wallet = createNativeLocalhostWallet(DISCOVERY, resolveNativeLocalhostConfig(true));
        const listener = vi.fn();
        const events = wallet.features['standard:events'] as {
            on(event: 'change', listener: (properties: { accounts?: readonly WalletAccount[] }) => void): () => void;
        };
        const connect = wallet.features['standard:connect'] as {
            connect(): Promise<{ accounts: readonly WalletAccount[] }>;
        };
        const disconnect = wallet.features['standard:disconnect'] as {
            disconnect(): Promise<void>;
        };

        events.on('change', listener);
        vi.mocked(fetch).mockResolvedValueOnce(
            jsonResponse({
                accounts: [
                    {
                        address: 'Account111111111111111111111111111111111',
                        publicKey: bytes(),
                        chains: ['solana:mainnet'],
                        features: ['solana:signMessage'],
                    },
                ],
            }),
        );

        await connect.connect();
        await disconnect.disconnect();

        expect(listener).toHaveBeenNthCalledWith(1, { accounts: expect.arrayContaining([expect.any(Object)]) });
        expect(listener).toHaveBeenNthCalledWith(2, { accounts: [] });
        expect(wallet.accounts).toEqual([]);
    });

    it('signMessage base64 encodes request bytes and decodes signature', async () => {
        const wallet = createNativeLocalhostWallet(DISCOVERY, resolveNativeLocalhostConfig(true));
        const connect = wallet.features['standard:connect'] as {
            connect(): Promise<{ accounts: readonly WalletAccount[] }>;
        };
        vi.mocked(fetch)
            .mockResolvedValueOnce(
                jsonResponse({
                    accounts: [
                        {
                            address: 'Account111111111111111111111111111111111',
                            publicKey: bytes(),
                            chains: ['solana:mainnet'],
                            features: ['solana:signMessage'],
                        },
                    ],
                }),
            )
            .mockResolvedValueOnce(jsonResponse({ signatureBase64: signatureBase64() }));

        const { accounts } = await connect.connect();
        const feature = wallet.features['solana:signMessage'] as {
            signMessage(input: { account: WalletAccount; message: Uint8Array; chain?: string }): Promise<{
                signature: Uint8Array;
            }>;
        };
        const result = await feature.signMessage({
            account: accounts[0],
            message: new Uint8Array([1, 2, 3]),
            chain: 'solana:mainnet',
        });

        expect(result.signature).toEqual(new Uint8Array([9, 8, 7, 6]));
        expect(JSON.parse(vi.mocked(fetch).mock.calls[1][1]?.body as string)).toEqual({
            protocolVersion: '1',
            accountAddress: accounts[0].address,
            chain: 'solana:mainnet',
            metadata: { origin: window.location.origin },
            messageBase64: Buffer.from(new Uint8Array([1, 2, 3])).toString('base64'),
        });
    });

    it('signTransaction supports singular input', async () => {
        const wallet = createNativeLocalhostWallet(DISCOVERY, resolveNativeLocalhostConfig(true));
        const connect = wallet.features['standard:connect'] as {
            connect(): Promise<{ accounts: readonly WalletAccount[] }>;
        };
        vi.mocked(fetch)
            .mockResolvedValueOnce(
                jsonResponse({
                    accounts: [
                        {
                            address: 'Account111111111111111111111111111111111',
                            publicKey: bytes(),
                            chains: ['solana:mainnet'],
                            features: ['solana:signTransaction'],
                        },
                    ],
                }),
            )
            .mockResolvedValueOnce(jsonResponse({ signedTransactionBase64: transactionBase64() }));

        const { accounts } = await connect.connect();
        const feature = wallet.features['solana:signTransaction'] as {
            signTransaction(input: { account: WalletAccount; transaction: Uint8Array; chain?: string }): Promise<{
                signedTransaction: Uint8Array;
            }>;
        };
        const result = await feature.signTransaction({
            account: accounts[0],
            transaction: new Uint8Array([4, 5, 6]),
            chain: 'solana:mainnet',
        });

        expect(result.signedTransaction).toEqual(new Uint8Array([6, 7, 8, 9]));
        expect(JSON.parse(vi.mocked(fetch).mock.calls[1][1]?.body as string).transactionBase64).toBe(
            Buffer.from(new Uint8Array([4, 5, 6])).toString('base64'),
        );
    });

    it('signTransaction supports array input shape', async () => {
        const wallet = createNativeLocalhostWallet(DISCOVERY, resolveNativeLocalhostConfig(true));
        const connect = wallet.features['standard:connect'] as {
            connect(): Promise<{ accounts: readonly WalletAccount[] }>;
        };
        vi.mocked(fetch)
            .mockResolvedValueOnce(
                jsonResponse({
                    accounts: [
                        {
                            address: 'Account111111111111111111111111111111111',
                            publicKey: bytes(),
                            chains: ['solana:mainnet'],
                            features: ['solana:signTransaction'],
                        },
                    ],
                }),
            )
            .mockResolvedValueOnce(jsonResponse({ signedTransactionBase64: transactionBase64() }))
            .mockResolvedValueOnce(jsonResponse({ signedTransactionBase64: signatureBase64() }));

        const { accounts } = await connect.connect();
        const feature = wallet.features['solana:signTransaction'] as {
            signTransaction(input: {
                account: WalletAccount;
                transactions: Uint8Array[];
                chain?: string;
            }): Promise<{ signedTransactions: Uint8Array[] }>;
        };
        const result = await feature.signTransaction({
            account: accounts[0],
            transactions: [new Uint8Array([1]), new Uint8Array([2])],
            chain: 'solana:mainnet',
        });

        expect(result.signedTransactions).toEqual([new Uint8Array([6, 7, 8, 9]), new Uint8Array([9, 8, 7, 6])]);
    });

    it('timeout aborts discovery cleanly', async () => {
        vi.useFakeTimers();
        vi.mocked(fetch).mockImplementationOnce((_url, init) => {
            return new Promise((_resolve, reject) => {
                init?.signal?.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')));
            });
        });

        const promise = discoverNativeLocalhostWallet({ enabled: true, timeoutMs: 5 });
        await vi.advanceTimersByTimeAsync(5);

        await expect(promise).resolves.toBeNull();
    });
});
