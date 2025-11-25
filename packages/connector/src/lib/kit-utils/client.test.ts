import { describe, it, expect } from 'vitest';
import { createSolanaClient } from './client';

describe('createSolanaClient', () => {
    describe('cluster monikers', () => {
        it('supports mainnet moniker', () => {
            expect(() => createSolanaClient({ urlOrMoniker: 'mainnet' })).not.toThrow();
        });

        it('supports devnet moniker', () => {
            expect(() => createSolanaClient({ urlOrMoniker: 'devnet' })).not.toThrow();
        });

        it('supports testnet moniker', () => {
            expect(() => createSolanaClient({ urlOrMoniker: 'testnet' })).not.toThrow();
        });

        it('supports localnet moniker', () => {
            expect(() => createSolanaClient({ urlOrMoniker: 'localnet' })).not.toThrow();
        });
    });

    describe('custom URLs', () => {
        it('supports https URLs', () => {
            expect(() => createSolanaClient({ urlOrMoniker: 'https://example-rpc.com' })).not.toThrow();
        });

        it('supports http URLs', () => {
            expect(() => createSolanaClient({ urlOrMoniker: 'http://localhost:8899' })).not.toThrow();
        });

        it('supports URLs with paths', () => {
            expect(() => createSolanaClient({ urlOrMoniker: 'https://rpc.example.com/api/v1' })).not.toThrow();
        });

        it('supports URLs with query params', () => {
            expect(() => createSolanaClient({ urlOrMoniker: 'https://rpc.example.com?api-key=123' })).not.toThrow();
        });
    });

    describe('error handling', () => {
        it('throws on invalid moniker', () => {
            expect(() => createSolanaClient({ urlOrMoniker: 'invalid' })).toThrow();
        });

        it('throws on malformed URL', () => {
            expect(() => createSolanaClient({ urlOrMoniker: 'http//invalid' })).toThrow();
        });

        it('throws on unsupported protocol', () => {
            expect(() => createSolanaClient({ urlOrMoniker: 'ftp://invalid.com' })).toThrow('Unsupported protocol');
        });

        it('throws when urlOrMoniker is empty', () => {
            expect(() => createSolanaClient({ urlOrMoniker: '' })).toThrow();
        });
    });

    describe('client structure', () => {
        it('returns rpc client', () => {
            const client = createSolanaClient({ urlOrMoniker: 'devnet' });
            expect(client.rpc).toBeDefined();
        });

        it('returns rpcSubscriptions client', () => {
            const client = createSolanaClient({ urlOrMoniker: 'devnet' });
            expect(client.rpcSubscriptions).toBeDefined();
        });

        it('returns urlOrMoniker', () => {
            const client = createSolanaClient({ urlOrMoniker: 'devnet' });
            expect(client.urlOrMoniker).toBeDefined();
            expect(typeof client.urlOrMoniker).toBe('string');
        });

        it('preserves custom URL in urlOrMoniker', () => {
            const customUrl = 'https://my-rpc.example.com';
            const client = createSolanaClient({ urlOrMoniker: customUrl });
            expect(client.urlOrMoniker).toBe(`${customUrl}/`);
        });
    });

    describe('port configuration', () => {
        it('accepts custom rpc port', () => {
            expect(() =>
                createSolanaClient({
                    urlOrMoniker: 'localnet',
                    rpcConfig: { port: 9999 },
                }),
            ).not.toThrow();
        });

        it('accepts custom rpcSubscriptions port', () => {
            expect(() =>
                createSolanaClient({
                    urlOrMoniker: 'localnet',
                    rpcSubscriptionsConfig: { port: 9000 },
                }),
            ).not.toThrow();
        });

        it('accepts both custom ports', () => {
            expect(() =>
                createSolanaClient({
                    urlOrMoniker: 'localnet',
                    rpcConfig: { port: 9999 },
                    rpcSubscriptionsConfig: { port: 9000 },
                }),
            ).not.toThrow();
        });
    });

    describe('URL object support', () => {
        it('accepts URL object', () => {
            const url = new URL('https://api.devnet.solana.com');
            expect(() => createSolanaClient({ urlOrMoniker: url })).not.toThrow();
        });

        it('accepts URL object with port', () => {
            const url = new URL('http://localhost:8899');
            expect(() => createSolanaClient({ urlOrMoniker: url })).not.toThrow();
        });
    });
});
