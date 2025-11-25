import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
    getClusterRpcUrl,
    getClusterExplorerUrl,
    getTransactionUrl,
    getAddressUrl,
    getTokenUrl,
    getBlockUrl,
    isMainnetCluster,
    isDevnetCluster,
    isTestnetCluster,
    isLocalCluster,
    getClusterName,
    getClusterType,
    type ClusterType,
} from './cluster';
import type { SolanaCluster } from '@wallet-ui/core';

// Mock kit-utils
vi.mock('../lib/kit-utils', () => ({
    getExplorerLink: vi.fn(({ transaction, address, cluster }) => {
        const clusterParam = cluster === 'mainnet' ? '' : `?cluster=${cluster}`;
        if (transaction) return `https://explorer.solana.com/tx/${transaction}${clusterParam}`;
        if (address) return `https://explorer.solana.com/address/${address}${clusterParam}`;
        return `https://explorer.solana.com${clusterParam}`;
    }),
}));

describe('Cluster Utilities', () => {
    const mockClusters: Record<string, SolanaCluster> = {
        mainnet: { id: 'solana:mainnet', label: 'Mainnet', url: 'https://api.mainnet.solana.com' } as SolanaCluster,
        mainnetBeta: { id: 'solana:mainnet-beta', label: 'Mainnet Beta', url: 'https://api.mainnet-beta.solana.com' } as SolanaCluster,
        devnet: { id: 'solana:devnet', label: 'Devnet', url: 'https://api.devnet.solana.com' } as SolanaCluster,
        testnet: { id: 'solana:testnet', label: 'Testnet', url: 'https://api.testnet.solana.com' } as SolanaCluster,
        localnet: { id: 'solana:localnet', label: 'Localnet', url: 'http://localhost:8899' } as SolanaCluster,
        custom: { id: 'custom:test', label: 'Custom', url: 'https://custom-rpc.com' } as SolanaCluster,
    };

    describe('getClusterRpcUrl', () => {
        it('should return RPC URL from cluster object', () => {
            expect(getClusterRpcUrl(mockClusters.mainnet)).toBe('https://api.mainnet.solana.com');
            expect(getClusterRpcUrl(mockClusters.devnet)).toBe('https://api.devnet.solana.com');
            expect(getClusterRpcUrl(mockClusters.testnet)).toBe('https://api.testnet.solana.com');
            expect(getClusterRpcUrl(mockClusters.custom)).toBe('https://custom-rpc.com');
        });

        it('should handle string cluster names', () => {
            const url = getClusterRpcUrl('mainnet-beta' as any);
            expect(url).toContain('mainnet');
        });

        it('should handle localnet', () => {
            const url = getClusterRpcUrl(mockClusters.localnet);
            expect(url).toBe('http://localhost:8899');
        });

        it('should throw on null cluster', () => {
            expect(() => getClusterRpcUrl(null as any)).toThrow();
        });

        it('should throw on undefined cluster', () => {
            expect(() => getClusterRpcUrl(undefined as any)).toThrow();
        });
    });

    describe('Explorer URLs', () => {
        it('should generate explorer URL for cluster', () => {
            const url = getClusterExplorerUrl(mockClusters.mainnet);
            expect(url).toContain('explorer.solana.com');
        });

        it('should generate transaction explorer URL', () => {
            const sig = 'test-signature';
            const url = getTransactionUrl(sig, mockClusters.devnet);

            expect(url).toContain('explorer.solana.com');
            expect(url).toContain('test-signature');
            expect(url).toContain('cluster=devnet');
        });

        it('should generate address explorer URL', () => {
            const addr = '5eykt4UsFv8P8NJdTREpY1vzqKqZKvdpKucSFTa2KSTu8';
            const url = getAddressUrl(addr, mockClusters.mainnet);

            expect(url).toContain('explorer.solana.com');
            expect(url).toContain(addr);
        });

        it('should generate token URL', () => {
            const token = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'; // USDC
            const url = getTokenUrl(token, mockClusters.mainnet);

            expect(url).toContain('explorer.solana.com');
            expect(url).toContain(token);
        });

        it('should generate block URL', () => {
            const slot = 123456789;
            const url = getBlockUrl(slot, mockClusters.mainnet);

            expect(url).toContain('explorer.solana.com');
            expect(url).toContain('123456789');
        });
    });

    describe('Cluster Type Detection', () => {
        it('should detect mainnet cluster', () => {
            expect(isMainnetCluster(mockClusters.mainnet)).toBe(true);
            expect(isMainnetCluster(mockClusters.mainnetBeta)).toBe(true);
            expect(isMainnetCluster(mockClusters.devnet)).toBe(false);
            expect(isMainnetCluster(mockClusters.testnet)).toBe(false);
        });

        it('should detect devnet cluster', () => {
            expect(isDevnetCluster(mockClusters.devnet)).toBe(true);
            expect(isDevnetCluster(mockClusters.mainnet)).toBe(false);
        });

        it('should detect testnet cluster', () => {
            expect(isTestnetCluster(mockClusters.testnet)).toBe(true);
            expect(isTestnetCluster(mockClusters.devnet)).toBe(false);
        });

        it('should detect localnet cluster', () => {
            expect(isLocalCluster(mockClusters.localnet)).toBe(true);
            expect(isLocalCluster(mockClusters.mainnet)).toBe(false);
        });
    });

    describe('Cluster Metadata', () => {
        it('should get cluster name', () => {
            expect(getClusterName(mockClusters.mainnet)).toBe('Mainnet');
            expect(getClusterName(mockClusters.devnet)).toBe('Devnet');
            expect(getClusterName(mockClusters.custom)).toBe('Custom');
        });

        it('should get cluster type', () => {
            expect(getClusterType(mockClusters.mainnet)).toBe('mainnet');
            expect(getClusterType(mockClusters.devnet)).toBe('devnet');
            expect(getClusterType(mockClusters.testnet)).toBe('testnet');
            expect(getClusterType(mockClusters.localnet)).toBe('localnet');
            expect(getClusterType(mockClusters.custom)).toBe('custom');
        });
    });
});
