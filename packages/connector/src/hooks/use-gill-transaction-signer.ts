/**
 * @connector-kit/connector - useGillTransactionSigner hook
 *
 * React hook for gill-compatible transaction signing
 * Use this when working with modern Solana libraries (@solana/kit, gill)
 */

'use client';

import { useMemo } from 'react';
import type { TransactionModifyingSigner } from 'gill';
import { useTransactionSigner } from './use-transaction-signer';
import { createGillTransactionSigner } from '../lib/transaction/gill-transaction-signer';

/**
 * Return value from useGillTransactionSigner hook
 */
export interface UseGillTransactionSignerReturn {
    /**
     * Gill-compatible TransactionModifyingSigner instance (null if not connected)
     * Use this with modern Solana libraries (@solana/kit, gill)
     */
    signer: TransactionModifyingSigner | null;

    /**
     * Whether a signer is available and ready to use
     * Useful for disabling transaction buttons
     */
    ready: boolean;
}

/**
 * Hook for gill-compatible transaction signing
 *
 * Creates a TransactionPartialSigner that's compatible with @solana/kit and gill,
 * enabling seamless integration with modern Solana development patterns.
 *
 * This hook wraps the standard useTransactionSigner and adapts it to gill's
 * interface, allowing you to use modern libraries without type incompatibilities.
 *
 * @example
 * ```tsx
 * import { useGillTransactionSigner } from '@connector-kit/connector';
 * import { getTransferSolInstruction } from 'gill/programs';
 * import { address, pipe, createTransactionMessage } from 'gill';
 *
 * function ModernTransfer() {
 *   const { signer, ready } = useGillTransactionSigner();
 *
 *   const handleTransfer = async (recipient: string, amount: number) => {
 *     if (!signer) return;
 *
 *     // Fully type-safe with gill!
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
 *       Send with Gill
 *     </button>
 *   );
 * }
 * ```
 *
 * @example
 * ```tsx
 * // For backward compatibility, continue using useTransactionSigner
 * import { useTransactionSigner } from '@connector-kit/connector';
 *
 * function LegacyTransfer() {
 *   const { signer } = useTransactionSigner(); // Wallet adapter compatible
 *   // Works with @solana/web3.js v1 and wallet-adapter
 * }
 * ```
 */
export function useGillTransactionSigner(): UseGillTransactionSignerReturn {
    const { signer: connectorSigner, ready } = useTransactionSigner();

    // Memoize the gill-compatible signer to prevent unnecessary recreations
    const gillSigner = useMemo(() => {
        if (!connectorSigner) return null;
        return createGillTransactionSigner(connectorSigner);
    }, [connectorSigner]);

    return {
        signer: gillSigner,
        ready,
    };
}
