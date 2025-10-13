/**
 * @connector-kit/connector - useTransactionSigner hook
 *
 * React hook for transaction signing operations
 * Provides a clean interface for signing and sending transactions
 * with automatic signer creation and lifecycle management
 */

'use client';

import { useMemo } from 'react';
import { useConnector } from '../ui/connector-provider';
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

/**
 * Hook for transaction signing operations
 *
 * Automatically creates a TransactionSigner when a wallet is connected,
 * and provides convenient state for building transaction UIs.
 *
 * The signer is automatically recreated when:
 * - Wallet connection state changes
 * - Selected account changes
 * - Active cluster/network changes
 *
 * @example
 * ```tsx
 * function SendTransaction() {
 *   const { signer, ready, capabilities } = useTransactionSigner()
 *   const [txSignature, setTxSignature] = useState<string | null>(null)
 *   const [error, setError] = useState<string | null>(null)
 *
 *   const handleSend = async () => {
 *     if (!signer) return
 *
 *     try {
 *       const signature = await signer.signAndSendTransaction(transaction)
 *       setTxSignature(signature)
 *       setError(null)
 *     } catch (err) {
 *       setError(err instanceof Error ? err.message : 'Transaction failed')
 *     }
 *   }
 *
 *   return (
 *     <div>
 *       <button onClick={handleSend} disabled={!ready}>
 *         {ready ? 'Send Transaction' : 'Connect Wallet'}
 *       </button>
 *
 *       {!capabilities.canSend && ready && (
 *         <p className="warning">
 *           Your wallet doesn't support direct sending.
 *           Transaction must be signed and broadcast separately.
 *         </p>
 *       )}
 *
 *       {txSignature && (
 *         <p>Transaction sent: {txSignature}</p>
 *       )}
 *
 *       {error && (
 *         <p className="error">{error}</p>
 *       )}
 *     </div>
 *   )
 * }
 * ```
 *
 * @example
 * ```tsx
 * // Using with multiple transactions
 * function SendBatch() {
 *   const { signer, ready, capabilities } = useTransactionSigner()
 *
 *   const handleSendBatch = async () => {
 *     if (!signer) return
 *
 *     const transactions = [tx1, tx2, tx3]
 *
 *     // Check if batch signing is supported
 *     if (capabilities.supportsBatchSigning) {
 *       // More efficient: sign all at once
 *       const signed = await signer.signAllTransactions(transactions)
 *       // ... send signed transactions
 *     } else {
 *       // Fallback: sign and send one by one
 *       const signatures = await signer.signAndSendTransactions(transactions)
 *       console.log('All sent:', signatures)
 *     }
 *   }
 *
 *   return (
 *     <button onClick={handleSendBatch} disabled={!ready}>
 *       Send {capabilities.supportsBatchSigning ? 'Batch' : 'Sequential'}
 *     </button>
 *   )
 * }
 * ```
 *
 * @example
 * ```tsx
 * // Using with message signing for authentication
 * function SignInWithWallet() {
 *   const { signer, ready, capabilities } = useTransactionSigner()
 *
 *   const handleSignIn = async () => {
 *     if (!signer || !capabilities.canSignMessage) {
 *       alert('Wallet does not support message signing')
 *       return
 *     }
 *
 *     const message = new TextEncoder().encode('Sign in to MyApp')
 *     const signature = await signer.signMessage!(message)
 *
 *     // Send signature to backend for verification
 *     await fetch('/api/auth/verify', {
 *       method: 'POST',
 *       body: JSON.stringify({
 *         message: Array.from(message),
 *         signature: Array.from(signature),
 *         address: signer.address
 *       })
 *     })
 *   }
 *
 *   if (!capabilities.canSignMessage) {
 *     return <p>Message signing not supported</p>
 *   }
 *
 *   return (
 *     <button onClick={handleSignIn} disabled={!ready}>
 *       Sign In with Wallet
 *     </button>
 *   )
 * }
 * ```
 */
export function useTransactionSigner(): UseTransactionSignerReturn {
    const { selectedWallet, selectedAccount, accounts, cluster, connected } = useConnector();

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
        });
    }, [connected, selectedWallet, account, cluster]);

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
