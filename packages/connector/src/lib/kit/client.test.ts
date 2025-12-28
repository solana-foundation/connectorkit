import { describe, it, expect, vi } from 'vitest';

vi.mock('@solana/kit', () => ({
    createSolanaRpc: vi.fn(url => ({ url, __type: 'rpc' })),
    createSolanaRpcSubscriptions: vi.fn(url => ({ url, __type: 'rpcSubscriptions' })),
}));

import { createSolanaClient } from './client';

describe('Kit Client Factory', () => {
    describe('createSolanaClient', () => {
        it('should create client from devnet moniker', () => {
            const client = createSolanaClient({ urlOrMoniker: 'devnet' });
            expect(client.rpc).toBeDefined();
            expect(client.rpcSubscriptions).toBeDefined();
            expect(client.urlOrMoniker).toContain('devnet.solana.com');
        });

        it('should create client from mainnet moniker', () => {
            const client = createSolanaClient({ urlOrMoniker: 'mainnet' });
            expect(client.urlOrMoniker).toContain('mainnet-beta.solana.com');
        });

        it('should create client from testnet moniker', () => {
            const client = createSolanaClient({ urlOrMoniker: 'testnet' });
            expect(client.urlOrMoniker).toContain('testnet.solana.com');
        });

        it('should create client from localnet moniker', () => {
            const client = createSolanaClient({ urlOrMoniker: 'localnet' });
            expect(client.urlOrMoniker).toContain('127.0.0.1');
        });

        it('should create client from URL string', () => {
            const client = createSolanaClient({ urlOrMoniker: 'https://custom-rpc.example.com' });
            expect(client.urlOrMoniker).toBe('https://custom-rpc.example.com/');
        });

        it('should throw for missing urlOrMoniker', () => {
            expect(() => createSolanaClient({ urlOrMoniker: '' })).toThrow('Cluster url or moniker is required');
        });

        it('should throw for invalid moniker', () => {
            expect(() => createSolanaClient({ urlOrMoniker: 'invalid-moniker' })).toThrow(
                'Invalid URL or cluster moniker',
            );
        });

        it('should apply custom RPC port', () => {
            const client = createSolanaClient({
                urlOrMoniker: 'https://custom-rpc.example.com',
                rpcConfig: { port: 9999 },
            });
            expect(client.urlOrMoniker).toContain(':9999');
        });
    });
});
