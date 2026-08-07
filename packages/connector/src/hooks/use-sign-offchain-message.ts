/**
 * useSignOffchainMessage hook
 */

'use client';

import { useCallback, useMemo } from 'react';
import { useConnector } from '../ui/connector-provider';
import {
    createOffchainMessageSigner,
    type SignedOffchainMessage,
    type SignOffchainMessageOptions,
} from '../lib/offchain-message/offchain-message-signer';
import { Errors } from '../lib/errors';

/**
 * Return value from useSignOffchainMessage hook
 */
export interface UseSignOffchainMessageReturn {
    /**
     * Sign a UTF-8 message body as a v1 off-chain message via the connected wallet.
     * Rejects with a FEATURE_NOT_SUPPORTED error when the wallet cannot sign off-chain messages.
     */
    signOffchainMessage: (message: string, options?: SignOffchainMessageOptions) => Promise<SignedOffchainMessage>;

    /**
     * Whether the connected wallet advertises the `solana:signOffchainMessage` feature
     */
    canSignOffchainMessage: boolean;

    /**
     * Off-chain message specification versions the wallet can sign
     */
    supportedMessageVersions: readonly number[];

    /**
     * Whether a wallet is connected and a signer is available.
     * Check `canSignOffchainMessage` to know if that wallet supports the feature.
     */
    ready: boolean;

    /**
     * Current wallet address that will sign, or null if no wallet connected
     */
    address: string | null;
}

const NO_SUPPORTED_MESSAGE_VERSIONS: readonly number[] = Object.freeze([]);

export function useSignOffchainMessage(): UseSignOffchainMessageReturn {
    const { selectedWallet, selectedAccount, accounts, connected } = useConnector();

    const account = useMemo(
        () => accounts.find(a => a.address === selectedAccount)?.raw ?? null,
        [accounts, selectedAccount],
    );

    const signer = useMemo(() => {
        if (!connected || !selectedWallet || !account) {
            return null;
        }

        return createOffchainMessageSigner({ wallet: selectedWallet, account });
    }, [connected, selectedWallet, account]);

    const signOffchainMessage = useCallback(
        (message: string, options?: SignOffchainMessageOptions) =>
            signer
                ? signer.signOffchainMessage(message, options)
                : Promise.reject(Errors.featureNotSupported('off-chain message signing')),
        [signer],
    );

    return {
        signOffchainMessage,
        canSignOffchainMessage: signer?.canSignOffchainMessage ?? false,
        supportedMessageVersions: signer?.supportedMessageVersions ?? NO_SUPPORTED_MESSAGE_VERSIONS,
        ready: Boolean(signer),
        address: selectedAccount,
    };
}
