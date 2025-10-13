/**
 * @connector-kit/debugger - Transaction Simulator
 * 
 * Core simulation logic for testing transactions before sending
 */

import { createSolanaRpc, getBase58Decoder, type Transaction } from '@solana/kit';
import type {
    SimulationResult,
    SimulateOptions,
    SimulationAccount,
    ComputeUnitBreakdown,
    SimulationAdvice,
} from '../types/simulation';
import { getSimpleErrorMessage } from './transaction-errors';

/**
 * Solana compute unit limit
 */
const COMPUTE_UNIT_LIMIT = 1_400_000; // Current Solana limit

/**
 * Base transaction fee in lamports
 */
const BASE_FEE_LAMPORTS = 5000;

/**
 * Simulate a transaction without sending it
 * 
 * @param transactionBytes - Serialized transaction bytes
 * @param rpcUrl - RPC endpoint URL
 * @param options - Simulation options
 * @returns Simulation result with detailed analysis
 */
export async function simulateTransaction(
    transactionBytes: Uint8Array,
    rpcUrl: string,
    options: SimulateOptions = {},
): Promise<SimulationResult> {
    try {
        const rpc = createSolanaRpc(rpcUrl);

        // Decode transaction to get signature for API
        const base58Decoder = getBase58Decoder();
        
        // Create simulation request
        const simulationOptions = {
            commitment: options.commitment || ('confirmed' as const),
            replaceRecentBlockhash: options.replaceRecentBlockhash ?? true,
            sigVerify: options.sigVerify ?? false,
            ...(options.accounts ? { accounts: options.accounts } : {}),
        };

        // Simulate the transaction
        const simulation = await rpc.simulateTransaction(
            transactionBytes,
            simulationOptions,
        ).send();

        // Check if simulation returned a value
        if (!simulation || !simulation.value) {
            return createErrorResult('Simulation returned no results');
        }

        const { value } = simulation;
        const success = value.err === null;
        const logs = value.logs || [];
        
        // Extract compute units from logs
        const computeUnitsConsumed = extractComputeUnits(logs);
        
        // Parse accounts if available
        const accounts = parseAccounts(value.accounts);

        // Extract error message if simulation failed
        let error: string | null = null;
        if (value.err) {
            error = getSimpleErrorMessage(value.err);
        }

        // Generate warnings
        const warnings = generateWarnings(computeUnitsConsumed, success, logs);

        // Calculate estimated fee
        const estimatedFee = computeUnitsConsumed ? estimateFee(computeUnitsConsumed) : null;

        // Create compute unit breakdown
        const unitsConsumed = computeUnitsConsumed
            ? createComputeUnitBreakdown(computeUnitsConsumed, logs)
            : null;

        return {
            success,
            error,
            computeUnitsConsumed,
            logs,
            accounts,
            estimatedFee,
            unitsConsumed,
            warnings,
            timestamp: new Date().toISOString(),
        };
    } catch (error) {
        console.error('Failed to simulate transaction:', error);
        return createErrorResult(
            error instanceof Error ? error.message : 'Unknown simulation error',
        );
    }
}

/**
 * Extract compute units consumed from simulation logs
 * 
 * @param logs - Program execution logs
 * @returns Compute units consumed, or null if not found
 */
function extractComputeUnits(logs: string[]): number | null {
    // Look for log like: "Program consumed: 2452 of 200000 compute units"
    for (const log of logs) {
        if (log.includes('consumed:') || log.includes('Consumed:')) {
            const match = log.match(/(\d+)\s+of\s+(\d+)\s+compute units/i);
            if (match) {
                return parseInt(match[1], 10);
            }
        }
    }
    
    // Also check for total compute units log
    for (const log of logs) {
        if (log.includes('total compute units')) {
            const match = log.match(/(\d+)\s+total compute units/i);
            if (match) {
                return parseInt(match[1], 10);
            }
        }
    }
    
    return null;
}

/**
 * Parse account information from simulation result
 * 
 * @param accounts - Raw account data from simulation
 * @returns Parsed account information
 */
function parseAccounts(accounts: unknown): SimulationAccount[] {
    if (!accounts || !Array.isArray(accounts)) {
        return [];
    }

    return accounts
        .map((acc, index) => {
            if (!acc || typeof acc !== 'object') {
                return null;
            }

            // Extract account properties
            const address = `account_${index}`; // Placeholder as we don't have address from simulation
            const valid = acc !== null;
            const writable = false; // Would need additional info from transaction

            return {
                address,
                valid,
                writable,
            };
        })
        .filter((acc): acc is SimulationAccount => acc !== null);
}

/**
 * Create compute unit breakdown with per-instruction analysis
 * 
 * @param totalUnits - Total compute units consumed
 * @param logs - Program execution logs
 * @returns Compute unit breakdown
 */
