import type { Transaction } from '@solana/transactions';

import {
    decompileTransactionMessageFetchingLookupTables,
    getCompiledTransactionMessageDecoder,
    getTransactionDecoder,
    createSolanaRpc,
    transactionConfigMaskHasComputeUnitLimit,
    transactionConfigMaskHasHeapSize,
    transactionConfigMaskHasLoadedAccountsDataSizeLimit,
    transactionConfigMaskHasPriorityFee,
} from '@solana/kit';

import { base64ToBytes } from './tx-bytes';

const COMPUTE_BUDGET_PROGRAM_ADDRESS = 'ComputeBudget111111111111111111111111111111';

interface CompiledInstructionLike {
    programAddressIndex: number;
    accountIndices?: readonly number[];
    data?: Uint8Array;
}

type CompiledConfigValueLike = { kind: 'u32'; value: number } | { kind: 'u64'; value: bigint };

interface CompiledTransactionMessageLike {
    version: 'legacy' | number;
    staticAccounts: readonly string[];
    /** Present on legacy/v0 compiled messages only */
    instructions?: readonly CompiledInstructionLike[];
    lifetimeToken?: string;
    addressTableLookups?: readonly unknown[];
    /** v1 compiled messages carry the embedded transaction config instead */
    configMask?: number;
    configValues?: readonly CompiledConfigValueLike[];
    instructionHeaders?: readonly unknown[];
    numInstructions?: number;
}

/** The embedded resource config of a v1 (SIMD-0296) transaction. */
export interface DecodedV1TransactionConfig {
    computeUnitLimit?: number;
    heapSize?: number;
    loadedAccountsDataSizeLimit?: number;
    /** Total priority fee in lamports (not micro-lamports per CU as in legacy/v0) */
    priorityFeeLamports?: bigint;
}

export interface DecodedWireTransactionSummary {
    version: 'legacy' | number;
    feePayer?: string;
    requiredSigners: number;
    instructionCount: number;
    computeUnitLimit?: number;
    /** Legacy/v0 priority fee unit (SetComputeUnitPrice); absent on v1 */
    computeUnitPriceMicroLamports?: bigint;
    /** v1 priority fee unit: total lamports for the whole transaction */
    priorityFeeLamports?: bigint;
    loadedAccountsDataSizeLimit?: number;
    heapSize?: number;
}

export interface DecodedWireTransaction {
    transaction: Transaction;
    compiledMessage: CompiledTransactionMessageLike;
    summary: DecodedWireTransactionSummary;
}

function readU32LE(bytes: Uint8Array, offset: number): number | undefined {
    if (bytes.byteLength < offset + 4) return;
    const view = new DataView(bytes.buffer, bytes.byteOffset + offset, 4);
    return view.getUint32(0, true);
}

function readU64LE(bytes: Uint8Array, offset: number): bigint | undefined {
    if (bytes.byteLength < offset + 8) return;
    const view = new DataView(bytes.buffer, bytes.byteOffset + offset, 8);
    return view.getBigUint64(0, true);
}

/**
 * Extract the embedded transaction config from a v1 compiled message.
 *
 * The compiled form stores present fields positionally in `configValues`,
 * paired with `configMask` bits in ascending bit order: priority fee
 * (bits 0-1, u64), compute unit limit (bit 2, u32), loaded accounts data
 * size limit (bit 3, u32), heap size (bit 4, u32).
 *
 * @returns The decoded config, or `undefined` for legacy/v0 messages.
 */
export function getV1ConfigFromCompiledMessage(
    compiledMessage: CompiledTransactionMessageLike,
): DecodedV1TransactionConfig | undefined {
    const { configMask, configValues } = compiledMessage;
    if (compiledMessage.version !== 1 || configMask === undefined || configValues === undefined) {
        return undefined;
    }

    const config: DecodedV1TransactionConfig = {};
    let index = 0;
    const nextValue = () => configValues[index++]?.value;

    try {
        if (transactionConfigMaskHasPriorityFee(configMask)) {
            const value = nextValue();
            if (value !== undefined) config.priorityFeeLamports = BigInt(value);
        }
        if (transactionConfigMaskHasComputeUnitLimit(configMask)) {
            const value = nextValue();
            if (value !== undefined) config.computeUnitLimit = Number(value);
        }
        if (transactionConfigMaskHasLoadedAccountsDataSizeLimit(configMask)) {
            const value = nextValue();
            if (value !== undefined) config.loadedAccountsDataSizeLimit = Number(value);
        }
        if (transactionConfigMaskHasHeapSize(configMask)) {
            const value = nextValue();
            if (value !== undefined) config.heapSize = Number(value);
        }
    } catch {
        // An invalid mask (e.g. mismatched priority fee bits) should not take
        // down the whole decode view; report whatever was read so far.
    }

    return config;
}

