/**
 * useDisconnectWallet - vNext wallet disconnection hook
 *
 * Provides a function to disconnect the current wallet.
 *
 * @example
 * ```tsx
 * const { disconnect, isDisconnecting } = useDisconnectWallet();
 *
 * return (
 *   <button
 *     onClick={() => disconnect()}
 *     disabled={isDisconnecting}
 *   >
 *     {isDisconnecting ? 'Disconnecting...' : 'Disconnect'}
 *   </button>
 * );
 * ```
 */

'use client';

import { useContext, useCallback, useState } from 'react';
import { ConnectorContext } from '../ui/connector-provider';

/**
 * Return type for useDisconnectWallet hook
 */
export interface UseDisconnectWalletReturn {
    /**
     * Disconnect the current wallet session.
     */
    disconnect: () => Promise<void>;

    /**
     * Whether a disconnection is currently in progress
     */
    isDisconnecting: boolean;
}

/**
 * Hook to disconnect the current wallet.
 * Uses the vNext disconnectWallet API.
 */
export function useDisconnectWallet(): UseDisconnectWalletReturn {
    const client = useContext(ConnectorContext);
    const [isDisconnecting, setIsDisconnecting] = useState(false);

    if (!client) {
        throw new Error(
            'useDisconnectWallet must be used within ConnectorProvider. ' +
                'Wrap your app with <ConnectorProvider> or <UnifiedProvider> to use wallet hooks.',
        );
    }

    const disconnect = useCallback(async () => {
        setIsDisconnecting(true);
        try {
            await client.disconnectWallet();
        } finally {
            setIsDisconnecting(false);
        }
    }, [client]);

    return {
        disconnect,
        isDisconnecting,
    };
}
