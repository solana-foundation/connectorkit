/**
 * @connector-kit/debugger - Simulation Tracker
 * 
 * Tracks simulation results across the session for statistics and analysis
 */

import type { SimulationResult, SimulationStatistics } from '../types/simulation';

/**
 * Simulation tracking entry
 */
interface SimulationEntry {
    result: SimulationResult;
    transactionSize: number;
    usedALT: boolean;
}

/**
 * Session-wide simulation tracker (singleton)
 */
class SimulationTrackerClass {
    private simulations: SimulationEntry[] = [];

    /**
     * Track a simulation result
     * 
     * @param result - Simulation result
     * @param transactionSize - Transaction size in bytes
     * @param usedALT - Whether transaction used Address Lookup Table
     */
    trackSimulation(result: SimulationResult, transactionSize: number, usedALT: boolean): void {
        this.simulations.push({
            result,
            transactionSize,
            usedALT,
        });
    }

    /**
     * Get overall success rate
     * 
     * @returns Success rate as percentage (0-100)
     */
    getSuccessRate(): number {
        if (this.simulations.length === 0) return 0;
        
        const successful = this.simulations.filter(s => s.result.success).length;
        return (successful / this.simulations.length) * 100;
    }

    /**
     * Get average compute units consumed
     * 
     * @returns Average compute units
     */
    getAverageComputeUnits(): number {
        const withComputeUnits = this.simulations.filter(
            s => s.result.computeUnitsConsumed !== null,
        );

        if (withComputeUnits.length === 0) return 0;

        const total = withComputeUnits.reduce(
            (sum, s) => sum + (s.result.computeUnitsConsumed || 0),
            0,
        );

        return Math.round(total / withComputeUnits.length);
    }

    /**
     * Get common errors encountered
     * 
     * @returns Array of errors with frequency counts
     */
    getCommonErrors(): Array<{ error: string; count: number }> {
        const errorCounts = new Map<string, number>();

        this.simulations.forEach(s => {
            if (s.result.error) {
                const count = errorCounts.get(s.result.error) || 0;
                errorCounts.set(s.result.error, count + 1);
            }
        });

        return Array.from(errorCounts.entries())
            .map(([error, count]) => ({ error, count }))
            .sort((a, b) => b.count - a.count);
    }

    /**
     * Get complete statistics
     * 
     * @returns Simulation statistics
     */
    getStatistics(): SimulationStatistics {
        const total = this.simulations.length;
        const successful = this.simulations.filter(s => s.result.success).length;
        const successRate = total > 0 ? (successful / total) * 100 : 0;

        // ALT statistics
        const withALT = this.simulations.filter(s => s.usedALT);
        const withoutALT = this.simulations.filter(s => !s.usedALT);

        const avgWithALT =
            withALT.length > 0
                ? Math.round(
                      withALT.reduce((sum, s) => sum + (s.result.computeUnitsConsumed || 0), 0) /
                          withALT.length,
                  )
                : 0;

        const avgWithoutALT =
            withoutALT.length > 0
                ? Math.round(
                      withoutALT.reduce((sum, s) => sum + (s.result.computeUnitsConsumed || 0), 0) /
                          withoutALT.length,
                  )
                : 0;

        return {
            totalSimulations: total,
            successfulSimulations: successful,
            successRate,
            averageComputeUnits: this.getAverageComputeUnits(),
            commonErrors: this.getCommonErrors(),
            withALT: {
                count: withALT.length,
                averageComputeUnits: avgWithALT,
            },
            withoutALT: {
                count: withoutALT.length,
                averageComputeUnits: avgWithoutALT,
            },
        };
    }

    /**
     * Get total number of simulations
     * 
     * @returns Total simulation count
     */
    getTotalSimulations(): number {
        return this.simulations.length;
    }

    /**
     * Clear all tracked simulations
     */
    reset(): void {
        this.simulations = [];
    }

    /**
     * Get recent simulations
     * 
     * @param count - Number of recent simulations to return
     * @returns Array of recent simulation entries
     */
    getRecent(count = 10): SimulationEntry[] {
        return this.simulations.slice(-count);
    }
}

/**
 * Singleton instance of simulation tracker
 */
export const SimulationTracker = new SimulationTrackerClass();

