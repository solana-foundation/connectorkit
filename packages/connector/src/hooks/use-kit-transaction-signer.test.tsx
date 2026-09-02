import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import type { SolanaCluster } from '@wallet-ui/core';
import { useKitTransactionSigner, useGillTransactionSigner } from './use-kit-transaction-signer';
import { ConnectorProvider, useConnector } from '../ui/connector-provider';
import { createMockPhantomWallet } from '../__tests__/mocks/wallet-standard-mock';
import { createMockWalletAccount, TEST_ADDRESSES } from '../__tests__/fixtures/accounts';
import type { ReactNode } from 'react';

vi.mock('../ui/connector-provider', async importOriginal => {
    const actual = await importOriginal<typeof import('../ui/connector-provider')>();
    return { ...actual, useConnector: vi.fn() };
});

function connectorState(cluster: SolanaCluster | null, overrides: Record<string, unknown> = {}) {
    const account = createMockWalletAccount(TEST_ADDRESSES.ACCOUNT_1, {
        chains: ['solana:mainnet', 'solana:devnet', 'solana:testnet'],
        features: ['solana:signTransaction'],
    });
    const wallet = createMockPhantomWallet({ accounts: [account], features: ['solana:signTransaction'] });
    return {
        connected: true,
        selectedWallet: wallet,
        selectedAccount: TEST_ADDRESSES.ACCOUNT_1,
        accounts: [{ address: TEST_ADDRESSES.ACCOUNT_1, raw: account }],
        cluster,
        ...overrides,
    } as unknown as ReturnType<typeof useConnector>;
}

describe('useKitTransactionSigner', () => {
    const mockConfig = {
        clusters: [{ id: 'solana:devnet', name: 'Devnet', rpcUrl: 'https://api.devnet.solana.com' }],
    };

    const wrapper = ({ children }: { children: ReactNode }) => (
        <ConnectorProvider config={mockConfig}>{children}</ConnectorProvider>
    );

    beforeEach(() => {
        vi.mocked(useConnector).mockReset();
    });

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

    describe('chain derivation', () => {
        it('builds a signer for the solana:mainnet-beta cluster id', () => {
            vi.mocked(useConnector).mockReturnValue(
                connectorState({ id: 'solana:mainnet-beta', label: 'Mainnet', url: 'https://rpc.example.com' }),
            );

            const { result } = renderHook(() => useKitTransactionSigner());

            expect(result.current.signer).not.toBeNull();
            expect(result.current.ready).toBe(true);
            expect(result.current.reason).toBeNull();
        });

        it('reports unsupported-chain for a custom cluster instead of silently disabling', () => {
            vi.mocked(useConnector).mockReturnValue(
                connectorState({ id: 'solana:my-fork', label: 'Fork', url: 'https://rpc.example.com' }),
            );

            const { result } = renderHook(() => useKitTransactionSigner());

            expect(result.current.signer).toBeNull();
            expect(result.current.ready).toBe(false);
            expect(result.current.reason).toBe('unsupported-chain');
        });

        it('builds a signer for a custom cluster with an explicit chain override', () => {
            vi.mocked(useConnector).mockReturnValue(
                connectorState({ id: 'solana:my-fork', label: 'Fork', url: 'https://rpc.example.com' }),
            );

            const { result } = renderHook(() => useKitTransactionSigner({ chain: 'solana:mainnet' }));

            expect(result.current.signer).not.toBeNull();
            expect(result.current.reason).toBeNull();
        });

        it('reports disconnected when no wallet is connected', () => {
            vi.mocked(useConnector).mockReturnValue(
                connectorState({ id: 'solana:devnet', label: 'Devnet', url: 'https://api.devnet.solana.com' }, {
                    connected: false,
                    selectedWallet: null,
                    accounts: [],
                    selectedAccount: null,
                }),
            );

            const { result } = renderHook(() => useKitTransactionSigner());

            expect(result.current.signer).toBeNull();
            expect(result.current.reason).toBe('disconnected');
        });
    });

    describe('useGillTransactionSigner (deprecated alias)', () => {
        it('should be an alias to useKitTransactionSigner', () => {
            expect(useGillTransactionSigner).toBe(useKitTransactionSigner);
        });
    });
});
