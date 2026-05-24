import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { WalletAccount } from '@wallet-standard/base';
import {
    createAssociationCrypto,
    createNativeAssociationStorage,
    createNativeAssociationWallet,
    discoverNativeAssociationWallet,
    NativeAssociationWalletError,
    resolveNativeAssociationConfig,
    type AssociationCrypto,
    type AssociationDiscoverResponse,
    type AssociationEnvelope,
    type NativeAssociationStorage,
    type NativeAssociationStoredSession,
    type NativeAssociationTransport,
} from './native-association';

const DISCOVERY: AssociationDiscoverResponse = {
    name: 'Native',
    version: '0.1.0',
    protocolVersion: '2',
    transports: [{ type: 'localhost', host: '127.0.0.1', port: 51884 }],
    chains: ['solana:mainnet'],
    features: ['solana:signMessage', 'solana:signTransaction'],
    encryption: 'x25519-hkdf-sha256-chacha20poly1305',
    sessionTokenTtlSeconds: 86_400,
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

function base64(data: Uint8Array): string {
    return Buffer.from(data).toString('base64');
}

function encodeJson(data: unknown): string {
    return Buffer.from(JSON.stringify(data)).toString('base64');
}

function decodeJson<T>(value: string): T {
    return JSON.parse(Buffer.from(value, 'base64').toString('utf8')) as T;
}

function createMemoryStorage(session?: NativeAssociationStoredSession | null): NativeAssociationStorage & {
    clear: ReturnType<typeof vi.fn>;
    set: ReturnType<typeof vi.fn>;
} {
    let value = session ?? null;
    return {
        get: vi.fn(() => value),
        set: vi.fn(next => {
            value = next;
        }),
        clear: vi.fn(() => {
            value = null;
        }),
    };
}

function createTestCrypto(): AssociationCrypto {
    return {
        generateKeyPair: () => ({
            secretKey: new Uint8Array(32).fill(1),
            publicKeyBase64: base64(new Uint8Array(32).fill(2)),
        }),
        deriveHandshakeKey: () => new Uint8Array(32).fill(3),
        deriveSessionKey: () => new Uint8Array(32).fill(4),
        sealJson: (keyId, _key, payload) => ({
            protocolVersion: '2',
            keyId,
            sealedBoxBase64: encodeJson(payload),
        }),
        openJson: (_key, envelope) => decodeJson(envelope.sealedBoxBase64),
        randomUUID: () => 'request-1',
        now: () => new Date('2026-01-01T00:00:00.000Z'),
    };
}

function createTransport(
    options: {
        storageSession?: NativeAssociationStoredSession | null;
        rejectResume?: boolean;
        onAssociatePayload?: (payload: unknown) => void;
        onRpcPayload?: (payload: unknown) => void;
    } = {},
): NativeAssociationTransport & { posts: ReturnType<typeof vi.fn> } {
    let handshakeCount = 0;
    const posts = vi.fn(async (path: string, body: unknown) => {
        if (path === '/v2/handshake') {
            handshakeCount += 1;
            return {
                protocolVersion: '2',
                handshakeId: `handshake-${handshakeCount}`,
                walletPublicKeyBase64: base64(new Uint8Array(32).fill(9)),
                expiresAt: '2026-01-01T00:05:00.000Z',
            };
        }

        if (path === '/v2/associate') {
            const envelope = body as AssociationEnvelope;
            const payload = decodeJson<{ kind: 'create' | 'resume' }>(envelope.sealedBoxBase64);
            options.onAssociatePayload?.(payload);
            if (payload.kind === 'resume' && options.rejectResume) {
                throw new NativeAssociationWalletError('user rejected: session invalid', 'session_invalid');
            }
            return {
                protocolVersion: '2',
                keyId: envelope.keyId,
                sealedBoxBase64: encodeJson({
                    sessionId: payload.kind === 'resume' ? options.storageSession?.sessionId : 'session-created',
                    sessionTokenBase64:
                        payload.kind === 'resume'
                            ? options.storageSession?.sessionTokenBase64
                            : base64(new Uint8Array(32).fill(7)),
                    expiresAt: '2026-01-02T00:00:00.000Z',
                    accounts: [
                        {
                            address: 'Account111111111111111111111111111111111',
                            publicKey: bytes(),
                            chains: ['solana:mainnet', 'eip155:1'],
                            features: ['solana:signMessage', 'solana:signTransaction'],
                            label: 'Main',
                        },
                    ],
                    chains: ['solana:mainnet'],
                    features: ['solana:signMessage', 'solana:signTransaction'],
                    signingPolicy: 'prompt',
                }),
            };
        }

        if (path === '/v2/rpc') {
            const envelope = body as AssociationEnvelope;
            const payload = decodeJson<{ method: string }>(envelope.sealedBoxBase64);
            options.onRpcPayload?.(payload);
            return {
                protocolVersion: '2',
                keyId: envelope.keyId,
                sealedBoxBase64: encodeJson({
                    requestId: 'request-1',
                    result:
                        payload.method === 'solana.signMessage'
                            ? { signatureBase64: base64(new Uint8Array([9, 8, 7, 6])) }
                            : {
                                  signedTransactionBase64: base64(new Uint8Array([6, 7, 8, 9])),
                                  signature: 'signature',
                              },
                }),
            };
        }

        throw new Error(`unexpected path ${path}`);
    });

    return {
        get: vi.fn(async () => DISCOVERY),
        post: posts,
        posts,
    };
}

describe('native association wallet adapter', () => {
    beforeEach(() => {
        vi.stubGlobal('fetch', vi.fn());
        window.localStorage.clear();
    });

    afterEach(() => {
        vi.useRealTimers();
        vi.unstubAllGlobals();
        window.localStorage.clear();
    });

    it('disabled config does not call fetch', async () => {
        await expect(discoverNativeAssociationWallet()).resolves.toBeNull();
        expect(fetch).not.toHaveBeenCalled();
    });

    it('nativeLocalhost: true probes /v2/discover', async () => {
        vi.mocked(fetch).mockResolvedValueOnce(jsonResponse(DISCOVERY));

        const wallet = await discoverNativeAssociationWallet(true);

        expect(wallet?.name).toBe('Native');
        expect(fetch).toHaveBeenCalledWith(
            'http://127.0.0.1:51884/v2/discover',
            expect.objectContaining({
                method: 'GET',
                credentials: 'omit',
            }),
        );
    });

    it('{ enabled: false } does not probe', async () => {
        await expect(discoverNativeAssociationWallet({ enabled: false })).resolves.toBeNull();
        expect(fetch).not.toHaveBeenCalled();
    });

    it('enabled config probes custom port', async () => {
        vi.mocked(fetch).mockResolvedValueOnce(jsonResponse(DISCOVERY));

        await discoverNativeAssociationWallet({ enabled: true, port: 51885 });

        expect(fetch).toHaveBeenCalledWith(
            'http://127.0.0.1:51885/v2/discover',
            expect.objectContaining({ method: 'GET' }),
        );
    });

    it('failed discovery returns null and does not throw', async () => {
        vi.mocked(fetch).mockRejectedValueOnce(new Error('offline'));

        await expect(discoverNativeAssociationWallet(true)).resolves.toBeNull();
    });

    it('incompatible protocol discovery returns null', async () => {
        vi.mocked(fetch).mockResolvedValueOnce(jsonResponse({ ...DISCOVERY, protocolVersion: '1' }));

        await expect(discoverNativeAssociationWallet(true)).resolves.toBeNull();
    });

    it('missing required signing features returns null', async () => {
        vi.mocked(fetch).mockResolvedValueOnce(jsonResponse({ ...DISCOVERY, features: ['solana:signMessage'] }));

        await expect(discoverNativeAssociationWallet(true)).resolves.toBeNull();
    });

    it('successful discovery creates a wallet named Native when response name is empty', async () => {
        vi.mocked(fetch).mockResolvedValueOnce(jsonResponse({ ...DISCOVERY, name: '' }));

        const wallet = await discoverNativeAssociationWallet(true);

        expect(wallet?.name).toBe('Native');
        expect(wallet?.accounts).toEqual([]);
    });

    it('standard:connect attempts resume when stored session exists', async () => {
        const storedSession = {
            sessionId: 'session-stored',
            sessionTokenBase64: base64(new Uint8Array(32).fill(8)),
            expiresAt: '2026-01-02T00:00:00.000Z',
            origin: window.location.origin,
            walletName: 'Native',
            walletVersion: '0.1.0',
        };
        const payloads: unknown[] = [];
        const storage = createMemoryStorage(storedSession);
        const transport = createTransport({
            storageSession: storedSession,
            onAssociatePayload: payload => payloads.push(payload),
        });
        const wallet = createNativeAssociationWallet(DISCOVERY, resolveNativeAssociationConfig(true), {
            transport,
            storage,
            crypto: createTestCrypto(),
        });

        await connect(wallet);

        expect(payloads[0]).toMatchObject({
            kind: 'resume',
            resumeSessionId: 'session-stored',
            resumeSessionTokenBase64: storedSession.sessionTokenBase64,
        });
    });

    it('standard:connect falls back to create when resume returns session_invalid', async () => {
        const storedSession = {
            sessionId: 'session-stored',
            sessionTokenBase64: base64(new Uint8Array(32).fill(8)),
            expiresAt: '2026-01-02T00:00:00.000Z',
            origin: window.location.origin,
            walletName: 'Native',
            walletVersion: '0.1.0',
        };
        const payloads: unknown[] = [];
        const storage = createMemoryStorage(storedSession);
        const transport = createTransport({
            storageSession: storedSession,
            rejectResume: true,
            onAssociatePayload: payload => payloads.push(payload),
        });
        const wallet = createNativeAssociationWallet(DISCOVERY, resolveNativeAssociationConfig(true), {
            transport,
            storage,
            crypto: createTestCrypto(),
        });

        await connect(wallet);

        expect(storage.clear).toHaveBeenCalled();
        expect(payloads).toEqual([
            expect.objectContaining({ kind: 'resume' }),
            expect.objectContaining({ kind: 'create' }),
        ]);
    });

    it('successful connect stores session and converts accounts', async () => {
        const storage = createMemoryStorage();
        const wallet = createNativeAssociationWallet(DISCOVERY, resolveNativeAssociationConfig(true), {
            transport: createTransport(),
            storage,
            crypto: createTestCrypto(),
        });

        const result = await connect(wallet);

        expect(result.accounts).toHaveLength(1);
        expect(result.accounts[0].publicKey).toBeInstanceOf(Uint8Array);
        expect(result.accounts[0].chains).toEqual(['solana:mainnet']);
        expect(result.accounts[0].features).toEqual(['solana:signMessage', 'solana:signTransaction']);
        expect(storage.set).toHaveBeenCalledWith(expect.objectContaining({ sessionId: 'session-created' }));
    });

    it('expired stored session is cleared', () => {
        const config = resolveNativeAssociationConfig(true);
        const storage = createNativeAssociationStorage({
            config,
            discovery: DISCOVERY,
            origin: window.location.origin,
        });
        const key = `${config.storageKey}:${encodeURIComponent(window.location.origin)}:localhost:${config.host}:${config.port}:Native`;
        window.localStorage.setItem(
            key,
            JSON.stringify({
                sessionId: 'expired',
                sessionTokenBase64: base64(new Uint8Array(32).fill(1)),
                expiresAt: '2020-01-01T00:00:00.000Z',
                origin: window.location.origin,
                walletName: 'Native',
                walletVersion: '0.1.0',
            }),
        );

        expect(storage.get()).toBeNull();
        expect(window.localStorage.getItem(key)).toBeNull();
    });

    it('connect emits account change events and disconnect clears accounts', async () => {
        const wallet = createNativeAssociationWallet(DISCOVERY, resolveNativeAssociationConfig(true), {
            transport: createTransport(),
            storage: createMemoryStorage(),
            crypto: createTestCrypto(),
        });
        const listener = vi.fn();
        const events = wallet.features['standard:events'] as {
            on(event: 'change', listener: (properties: { accounts?: readonly WalletAccount[] }) => void): () => void;
        };
        const disconnect = wallet.features['standard:disconnect'] as {
            disconnect(): Promise<void>;
        };

        events.on('change', listener);
        await connect(wallet);
        await disconnect.disconnect();

        expect(listener).toHaveBeenNthCalledWith(1, { accounts: expect.arrayContaining([expect.any(Object)]) });
        expect(listener).toHaveBeenNthCalledWith(2, { accounts: [] });
        expect(wallet.accounts).toEqual([]);
    });

    it('signMessage sends encrypted /v2/rpc with solana.signMessage', async () => {
        let rpcPayload: unknown;
        const wallet = createNativeAssociationWallet(DISCOVERY, resolveNativeAssociationConfig(true), {
            transport: createTransport({ onRpcPayload: payload => (rpcPayload = payload) }),
            storage: createMemoryStorage(),
            crypto: createTestCrypto(),
        });
        const { accounts } = await connect(wallet);
        const result = await signMessage(wallet, accounts[0], new Uint8Array([1, 2, 3]));

        expect(result.signature).toEqual(new Uint8Array([9, 8, 7, 6]));
        expect(rpcPayload).toMatchObject({
            requestId: 'request-1',
            issuedAt: '2026-01-01T00:00:00.000Z',
            method: 'solana.signMessage',
            params: {
                accountAddress: accounts[0].address,
                chain: 'solana:mainnet',
                messageBase64: base64(new Uint8Array([1, 2, 3])),
            },
        });
    });

    it('signTransaction sends encrypted /v2/rpc with solana.signTransaction', async () => {
        let rpcPayload: unknown;
        const wallet = createNativeAssociationWallet(DISCOVERY, resolveNativeAssociationConfig(true), {
            transport: createTransport({ onRpcPayload: payload => (rpcPayload = payload) }),
            storage: createMemoryStorage(),
            crypto: createTestCrypto(),
        });
        const { accounts } = await connect(wallet);
        const result = await signTransaction(wallet, accounts[0], new Uint8Array([4, 5, 6]));

        expect(result.signedTransaction).toEqual(new Uint8Array([6, 7, 8, 9]));
        expect(rpcPayload).toMatchObject({
            method: 'solana.signTransaction',
            params: {
                transactionBase64: base64(new Uint8Array([4, 5, 6])),
            },
        });
    });

    it('signTransaction supports array input shape', async () => {
        const wallet = createNativeAssociationWallet(DISCOVERY, resolveNativeAssociationConfig(true), {
            transport: createTransport(),
            storage: createMemoryStorage(),
            crypto: createTestCrypto(),
        });
        const { accounts } = await connect(wallet);
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

        expect(result.signedTransactions).toEqual([new Uint8Array([6, 7, 8, 9]), new Uint8Array([6, 7, 8, 9])]);
    });

    it('malformed/error responses map to wallet errors', async () => {
        const transport = createTransport();
        transport.posts.mockRejectedValueOnce(new NativeAssociationWalletError('user rejected: no', 'user_rejected'));
        const wallet = createNativeAssociationWallet(DISCOVERY, resolveNativeAssociationConfig(true), {
            transport,
            storage: createMemoryStorage(),
            crypto: createTestCrypto(),
        });

        await expect(connect(wallet)).rejects.toMatchObject({
            name: 'NativeAssociationWalletError',
            code: 'user_rejected',
        });
    });

    it('timeout aborts discovery cleanly', async () => {
        vi.useFakeTimers();
        vi.mocked(fetch).mockImplementationOnce((_url, init) => {
            return new Promise((_resolve, reject) => {
                init?.signal?.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')));
            });
        });

        const promise = discoverNativeAssociationWallet({ enabled: true, timeoutMs: 5 });
        await vi.advanceTimersByTimeAsync(5);

        await expect(promise).resolves.toBeNull();
    });

    it('real crypto can seal and open an association envelope', () => {
        const crypto = createAssociationCrypto();
        const key = new Uint8Array(32).fill(1);
        const envelope = crypto.sealJson('key-1', key, { hello: 'native' });

        expect(crypto.openJson(key, envelope)).toEqual({ hello: 'native' });
    });
});

async function connect(wallet: ReturnType<typeof createNativeAssociationWallet>) {
    const connectFeature = wallet.features['standard:connect'] as {
        connect(): Promise<{ accounts: readonly WalletAccount[] }>;
    };
    return connectFeature.connect();
}

async function signMessage(
    wallet: ReturnType<typeof createNativeAssociationWallet>,
    account: WalletAccount,
    message: Uint8Array,
) {
    const feature = wallet.features['solana:signMessage'] as {
        signMessage(input: { account: WalletAccount; message: Uint8Array; chain?: string }): Promise<{
            signature: Uint8Array;
        }>;
    };
    return feature.signMessage({ account, message, chain: 'solana:mainnet' });
}

async function signTransaction(
    wallet: ReturnType<typeof createNativeAssociationWallet>,
    account: WalletAccount,
    transaction: Uint8Array,
) {
    const feature = wallet.features['solana:signTransaction'] as {
        signTransaction(input: { account: WalletAccount; transaction: Uint8Array; chain?: string }): Promise<{
            signedTransaction: Uint8Array;
        }>;
    };
    return feature.signTransaction({ account, transaction, chain: 'solana:mainnet' });
}
