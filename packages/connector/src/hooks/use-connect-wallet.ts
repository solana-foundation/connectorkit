/**
 * useConnectWallet - vNext wallet connection hook
 *
 * Provides a function to connect to a wallet by connector ID.
 *
 * @example
 * ```tsx
 * const { connect, isConnecting, error } = useConnectWallet();
 *
 * return (
 *   <button
 *     onClick={() => connect('wallet-standard:phantom')}
 *     disabled={isConnecting}
 *   >
 *     {isConnecting ? 'Connecting...' : 'Connect Phantom'}
 *   </button>
 * );
 * ```
 */

'use client';

import { useContext, useCallback, useState } from 'react';
import { ConnectorContext } from '../ui/connector-provider';
import type { WalletConnectorId, ConnectOptions } from '../types/session';

/**
 * Return type for useConnectWallet hook
 */
export interface UseConnectWalletReturn {
    /**
     * Connect to a wallet by connector ID.
     *
     * @param connectorId - Stable connector identifier (e.g., 'wallet-standard:phantom')
     * @param options - Connection options (silent mode, preferred account)
     */
    connect: (connectorId: WalletConnectorId, options?: ConnectOptions) => Promise<void>;

    /**
     * Whether a connection is currently in progress
     */
    isConnecting: boolean;

    /**
     * Error from the last connection attempt (null if none)
     */
    error: Error | null;

    /**
     * Reset the error state
     */
    resetError: () => void;
}

/**
 * Hook to connect to a wallet by connector ID.
 * Uses the vNext connectWallet API with silent-first support.
 */
export function useConnectWallet(): UseConnectWalletReturn {
    const client = useContext(ConnectorContext);
    const [isConnecting, setIsConnecting] = useState(false);
    const [error, setError] = useState<Error | null>(null);

    if (!client) {
        throw new Error(
            'useConnectWallet must be used within ConnectorProvider. ' +
                'Wrap your app with <ConnectorProvider> or <UnifiedProvider> to use wallet hooks.',
        );
    }

    const connect = useCallback(
        async (connectorId: WalletConnectorId, options?: ConnectOptions) => {
            setIsConnecting(true);
            setError(null);

            try {
                await client.connectWallet(connectorId, options);
            } catch (e) {
                const connectError = e instanceof Error ? e : new Error(String(e));
                setError(connectError);
                throw connectError;
            } finally {
                setIsConnecting(false);
            }
        },
        [client],
    );

    const resetError = useCallback(() => {
        setError(null);
    }, []);

    return {
        connect,
        isConnecting,
        error,
        resetError,
    };
}
