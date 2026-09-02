import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';

import { useWalletAssets } from './use-wallet-assets';
import { clearSharedQueryCache } from './use-shared-query';
import { TEST_ADDRESSES } from '../../__tests__/fixtures/accounts';

vi.mock('@solana/react', () => ({ useSubscription: vi.fn() }));
vi.mock('../use-wallet', () => ({ useWallet: vi.fn() }));
vi.mock('../use-kit-solana-client', () => ({ useSolanaClient: vi.fn() }));

const { useSubscription } = await import('@solana/react');
const { useWallet } = await import('../use-wallet');
const { useSolanaClient } = await import('../use-kit-solana-client');

interface MockSubscriptionState {
    data: unknown;
    error: unknown;
    status: string;
}

describe('useWalletAssets', () => {
    let getBalance: ReturnType<typeof vi.fn>;
    let getTokenAccountsByOwner: ReturnType<typeof vi.fn>;
    let accountNotifications: ReturnType<typeof vi.fn>;
    let subscriptionState: MockSubscriptionState;
    let lamports: bigint;

    const makeClient = () => ({
        urlOrMoniker: 'https://rpc.test.example',
        rpc: { getBalance, getTokenAccountsByOwner },
        rpcSubscriptions: { accountNotifications },
    });

    beforeEach(() => {
        clearSharedQueryCache();
        lamports = 1000n;
        getBalance = vi.fn(() => ({ send: async () => ({ value: lamports }) }));
        getTokenAccountsByOwner = vi.fn(() => ({ send: async () => ({ value: [] }) }));
        accountNotifications = vi.fn(() => ({ subscription: 'source' }));
        subscriptionState = { data: undefined, error: null, status: 'connecting' };

        vi.mocked(useSubscription).mockImplementation(
            () => subscriptionState as unknown as ReturnType<typeof useSubscription>,
        );
        vi.mocked(useWallet).mockReturnValue({
            account: TEST_ADDRESSES.ACCOUNT_1,
            isConnected: true,
        } as unknown as ReturnType<typeof useWallet>);
        vi.mocked(useSolanaClient).mockImplementation(
            () =>
                ({
                    client: makeClient(),
                    ready: true,
                    clusterType: 'devnet',
                }) as unknown as ReturnType<typeof useSolanaClient>,
        );
    });

    afterEach(() => {
        vi.useRealTimers();
        vi.clearAllMocks();
    });

    it('keeps polling after the subscription reports loaded', async () => {
        vi.useFakeTimers();
        const { rerender } = renderHook(() => useWalletAssets({ liveUpdates: true, refetchIntervalMs: 500 }));
        await act(async () => {
            await vi.advanceTimersByTimeAsync(0);
        });
        // The subscription is live — the wallet system account delivered data.
        // SPL token changes never notify it, so polling must not stop.
        subscriptionState = { data: { value: { lamports: 1000n } }, error: null, status: 'loaded' };
        await act(async () => {
            rerender();
        });
        const callsAfterLoad = getBalance.mock.calls.length;

        await act(async () => {
            await vi.advanceTimersByTimeAsync(1600);
        });

        expect(getBalance.mock.calls.length).toBeGreaterThanOrEqual(callsAfterLoad + 2);
    });

    it('applies pushed lamports to the shared cache immediately and refetches once', async () => {
        const { result, rerender } = renderHook(() => useWalletAssets({ liveUpdates: true }));
        await waitFor(() => expect(result.current.data?.lamports).toBe(1000n));
        const callsBeforePush = getBalance.mock.calls.length;

        lamports = 5000n;
        subscriptionState = { data: { value: { lamports: 5000n } }, error: null, status: 'loaded' };
        await act(async () => {
            rerender();
        });

        // The pushed value is visible without waiting for the refetch...
        expect(result.current.data?.lamports).toBe(5000n);
        // ...and one full refetch runs to pick up token deltas.
        await waitFor(() => expect(getBalance.mock.calls.length).toBe(callsBeforePush + 1));
        await waitFor(() => expect(result.current.data?.lamports).toBe(5000n));
    });

    it('ignores notifications for accounts that do not exist on chain', async () => {
        const { result, rerender } = renderHook(() => useWalletAssets({ liveUpdates: true }));
        await waitFor(() => expect(result.current.data?.lamports).toBe(1000n));
        const callsBefore = getBalance.mock.calls.length;

        subscriptionState = { data: { value: null }, error: null, status: 'loaded' };
        await act(async () => {
            rerender();
        });

        expect(result.current.data?.lamports).toBe(1000n);
        expect(getBalance.mock.calls.length).toBe(callsBefore);
    });

    it('does not subscribe when liveUpdates is disabled', async () => {
        const { result } = renderHook(() => useWalletAssets());
        await waitFor(() => expect(result.current.data).toBeDefined());

        expect(accountNotifications).not.toHaveBeenCalled();
        expect(vi.mocked(useSubscription)).toHaveBeenLastCalledWith(null);
    });
});
