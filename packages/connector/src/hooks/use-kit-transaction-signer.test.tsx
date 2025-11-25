import { describe, it, expect } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useKitTransactionSigner, useGillTransactionSigner } from './use-kit-transaction-signer';
import { ConnectorProvider } from '../ui/connector-provider';
import type { ReactNode } from 'react';

describe('useKitTransactionSigner', () => {
    const mockConfig = {
        clusters: [{ id: 'solana:devnet', name: 'Devnet', rpcUrl: 'https://api.devnet.solana.com' }],
    };

    const wrapper = ({ children }: { children: ReactNode }) => (
        <ConnectorProvider config={mockConfig}>{children}</ConnectorProvider>
    );

    it.skip('should return signer and ready status', () => {
        const { result } = renderHook(() => useKitTransactionSigner(), { wrapper });

        expect(result.current).toHaveProperty('signer');
        expect(result.current).toHaveProperty('ready');
        expect(typeof result.current.ready).toBe('boolean');
    });

    it.skip('should return null signer when not ready (no wallet connected)', () => {
        const { result } = renderHook(() => useKitTransactionSigner(), { wrapper });

        expect(result.current.signer).toBeNull();
        expect(result.current.ready).toBe(false);
    });

    describe('useGillTransactionSigner (deprecated alias)', () => {
        it('should be an alias to useKitTransactionSigner', () => {
            expect(useGillTransactionSigner).toBe(useKitTransactionSigner);
        });
    });
});




