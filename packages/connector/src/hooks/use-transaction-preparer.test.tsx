import { describe, it, expect } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useTransactionPreparer } from './use-transaction-preparer';
import { ConnectorProvider } from '../ui/connector-provider';
import type { ReactNode } from 'react';

describe('useTransactionPreparer', () => {
    const mockConfig = {
        clusters: [{ id: 'solana:devnet', name: 'Devnet', rpcUrl: 'https://api.devnet.solana.com' }],
    };

    const wrapper = ({ children }: { children: ReactNode }) => (
        <ConnectorProvider config={mockConfig}>{children}</ConnectorProvider>
    );

    it.skip('should return prepare function and ready status', () => {
        const { result } = renderHook(() => useTransactionPreparer(), { wrapper });

        expect(result.current).toHaveProperty('prepare');
        expect(result.current).toHaveProperty('ready');
        expect(typeof result.current.prepare).toBe('function');
        expect(typeof result.current.ready).toBe('boolean');
    });

    it.skip('should return not ready when no client available', () => {
        const { result } = renderHook(() => useTransactionPreparer(), { wrapper });

        // Without cluster, client won't be ready
        expect(result.current.ready).toBe(false);
    });

    it.skip('should provide prepare function that can be called', () => {
        const { result } = renderHook(() => useTransactionPreparer(), { wrapper });

        expect(typeof result.current.prepare).toBe('function');
        // Verify it's a function that accepts parameters
        expect(result.current.prepare.length).toBeGreaterThanOrEqual(1);
    });
});
