/**
 * @solana/connector - useKitMessageSigner hook
 *
 * React hook for kit-compatible message signing
 * Use this when working with modern Solana libraries (@solana/kit)
 */

'use client';

import { useMemo } from 'react';
import type { MessageModifyingSigner } from '@solana/signers';
import { createMessageSignerFromWalletAccount } from '@solana/wallet-account-signer';
import { getOrCreateUiWalletAccountForStandardWalletAccount } from '@wallet-standard/ui-registry';
import { useConnector } from '../ui/connector-provider';
import { getUnderlyingWallet } from '../lib/wallet/wallet-icon-overrides';

/**
 * Return value from useKitMessageSigner hook
 */
export interface UseKitMessageSignerReturn {
    /**
     * Kit-compatible MessageModifyingSigner instance.
     *
     * Null when no wallet is connected, or when the connected account does not
     * advertise the `solana:signMessage` feature.
     */
    signer: MessageModifyingSigner | null;

    /**
     * Whether a message signer is available and ready to use
     * Useful for disabling "sign message" buttons
     */
    ready: boolean;

    /**
     * Why no signer is available, for diagnostics (null when ready).
     * `'signer-unavailable'` means the connected account does not support
     * `solana:signMessage`.
     */
    reason: 'disconnected' | 'signer-unavailable' | null;
}

/**
 * Hook for kit-compatible message signing
 *
 * `useKitTransactionSigner` returns a `TransactionModifyingSigner`, which carries
 * no message-signing member. This hook returns a `MessageModifyingSigner` built
 * directly from the connected Wallet Standard account via
 * `@solana/wallet-account-signer`. Message signing is not chain-scoped, so unlike
 * the transaction signer it is available on custom clusters too.
 *
 * @example
 * ```tsx
 * import { useKitMessageSigner } from '@solana/connector';
 *
 * function SignIn() {
 *   const { signer, ready } = useKitMessageSigner();
 *
 *   const handleSign = async () => {
 *     if (!signer) return;
 *     const [signed] = await signer.modifyAndSignMessages([
 *       { content: new TextEncoder().encode('Hello'), signatures: {} },
 *     ]);
 *     console.log(signed.signatures[signer.address]);
 *   };
 *
 *   return <button onClick={handleSign} disabled={!ready}>Sign message</button>;
 * }
 * ```
 */
export function useKitMessageSigner(): UseKitMessageSignerReturn {
    const { selectedWallet, selectedAccount, accounts, connected } = useConnector();

    const account = useMemo(
        () => accounts.find(a => a.address === selectedAccount)?.raw ?? null,
        [accounts, selectedAccount],
    );

    const { signer, reason } = useMemo((): Pick<UseKitMessageSignerReturn, 'signer' | 'reason'> => {
        if (!connected || !selectedWallet || !account) {
            return { signer: null, reason: 'disconnected' };
        }

        // Wallet Standard scopes features per account: a wallet rejects an account
        // that omits `solana:signMessage` even when the wallet itself advertises it.
        // The signer factory throws in that case, so gate on the account's own list
        // and surface anything else it rejects as "no signer available" rather than
        // a render error.
        try {
            const uiWalletAccount = getOrCreateUiWalletAccountForStandardWalletAccount(
                getUnderlyingWallet(selectedWallet),
                account,
            );
            if (!uiWalletAccount.features.includes('solana:signMessage')) {
                return { signer: null, reason: 'signer-unavailable' };
            }
            return { signer: createMessageSignerFromWalletAccount(uiWalletAccount), reason: null };
        } catch {
            return { signer: null, reason: 'signer-unavailable' };
        }
    }, [connected, selectedWallet, account]);

    return {
        signer,
        ready: Boolean(signer),
        reason,
    };
}
