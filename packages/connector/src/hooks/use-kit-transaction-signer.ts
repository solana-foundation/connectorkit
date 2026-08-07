/**
 * @solana/connector - useKitTransactionSigner hook
 *
 * React hook for kit-compatible transaction signing
 * Use this when working with modern Solana libraries (@solana/kit)
 */

'use client';

import { useMemo } from 'react';
import type { TransactionModifyingSigner } from '@solana/signers';
import { createTransactionSignerFromWalletAccount } from '@solana/wallet-account-signer';
import { getOrCreateUiWalletAccountForStandardWalletAccount } from '@wallet-standard/ui-registry';
import { useConnector } from '../ui/connector-provider';
import { normalizeWalletChain } from '../lib/wallet/kit-wallet-core';

/**
 * Return value from useKitTransactionSigner hook
 */
export interface UseKitTransactionSignerReturn {
    /**
     * Kit-compatible TransactionModifyingSigner instance (null if not connected)
     * Use this with modern Solana libraries (@solana/kit)
     */
    signer: TransactionModifyingSigner | null;

    /**
     * Whether a signer is available and ready to use
     * Useful for disabling transaction buttons
     */
    ready: boolean;
}

/**
 * @deprecated Use `UseKitTransactionSignerReturn` instead
 */
export type UseGillTransactionSignerReturn = UseKitTransactionSignerReturn;

/**
 * Hook for kit-compatible transaction signing
 *
 * Returns a `TransactionModifyingSigner` from `@solana/kit`, built directly from the
 * connected Wallet Standard account via `@solana/wallet-account-signer`. Pass it to
 * kit instruction builders and transaction message helpers.
 *
 * @example
 * ```tsx
 * import { useKitTransactionSigner } from '@solana/connector';
 * import { getTransferSolInstruction } from '@solana-program/system';
 * import { address } from '@solana/kit';
 *
 * function ModernTransfer() {
 *   const { signer, ready } = useKitTransactionSigner();
 *
 *   const handleTransfer = (recipient: string, amount: bigint) => {
 *     if (!signer) return;
 *     const instruction = getTransferSolInstruction({
 *       source: signer,
 *       destination: address(recipient),
 *       amount,
 *     });
 *     // ...compile and send with kit
 *   };
 *
 *   return (
 *     <button onClick={() => handleTransfer('...', 1_000_000n)} disabled={!ready}>
 *       Send with Kit
 *     </button>
 *   );
 * }
 * ```
 */
export function useKitTransactionSigner(): UseKitTransactionSignerReturn {
    const { selectedWallet, selectedAccount, accounts, cluster, connected } = useConnector();

    const account = useMemo(
        () => accounts.find(a => a.address === selectedAccount)?.raw ?? null,
        [accounts, selectedAccount],
    );

    const signer = useMemo(() => {
        if (!connected || !selectedWallet || !account || !cluster) {
            return null;
        }

        // The signer factory validates the chain and the account's signing
        // features at construction and throws when either is unsupported
        // (e.g. custom cluster ids, or accounts that advertise no features).
        // Surface that as "no signer available" rather than a render error.
        try {
            const uiWalletAccount = getOrCreateUiWalletAccountForStandardWalletAccount(selectedWallet, account);
            const chain = normalizeWalletChain(cluster.id) as `solana:${string}`;
            return createTransactionSignerFromWalletAccount(uiWalletAccount, chain);
        } catch {
            return null;
        }
    }, [connected, selectedWallet, account, cluster]);

    return {
        signer,
        ready: Boolean(signer),
    };
}

/**
 * @deprecated Use `useKitTransactionSigner` instead. This alias is provided for backward compatibility.
 */
export const useGillTransactionSigner = useKitTransactionSigner;
