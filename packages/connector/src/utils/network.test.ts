/**
 * Network utilities tests
 *
 * Tests network name normalization and RPC URL functions
 */

import { describe, it, expect } from 'vitest';
import {
    normalizeNetwork,
    toClusterId,
    getDefaultRpcUrl,
    isMainnet,
    isDevnet,
    isTestnet,
    isLocalnet,
    getNetworkDisplayName,
    PUBLIC_RPC_ENDPOINTS,
} from './network';

describe('normalizeNetwork', () => {
    it('should normalize mainnet-beta to mainnet', () => {
        expect(normalizeNetwork('mainnet-beta')).toBe('mainnet');
    });

    it('should normalize MAINNET to mainnet', () => {
        expect(normalizeNetwork('MAINNET')).toBe('mainnet');
    });

    it('should keep mainnet as mainnet', () => {
        expect(normalizeNetwork('mainnet')).toBe('mainnet');
    });

    it('should normalize devnet', () => {
        expect(normalizeNetwork('DEVNET')).toBe('devnet');
        expect(normalizeNetwork('devnet')).toBe('devnet');
    });

    it('should normalize testnet', () => {
        expect(normalizeNetwork('TESTNET')).toBe('testnet');
        expect(normalizeNetwork('testnet')).toBe('testnet');
    });

    it('should normalize localnet', () => {
        expect(normalizeNetwork('LOCALNET')).toBe('localnet');
        expect(normalizeNetwork('localnet')).toBe('localnet');
    });

    it('should default unknown networks to mainnet', () => {
        expect(normalizeNetwork('unknown')).toBe('mainnet');
        expect(normalizeNetwork('custom')).toBe('mainnet');
        expect(normalizeNetwork('')).toBe('mainnet');
    });
});

describe('toClusterId', () => {
    it('should convert mainnet to cluster ID', () => {
        expect(toClusterId('mainnet')).toBe('solana:mainnet');
    });

    it('should convert mainnet-beta to cluster ID', () => {
        expect(toClusterId('mainnet-beta')).toBe('solana:mainnet');
    });

    it('should convert devnet to cluster ID', () => {
        expect(toClusterId('devnet')).toBe('solana:devnet');
    });

    it('should convert testnet to cluster ID', () => {
        expect(toClusterId('testnet')).toBe('solana:testnet');
    });

    it('should convert localnet to cluster ID', () => {
        expect(toClusterId('localnet')).toBe('solana:localnet');
    });

    it('should handle uppercase network names', () => {
        expect(toClusterId('MAINNET')).toBe('solana:mainnet');
        expect(toClusterId('DEVNET')).toBe('solana:devnet');
    });
});

describe('getDefaultRpcUrl', () => {
    it('should return mainnet RPC URL', () => {
        const url = getDefaultRpcUrl('mainnet');
        expect(url).toContain('mainnet');
        expect(url).toContain('http');
    });

    it('should return devnet RPC URL', () => {
        const url = getDefaultRpcUrl('devnet');
        expect(url).toContain('devnet');
        expect(url).toContain('http');
    });

    it('should return testnet RPC URL', () => {
        const url = getDefaultRpcUrl('testnet');
        expect(url).toContain('testnet');
        expect(url).toContain('http');
    });

    it('should return localnet RPC URL', () => {
        const url = getDefaultRpcUrl('localnet');
        // Accept either localhost or 127.0.0.1 (they're functionally equivalent)
        expect(url).toMatch(/^http:\/\/(localhost|127\.0\.0\.1):8899$/);
    });

    it('should handle mainnet-beta', () => {
        const url = getDefaultRpcUrl('mainnet-beta');
        expect(url).toContain('mainnet');
    });

    it('should handle uppercase network names', () => {
        const url = getDefaultRpcUrl('MAINNET');
        expect(url).toContain('mainnet');
    });

    it('should fallback for unknown networks', () => {
        const url = getDefaultRpcUrl('unknown-network');
        expect(url).toBeDefined();
        expect(url.startsWith('http')).toBe(true);
    });
});

