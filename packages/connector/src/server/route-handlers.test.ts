/**
 * Tests for the remote signer route handlers
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createRemoteSignerRouteHandlers } from './route-handlers';
import type { RemoteSigner, RemoteSignerRouteHandlersConfig } from './route-handlers';
import { timingSafeEqualString } from './constant-time';
import { decodeBase64, encodeBase64 } from '../remote/protocol';
import type { RemoteSignerMetadata, RemoteSignerErrorResponse } from '../remote/protocol';

const ENDPOINT = 'http://localhost/api/connector-signer';

function createMockSigner(overrides: Partial<RemoteSigner> = {}): RemoteSigner {
    return {
        address: 'MockSignerAddress111111111111111111111111111',
        signTransaction: vi.fn(async (bytes: Uint8Array) => new Uint8Array([...bytes, 0xff])),
        signAllTransactions: vi.fn(async (txs: Uint8Array[]) => txs.map(bytes => new Uint8Array([...bytes, 0xff]))),
        signMessage: vi.fn(async () => new Uint8Array(64).fill(7)),
        isAvailable: vi.fn(async () => true),
        ...overrides,
    };
}

function get(headers: Record<string, string> = {}): Request {
    return new Request(ENDPOINT, { method: 'GET', headers });
}

function post(body: unknown, headers: Record<string, string> = {}): Request {
    return new Request(ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...headers },
        body: typeof body === 'string' ? body : JSON.stringify(body),
    });
}

async function json<T>(response: Response): Promise<T> {
    return (await response.json()) as T;
}

function handlers<P>(overrides: Partial<RemoteSignerRouteHandlersConfig<P>> = {}, signer = createMockSigner()) {
    return createRemoteSignerRouteHandlers<P>({
        provider: { type: 'custom', signer },
        authorize: () => true,
        ...overrides,
    });
}

const TX = new Uint8Array([1, 2, 3, 4]);
const TX_B64 = encodeBase64(TX);
const MSG = new Uint8Array([9, 8, 7]);
const MSG_B64 = encodeBase64(MSG);

describe('createRemoteSignerRouteHandlers', () => {
    beforeEach(() => {
        vi.spyOn(console, 'warn').mockImplementation(() => {});
        vi.spyOn(console, 'error').mockImplementation(() => {});
    });

    afterEach(() => {
        vi.restoreAllMocks();
        vi.unstubAllGlobals();
        vi.unstubAllEnvs();
    });

    describe('GET', () => {
        it('returns 401 when authorize rejects', async () => {
            const { GET } = handlers({ authorize: () => false });
            const response = await GET(get());
            expect(response.status).toBe(401);
            const body = await json<RemoteSignerErrorResponse>(response);
            expect(body.error.code).toBe('UNAUTHORIZED');
        });

        it('returns 503 when the signer is unavailable', async () => {
            const signer = createMockSigner({ isAvailable: vi.fn(async () => false) });
            const { GET } = handlers({}, signer);
            const response = await GET(get());
            expect(response.status).toBe(503);
            const body = await json<RemoteSignerErrorResponse>(response);
            expect(body.error.code).toBe('PROVIDER_ERROR');
        });

        it('returns metadata with capabilities reflecting rpc config', async () => {
            const signer = createMockSigner();
            const { GET } = handlers(
                { name: 'Treasury', icon: 'data:image/svg+xml,', chains: ['solana:devnet'] },
                signer,
            );
            const response = await GET(get());
            expect(response.status).toBe(200);
            const body = await json<RemoteSignerMetadata>(response);
            expect(body).toEqual({
                address: signer.address,
                chains: ['solana:devnet'],
                capabilities: {
                    signTransaction: true,
                    signAllTransactions: true,
                    signMessage: true,
                    signAndSendTransaction: false,
                },
                name: 'Treasury',
                icon: 'data:image/svg+xml,',
            });

            const withRpc = handlers({ rpc: { url: 'http://rpc' } });
            const rpcBody = await json<RemoteSignerMetadata>(await withRpc.GET(get()));
            expect(rpcBody.capabilities.signAndSendTransaction).toBe(true);
            expect(rpcBody.name).toBe('Remote Signer');
        });

        it('returns 500 when loading the signer throws', async () => {
            const signer = createMockSigner({
                isAvailable: vi.fn(async () => {
                    throw new Error('boom');
                }),
            });
            const { GET } = handlers({}, signer);
            const response = await GET(get());
            expect(response.status).toBe(500);
            const body = await json<RemoteSignerErrorResponse>(response);
            expect(body.error).toMatchObject({ code: 'INTERNAL_ERROR', message: 'boom' });
        });
    });

    describe('POST authorization', () => {
        it.each([
            ['false', () => false],
            ['null', () => null],
            ['undefined', () => undefined],
            ['async false', async () => false],
        ])('returns 401 when authorize returns %s', async (_label, authorize) => {
            const signer = createMockSigner();
            const { POST } = handlers({ authorize }, signer);
            const response = await POST(post({ operation: 'signTransaction', transaction: TX_B64 }));
            expect(response.status).toBe(401);
            expect(signer.signTransaction).not.toHaveBeenCalled();
        });

        it('authorizes when authorize returns a principal object', async () => {
            const { POST } = handlers({ authorize: () => ({ principal: { userId: 'u1' } }) });
            const response = await POST(post({ operation: 'signTransaction', transaction: TX_B64 }));
            expect(response.status).toBe(200);
        });

        it('passes the request to authorize', async () => {
            const authorize = vi.fn(() => true);
            const { POST } = handlers({ authorize });
            await POST(post({ operation: 'signMessage', message: MSG_B64 }, { 'x-test': 'yes' }));
            expect(authorize).toHaveBeenCalledTimes(1);
            const [request] = authorize.mock.calls[0] as unknown as [Request];
            expect(request.headers.get('x-test')).toBe('yes');
        });
    });

    describe('POST request validation', () => {
        it('returns 400 for invalid JSON', async () => {
            const { POST } = handlers();
            const response = await POST(post('{not json'));
            expect(response.status).toBe(400);
            const body = await json<RemoteSignerErrorResponse>(response);
            expect(body.error).toMatchObject({ code: 'INVALID_REQUEST', message: 'Invalid JSON body' });
        });

        it('returns 400 when operation is missing', async () => {
            const { POST } = handlers();
            const response = await POST(post({ transaction: TX_B64 }));
            expect(response.status).toBe(400);
            const body = await json<RemoteSignerErrorResponse>(response);
            expect(body.error.message).toBe('Missing operation field');
        });

        it('returns 400 for an unknown operation', async () => {
            const { POST } = handlers();
            const response = await POST(post({ operation: 'mint' }));
            expect(response.status).toBe(400);
            const body = await json<RemoteSignerErrorResponse>(response);
            expect(body.error).toMatchObject({ code: 'INVALID_OPERATION', message: 'Unknown operation: mint' });
        });

        it.each([
            ['signTransaction', {}, 'Missing transaction field'],
            ['signAllTransactions', {}, 'Missing transactions array'],
            ['signAllTransactions', { transactions: 'nope' }, 'Missing transactions array'],
            ['signMessage', {}, 'Missing message field'],
        ])('returns 400 for %s with missing fields', async (operation, extra, message) => {
            const signer = createMockSigner();
            const { POST } = handlers({}, signer);
            const response = await POST(post({ operation, ...extra }));
            expect(response.status).toBe(400);
            const body = await json<RemoteSignerErrorResponse>(response);
            expect(body.error).toMatchObject({ code: 'INVALID_REQUEST', message });
            expect(signer.signTransaction).not.toHaveBeenCalled();
            expect(signer.signAllTransactions).not.toHaveBeenCalled();
            expect(signer.signMessage).not.toHaveBeenCalled();
        });

        it('returns 400 for signAndSendTransaction without a transaction field', async () => {
            const { POST } = handlers({ rpc: { url: 'http://rpc' } });
            const response = await POST(post({ operation: 'signAndSendTransaction' }));
            expect(response.status).toBe(400);
            const body = await json<RemoteSignerErrorResponse>(response);
            expect(body.error).toMatchObject({ code: 'INVALID_REQUEST', message: 'Missing transaction field' });
        });
    });

    describe('signTransaction', () => {
        it('signs and returns base64 bytes', async () => {
            const signer = createMockSigner();
            const { POST } = handlers({}, signer);
            const response = await POST(post({ operation: 'signTransaction', transaction: TX_B64 }));
            expect(response.status).toBe(200);
            const body = await json<{ signedTransaction: string }>(response);
            expect(decodeBase64(body.signedTransaction)).toEqual(new Uint8Array([1, 2, 3, 4, 0xff]));
            expect(signer.signTransaction).toHaveBeenCalledWith(TX);
        });

        it('returns 403 and does not sign when policy rejects', async () => {
            const signer = createMockSigner();
            const { POST } = handlers({ policy: { validateTransaction: () => false } }, signer);
            const response = await POST(post({ operation: 'signTransaction', transaction: TX_B64 }));
            expect(response.status).toBe(403);
            const body = await json<RemoteSignerErrorResponse>(response);
            expect(body.error).toMatchObject({ code: 'POLICY_VIOLATION', message: 'Transaction rejected by policy' });
            expect(signer.signTransaction).not.toHaveBeenCalled();
        });

        it('passes bytes, request, and context with the principal to the policy hook', async () => {
            const validateTransaction = vi.fn(() => true);
            const { POST } = handlers({
                authorize: () => ({ principal: { userId: 'alice' } }),
                policy: { validateTransaction },
            });
            await POST(post({ operation: 'signTransaction', transaction: TX_B64 }, { 'x-trace': 't1' }));
            expect(validateTransaction).toHaveBeenCalledTimes(1);
            const [bytes, request, context] = validateTransaction.mock.calls[0] as unknown as [
                Uint8Array,
                Request,
                { principal: unknown; request: Request; operation: string; index?: number; total?: number },
            ];
            expect(bytes).toEqual(TX);
            expect(request.headers.get('x-trace')).toBe('t1');
            expect(context.principal).toEqual({ userId: 'alice' });
            expect(context.request).toBe(request);
            expect(context.operation).toBe('signTransaction');
            expect(context.index).toBeUndefined();
            expect(context.total).toBeUndefined();
        });

        it('passes principal undefined when authorize returned true', async () => {
            const validateTransaction = vi.fn(() => true);
            const { POST } = handlers({ authorize: () => true, policy: { validateTransaction } });
            await POST(post({ operation: 'signTransaction', transaction: TX_B64 }));
            const context = validateTransaction.mock.calls[0][2] as { principal: unknown };
            expect(context.principal).toBeUndefined();
        });

        it('still runs legacy two-argument policy hooks', async () => {
            const signer = createMockSigner();
            const validateTransaction = vi.fn((bytes: Uint8Array, request: Request) => {
                return bytes.length === 4 && request.method === 'POST';
            });
            const { POST } = handlers({ policy: { validateTransaction } }, signer);
            const response = await POST(post({ operation: 'signTransaction', transaction: TX_B64 }));
            expect(response.status).toBe(200);
            expect(validateTransaction).toHaveBeenCalledTimes(1);
        });
    });

    describe('signAllTransactions', () => {
        const TXS = [new Uint8Array([1]), new Uint8Array([2]), new Uint8Array([3])];

        it('signs all and returns base64 bytes', async () => {
            const signer = createMockSigner();
            const { POST } = handlers({}, signer);
            const response = await POST(
                post({ operation: 'signAllTransactions', transactions: TXS.map(encodeBase64) }),
            );
            expect(response.status).toBe(200);
            const body = await json<{ signedTransactions: string[] }>(response);
            expect(body.signedTransactions.map(decodeBase64)).toEqual([
                new Uint8Array([1, 0xff]),
                new Uint8Array([2, 0xff]),
                new Uint8Array([3, 0xff]),
            ]);
            expect(signer.signAllTransactions).toHaveBeenCalledWith(TXS);
        });

        it('runs the policy per transaction with index and total', async () => {
            const validateTransaction = vi.fn(() => true);
            const { POST } = handlers({ policy: { validateTransaction } });
            await POST(post({ operation: 'signAllTransactions', transactions: TXS.map(encodeBase64) }));
            expect(validateTransaction).toHaveBeenCalledTimes(3);
            validateTransaction.mock.calls.forEach((call, i) => {
                const [bytes, , context] = call as unknown as [
                    Uint8Array,
                    Request,
                    { operation: string; index: number; total: number },
                ];
                expect(bytes).toEqual(TXS[i]);
                expect(context).toMatchObject({ operation: 'signAllTransactions', index: i, total: 3 });
            });
        });

        it('rejects the whole batch when any transaction fails policy', async () => {
            const signer = createMockSigner();
            const validateTransaction = vi.fn((bytes: Uint8Array) => bytes[0] !== 2);
            const { POST } = handlers({ policy: { validateTransaction } }, signer);
            const response = await POST(
                post({ operation: 'signAllTransactions', transactions: TXS.map(encodeBase64) }),
            );
            expect(response.status).toBe(403);
            expect(validateTransaction).toHaveBeenCalledTimes(2);
            expect(signer.signAllTransactions).not.toHaveBeenCalled();
        });
    });

    describe('signMessage', () => {
        it('signs and returns a base64 signature', async () => {
            const signer = createMockSigner();
            const { POST } = handlers({}, signer);
            const response = await POST(post({ operation: 'signMessage', message: MSG_B64 }));
            expect(response.status).toBe(200);
            const body = await json<{ signature: string }>(response);
            expect(decodeBase64(body.signature)).toEqual(new Uint8Array(64).fill(7));
            expect(signer.signMessage).toHaveBeenCalledWith(MSG);
        });

        it('returns 403 and does not sign when the message policy rejects', async () => {
            const signer = createMockSigner();
            const validateMessage = vi.fn(() => false);
            const { POST } = handlers({ policy: { validateMessage } }, signer);
            const response = await POST(post({ operation: 'signMessage', message: MSG_B64 }));
            expect(response.status).toBe(403);
            const body = await json<RemoteSignerErrorResponse>(response);
            expect(body.error).toMatchObject({ code: 'POLICY_VIOLATION', message: 'Message rejected by policy' });
            expect(signer.signMessage).not.toHaveBeenCalled();
            const context = validateMessage.mock.calls[0][2] as { operation: string };
            expect(context.operation).toBe('signMessage');
        });

        it('does not consult the transaction policy for messages', async () => {
            const validateTransaction = vi.fn(() => false);
            const { POST } = handlers({ policy: { validateTransaction } });
            const response = await POST(post({ operation: 'signMessage', message: MSG_B64 }));
            expect(response.status).toBe(200);
            expect(validateTransaction).not.toHaveBeenCalled();
        });
    });

    describe('signAndSendTransaction', () => {
        it('returns 400 when rpc is not configured', async () => {
            const signer = createMockSigner();
            const { POST } = handlers({}, signer);
            const response = await POST(post({ operation: 'signAndSendTransaction', transaction: TX_B64 }));
            expect(response.status).toBe(400);
            const body = await json<RemoteSignerErrorResponse>(response);
            expect(body.error.code).toBe('INVALID_OPERATION');
            expect(signer.signTransaction).not.toHaveBeenCalled();
        });

        it('signs, broadcasts via JSON-RPC, and returns the signature', async () => {
            const fetchMock = vi.fn(async () => Response.json({ jsonrpc: '2.0', id: 1, result: 'Sig111' }));
            vi.stubGlobal('fetch', fetchMock);
            const signer = createMockSigner();
            const { POST } = handlers({ rpc: { url: 'http://rpc.local', commitment: 'finalized' } }, signer);

            const response = await POST(post({ operation: 'signAndSendTransaction', transaction: TX_B64 }));
            expect(response.status).toBe(200);
            expect(await json<{ signature: string }>(response)).toEqual({ signature: 'Sig111' });

            expect(fetchMock).toHaveBeenCalledTimes(1);
            const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
            expect(url).toBe('http://rpc.local');
            const rpcBody = JSON.parse(init.body as string);
            expect(rpcBody.method).toBe('sendTransaction');
            expect(decodeBase64(rpcBody.params[0])).toEqual(new Uint8Array([1, 2, 3, 4, 0xff]));
            expect(rpcBody.params[1]).toMatchObject({ encoding: 'base64', preflightCommitment: 'finalized' });
        });

        it('runs the policy with the signAndSendTransaction operation', async () => {
            vi.stubGlobal(
                'fetch',
                vi.fn(async () => Response.json({ result: 'Sig' })),
            );
            const validateTransaction = vi.fn(() => true);
            const { POST } = handlers({ rpc: { url: 'http://rpc.local' }, policy: { validateTransaction } });
            await POST(post({ operation: 'signAndSendTransaction', transaction: TX_B64 }));
            const context = validateTransaction.mock.calls[0][2] as { operation: string };
            expect(context.operation).toBe('signAndSendTransaction');
        });

        it('returns 403 and does not sign or send when policy rejects', async () => {
            const fetchMock = vi.fn();
            vi.stubGlobal('fetch', fetchMock);
            const signer = createMockSigner();
            const { POST } = handlers(
                { rpc: { url: 'http://rpc.local' }, policy: { validateTransaction: () => false } },
                signer,
            );
            const response = await POST(post({ operation: 'signAndSendTransaction', transaction: TX_B64 }));
            expect(response.status).toBe(403);
            expect(signer.signTransaction).not.toHaveBeenCalled();
            expect(fetchMock).not.toHaveBeenCalled();
        });

        it('returns 500 SEND_FAILED when the RPC reports an error', async () => {
            vi.stubGlobal(
                'fetch',
                vi.fn(async () => Response.json({ error: { message: 'Blockhash not found' } })),
            );
            const { POST } = handlers({ rpc: { url: 'http://rpc.local' } });
            const response = await POST(post({ operation: 'signAndSendTransaction', transaction: TX_B64 }));
            expect(response.status).toBe(500);
            const body = await json<RemoteSignerErrorResponse>(response);
            expect(body.error).toMatchObject({ code: 'SEND_FAILED', message: 'Blockhash not found' });
        });
    });

    describe('signer error mapping', () => {
        it('maps rate-limit errors to 429', async () => {
            const signer = createMockSigner({
                signTransaction: vi.fn(async () => {
                    throw new Error('Provider rate limit exceeded');
                }),
            });
            const { POST } = handlers({}, signer);
            const response = await POST(post({ operation: 'signTransaction', transaction: TX_B64 }));
            expect(response.status).toBe(429);
            const body = await json<RemoteSignerErrorResponse>(response);
            expect(body.error.code).toBe('PROVIDER_ERROR');
        });

        it('maps other signer errors to 500 SIGNING_FAILED', async () => {
            const signer = createMockSigner({
                signMessage: vi.fn(async () => {
                    throw new Error('HSM offline');
                }),
            });
            const { POST } = handlers({}, signer);
            const response = await POST(post({ operation: 'signMessage', message: MSG_B64 }));
            expect(response.status).toBe(500);
            const body = await json<RemoteSignerErrorResponse>(response);
            expect(body.error).toMatchObject({ code: 'SIGNING_FAILED', message: 'HSM offline' });
        });

        it('surfaces policy hook exceptions as 500', async () => {
            const { POST } = handlers({
                policy: {
                    validateTransaction: () => {
                        throw new Error('policy backend down');
                    },
                },
            });
            const response = await POST(post({ operation: 'signTransaction', transaction: TX_B64 }));
            expect(response.status).toBe(500);
        });
    });

    describe('signer cache', () => {
        it('keeps a separate signer per handler instance', async () => {
            const signerA = createMockSigner({ address: 'AddressA' });
            const signerB = createMockSigner({ address: 'AddressB' });
            const a = handlers({}, signerA);
            const b = handlers({}, signerB);

            expect((await json<RemoteSignerMetadata>(await a.GET(get()))).address).toBe('AddressA');
            expect((await json<RemoteSignerMetadata>(await b.GET(get()))).address).toBe('AddressB');

            await a.POST(post({ operation: 'signMessage', message: MSG_B64 }));
            await b.POST(post({ operation: 'signMessage', message: MSG_B64 }));
            expect(signerA.signMessage).toHaveBeenCalledTimes(1);
            expect(signerB.signMessage).toHaveBeenCalledTimes(1);
        });

        it('shares one load across concurrent requests and retries after a failed load', async () => {
            // A getter on the custom provider counts loads: the first attempt
            // throws, the next succeeds. Concurrent first requests must share the
            // single failing load, and a later request must load again and succeed.
            let loads = 0;
            const signer = createMockSigner();
            const { GET } = createRemoteSignerRouteHandlers({
                provider: {
                    type: 'custom',
                    get signer() {
                        loads++;
                        if (loads === 1) {
                            throw new Error('provider warming up');
                        }
                        return signer;
                    },
                },
                authorize: () => true,
            });

            const [first, second] = await Promise.all([GET(get()), GET(get())]);
            expect(first.status).toBe(500);
            expect(second.status).toBe(500);
            expect((await json<RemoteSignerErrorResponse>(first)).error.message).toContain('provider warming up');
            expect(loads).toBe(1);

            // The failed load was not cached: the next request loads again and succeeds
            const third = await GET(get());
            expect(third.status).toBe(200);
            expect((await json<RemoteSignerMetadata>(third)).address).toBe(signer.address);
            expect(loads).toBe(2);

            // ...and the successful load is cached from then on
            expect((await GET(get())).status).toBe(200);
            expect(loads).toBe(2);
        });

        it('reports an unknown provider type as a 500 without caching the failure', async () => {
            const { GET } = createRemoteSignerRouteHandlers({
                provider: { type: 'nope' } as never,
                authorize: () => true,
            });

            for (let i = 0; i < 2; i++) {
                const response = await GET(get());
                expect(response.status).toBe(500);
                expect((await json<RemoteSignerErrorResponse>(response)).error.message).toContain(
                    'Unknown provider type',
                );
            }
        });

        it('dedupes concurrent first requests to a single signer load', async () => {
            // A getter on the custom provider counts how many times the
            // signer is loaded; three concurrent GETs must load it once.
            let loads = 0;
            const signer = createMockSigner();
            const config: RemoteSignerRouteHandlersConfig = {
                provider: {
                    type: 'custom',
                    get signer() {
                        loads++;
                        return signer;
                    },
                },
                authorize: () => true,
            };
            const { GET } = createRemoteSignerRouteHandlers(config);
            await Promise.all([GET(get()), GET(get()), GET(get())]);
            expect(loads).toBe(1);
            expect(signer.isAvailable).toHaveBeenCalledTimes(3);
        });
    });

    describe('default authorization', () => {
        const TOKEN = 'super-secret-token';

        it('rejects every request when CONNECTOR_SIGNER_TOKEN is unset', async () => {
            vi.stubEnv('CONNECTOR_SIGNER_TOKEN', '');
            const { GET } = createRemoteSignerRouteHandlers({
                provider: { type: 'custom', signer: createMockSigner() },
            });
            const response = await GET(get({ Authorization: 'Bearer anything' }));
            expect(response.status).toBe(401);
        });

        it('accepts a matching Bearer token', async () => {
            vi.stubEnv('CONNECTOR_SIGNER_TOKEN', TOKEN);
            const { GET } = createRemoteSignerRouteHandlers({
                provider: { type: 'custom', signer: createMockSigner() },
            });
            expect((await GET(get({ Authorization: `Bearer ${TOKEN}` }))).status).toBe(200);
            expect((await GET(get({ Authorization: `bearer ${TOKEN}` }))).status).toBe(200);
        });

        it('accepts a matching raw token', async () => {
            vi.stubEnv('CONNECTOR_SIGNER_TOKEN', TOKEN);
            const { GET } = createRemoteSignerRouteHandlers({
                provider: { type: 'custom', signer: createMockSigner() },
            });
            expect((await GET(get({ Authorization: TOKEN }))).status).toBe(200);
        });

        it('rejects a wrong or missing token', async () => {
            vi.stubEnv('CONNECTOR_SIGNER_TOKEN', TOKEN);
            const { GET } = createRemoteSignerRouteHandlers({
                provider: { type: 'custom', signer: createMockSigner() },
            });
            expect((await GET(get({ Authorization: 'Bearer wrong' }))).status).toBe(401);
            expect((await GET(get({ Authorization: `Bearer ${TOKEN}x` }))).status).toBe(401);
            expect((await GET(get())).status).toBe(401);
        });
    });
});

describe('timingSafeEqualString', () => {
    it('returns true for equal strings', () => {
        expect(timingSafeEqualString('abc', 'abc')).toBe(true);
        expect(timingSafeEqualString('', '')).toBe(true);
    });

    it('returns false for different lengths', () => {
        expect(timingSafeEqualString('abc', 'abcd')).toBe(false);
        expect(timingSafeEqualString('abcd', 'abc')).toBe(false);
        expect(timingSafeEqualString('', 'a')).toBe(false);
    });

    it('returns false when a single byte differs', () => {
        expect(timingSafeEqualString('abc', 'abd')).toBe(false);
        expect(timingSafeEqualString('abc', 'xbc')).toBe(false);
    });

    it('handles non-ASCII input', () => {
        expect(timingSafeEqualString('tökén', 'tökén')).toBe(true);
        expect(timingSafeEqualString('tökén', 'token')).toBe(false);
        expect(timingSafeEqualString('é', 'é')).toBe(false);
    });
});
