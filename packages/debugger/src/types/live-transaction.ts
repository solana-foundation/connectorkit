/**
 * @connector-kit/debugger - Live Transaction Types
 * 
 * Types for real-time transaction monitoring and lifecycle tracking
 */

import type { SimulationResult } from './simulation';
import type { ALTSavingsAnalysis } from '../utils/alt-optimizer';

/**
 * Status of a live transaction as it progresses through lifecycle
 */
export type LiveTransactionStatus =
    | 'preparing'    // Transaction received, about to simulate
    | 'simulating'   // Simulation in progress
    | 'simulated'    // Simulation complete
    | 'signing'      // Waiting for user signature
    | 'sending'      // Broadcasting to network
    | 'confirming'   // Waiting for confirmation
    | 'confirmed'    // Successfully confirmed
    | 'failed';      // Failed at any stage

/**
 * Live transaction being tracked
 */
export interface LiveTransaction {
    /** Unique ID for this transaction */
    id: string;
    
    /** Current status */
    status: LiveTransactionStatus;
    
    /** Raw transaction bytes */
    transaction: Uint8Array;
    
    /** Transaction size in bytes */
    size: number;
    
    /** Simulation result (null until simulated) */
    simulationResult: SimulationResult | null;
    
    /** Transaction signature (null until sent) */
    signature: string | null;
    
    /** When transaction was received */
    timestamp: string;
    
    /** ALT optimization suggestion (if applicable) */
    altSuggestion?: ALTSavingsAnalysis;
    
    /** Error message (if failed) */
    error?: string;
    
    /** When to auto-clear (for confirmed transactions) */
    autoClearAt?: number;
}

/**
 * Configuration for auto-simulation behavior
 */
export interface AutoSimulationConfig {
    /** Whether to auto-simulate transactions */
    enabled: boolean;
    
    /** Whether to auto-switch to Live tab on new transaction */
    autoSwitchTab: boolean;
    
    /** Auto-clear confirmed transactions after N milliseconds */
    autoClearDelay: number;
    
    /** Show optimization suggestions in Live view */
    showOptimizationSuggestions: boolean;
    
    /** Track simulations in optimization stats */
    trackInStats: boolean;
}

/**
 * Default auto-simulation configuration
 */
export const DEFAULT_AUTO_SIMULATION_CONFIG: AutoSimulationConfig = {
    enabled: true,
    autoSwitchTab: false,
    autoClearDelay: 5000, // 5 seconds
    showOptimizationSuggestions: true,
    trackInStats: true,
};