export function getComputeBudgetSummaryFromCompiledMessage(
    compiledMessage: CompiledTransactionMessageLike,
): Pick<
    DecodedWireTransactionSummary,
    | 'computeUnitLimit'
    | 'computeUnitPriceMicroLamports'
    | 'priorityFeeLamports'
    | 'loadedAccountsDataSizeLimit'
    | 'heapSize'
> {
    let computeUnitLimit: number | undefined;
    let computeUnitPriceMicroLamports: bigint | undefined;

    for (const ix of compiledMessage.instructions ?? []) {
        const programId = compiledMessage.staticAccounts[ix.programAddressIndex];
        if (programId !== COMPUTE_BUDGET_PROGRAM_ADDRESS) continue;
        if (!ix.data || ix.data.length === 0) continue;

        const tag = ix.data[0];
        // Program instruction tags (ComputeBudgetInstruction enum)
        // 2: SetComputeUnitLimit(u32)
        // 3: SetComputeUnitPrice(u64 microLamports)
        if (tag === 2) computeUnitLimit = readU32LE(ix.data, 1);
        if (tag === 3) computeUnitPriceMicroLamports = readU64LE(ix.data, 1);
    }

    // v1 transactions carry their budget in the embedded config, not in
    // ComputeBudget instructions. The config is what the runtime honors, so
    // it wins if a malformed transaction somehow carries both.
    const v1Config = getV1ConfigFromCompiledMessage(compiledMessage);
    if (v1Config) {
        return {
            computeUnitLimit: v1Config.computeUnitLimit ?? computeUnitLimit,
            computeUnitPriceMicroLamports: undefined,
            heapSize: v1Config.heapSize,
            loadedAccountsDataSizeLimit: v1Config.loadedAccountsDataSizeLimit,
            priorityFeeLamports: v1Config.priorityFeeLamports,
        };
    }

    return { computeUnitLimit, computeUnitPriceMicroLamports };
}

export function decodeWireTransactionBase64(transactionBase64: string): DecodedWireTransaction {
    const txBytes = base64ToBytes(transactionBase64);

    const transactionDecoder = getTransactionDecoder();
    const decodedTransaction = transactionDecoder.decode(txBytes) as Transaction;

    const compiledMessageDecoder = getCompiledTransactionMessageDecoder();
    const compiledMessage = compiledMessageDecoder.decode(
        decodedTransaction.messageBytes,
    ) as unknown as CompiledTransactionMessageLike;

    const requiredSigners = Object.keys(decodedTransaction.signatures).length;
    const feePayer = compiledMessage.staticAccounts[0];

    const budget = getComputeBudgetSummaryFromCompiledMessage(compiledMessage);

    // Legacy/v0 compiled messages carry an `instructions` array; v1 splits
    // instructions into headers/payloads and records the count separately.
    const instructionCount = compiledMessage.instructions?.length ?? compiledMessage.numInstructions ?? 0;

    return {
        compiledMessage,
        transaction: decodedTransaction,
        summary: {
            ...budget,
            feePayer,
            instructionCount,
            requiredSigners,
            version: compiledMessage.version,
        },
    };
}

/**
 * Decompile a compiled transaction message into a readable TransactionMessage, fetching any
 * required address lookup tables from the network.
 */
export async function decompileMessageFromWireTransactionBase64(transactionBase64: string, rpcUrl: string) {
    const decoded = decodeWireTransactionBase64(transactionBase64);

    // `decompileTransactionMessageFetchingLookupTables` expects a compiled message with lifetime.
    // We treat the decoded compiled message as compatible with that shape.
    const rpc = createSolanaRpc(rpcUrl) as any;
    return await decompileTransactionMessageFetchingLookupTables(decoded.compiledMessage as any, rpc);
}
