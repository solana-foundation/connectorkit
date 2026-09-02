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
import { getStandardWalletChainForCluster } from '../utils/cluster';
import { getUnderlyingWallet } from '../lib/wallet/wallet-icon-overrides';

/**
 * Options for useKitTransactionSigner
 */
export interface UseKitTransactionSignerOptions {
    /**
     * Explicit wallet chain to build the signer for, overriding the chain
     * derived from the active cluster. The escape hatch for custom clusters
     * (whose chain cannot be derived): pass the standard chain the custom
     * endpoint actually serves, e.g. `'solana:mainnet'` for a private
     * mainnet RPC.
     */
    chain?: `solana:${string}`;
}

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

    /**
     * Why no signer is available, for diagnostics (null when ready).
     * `'unsupported-chain'` means the active cluster is custom and no
     * explicit `chain` override was given; `'signer-unavailable'` means the
     * connected account does not support signing on the resolved chain.
     */
    reason: 'disconnected' | 'unsupported-chain' | 'signer-unavailable' | null;
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
export function useKitTransactionSigner(options?: UseKitTransactionSignerOptions): UseKitTransactionSignerReturn {
    const { selectedWallet, selectedAccount, accounts, cluster, connected } = useConnector();
    const chainOverride = options?.chain;

    const account = useMemo(
        () => accounts.find(a => a.address === selectedAccount)?.raw ?? null,
        [accounts, selectedAccount],
    );

    const { signer, reason } = useMemo((): Pick<UseKitTransactionSignerReturn, 'signer' | 'reason'> => {
        if (!connected || !selectedWallet || !account || !cluster) {
            return { signer: null, reason: 'disconnected' };
        }

        // Derive the chain from the cluster (not its raw id), so aliases like
        // solana:mainnet-beta resolve. Custom clusters have no derivable
        // chain, and signing on a substituted one would prompt against the
        // wrong network — callers pass an explicit `chain` instead.
        const chain = chainOverride ?? getStandardWalletChainForCluster(cluster);
        if (!chain) return { signer: null, reason: 'unsupported-chain' };

        // The signer factory validates the chain and the account's signing
        // features at construction and throws when either is unsupported
        // (e.g. accounts that advertise no features). Surface that as
        // "no signer available" rather than a render error.
        try {
            const uiWalletAccount = getOrCreateUiWalletAccountForStandardWalletAccount(
                getUnderlyingWallet(selectedWallet),
                account,
            );
            return { signer: createTransactionSignerFromWalletAccount(uiWalletAccount, chain), reason: null };
        } catch {
            return { signer: null, reason: 'signer-unavailable' };
        }
    }, [connected, selectedWallet, account, cluster, chainOverride]);

    return {
        signer,
        ready: Boolean(signer),
        reason,
    };
}

/**
 * @deprecated Use `useKitTransactionSigner` instead. This alias is provided for backward compatibility.
 */
export const useGillTransactionSigner = useKitTransactionSigner;
