/**
 * @solana/connector - useKitTransactionSigner hook
 *
 * React hook for kit-compatible transaction signing
 * Use this when working with modern Solana libraries (@solana/kit)
 */

'use client';

import { useMemo } from 'react';
import type { TransactionModifyingSigner } from '@solana/signers';
import { useTransactionSigner } from './use-transaction-signer';
import { createKitTransactionSigner } from '../lib/transaction/kit-transaction-signer';

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
 * Creates a TransactionPartialSigner that's compatible with @solana/kit,
 * enabling seamless integration with modern Solana development patterns.
 *
 * This hook wraps the standard useTransactionSigner and adapts it to kit's
 * interface, allowing you to use modern libraries without type incompatibilities.
 *
 * @example
 * ```tsx
 * import { useKitTransactionSigner } from '@solana/connector';
 * import { getTransferSolInstruction } from '@solana-program/system';
 * import { address, pipe, createTransactionMessage } from '@solana/kit';
 *
 * function ModernTransfer() {
 *   const { signer, ready } = useKitTransactionSigner();
 *
 *   const handleTransfer = async (recipient: string, amount: number) => {
 *     if (!signer) return;
 *
 *     // Fully type-safe with @solana/kit!
 *     const instruction = getTransferSolInstruction({
 *       source: signer, // No type errors
 *       destination: address(recipient),
 *       amount
 *     });
 *
 *     const txMessage = pipe(
 *       createTransactionMessage({ version: 0 }),
 *       (tx) => setTransactionMessageFeePayerSigner(signer, tx), // Works!
 *       // ...
 *     );
 *   };
 *
 *   return (
 *     <button onClick={handleTransfer} disabled={!ready}>
 *       Send with Kit
 *     </button>
 *   );
 * }
 * ```
 *
 * @example
 * ```tsx
 * // For backward compatibility, continue using useTransactionSigner
 * import { useTransactionSigner } from '@solana/connector';
 *
 * function LegacyTransfer() {
 *   const { signer } = useTransactionSigner(); // Wallet adapter compatible
 *   // Works with @solana/web3.js v1 and wallet-adapter
 * }
 * ```
 */
export function useKitTransactionSigner(): UseKitTransactionSignerReturn {
    const { signer: connectorSigner, ready } = useTransactionSigner();

    const kitSigner = useMemo(() => {
        if (!connectorSigner) return null;
        return createKitTransactionSigner(connectorSigner);
    }, [connectorSigner]);

    return {
        signer: kitSigner,
        ready,
    };
}

/**
 * @deprecated Use `useKitTransactionSigner` instead. This alias is provided for backward compatibility.
 */
export const useGillTransactionSigner = useKitTransactionSigner;

