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
 * Smallest headroom added on top of an estimate. Covers, at minimum, the two
 * Compute Budget instructions that setting the limits itself introduces.
 */
const MIN_COMPUTE_UNIT_BUFFER = 300;
/** Largest compute unit limit the runtime accepts for a single transaction. */
const MAX_COMPUTE_UNIT_LIMIT = 1_400_000;
/** Estimate at which the percentage margin stops decaying. */
const COMPUTE_UNIT_MARGIN_CAP = 500_000;
/** Margin added to low estimates. */
const MAX_COMPUTE_UNIT_MARGIN = 0.1;
/** Margin added to estimates at or above {@link COMPUTE_UNIT_MARGIN_CAP}. */
const MIN_COMPUTE_UNIT_MARGIN = 0.02;

/**
 * Map an estimated compute unit consumption to the limit to request.
 *
 * Execution can consume slightly more than simulation, so the limit needs
 * headroom. A flat percentage is the wrong shape at both ends: on a tiny
 * transaction it rounds to nothing, and on a large one it buys thousands of
 * units of prioritization fee that will never be used. This takes the greater
 * of a flat floor and a margin that decays from 10% to 2% as the estimate
 * approaches {@link COMPUTE_UNIT_MARGIN_CAP}.
 */
function getDefaultComputeUnitLimitFromEstimate(estimatedComputeUnits: number): number {
    const progress = Math.min(estimatedComputeUnits / COMPUTE_UNIT_MARGIN_CAP, 1);
    const margin = MAX_COMPUTE_UNIT_MARGIN - (MAX_COMPUTE_UNIT_MARGIN - MIN_COMPUTE_UNIT_MARGIN) * progress;
    const extraComputeUnits = Math.max(Math.ceil(estimatedComputeUnits * margin), MIN_COMPUTE_UNIT_BUFFER);
    return estimatedComputeUnits + extraComputeUnits;
}

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
     * Multiplier applied to the simulated compute unit value obtained from simulation.
     * When omitted, headroom is sized by {@link getDefaultComputeUnitLimitFromEstimate}
     * instead of a flat multiplier.
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
    /**
     * Estimate and set compute/resource limits via simulation.
     * @default true
     */
    estimateResources?: true;
}

/**
 * Configuration for preparing a transaction without simulation-based resource
 * estimation: only the blockhash lifetime is managed. For transactions that
 * cannot simulate at preparation time (e.g. an unfunded fee payer during
 * onboarding, or an instruction depending on state a prior transaction has
 * not landed yet).
 */
export interface PrepareTransactionConfigWithoutEstimation<TMessage extends PrepareCompilableTransactionMessage> {
    /**
     * Transaction to prepare for sending to the blockchain
     */
    transaction: TMessage;
    /**
     * RPC client capable of getting the latest blockhash. Simulation
     * capability is not required when estimation is skipped.
     */
    rpc: Rpc<GetLatestBlockhashApi>;
    /**
     * Whether or not you wish to force reset the latest blockhash (if one is already set)
     * @default true
     */
    blockhashReset?: boolean;
    /**
     * Skip simulation-based resource estimation entirely; compute unit limits
     * are left exactly as the message carries them.
     */
    estimateResources: false;
}

/**
 * Prepare a Transaction to be signed and sent to the network. Including:
 * - simulating the transaction to estimate its compute unit limit (and, for
 *   version 1 messages, its loaded accounts data size limit), applying the
 *   estimate with a configurable safety multiplier
 * - fetching the latest blockhash (if not already set)
 * - (optional) resetting latest blockhash to the most recent
 *
 * Messages that already carry an explicit compute unit limit keep it unless
 * `computeUnitLimitReset` is set — except the provisory value 0 and the
 * 1,400,000 maximum, which kit treats as unset and re-estimates.
 *
 * Pass `estimateResources: false` to skip simulation entirely (blockhash-only
 * preparation); the `rpc` then only needs `GetLatestBlockhashApi`. Use this
 * for transactions that cannot simulate at preparation time, e.g. an unfunded
 * fee payer during onboarding.
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
): Promise<TMessage & TransactionMessageWithBlockhashLifetime>;
export async function prepareTransaction<TMessage extends PrepareCompilableTransactionMessage>(
    config: PrepareTransactionConfigWithoutEstimation<TMessage>,
): Promise<TMessage & TransactionMessageWithBlockhashLifetime>;
export async function prepareTransaction<TMessage extends PrepareCompilableTransactionMessage>(
    config: PrepareTransactionConfig<TMessage> | PrepareTransactionConfigWithoutEstimation<TMessage>,
): Promise<TMessage & TransactionMessageWithBlockhashLifetime> {
    // Set config defaults
    const blockhashReset = config.blockhashReset !== false;

    let transaction = config.transaction as TMessage & Partial<TransactionMessageWithBlockhashLifetime>;

    if (config.estimateResources !== false) {
        const { computeUnitLimitMultiplier } = config;
        const getComputeUnitLimit =
            computeUnitLimitMultiplier === undefined
                ? getDefaultComputeUnitLimitFromEstimate
                : (estimate: number) => Math.ceil(estimate * computeUnitLimitMultiplier);

        if (config.computeUnitLimitReset) {
            if (isDebugEnabled()) {
                debug('Force resetting the compute unit limit.', 'debug');
            }
            transaction = setTransactionMessageComputeUnitLimit(undefined, transaction);
        }

        const estimateResourceLimits = estimateResourceLimitsFactory({ rpc: config.rpc });
        const estimateAndSetResourceLimits = estimateAndSetResourceLimitsFactory(
            async (transactionMessage, config_) => {
                const estimate = await estimateResourceLimits(transactionMessage, config_);
                return {
                    ...estimate,
                    computeUnitLimit: Math.min(
                        Math.ceil(getComputeUnitLimit(estimate.computeUnitLimit)),
                        MAX_COMPUTE_UNIT_LIMIT,
                    ),
                };
            },
        );
        transaction = await estimateAndSetResourceLimits(transaction);
    } else if (isDebugEnabled()) {
        debug('Skipping resource estimation (estimateResources: false).', 'debug');
    }

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