describe('isMainnet', () => {
    it('should return true for mainnet', () => {
        expect(isMainnet('mainnet')).toBe(true);
    });

    it('should return true for mainnet-beta', () => {
        expect(isMainnet('mainnet-beta')).toBe(true);
    });

    it('should return true for MAINNET', () => {
        expect(isMainnet('MAINNET')).toBe(true);
    });

    it('should return false for devnet', () => {
        expect(isMainnet('devnet')).toBe(false);
    });

    it('should return false for testnet', () => {
        expect(isMainnet('testnet')).toBe(false);
    });

    it('should return false for localnet', () => {
        expect(isMainnet('localnet')).toBe(false);
    });
});

describe('isDevnet', () => {
    it('should return true for devnet', () => {
        expect(isDevnet('devnet')).toBe(true);
    });

    it('should return true for DEVNET', () => {
        expect(isDevnet('DEVNET')).toBe(true);
    });

    it('should return false for mainnet', () => {
        expect(isDevnet('mainnet')).toBe(false);
    });

    it('should return false for testnet', () => {
        expect(isDevnet('testnet')).toBe(false);
    });

    it('should return false for localnet', () => {
        expect(isDevnet('localnet')).toBe(false);
    });
});

describe('isTestnet', () => {
    it('should return true for testnet', () => {
        expect(isTestnet('testnet')).toBe(true);
    });

    it('should return true for TESTNET', () => {
        expect(isTestnet('TESTNET')).toBe(true);
    });

    it('should return false for mainnet', () => {
        expect(isTestnet('mainnet')).toBe(false);
    });

    it('should return false for devnet', () => {
        expect(isTestnet('devnet')).toBe(false);
    });

    it('should return false for localnet', () => {
        expect(isTestnet('localnet')).toBe(false);
    });
});

describe('isLocalnet', () => {
    it('should return true for localnet', () => {
        expect(isLocalnet('localnet')).toBe(true);
    });

    it('should return true for LOCALNET', () => {
        expect(isLocalnet('LOCALNET')).toBe(true);
    });

    it('should return false for mainnet', () => {
        expect(isLocalnet('mainnet')).toBe(false);
    });

    it('should return false for devnet', () => {
        expect(isLocalnet('devnet')).toBe(false);
    });

    it('should return false for testnet', () => {
        expect(isLocalnet('testnet')).toBe(false);
    });
});

describe('getNetworkDisplayName', () => {
    it('should return capitalized mainnet', () => {
        expect(getNetworkDisplayName('mainnet')).toBe('Mainnet');
    });

    it('should return capitalized devnet', () => {
        expect(getNetworkDisplayName('devnet')).toBe('Devnet');
    });

    it('should return capitalized testnet', () => {
        expect(getNetworkDisplayName('testnet')).toBe('Testnet');
    });

    it('should return capitalized localnet', () => {
        expect(getNetworkDisplayName('localnet')).toBe('Localnet');
    });

    it('should handle mainnet-beta', () => {
        expect(getNetworkDisplayName('mainnet-beta')).toBe('Mainnet');
    });

    it('should handle uppercase names', () => {
        expect(getNetworkDisplayName('MAINNET')).toBe('Mainnet');
        expect(getNetworkDisplayName('DEVNET')).toBe('Devnet');
    });
});

describe('PUBLIC_RPC_ENDPOINTS', () => {
    it('should have all network endpoints', () => {
        expect(PUBLIC_RPC_ENDPOINTS.mainnet).toBeDefined();
        expect(PUBLIC_RPC_ENDPOINTS.devnet).toBeDefined();
        expect(PUBLIC_RPC_ENDPOINTS.testnet).toBeDefined();
        expect(PUBLIC_RPC_ENDPOINTS.localnet).toBeDefined();
    });

    it('should have valid URLs', () => {
        Object.values(PUBLIC_RPC_ENDPOINTS).forEach(url => {
            expect(url).toMatch(/^https?:\/\//);
        });
    });

    it('should use localhost for localnet', () => {
        expect(PUBLIC_RPC_ENDPOINTS.localnet).toBe('http://localhost:8899');
    });
});
