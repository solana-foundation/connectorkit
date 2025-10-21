/**
 * @solana/connector-debugger - Simulation Types
 *
 * TypeScript types for transaction simulation features
 */

/**
 * Result of a transaction simulation
 */
export interface SimulationResult {
    /** Whether the simulation succeeded */
    success: boolean;
    /** Error message if simulation failed */
    error: string | null;
    /** Total compute units consumed */
    computeUnitsConsumed: number | null;
    /** Program execution logs */
    logs: string[];
    /** Accounts accessed during simulation */
    accounts: SimulationAccount[];
    /** Estimated transaction fee in lamports */
    estimatedFee: number | null;
    /** Detailed compute unit breakdown */
    unitsConsumed: ComputeUnitBreakdown | null;
    /** Warnings about potential issues */
    warnings: string[];
    /** Timestamp of simulation */
    timestamp: string;
}

/**
 * Account information from simulation
 */
export interface SimulationAccount {
    /** Account address */
    address: string;
    /** Whether account is valid/exists */
    valid: boolean;
    /** Whether account is writable */
    writable: boolean;
    /** Account balance in lamports (if available) */
    lamports?: number;
}

/**
 * Compute unit breakdown by instruction
 */
export interface ComputeUnitBreakdown {
    /** Total compute units consumed */
    total: number;
    /** Compute units per instruction */
    byInstruction: number[];
    /** Percentage of limit used */
    percentOfLimit: number;
}

/**
 * Options for transaction simulation
 */
export interface SimulateOptions {
    /** Replace the recent blockhash with latest */
    replaceRecentBlockhash?: boolean;
    /** Skip signature verification */
    sigVerify?: boolean;
    /** Commitment level */
    commitment?: 'processed' | 'confirmed' | 'finalized';
    /** Specific accounts to include in response */
    accounts?: {
        encoding: 'base64' | 'base58' | 'jsonParsed';
        addresses: string[];
    };
}

/**
 * Comparison between two simulations
 */
export interface SimulationComparison {
    /** Original simulation result */
    original: SimulationResult;
    /** Optimized simulation result */
    optimized: SimulationResult;
    /** Savings achieved */
    savings: {
        bytes: number;
        computeUnits: number;
        percentReduction: number;
    };
}

/**
 * Simulation advice/suggestion
 */
export interface SimulationAdvice {
    /** Severity level */
    severity: 'error' | 'warning' | 'info' | 'success';
    /** Human-readable message */
    message: string;
    /** Suggested action to take */
    action?: string;
    /** Code snippet to fix issue */
    code?: string;
}

/**
 * Session-wide simulation statistics
 */
export interface SimulationStatistics {
    /** Total simulations performed */
    totalSimulations: number;
    /** Number of successful simulations */
    successfulSimulations: number;
    /** Success rate (0-100) */
    successRate: number;
    /** Average compute units consumed */
    averageComputeUnits: number;
    /** Common errors encountered */
    commonErrors: Array<{ error: string; count: number }>;
    /** Simulations with ALT */
    withALT: {
        count: number;
        averageComputeUnits: number;
    };
    /** Simulations without ALT */
    withoutALT: {
        count: number;
        averageComputeUnits: number;
    };
}
