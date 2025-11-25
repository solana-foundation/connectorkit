import { describe, it, expect } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useSolanaClient, useGillSolanaClient } from './use-kit-solana-client';
import { ConnectorProvider } from '../ui/connector-provider';
import type { ReactNode } from 'react';

describe('useSolanaClient', () => {
    const mockConfig = {
        clusters: [{ id: 'solana:devnet', name: 'Devnet', rpcUrl: 'https://api.devnet.solana.com' }],
    };

    const wrapper = ({ children }: { children: ReactNode }) => (
        <ConnectorProvider config={mockConfig}>{children}</ConnectorProvider>
    );

    it.skip('should return client and ready status', () => {
        const { result } = renderHook(() => useSolanaClient(), { wrapper });

        expect(result.current).toHaveProperty('client');
        expect(result.current).toHaveProperty('ready');
        expect(typeof result.current.ready).toBe('boolean');
    });

    it.skip('should return null client when not ready', () => {
        const { result } = renderHook(() => useSolanaClient(), { wrapper });

        // Without a cluster selected, client should be null and ready should be false
        expect(result.current.client).toBeNull();
        expect(result.current.ready).toBe(false);
    });

    describe('useGillSolanaClient (deprecated alias)', () => {
        it('should be an alias to useSolanaClient', () => {
            expect(useGillSolanaClient).toBe(useSolanaClient);
        });
    });
});




