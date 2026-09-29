'use client';

import { useMemo } from 'react';
import type { TransactionSigner } from '@solana/kit';
import { createClient, solanaRpc, type TransactionPlannerConfig } from '@solana/connector/kit';
import { signer } from '@solana/kit-plugin-signer';
import { useConnectorClient, useKitTransactionSigner } from '@solana/connector';

function createKitClient(
    walletSigner: TransactionSigner,
    rpcUrl: string,
    transactionConfig?: TransactionPlannerConfig,
) {
    return createClient().use(signer(walletSigner)).use(solanaRpc({ rpcUrl, transactionConfig }));
}

/**
 * A `@solana/kit` plugin client whose payer and identity are the connected wallet.
 *
 * `client.sendTransaction(instructions)` plans, signs, sends, and confirms in a
 * single call, so demos never build a transaction message by hand.
 */
export type KitClient = ReturnType<typeof createKitClient>;

export interface UseKitClientReturn {
    /** Plugin client for the connected wallet and cluster (null when either is missing) */
    client: KitClient | null;
    /** Whether a client is available */
    ready: boolean;
    /**
     * Whether the cluster's RPC endpoint can confirm sends.
     *
     * Confirmation happens over a `signatureNotifications` WebSocket
     * subscription, which the bundled `/api/rpc` route cannot serve — it
     * proxies JSON-RPC over HTTP only.
     */
    canSendTransactions: boolean;
}

function hasWebSocketEndpoint(rpcUrl: string): boolean {
    try {
        return new URL(rpcUrl).pathname !== '/api/rpc';
    } catch {
        return false;
    }
}

export interface UseKitClientOptions {
    /**
     * Planner config passed through to `solanaRpc`. Set `{ version: 1, ... }`
     * to build v1 (SIMD-0296) transactions; omit for the default (version 0).
     */
    transactionConfig?: TransactionPlannerConfig;
}

export function useKitClient(options?: UseKitClientOptions): UseKitClientReturn {
    const { signer: walletSigner } = useKitTransactionSigner();
    const connectorClient = useConnectorClient();
    const rpcUrl = connectorClient?.getRpcUrl() ?? null;
    const transactionConfig = options?.transactionConfig;

    return useMemo(() => {
        if (!walletSigner || !rpcUrl) {
            return { client: null, ready: false, canSendTransactions: false };
        }

        return {
            client: createKitClient(walletSigner, rpcUrl, transactionConfig),
            ready: true,
            canSendTransactions: hasWebSocketEndpoint(rpcUrl),
        };
    }, [rpcUrl, transactionConfig, walletSigner]);
}
