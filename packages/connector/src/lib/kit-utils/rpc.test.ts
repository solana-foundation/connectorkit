import { describe, it, expect } from 'vitest';
import { getPublicSolanaRpcUrl, getWebSocketUrl, localnet } from './rpc';

describe('getPublicSolanaRpcUrl', () => {
    it('returns mainnet-beta url for mainnet-beta moniker', () => {
        const rpcUrl = getPublicSolanaRpcUrl('mainnet-beta');
        expect(rpcUrl).toBe('https://api.mainnet-beta.solana.com');
    });

    it('returns mainnet-beta url for mainnet moniker', () => {
        const rpcUrl = getPublicSolanaRpcUrl('mainnet');
        expect(rpcUrl).toBe('https://api.mainnet-beta.solana.com');
    });

    it('returns devnet url for devnet moniker', () => {
        const rpcUrl = getPublicSolanaRpcUrl('devnet');
        expect(rpcUrl).toBe('https://api.devnet.solana.com');
    });

    it('returns testnet url for testnet moniker', () => {
        const rpcUrl = getPublicSolanaRpcUrl('testnet');
        expect(rpcUrl).toBe('https://api.testnet.solana.com');
    });

    it('returns localnet url for localnet moniker', () => {
        const rpcUrl = getPublicSolanaRpcUrl('localnet');
        expect(rpcUrl).toBe('http://127.0.0.1:8899');
    });

    it('returns localhost url for localhost moniker', () => {
        const rpcUrl = getPublicSolanaRpcUrl('localhost');
        expect(rpcUrl).toBe('http://127.0.0.1:8899');
    });

    it('throws error on unsupported moniker', () => {
        // @ts-expect-error - testing invalid moniker
        expect(() => getPublicSolanaRpcUrl('not-supported')).toThrow('Invalid cluster moniker');
    });

    it('throws error when URL is provided instead of moniker', () => {
        // @ts-expect-error - URLs are not supported
        expect(() => getPublicSolanaRpcUrl('https://google.com')).toThrow('Invalid cluster moniker');
    });
});

describe('getWebSocketUrl', () => {
    it('converts https to wss', () => {
        const wsUrl = getWebSocketUrl('https://api.mainnet-beta.solana.com');
        expect(wsUrl).toBe('wss://api.mainnet-beta.solana.com/');
    });

    it('converts http to ws', () => {
        const wsUrl = getWebSocketUrl('http://api.devnet.solana.com');
        expect(wsUrl).toBe('ws://api.devnet.solana.com/');
    });

    it('uses port 8900 for localhost', () => {
        const wsUrl = getWebSocketUrl('http://localhost:8899');
        expect(wsUrl).toBe('ws://localhost:8900/');
    });

    it('uses port 8900 for 127.0.0.1', () => {
        const wsUrl = getWebSocketUrl('http://127.0.0.1:8899');
        expect(wsUrl).toBe('ws://127.0.0.1:8900/');
    });

    it('preserves path in URL', () => {
        const wsUrl = getWebSocketUrl('https://my-rpc.example.com/api/v1');
        expect(wsUrl).toBe('wss://my-rpc.example.com/api/v1');
    });

    it('preserves query params in URL', () => {
        const wsUrl = getWebSocketUrl('https://my-rpc.example.com?api-key=123');
        expect(wsUrl).toBe('wss://my-rpc.example.com/?api-key=123');
    });
});

describe('localnet', () => {
    it('returns string as LocalnetUrl type', () => {
        const url = localnet('http://127.0.0.1:8899');
        expect(url).toBe('http://127.0.0.1:8899');
    });

    it('accepts any string', () => {
        const url = localnet('http://custom-localnet:9999');
        expect(url).toBe('http://custom-localnet:9999');
    });
});
