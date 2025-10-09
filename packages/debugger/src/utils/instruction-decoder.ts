/**
 * Basic instruction decoder
 * Decodes common instruction types for display
 */

import type { Address, Base58EncodedBytes } from '@solana/kit';
import { getShortProgramName } from './program-names';

export interface DecodedInstruction {
    index: number;
    programId: string;
    programName: string;
    instructionName: string;
    data?: string;
}

/**
 * Instruction type from Solana Kit getTransaction with 'json' encoding (not exported from Solana Kit)
 * Uses indices to reference accounts, not addresses directly
 */
type TransactionInstruction = Readonly<{
    accounts: readonly number[];
    data: Base58EncodedBytes;
    programIdIndex: number;
    stackHeight?: number;
}>;

/**
 * Decode instruction to readable format
 * Works with 'json' encoding where instructions use account indices
 * @param instruction - The instruction from transaction.message.instructions
 * @param accountKeys - The account keys array to resolve indices
 * @param index - The instruction index
 */
export function decodeInstruction(
    instruction: TransactionInstruction,
    accountKeys: readonly Address[],
    index: number
): DecodedInstruction {
    const programId = accountKeys[instruction.programIdIndex] || 'unknown';
    const programName = getShortProgramName(programId);
    const instructionName = instruction.stackHeight ? `Instruction (Stack Height: ${instruction.stackHeight})` : 'Instruction';

    return {
        index: index + 1,
        programId,
        programName,
        instructionName,
        data: instruction.data,
    };
}