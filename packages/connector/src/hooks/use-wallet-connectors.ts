/**
 * useWalletConnectors - vNext wallet connectors hook
 *
 * Provides access to available wallet connectors and their metadata.
 *
 * @example
 * ```tsx
 * const connectors = useWalletConnectors();
 *
 * return (
 *   <ul>
 *     {connectors.map(connector => (
 *       <li key={connector.id}>
 *         <img src={connector.icon} alt={connector.name} />
 *         {connector.name}
 *       </li>
 *     ))}
 *   </ul>
 * );
 * ```
 */

'use client';

import { useContext, useSyncExternalStore, useCallback } from 'react';
import { ConnectorContext } from '../ui/connector-provider';
import type { WalletConnectorMetadata } from '../types/session';

/**
 * Hook to access available wallet connectors.
 * Returns an array of connector metadata (id, name, icon, ready state).
 */
export function useWalletConnectors(): WalletConnectorMetadata[] {
    const client = useContext(ConnectorContext);

    if (!client) {
        throw new Error(
            'useWalletConnectors must be used within ConnectorProvider. ' +
                'Wrap your app with <ConnectorProvider> or <UnifiedProvider> to use wallet hooks.',
        );
    }

    return useSyncExternalStore(
        useCallback(cb => client.subscribe(cb), [client]),
        useCallback(() => client.getSnapshot().connectors, [client]),
        useCallback(() => client.getSnapshot().connectors, [client]),
    );
}
