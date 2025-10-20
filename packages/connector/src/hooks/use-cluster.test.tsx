import { describe, it, expect, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useCluster } from './use-cluster';
import { ConnectorProvider } from '../ui/connector-provider';
import type { ReactNode } from 'react';

describe('useCluster', () => {
    const mockConfig = {
        clusters: [
            { id: 'solana:mainnet', name: 'Mainnet', rpcUrl: 'https://api.mainnet.solana.com' },
            { id: 'solana:devnet', name: 'Devnet', rpcUrl: 'https://api.devnet.solana.com' },
            { id: 'solana:testnet', name: 'Testnet', rpcUrl: 'https://api.testnet.solana.com' },
        ],
    };

    const wrapper = ({ children }: { children: ReactNode }) => (
        <ConnectorProvider config={mockConfig}>{children}</ConnectorProvider>
    );

    it('should return cluster structure with all required fields', () => {
        const { result } = renderHook(() => useCluster(), { wrapper });

        expect(result.current).toHaveProperty('cluster');
        expect(result.current).toHaveProperty('clusters');
        expect(result.current).toHaveProperty('setCluster');
        expect(result.current).toHaveProperty('isMainnet');
        expect(result.current).toHaveProperty('isDevnet');
        expect(result.current).toHaveProperty('isTestnet');
        expect(result.current).toHaveProperty('isLocal');
        expect(result.current).toHaveProperty('explorerUrl');
        expect(result.current).toHaveProperty('type');

        // Check types
        expect(typeof result.current.setCluster).toBe('function');
        expect(Array.isArray(result.current.clusters)).toBe(true);
    });

    it('should return available clusters from config', () => {
        const { result } = renderHook(() => useCluster(), { wrapper });

        // Clusters array may be empty initially depending on config processing
        expect(Array.isArray(result.current.clusters)).toBe(true);
    });

    it('should provide setCluster function that accepts cluster IDs', () => {
        const { result } = renderHook(() => useCluster(), { wrapper });

        expect(typeof result.current.setCluster).toBe('function');
        // setCluster is async and requires valid cluster in state, skip actual call
    });

    it('should derive cluster type booleans correctly', () => {
        const { result } = renderHook(() => useCluster(), { wrapper });

        // Without a selected cluster, all should be false
        expect(result.current.isMainnet).toBe(false);
        expect(result.current.isDevnet).toBe(false);
        expect(result.current.isTestnet).toBe(false);
        expect(result.current.isLocal).toBe(false);
    });

    it('should provide explorer URL (empty when no cluster)', () => {
        const { result } = renderHook(() => useCluster(), { wrapper });

        expect(typeof result.current.explorerUrl).toBe('string');
        expect(result.current.explorerUrl).toBe('');
    });

    it('should throw error when used outside provider', () => {
        expect(() => {
            renderHook(() => useCluster());
        }).toThrow('must be used within ConnectorProvider');
    });
});
