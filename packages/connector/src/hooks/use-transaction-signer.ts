/**
 * useTransactionSigner hook
 */

'use client';

import { useMemo } from 'react';
import { useConnector } from '../ui/connector-provider';
import { useConnectorClient } from '../ui/connector-provider';
import { createTransactionSigner, type TransactionSigner } from '../lib/transaction/transaction-signer';
import type { TransactionSignerCapabilities } from '../types/transactions';

/**
 * Return value from useTransactionSigner hook
 */
export interface UseTransactionSignerReturn {
    /**
     * Transaction signer instance (null if not connected)
     * Use this to sign and send transactions
     */
    signer: TransactionSigner | null;

    /**
     * Whether a signer is available and ready to use
     * Useful for disabling transaction buttons
     */
    ready: boolean;

    /**
     * Current wallet address that will sign transactions
     * Null if no wallet connected
     */
    address: string | null;

    /**
     * Signer capabilities (what operations are supported)
     * Always available even if signer is null (shows all false)
     */
    capabilities: TransactionSignerCapabilities;
}

export function useTransactionSigner(): UseTransactionSignerReturn {
    const { selectedWallet, selectedAccount, accounts, cluster, connected } = useConnector();
    const client = useConnectorClient();

    const account = useMemo(
        () => accounts.find(a => a.address === selectedAccount)?.raw ?? null,
        [accounts, selectedAccount],
    );

    const signer = useMemo(() => {
        if (!connected || !selectedWallet || !account) {
            return null;
        }

        return createTransactionSigner({
            wallet: selectedWallet,
            account,
            cluster: cluster ?? undefined,
            eventEmitter: client
                ? {
                      emit: (event: unknown) => {
                          client.emitEvent(event as import('../types/events').ConnectorEvent);
                      },
                  }
                : undefined,
        });
    }, [connected, selectedWallet, account, cluster, client]);

    const capabilities = useMemo(
        () =>
            signer?.getCapabilities() ?? {
                canSign: false,
                canSend: false,
                canSignMessage: false,
                supportsBatchSigning: false,
            },
        [signer],
    );

    return {
        signer,
        ready: Boolean(signer),
        address: selectedAccount,
        capabilities,
    };
}
