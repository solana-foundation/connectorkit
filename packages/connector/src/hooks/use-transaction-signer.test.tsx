import { describe, it, expect } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useTransactionSigner } from './use-transaction-signer';
import { ConnectorProvider } from '../ui/connector-provider';
import type { ReactNode } from 'react';

describe('useTransactionSigner', () => {
    const mockConfig = {
        clusters: [{ id: 'solana:devnet', name: 'Devnet', rpcUrl: 'https://api.devnet.solana.com' }],
    };

    const wrapper = ({ children }: { children: ReactNode }) => (
        <ConnectorProvider config={mockConfig}>{children}</ConnectorProvider>
    );

    it.skip('should return signer, capabilities, and ready status', () => {
        const { result } = renderHook(() => useTransactionSigner(), { wrapper });

        expect(result.current).toHaveProperty('signer');
        expect(result.current).toHaveProperty('ready');
        expect(result.current).toHaveProperty('capabilities');

        // Check capabilities structure
        expect(result.current.capabilities).toHaveProperty('canSign');
        expect(result.current.capabilities).toHaveProperty('canSend');
        expect(result.current.capabilities).toHaveProperty('canSignMessage');
        expect(result.current.capabilities).toHaveProperty('supportsBatchSigning');

        // All should be booleans
        expect(typeof result.current.capabilities.canSign).toBe('boolean');
        expect(typeof result.current.capabilities.canSend).toBe('boolean');
        expect(typeof result.current.capabilities.canSignMessage).toBe('boolean');
        expect(typeof result.current.capabilities.supportsBatchSigning).toBe('boolean');
    });

    it.skip('should return null signer when not connected', () => {
        const { result } = renderHook(() => useTransactionSigner(), { wrapper });

        expect(result.current.signer).toBeNull();
        expect(result.current.ready).toBe(false);
    });

    it.skip('should return default capabilities when no signer', () => {
        const { result } = renderHook(() => useTransactionSigner(), { wrapper });

        // When not connected, capabilities should all be false
        expect(result.current.capabilities.canSign).toBe(false);
        expect(result.current.capabilities.canSend).toBe(false);
        expect(result.current.capabilities.canSignMessage).toBe(false);
        expect(result.current.capabilities.supportsBatchSigning).toBe(false);
    });
});
