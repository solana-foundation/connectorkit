/**
 * useWallet - vNext wallet status hook
 *
 * Provides access to the wallet status state machine and derived values.
 * This is the primary hook for checking wallet connection state in vNext.
 *
 * @example
 * ```tsx
 * const { status, isConnected, isConnecting, account, accounts } = useWallet();
 *
 * if (status === 'connected') {
 *   console.log('Connected account:', account);
 * }
 * ```
 */

'use client';

import { useContext, useMemo, useSyncExternalStore, useCallback } from 'react';
import { ConnectorContext } from '../ui/connector-provider';
import type { WalletStatus, WalletConnectorId, SessionAccount, WalletSession } from '../types/session';
import type { Address } from '@solana/addresses';

/**
 * Return type for useWallet hook
 */
export interface UseWalletReturn {
    /**
     * Current wallet status ('disconnected' | 'connecting' | 'connected' | 'error')
     */
    status: WalletStatus['status'];

    /**
     * Full wallet status object for advanced usage
     */
    walletStatus: WalletStatus;

    /**
     * Whether a wallet is connected
     */
    isConnected: boolean;

    /**
     * Whether a wallet connection is in progress
     */
    isConnecting: boolean;

    /**
     * Whether an error occurred
     */
    isError: boolean;

    /**
     * Error object if status is 'error'
     */
    error: Error | null;

    /**
     * Connected connector ID (null if not connected)
     */
    connectorId: WalletConnectorId | null;

    /**
     * Currently selected account address (null if not connected)
     */
    account: Address | null;

    /**
     * All available accounts (empty if not connected)
     */
    accounts: SessionAccount[];

    /**
     * Active session (null if not connected)
     */
    session: WalletSession | null;
}

/**
 * Hook to access the current wallet status and connection state.
 * This is the primary hook for checking wallet state in vNext.
 */
export function useWallet(): UseWalletReturn {
    const client = useContext(ConnectorContext);

    if (!client) {
        throw new Error(
            'useWallet must be used within ConnectorProvider. ' +
                'Wrap your app with <ConnectorProvider> or <UnifiedProvider> to use wallet hooks.',
        );
    }

    const walletStatus = useSyncExternalStore(
        useCallback(cb => client.subscribe(cb), [client]),
        useCallback(() => client.getSnapshot().wallet, [client]),
        useCallback(() => client.getSnapshot().wallet, [client]),
    );

    return useMemo(() => {
        const status = walletStatus.status;
        const isConnected = status === 'connected';
        const isConnecting = status === 'connecting';
        const isError = status === 'error';

        // Extract values based on status
        let connectorId: WalletConnectorId | null = null;
        let account: Address | null = null;
        let accounts: SessionAccount[] = [];
        let session: WalletSession | null = null;
        let error: Error | null = null;

        if (walletStatus.status === 'connected') {
            connectorId = walletStatus.session.connectorId;
            account = walletStatus.session.selectedAccount.address;
            accounts = walletStatus.session.accounts;
            session = walletStatus.session;
        } else if (walletStatus.status === 'connecting') {
            connectorId = walletStatus.connectorId;
        } else if (walletStatus.status === 'error') {
            error = walletStatus.error;
            connectorId = walletStatus.connectorId ?? null;
        }

        return {
            status,
            walletStatus,
            isConnected,
            isConnecting,
            isError,
            error,
            connectorId,
            account,
            accounts,
            session,
        };
    }, [walletStatus]);
}
