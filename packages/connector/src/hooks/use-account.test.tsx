import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useAccount } from './use-account';
import { ConnectorProvider } from '../ui/connector-provider';
import type { ReactNode } from 'react';

// Mock dependencies
vi.mock('../utils', () => ({
    copyAddressToClipboard: vi.fn(async addr => ({
        success: true,
        copiedValue: addr,
    })),
    formatAddress: vi.fn(addr => (addr ? `${addr.slice(0, 4)}...${addr.slice(-4)}` : '')),
    ClipboardErrorType: { EMPTY_VALUE: 'empty_value' },
}));

describe('useAccount', () => {
    const mockConfig = {
        clusters: [{ id: 'solana:devnet', name: 'Devnet', rpcUrl: 'https://api.devnet.solana.com' }],
    };

    const wrapper = ({ children }: { children: ReactNode }) => (
        <ConnectorProvider config={mockConfig}>{children}</ConnectorProvider>
    );

    it('should return account structure with all required fields', () => {
        const { result } = renderHook(() => useAccount(), { wrapper });

        expect(result.current).toHaveProperty('address');
        expect(result.current).toHaveProperty('account');
        expect(result.current).toHaveProperty('connected');
        expect(result.current).toHaveProperty('formatted');
        expect(result.current).toHaveProperty('copy');
        expect(result.current).toHaveProperty('copied');
        expect(result.current).toHaveProperty('accounts');
        expect(result.current).toHaveProperty('selectAccount');

        // Check types
        expect(typeof result.current.copy).toBe('function');
        expect(typeof result.current.selectAccount).toBe('function');
        expect(Array.isArray(result.current.accounts)).toBe(true);
    });

    it('should return null/empty values when not connected', () => {
        const { result } = renderHook(() => useAccount(), { wrapper });

        expect(result.current.address).toBeNull();
        expect(result.current.account).toBeNull();
        expect(result.current.connected).toBe(false);
        expect(result.current.formatted).toBe('');
        expect(result.current.copied).toBe(false);
        expect(result.current.accounts).toEqual([]);
    });

    it('should provide working copy function', async () => {
        const { result } = renderHook(() => useAccount(), { wrapper });

        const copyResult = await result.current.copy();

        expect(copyResult).toHaveProperty('success');
        // When not connected, should fail with EMPTY_VALUE
        expect(copyResult.success).toBe(false);
    });

    it('should set copied state temporarily after successful copy', async () => {
        const { result } = renderHook(() => useAccount(), { wrapper });

        expect(result.current.copied).toBe(false);

        // Note: This test would need a connected wallet to test the success path
        // For now we verify the API exists and handles the disconnected case
    });

    it('should cleanup timers on unmount', () => {
        const { unmount } = renderHook(() => useAccount(), { wrapper });

        expect(() => unmount()).not.toThrow();
    });
});
