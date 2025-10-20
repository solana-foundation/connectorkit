import { describe, it, expect } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useWalletInfo } from './use-wallet-info';
import { ConnectorProvider } from '../ui/connector-provider';
import type { ReactNode } from 'react';

describe('useWalletInfo', () => {
    const mockConfig = {
        clusters: [{ id: 'solana:devnet', name: 'Devnet', rpcUrl: 'https://api.devnet.solana.com' }],
    };

    const wrapper = ({ children }: { children: ReactNode }) => (
        <ConnectorProvider config={mockConfig}>{children}</ConnectorProvider>
    );

    it.skip('should return wallet info structure with all required fields', () => {
        const { result } = renderHook(() => useWalletInfo(), { wrapper });

        // Check individual wallet info fields
        expect(result.current).toHaveProperty('name');
        expect(result.current).toHaveProperty('icon');
        expect(result.current).toHaveProperty('installed');
        expect(result.current).toHaveProperty('connectable');
        expect(result.current).toHaveProperty('connected');

        // Check wallets array
        expect(result.current).toHaveProperty('wallets');
        expect(Array.isArray(result.current.wallets)).toBe(true);
    });

    it.skip('should return empty wallets array when no wallets detected', () => {
        const { result } = renderHook(() => useWalletInfo(), { wrapper });

        expect(result.current.wallets).toEqual([]);
    });

    it.skip('should return null for selected wallet info when not connected', () => {
        const { result } = renderHook(() => useWalletInfo(), { wrapper });

        expect(result.current.name).toBeNull();
        expect(result.current.icon).toBeNull();
        expect(result.current.installed).toBe(false);
        expect(result.current.connectable).toBe(false);
        expect(result.current.connected).toBe(false);
    });

    it.skip('should map wallet info to display format', () => {
        const { result } = renderHook(() => useWalletInfo(), { wrapper });

        // Verify the wallets array structure (even if empty)
        result.current.wallets.forEach(wallet => {
            expect(wallet).toHaveProperty('name');
            expect(wallet).toHaveProperty('icon');
            expect(wallet).toHaveProperty('installed');
            expect(wallet).toHaveProperty('connectable');
        });
    });
});
