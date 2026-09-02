import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useSolanaClient, useGillSolanaClient, clearSharedSolanaClientCache } from './use-kit-solana-client';
import { useCluster } from './use-cluster';
import { useConnectorClient } from '../ui/connector-provider';
import type { ClusterType } from '../utils/cluster';

vi.mock('./use-cluster', () => ({ useCluster: vi.fn() }));
vi.mock('../ui/connector-provider', async importOriginal => {
    const actual = await importOriginal<typeof import('../ui/connector-provider')>();
    return { ...actual, useConnectorClient: vi.fn() };
});

function mockEnv(type: ClusterType | null, getRpcUrl: () => string | null) {
    vi.mocked(useCluster).mockReturnValue({ type } as unknown as ReturnType<typeof useCluster>);
    vi.mocked(useConnectorClient).mockReturnValue({ getRpcUrl } as unknown as ReturnType<typeof useConnectorClient>);
}

describe('useSolanaClient', () => {
    beforeEach(() => {
        vi.mocked(useCluster).mockReset();
        vi.mocked(useConnectorClient).mockReset();
        clearSharedSolanaClientCache();
    });

    describe('shared client cache', () => {
        it('shares one client (and its subscription transport) across hook instances', () => {
            mockEnv('devnet', () => 'https://api.devnet.solana.com');

            const { result: first } = renderHook(() => useSolanaClient());
            const { result: second } = renderHook(() => useSolanaClient());

            expect(first.current.client).not.toBeNull();
            expect(first.current.client).toBe(second.current.client);
        });

        it('returns a fresh client after the cache is cleared', () => {
            mockEnv('devnet', () => 'https://api.devnet.solana.com');

            const { result: first } = renderHook(() => useSolanaClient());
            expect(first.current.client).not.toBeNull();

            clearSharedSolanaClientCache();
            const { result: second } = renderHook(() => useSolanaClient());

            expect(second.current.client).not.toBeNull();
            expect(second.current.client).not.toBe(first.current.client);
        });

        it('swaps clients when switching between two custom clusters', () => {
            // Same cluster type ('custom') and same connector client identity
            // across the switch — only the resolved RPC URL changes, which is
            // exactly what the memo must react to.
            let url = 'https://rpc-a.example.com';
            mockEnv('custom', () => url);

            const { result, rerender } = renderHook(() => useSolanaClient());
            const clientA = result.current.client;
            expect(clientA).not.toBeNull();

            url = 'https://rpc-b.example.com';
            rerender();

            expect(result.current.client).not.toBeNull();
            expect(result.current.client).not.toBe(clientA);
            expect(String(result.current.client?.urlOrMoniker)).toContain('rpc-b.example.com');
        });

        it('returns null for a custom cluster without a configured RPC URL', () => {
            mockEnv('custom', () => null);

            const { result } = renderHook(() => useSolanaClient());

            expect(result.current.client).toBeNull();
            expect(result.current.ready).toBe(false);
        });
    });

    describe('useGillSolanaClient (deprecated alias)', () => {
        it('should be an alias to useSolanaClient', () => {
            expect(useGillSolanaClient).toBe(useSolanaClient);
        });
    });
});
