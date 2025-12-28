/**
 * @solana/connector - Kit Transaction Preparation
 *
 * Prepares transactions for sending by setting blockhash.
 * A simplified version that focuses on blockhash management.
 */

import type {
    GetLatestBlockhashApi,
    Rpc,
    TransactionMessage,
    TransactionMessageWithBlockhashLifetime,
    TransactionMessageWithFeePayer,
} from '@solana/kit';
import {
    assertIsTransactionMessageWithBlockhashLifetime,
    setTransactionMessageLifetimeUsingBlockhash,
} from '@solana/kit';

import { debug, isDebugEnabled } from './debug';

/**
 * Transaction message types that can be prepared.
 * Requires both a fee payer and a transaction message.
 */
type PrepareCompilableTransactionMessage = TransactionMessage & TransactionMessageWithFeePayer;

/**
 * Configuration for preparing a transaction
 */
export interface PrepareTransactionConfig<TMessage extends PrepareCompilableTransactionMessage> {
    /**
     * Transaction to prepare for sending to the blockchain
     */
    transaction: TMessage;
    /**
     * RPC client capable of getting the latest blockhash
     */
    rpc: Rpc<GetLatestBlockhashApi>;
    /**
     * Multiplier applied to the simulated compute unit value obtained from simulation
     * @default 1.1
     * @deprecated Compute unit estimation is not currently supported
     */
    computeUnitLimitMultiplier?: number;
    /**
     * Whether or not you wish to force reset the compute unit limit value (if one is already set)
     * @deprecated Compute unit estimation is not currently supported
     */
    computeUnitLimitReset?: boolean;
    /**
     * Whether or not you wish to force reset the latest blockhash (if one is already set)
     * @default true
     */
    blockhashReset?: boolean;
}

/**
 * Prepare a Transaction to be signed and sent to the network. Including:
 * - fetching the latest blockhash (if not already set)
 * - (optional) resetting latest blockhash to the most recent
 *
 * Note: Automatic compute unit estimation is not currently supported in this version.
 * You should set compute unit limits manually if needed.
 *
 * @param config - Configuration for transaction preparation
 * @returns Prepared transaction with blockhash lifetime set
 *
 * @example
 * ```ts
 * const prepared = await prepareTransaction({
 *   transaction: myTransaction,
 *   rpc: client.rpc,
 * });
 * ```
 */
export async function prepareTransaction<TMessage extends PrepareCompilableTransactionMessage>(
    config: PrepareTransactionConfig<TMessage>,
): Promise<TMessage & TransactionMessageWithBlockhashLifetime> {
    // Set config defaults
    const blockhashReset = config.blockhashReset !== false;

    let transaction = config.transaction as TMessage & Partial<TransactionMessageWithBlockhashLifetime>;

    // Update the latest blockhash
    const hasLifetimeConstraint = 'lifetimeConstraint' in transaction;

    if (blockhashReset || !hasLifetimeConstraint) {
        const { value: latestBlockhash } = await config.rpc.getLatestBlockhash().send();

        if (!hasLifetimeConstraint) {
            if (isDebugEnabled()) {
                debug('Transaction missing latest blockhash, fetching one.', 'debug');
            }
            transaction = setTransactionMessageLifetimeUsingBlockhash(
                latestBlockhash,
                transaction as TMessage,
            ) as TMessage & TransactionMessageWithBlockhashLifetime;
        } else if (blockhashReset) {
            if (isDebugEnabled()) {
                debug('Auto resetting the latest blockhash.', 'debug');
            }
            transaction = {
                ...transaction,
                lifetimeConstraint: latestBlockhash,
            } as TMessage & TransactionMessageWithBlockhashLifetime;
        }
    }

    assertIsTransactionMessageWithBlockhashLifetime(transaction);

    return transaction as TMessage & TransactionMessageWithBlockhashLifetime;
}
