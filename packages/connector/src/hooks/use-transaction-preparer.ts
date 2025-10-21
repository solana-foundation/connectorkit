/**
 * @solana/connector - useTransactionPreparer hook
 *
 * React hook for preparing transactions with automatic optimization
 * Handles blockhash fetching, compute unit limits, and transaction simulation
 */

'use client';

import { useCallback } from 'react';
import {
    prepareTransaction,
    type PrepareTransactionConfig,
    type CompilableTransactionMessage,
    type TransactionMessageWithBlockhashLifetime,
} from 'gill';
import { useGillSolanaClient } from './use-gill-solana-client';
import { NetworkError } from '../lib/errors';

/**
 * Options for transaction preparation
 */
export interface TransactionPrepareOptions {
    /**
     * Multiplier applied to the simulated compute unit value
     * @default 1.1 (10% buffer)
     */
    computeUnitLimitMultiplier?: number;

    /**
     * Whether to force reset the compute unit limit value (if one is already set)
     * using the simulation response and computeUnitLimitMultiplier
     * @default false
     */
    computeUnitLimitReset?: boolean;

    /**
     * Whether to force reset the latest blockhash (if one is already set)
     * @default true
     */
    blockhashReset?: boolean;
}

/**
 * Return value from useTransactionPreparer hook
 */
export interface UseTransactionPreparerReturn {
    /**
     * Prepare a transaction for sending
     * Automatically adds:
     * - Compute unit limit (via simulation with optional multiplier)
     * - Latest blockhash (if not already set)
     *
     * @param transaction - The transaction to prepare
     * @param options - Optional preparation settings
     * @returns Prepared transaction with blockhash lifetime set
     */
    prepare: <TMessage extends CompilableTransactionMessage>(
        transaction: TMessage,
        options?: TransactionPrepareOptions,
    ) => Promise<TMessage & TransactionMessageWithBlockhashLifetime>;

    /**
     * Whether the preparer is ready to use
     * False if Solana client is not available
     */
    ready: boolean;
}

/**
 * Hook for preparing transactions with automatic optimization
 *
 * Uses Gill's prepareTransaction utility to:
 * 1. Simulate the transaction to determine optimal compute units
 * 2. Set compute unit limit (with configurable multiplier for safety margin)
 * 3. Fetch and set the latest blockhash (if not already present)
 *
 * This significantly improves transaction landing rates by ensuring proper
 * compute budget allocation and fresh blockhashes.
 *
 * @example
 * ```tsx
 * import { useTransactionPreparer, useGillTransactionSigner } from '@solana/connector';
 * import { pipe, createTransactionMessage, appendTransactionMessageInstructions } from 'gill';
 * import { getTransferSolInstruction } from 'gill/programs';
 *
 * function SendOptimizedTransaction() {
 *   const { prepare, ready } = useTransactionPreparer();
 *   const { signer } = useGillTransactionSigner();
 *   const { client } = useGillSolanaClient();
 *
 *   const handleSend = async (recipient: string, amount: bigint) => {
 *     if (!ready || !signer || !client) return;
 *
 *     // Build transaction message
 *     const tx = pipe(
 *       createTransactionMessage({ version: 0 }),
 *       tx => setTransactionMessageFeePayerSigner(signer, tx),
 *       tx => appendTransactionMessageInstructions([
 *         getTransferSolInstruction({
 *           source: signer,
 *           destination: address(recipient),
 *           amount: lamports(amount),
 *         })
 *       ], tx)
 *     );
 *
 *     // Prepare: auto-adds compute units + blockhash
 *     const prepared = await prepare(tx);
 *
 *     // Sign
 *     const signed = await signTransactionMessageWithSigners(prepared);
 *
 *     // Send and confirm
 *     await client.sendAndConfirmTransaction(signed);
 *   };
 *
 *   return (
 *     <button onClick={handleSend} disabled={!ready}>
 *       Send Optimized Transaction
 *     </button>
 *   );
 * }
 * ```
 *
 * @example
 * ```tsx
 * // With custom compute unit multiplier for high-priority transactions
 * const { prepare } = useTransactionPreparer();
 *
 * const prepared = await prepare(transaction, {
 *   computeUnitLimitMultiplier: 1.3, // 30% buffer instead of default 10%
 *   blockhashReset: true // Always fetch fresh blockhash
 * });
 * ```
 *
 * @example
 * ```tsx
 * // Force reset compute units even if already set
 * const { prepare } = useTransactionPreparer();
 *
 * const prepared = await prepare(transaction, {
 *   computeUnitLimitReset: true, // Re-simulate and reset compute units
 *   computeUnitLimitMultiplier: 1.2
 * });
 * ```
 */
export function useTransactionPreparer(): UseTransactionPreparerReturn {
    const { client, ready } = useGillSolanaClient();

    const prepare = useCallback(
        async <TMessage extends CompilableTransactionMessage>(
            transaction: TMessage,
            options: TransactionPrepareOptions = {},
        ): Promise<TMessage & TransactionMessageWithBlockhashLifetime> => {
            if (!client) {
                throw new NetworkError('RPC_ERROR', 'Solana client not available. Cannot prepare transaction.');
            }

            return prepareTransaction({
                transaction,
                rpc: client.rpc,
                computeUnitLimitMultiplier: options.computeUnitLimitMultiplier,
                computeUnitLimitReset: options.computeUnitLimitReset,
                blockhashReset: options.blockhashReset,
            });
        },
        [client],
    );

    return {
        prepare,
        ready,
    };
}
