/**
 * @connector-kit/connector - useGillSolanaClient hook
 *
 * React hook for Gill's SolanaClient with built-in RPC and WebSocket subscriptions
 * Provides rpc, rpcSubscriptions, sendAndConfirmTransaction, and simulateTransaction
 */

'use client';

import { useMemo } from 'react';
import { createSolanaClient, type SolanaClient, type ModifiedClusterUrl } from 'gill';
import { useCluster } from './use-cluster';

/**
 * Return value from useGillSolanaClient hook
 */
export interface UseGillSolanaClientReturn {
    /**
     * Gill SolanaClient instance with RPC and subscriptions (null if not available)
     * Includes: rpc, rpcSubscriptions, sendAndConfirmTransaction, simulateTransaction
     */
    client: SolanaClient | null;

    /**
     * Whether a client is available and ready to use
     */
    ready: boolean;

    /**
     * RPC endpoint URL
     */
    rpcUrl: string;

    /**
     * Cluster type (mainnet, devnet, testnet, localnet, custom)
     */
    clusterType: 'mainnet' | 'devnet' | 'testnet' | 'localnet' | 'custom' | null;
}

/**
 * Hook for Gill's SolanaClient with automatic RPC and WebSocket subscription management
 *
 * Creates a fully configured SolanaClient based on the current cluster, providing:
 * - Type-safe RPC client
 * - WebSocket subscription client
 * - Built-in sendAndConfirmTransaction helper
 * - Built-in simulateTransaction helper
 *
 * The client is automatically recreated when the cluster changes.
 *
 * @example
 * ```tsx
 * import { useGillSolanaClient, useGillTransactionSigner } from '@connector-kit/connector';
 * import { signTransactionMessageWithSigners } from 'gill';
 *
 * function SendTransaction() {
 *   const { client, ready } = useGillSolanaClient();
 *   const { signer } = useGillTransactionSigner();
 *
 *   const handleSend = async (transaction) => {
 *     if (!client || !signer) return;
 *
 *     // Sign the transaction
 *     const signed = await signTransactionMessageWithSigners(transaction);
 *
 *     // Send and confirm using Gill's built-in helper
 *     await client.sendAndConfirmTransaction(signed, {
 *       commitment: 'confirmed'
 *     });
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
 * // Simulating a transaction
 * function SimulateTransaction() {
 *   const { client } = useGillSolanaClient();
 *
 *   const handleSimulate = async (transaction) => {
 *     if (!client) return;
 *
 *     const simulation = await client.simulateTransaction(transaction, {
 *       sigVerify: false,
 *       commitment: 'processed'
 *     });
 *
 *     console.log('Simulation result:', simulation);
 *   };
 * }
 * ```
 *
 * @example
 * ```tsx
 * // Direct RPC access
 * function GetBalance() {
 *   const { client } = useGillSolanaClient();
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
export function useGillSolanaClient(): UseGillSolanaClientReturn {
    const { rpcUrl, type } = useCluster();

    const client = useMemo(() => {
        if (!rpcUrl || !type) return null;

        try {
            if (type !== 'custom') {
                return createSolanaClient({
                    urlOrMoniker: type,
                });
            }

            return createSolanaClient({
                urlOrMoniker: rpcUrl as ModifiedClusterUrl,
            });
        } catch (error) {
            console.error('Failed to create Gill Solana client:', error);
            return null;
        }
    }, [rpcUrl, type]);

    return {
        client,
        ready: Boolean(client),
        rpcUrl,
        clusterType: type,
    };
}
