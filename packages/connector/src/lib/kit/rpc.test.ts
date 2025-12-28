import { describe, it, expect } from 'vitest';
import { getPublicSolanaRpcUrl, getWebSocketUrl, localnet } from './rpc';

describe('RPC Utilities', () => {
    describe('getPublicSolanaRpcUrl', () => {
        it('should return devnet URL', () => {
            expect(getPublicSolanaRpcUrl('devnet')).toBe('https://api.devnet.solana.com');
        });

        it('should return testnet URL', () => {
            expect(getPublicSolanaRpcUrl('testnet')).toBe('https://api.testnet.solana.com');
        });

        it('should return mainnet URL', () => {
            expect(getPublicSolanaRpcUrl('mainnet')).toBe('https://api.mainnet-beta.solana.com');
        });

        it('should return mainnet-beta URL', () => {
            expect(getPublicSolanaRpcUrl('mainnet-beta')).toBe('https://api.mainnet-beta.solana.com');
        });

        it('should return localnet URL', () => {
            expect(getPublicSolanaRpcUrl('localnet')).toBe('http://127.0.0.1:8899');
        });

        it('should return localhost URL', () => {
            expect(getPublicSolanaRpcUrl('localhost')).toBe('http://127.0.0.1:8899');
        });

        it('should throw for invalid cluster', () => {
            expect(() => getPublicSolanaRpcUrl('invalid' as 'devnet')).toThrow('Invalid cluster moniker');
        });
    });

    describe('getWebSocketUrl', () => {
        it('should convert http to ws', () => {
            expect(getWebSocketUrl('http://example.com')).toBe('ws://example.com/');
        });

        it('should convert https to wss', () => {
            expect(getWebSocketUrl('https://example.com')).toBe('wss://example.com/');
        });

        it('should set port 8900 for localhost', () => {
            expect(getWebSocketUrl('http://localhost:8899')).toBe('ws://localhost:8900/');
        });

        it('should set port 8900 for 127.0.0.1', () => {
            expect(getWebSocketUrl('http://127.0.0.1:8899')).toBe('ws://127.0.0.1:8900/');
        });
    });

    describe('localnet', () => {
        it('should return the string as LocalnetUrl type', () => {
            const url = localnet('http://localhost:8899');
            expect(url).toBe('http://localhost:8899');
        });
    });
});
