/**
 * @solana/connector - useSolanaClient hook
 *
 * React hook for Kit's SolanaClient with built-in RPC and WebSocket subscriptions
 * Provides rpc and rpcSubscriptions
 */

'use client';

import { useMemo } from 'react';
import { createSolanaClient, type SolanaClient, type ModifiedClusterUrl } from '../lib/kit';
import { resolveRpcUrl } from '../lib/kit/client';
import type { SolanaClientUrlOrMoniker } from '../lib/kit/rpc';
import { useCluster } from './use-cluster';
import { useConnectorClient } from '../ui/connector-provider';
import type { ClusterType } from '../utils/cluster';
import { createLogger } from '../lib/utils/secure-logger';

const logger = createLogger('useSolanaClient');

/**
 * One client per resolved RPC URL, shared across all hook instances.
 * Kit's subscription transport only coalesces identical subscriptions within
 * a single transport, so per-hook clients would open one WebSocket per hook;
 * sharing the client makes N hooks share one socket. An idle cached client
 * holds no sockets (channels open lazily on the first subscription and close
 * when the last one ends), so entries never need disposal.
 */
const sharedClients = new Map<string, SolanaClient>();

function getSharedSolanaClient(urlOrMoniker: SolanaClientUrlOrMoniker): SolanaClient {
    const key = resolveRpcUrl(urlOrMoniker).toString();
    let client = sharedClients.get(key);
    if (!client) {
        client = createSolanaClient({ urlOrMoniker: urlOrMoniker as ModifiedClusterUrl });
        sharedClients.set(key, client);
    }
    return client;
}

/** Test-only escape hatch; not exported from the package entrypoints. */
export function clearSharedSolanaClientCache(): void {
    sharedClients.clear();
}

/**
 * Return value from useSolanaClient hook
 */
export interface UseSolanaClientReturn {
    /**
     * Kit SolanaClient instance with RPC and subscriptions (null if not available)
     * Includes: rpc, rpcSubscriptions
     */
    client: SolanaClient | null;

    /**
     * Whether a client is available and ready to use
     */
    ready: boolean;

    /**
     * Cluster type (mainnet, devnet, testnet, localnet, custom)
     */
    clusterType: ClusterType | null;
}

/**
 * @deprecated Use `UseSolanaClientReturn` instead
 */
export type UseGillSolanaClientReturn = UseSolanaClientReturn;

/**
 * Hook for Kit's SolanaClient with automatic RPC and WebSocket subscription management
 *
 * Creates a fully configured SolanaClient based on the current cluster, providing:
 * - Type-safe RPC client
 * - WebSocket subscription client
 *
 * The client is automatically recreated when the cluster changes.
 *
 * @example
 * ```tsx
 * import { useSolanaClient, useKitTransactionSigner } from '@solana/connector';
 * import { signTransactionMessageWithSigners } from '@solana/kit';
 *
 * function SendTransaction() {
 *   const { client, ready } = useSolanaClient();
 *   const { signer } = useKitTransactionSigner();
 *
 *   const handleSend = async (transaction) => {
 *     if (!client || !signer) return;
 *
 *     // Sign the transaction
 *     const signed = await signTransactionMessageWithSigners(transaction);
 *
 *     // Send using RPC client
 *     const signature = await client.rpc.sendTransaction(signed).send();
 *   };
 *
 *   return (
 *     <button onClick={handleSend} disabled={!ready}>
 *       Send Transaction
 *     </button>
 *   );
 * }
 * ```
 *
 * @example
 * ```tsx
 * // Direct RPC access
 * function GetBalance() {
 *   const { client } = useSolanaClient();
 *
 *   const fetchBalance = async (address: Address) => {
 *     if (!client) return;
 *
 *     const balance = await client.rpc.getBalance(address).send();
 *     console.log('Balance:', balance);
 *   };
 * }
 * ```
 */
export function useSolanaClient(): UseSolanaClientReturn {
    const { type } = useCluster();
    const connectorClient = useConnectorClient();

    // Read the URL every render and key the memo on it: the cluster type
    // alone misses a switch between two custom clusters ('custom' both
    // before and after while the URL changes). useCluster subscribes to
    // cluster state, so a switch re-renders this hook.
    const rpcUrl = connectorClient?.getRpcUrl() ?? null;

    const client = useMemo(() => {
        if (!type || !connectorClient) return null;

        try {
            // ALWAYS prefer the configured RPC URL from cluster config
            if (rpcUrl) {
                return getSharedSolanaClient(rpcUrl as ModifiedClusterUrl);
            }

            // Fallback to moniker only if no RPC URL configured
            if (type !== 'custom') {
                return getSharedSolanaClient(type);
            }

            return null;
        } catch (error) {
            logger.error('Failed to create Solana client', { error });
            return null;
        }
    }, [type, connectorClient, rpcUrl]);

    // Memoize return object to prevent infinite re-renders in consumers
    return useMemo(
        () => ({
            client,
            ready: Boolean(client),
            clusterType: type,
        }),
        [client, type],
    );
}

/**
 * @deprecated Use `useSolanaClient` instead. This alias is provided for backward compatibility.
 */
export const useGillSolanaClient = useSolanaClient;
