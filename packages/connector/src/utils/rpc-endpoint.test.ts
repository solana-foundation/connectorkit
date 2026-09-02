import { describe, it, expect } from 'vitest';
import { getClusterTypeFromRpcEndpoint } from './rpc-endpoint';

describe('getClusterTypeFromRpcEndpoint', () => {
    it.each([
        ['https://api.mainnet-beta.solana.com', 'mainnet'],
        ['https://mainnet.helius-rpc.com', 'mainnet'],
        ['https://api.testnet.solana.com', 'testnet'],
        ['https://api.devnet.solana.com', 'devnet'],
        ['http://localhost:8899', 'localnet'],
        ['http://127.0.0.1:8899', 'localnet'],
        ['http://0.0.0.0:8899', 'localnet'],
        ['http://[::1]:8899', 'localnet'],
        ['https://rpc.example.com', 'custom'],
        ['not a url', 'custom'],
        ['', 'custom'],
    ] as const)('classifies %s as %s', (endpoint, expected) => {
        expect(getClusterTypeFromRpcEndpoint(endpoint)).toBe(expected);
    });

    it('falls back to substring matching for local endpoints that do not parse as URLs', () => {
        expect(getClusterTypeFromRpcEndpoint('localhost:8899')).toBe('localnet');
    });
});
