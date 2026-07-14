/**
 * @solana/connector - Kit Transaction Preparation
 *
 * Prepares transactions for sending: estimates compute unit / resource limits
 * via kit's simulation-based estimators and manages the blockhash lifetime.
 */

import type {
    GetLatestBlockhashApi,
    Rpc,
    SimulateTransactionApi,
    TransactionMessage,
    TransactionMessageWithBlockhashLifetime,
    TransactionMessageWithFeePayer,
} from '@solana/kit';
import {
    assertIsTransactionMessageWithBlockhashLifetime,
    estimateAndSetResourceLimitsFactory,
    estimateResourceLimitsFactory,
    setTransactionMessageComputeUnitLimit,
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
     * RPC client capable of simulating transactions and getting the latest blockhash
     */
    rpc: Rpc<GetLatestBlockhashApi & SimulateTransactionApi>;
    /**
     * Multiplier applied to the simulated compute unit value obtained from simulation
     * @default 1.1
     */
    computeUnitLimitMultiplier?: number;
    /**
     * Whether or not you wish to force reset the compute unit limit value (if one is already set)
     * using the simulation response and `computeUnitLimitMultiplier`
     * @default false
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
 * - simulating the transaction to estimate its compute unit limit (and, for
 *   version 1 messages, its loaded accounts data size limit), applying the
 *   estimate with a configurable safety multiplier
 * - fetching the latest blockhash (if not already set)
 * - (optional) resetting latest blockhash to the most recent
 *
 * Messages that already carry an explicit compute unit limit are left
 * untouched unless `computeUnitLimitReset` is set.
 *
 * @param config - Configuration for transaction preparation
 * @returns Prepared transaction with resource limits and blockhash lifetime set
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
    const computeUnitLimitMultiplier = config.computeUnitLimitMultiplier ?? 1.1;

    let transaction = config.transaction as TMessage & Partial<TransactionMessageWithBlockhashLifetime>;

    if (config.computeUnitLimitReset) {
        if (isDebugEnabled()) {
            debug('Force resetting the compute unit limit.', 'debug');
        }
        transaction = setTransactionMessageComputeUnitLimit(undefined, transaction);
    }

    const estimateResourceLimits = estimateResourceLimitsFactory({ rpc: config.rpc });
    const estimateAndSetResourceLimits = estimateAndSetResourceLimitsFactory(async (transactionMessage, config_) => {
        const estimate = await estimateResourceLimits(transactionMessage, config_);
        return {
            ...estimate,
            computeUnitLimit: Math.ceil(estimate.computeUnitLimit * computeUnitLimitMultiplier),
        };
    });
    transaction = await estimateAndSetResourceLimits(transaction);

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