function createComputeUnitBreakdown(totalUnits: number, logs: string[]): ComputeUnitBreakdown {
    // Try to extract per-instruction compute units from logs
    const byInstruction: number[] = [];
    
    for (const log of logs) {
        // Look for instruction-specific compute unit logs
        const match = log.match(/Instruction #(\d+).*?(\d+)\s+compute units/i);
        if (match) {
            byInstruction.push(parseInt(match[2], 10));
        }
    }

    const percentOfLimit = (totalUnits / COMPUTE_UNIT_LIMIT) * 100;

    return {
        total: totalUnits,
        byInstruction,
        percentOfLimit,
    };
}

/**
 * Estimate transaction fee based on compute units
 * 
 * @param computeUnits - Compute units consumed
 * @param priorityFee - Optional priority fee in microlamports
 * @returns Estimated fee in lamports
 */
function estimateFee(computeUnits: number, priorityFee = 0): number {
    // Solana fee: 5000 lamports base + priority fee
    const baseFee = BASE_FEE_LAMPORTS;
    const priority = priorityFee > 0 ? Math.ceil((priorityFee * computeUnits) / 1_000_000) : 0;
    
    return baseFee + priority;
}

/**
 * Generate warnings based on simulation results
 * 
 * @param computeUnits - Compute units consumed
 * @param success - Whether simulation succeeded
 * @param logs - Program execution logs
 * @returns Array of warning messages
 */
function generateWarnings(
    computeUnits: number | null,
    success: boolean,
    logs: string[],
): string[] {
    const warnings: string[] = [];

    // Check compute unit usage
    if (computeUnits !== null) {
        const percentUsed = (computeUnits / COMPUTE_UNIT_LIMIT) * 100;
        
        if (percentUsed > 80) {
            warnings.push(`High compute unit usage: ${percentUsed.toFixed(1)}% of limit`);
        }
    }

    // Check for common warning patterns in logs
    const warningPatterns = [
        { pattern: /insufficient/i, message: 'Insufficient funds or resources detected' },
        { pattern: /invalid/i, message: 'Invalid account or data detected' },
        { pattern: /failed/i, message: 'Operation failure detected in logs' },
    ];

    for (const { pattern, message } of warningPatterns) {
        if (logs.some(log => pattern.test(log)) && !success) {
            warnings.push(message);
        }
    }

    return warnings;
}

/**
 * Create an error result when simulation fails to execute
 * 
 * @param errorMessage - Error message
 * @returns Simulation result indicating error
 */
function createErrorResult(errorMessage: string): SimulationResult {
    return {
        success: false,
        error: errorMessage,
        computeUnitsConsumed: null,
        logs: [],
        accounts: [],
        estimatedFee: null,
        unitsConsumed: null,
        warnings: ['Simulation failed to execute'],
        timestamp: new Date().toISOString(),
    };
}

/**
 * Analyze simulation result and provide actionable advice
 * 
 * @param result - Simulation result
 * @returns Array of advice items
 */
export function analyzeSimulation(result: SimulationResult): SimulationAdvice[] {
    const advice: SimulationAdvice[] = [];

    // Success case
    if (result.success) {
        advice.push({
            severity: 'success',
            message: 'Simulation successful - transaction ready to send',
        });

        // Check compute unit efficiency
        if (result.computeUnitsConsumed && result.computeUnitsConsumed > 800_000) {
            advice.push({
                severity: 'info',
                message: 'High compute unit usage detected',
                action: 'Consider optimizing with Address Lookup Tables or splitting into multiple transactions',
            });
        }

        return advice;
    }

    // Error cases
    if (!result.error) {
        advice.push({
            severity: 'error',
            message: 'Simulation failed with unknown error',
        });
        return advice;
    }

    // Specific error handling
    const errorLower = result.error.toLowerCase();

    if (errorLower.includes('insufficient funds') || errorLower.includes('insufficient lamports')) {
        advice.push({
            severity: 'error',
            message: 'Insufficient SOL balance',
            action: 'Add more SOL to your wallet before sending this transaction',
        });
    } else if (errorLower.includes('blockhash') || errorLower.includes('expired')) {
        advice.push({
            severity: 'warning',
            message: 'Transaction blockhash expired',
            action: 'Rebuild transaction with fresh blockhash',
        });
    } else if (errorLower.includes('compute') || errorLower.includes('exceeded')) {
        advice.push({
            severity: 'error',
            message: 'Transaction exceeded compute budget',
            action: 'Add compute budget instructions or optimize transaction',
            code: `import { ComputeBudgetProgram } from '@solana/web3.js';

// Add to transaction instructions:
ComputeBudgetProgram.setComputeUnitLimit({ units: 400_000 })`,
        });
    } else if (errorLower.includes('invalid') || errorLower.includes('account')) {
        advice.push({
            severity: 'error',
            message: 'Invalid account or account does not exist',
            action: 'Verify all accounts exist and are correctly initialized',
        });
    } else {
        advice.push({
            severity: 'error',
            message: result.error,
            action: 'Review transaction and account setup',
        });
    }

    return advice;
}

/**
 * Format compute units for display
 * 
 * @param units - Compute units
 * @returns Formatted string
 */
export function formatComputeUnits(units: number): string {
    if (units < 1000) {
        return `${units} CU`;
    }
    return `${(units / 1000).toFixed(1)}K CU`;
}

/**
 * Format fee for display
 * 
 * @param lamports - Fee in lamports
 * @returns Formatted string
 */
export function formatFee(lamports: number): string {
    const sol = lamports / 1_000_000_000;
    if (sol < 0.000001) {
        return `${lamports} lamports`;
    }
    return `${sol.toFixed(6)} SOL`;
}

