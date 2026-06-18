import { describe, it, expect } from 'vitest';
import { renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import { useSignOffchainMessage } from './use-sign-offchain-message';
import { ConnectorProvider } from '../ui/connector-provider';

describe('useSignOffchainMessage', () => {
    const mockConfig = {
        clusters: [{ id: 'solana:devnet', name: 'Devnet', rpcUrl: 'https://api.devnet.solana.com' }],
    };

    const wrapper = ({ children }: { children: ReactNode }) => (
        <ConnectorProvider config={mockConfig}>{children}</ConnectorProvider>
    );

    it('exposes a disconnected default shape', () => {
        const { result } = renderHook(() => useSignOffchainMessage(), { wrapper });

        expect(result.current.canSignOffchainMessage).toBe(false);
        expect(result.current.ready).toBe(false);
        expect(result.current.supportedMessageVersions).toEqual([]);
        expect(result.current.address).toBeNull();
    });

    it('rejects signing when no wallet is connected', async () => {
        const { result } = renderHook(() => useSignOffchainMessage(), { wrapper });

        await expect(result.current.signOffchainMessage('hi')).rejects.toMatchObject({
            code: 'FEATURE_NOT_SUPPORTED',
        });
    });
});
