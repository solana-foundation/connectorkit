/**
 * Program log parsing utilities
 * Adapted from Solana Explorer for transaction debugging
 */

import { getTransactionInstructionError, type TransactionErrorType } from './transaction-errors';
import { getProgramName } from './program-names';
import { TransactionError } from '@solana/kit';

export interface LogMessage {
    text: string;
    prefix: string;
    style: 'muted' | 'info' | 'success' | 'warning';
}

export interface InstructionLogs {
    invokedProgram: string | null;
    logs: LogMessage[];
    computeUnits: number;
    truncated: boolean;
    failed: boolean;
}

/**
 * Parse raw transaction logs into structured instruction logs
 * Works with both legacy web3.js and Solana Kit transaction structures
 */
export function parseProgramLogs(
    logs: readonly string[],
    error: TransactionError | null,
    cluster: string = 'mainnet'
): InstructionLogs[] {
    let depth = 0;
    const prettyLogs: InstructionLogs[] = [];

    function prefixBuilder(indentLevel: number) {
        if (indentLevel <= 0) {
            return '';
        }
        return new Array(indentLevel - 1).fill('\u00A0\u00A0').join('') + '> ';
    }

    let prettyError;
    if (error) {
        prettyError = getTransactionInstructionError(error);
    }

    logs.forEach(log => {
        if (log.startsWith('Program log:')) {
            // Use passive tense
            log = log.replace(/Program log: (.*)/g, (match, p1) => {
                return `Program logged: "${p1}"`;
            });

            prettyLogs[prettyLogs.length - 1].logs.push({
                prefix: prefixBuilder(depth),
                style: 'muted',
                text: log,
            });
        } else if (log.startsWith('Log truncated')) {
            prettyLogs[prettyLogs.length - 1].truncated = true;
        } else {
            const regex = /Program (\w*) invoke \[(\d)\]/g;
            const matches = Array.from(log.matchAll(regex));

            if (matches.length > 0) {
                const programAddress = matches[0][1];
                const programName = getProgramName(programAddress, cluster);

                if (depth === 0) {
                    prettyLogs.push({
                        computeUnits: 0,
                        failed: false,
                        invokedProgram: programAddress,
                        logs: [],
                        truncated: false,
                    });
                } else {
                    prettyLogs[prettyLogs.length - 1].logs.push({
                        prefix: prefixBuilder(depth),
                        style: 'info',
                        text: `Program invoked: ${programName}`,
                    });
                }

                depth++;
            } else if (log.includes('success')) {
                prettyLogs[prettyLogs.length - 1].logs.push({
                    prefix: prefixBuilder(depth),
                    style: 'success',
                    text: `Program returned success`,
                });
                depth--;
            } else if (log.includes('failed')) {
                const instructionLog = prettyLogs[prettyLogs.length - 1];
                instructionLog.failed = true;

                let currText = `Program returned error: "${log.slice(log.indexOf(': ') + 2)}"`;
                // failed to verify log of previous program so reset depth and print full log
                if (log.startsWith('failed')) {
                    depth++;
                    currText = log.charAt(0).toUpperCase() + log.slice(1);
                }

                instructionLog.logs.push({
                    prefix: prefixBuilder(depth),
                    style: 'warning',
                    text: currText,
                });
                depth--;
            } else {
                if (depth === 0) {
                    prettyLogs.push({
                        computeUnits: 0,
                        failed: false,
                        invokedProgram: null,
                        logs: [],
                        truncated: false,
                    });
                    depth++;
                }

                // Remove redundant program address from logs
                log = log.replace(/Program \w* consumed (\d*) (.*)/g, (match, p1, p2) => {
                    // Only aggregate compute units consumed from top-level tx instructions
                    // because they include inner ix compute units as well.
                    if (depth === 1) {
                        prettyLogs[prettyLogs.length - 1].computeUnits += Number.parseInt(p1);
                    }

                    return `Program consumed: ${p1} ${p2}`;
                });

                // native program logs don't start with "Program log:"
                prettyLogs[prettyLogs.length - 1].logs.push({
                    prefix: prefixBuilder(depth),
                    style: 'muted',
                    text: log,
                });
            }
        }
    });

    // If the instruction's simulation returned an error without any logs then add an empty log entry for Runtime error
    if (prettyError && prettyLogs.length === 0) {
        prettyLogs.push({
            computeUnits: 0,
            failed: true,
            invokedProgram: null,
            logs: [],
            truncated: false,
        });
    }

    if (prettyError && prettyError.index === prettyLogs.length - 1) {
        const failedIx = prettyLogs[prettyError.index];
        if (!failedIx.failed) {
            failedIx.failed = true;
            failedIx.logs.push({
                prefix: prefixBuilder(1),
                style: 'warning',
                text: `Runtime error: ${prettyError.message}`,
            });
        }
    }

    return prettyLogs;
}

/**
 * Calculate total compute units consumed across all instructions
 */
export function getTotalComputeUnits(logs: InstructionLogs[]): number {
    return logs.reduce((total, log) => total + log.computeUnits, 0);
}

