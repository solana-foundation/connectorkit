import type { Transaction } from '@solana/transactions';

import {
    decompileTransactionMessageFetchingLookupTables,
    getCompiledTransactionMessageDecoder,
    getTransactionDecoder,
    createSolanaRpc,
} from '@solana/kit';

import { base64ToBytes } from './tx-bytes';

const COMPUTE_BUDGET_PROGRAM_ADDRESS = 'ComputeBudget111111111111111111111111111111';

interface CompiledInstructionLike {
    programAddressIndex: number;
    accountIndices?: readonly number[];
    data?: Uint8Array;
}

interface CompiledTransactionMessageLike {
    version: 'legacy' | number;
    staticAccounts: readonly string[];
    instructions: readonly CompiledInstructionLike[];
    lifetimeToken?: string;
    addressTableLookups?: readonly unknown[];
}

export interface DecodedWireTransactionSummary {
    version: 'legacy' | number;
    feePayer?: string;
    requiredSigners: number;
    instructionCount: number;
    computeUnitLimit?: number;
    computeUnitPriceMicroLamports?: bigint;
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

export function getComputeBudgetSummaryFromCompiledMessage(
    compiledMessage: CompiledTransactionMessageLike,
): Pick<DecodedWireTransactionSummary, 'computeUnitLimit' | 'computeUnitPriceMicroLamports'> {
    let computeUnitLimit: number | undefined;
    let computeUnitPriceMicroLamports: bigint | undefined;

    for (const ix of compiledMessage.instructions) {
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

    const { computeUnitLimit, computeUnitPriceMicroLamports } =
        getComputeBudgetSummaryFromCompiledMessage(compiledMessage);

    return {
        compiledMessage,
        transaction: decodedTransaction,
        summary: {
            computeUnitLimit,
            computeUnitPriceMicroLamports,
            feePayer,
            instructionCount: compiledMessage.instructions.length,
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
