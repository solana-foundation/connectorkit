/**
 * @solana/connector-debugger - ALT Optimization Calculator
 *
 * Calculates potential savings from using Address Lookup Tables (ALTs).
 * Based on real-world data from transaction optimizer showing 40-50% typical savings.
 */

import type { TransactionSizeAnalysis } from './transaction-analyzer';

/**
 * ALT savings calculation result
 */
export interface ALTSavingsAnalysis {
    /** Current transaction size in bytes */
    currentSize: number;
    /** Estimated size with ALT optimization */
    potentialSize: number;
    /** Bytes that would be saved */
    bytesSaved: number;
    /** Percentage reduction (0-100) */
    percentReduction: number;
    /** Compression ratio (e.g., 1.87 means 1.87:1 compression) */
    compressionRatio: number;
    /** Whether optimization is worthwhile (>20% savings) */
    worthOptimizing: boolean;
    /** Number of repeated addresses that would benefit from ALT */
    numRepeatedAddresses: number;
    /** Recommended addresses to include in ALT */
    recommendedAddresses: string[];
    /** Quality rating of the optimization opportunity */
    rating: 'excellent' | 'good' | 'moderate' | 'minimal';
}

/**
 * Address suggestion with reasoning
 */
export interface AddressSuggestion {
    /** List of recommended addresses for ALT */
    recommended: string[];
    /** Expected bytes saved */
    expectedSavings: number;
    /** Human-readable explanation */
    rationale: string;
}

/**
 * Calculate potential savings from using Address Lookup Tables
 *
 * Based on real-world measurements:
 * - Single transaction: 660 bytes → 353 bytes (46.5% reduction)
 * - Bundle transaction: 1536 bytes → 871 bytes (43.3% reduction)
 * - Each address: 32 bytes → 1 byte index (31 bytes saved)
 * - ALT overhead: ~33 bytes (32 byte table address + 1 byte version)
 *
 * @param currentSize - Current transaction size in bytes
 * @param addresses - Array of account addresses in transaction
 * @param frequencyMap - Optional map of how often each address appears globally
 * @returns ALT savings analysis
 */
export function calculateALTSavings(
    currentSize: number,
    addresses: string[],
    frequencyMap?: Map<string, number>,
): ALTSavingsAnalysis {
    // Count duplicate addresses within this transaction
    const addressCounts = new Map<string, number>();
    addresses.forEach(addr => {
        addressCounts.set(addr, (addressCounts.get(addr) || 0) + 1);
    });

    // Find addresses that appear multiple times OR appear frequently across sessions
    const repeatedAddresses = Array.from(addressCounts.entries()).filter(([addr, count]) => {
        const localRepeats = count > 1;
        const globalFrequent = frequencyMap && (frequencyMap.get(addr) || 0) >= 3;
        return localRepeats || globalFrequent;
    });

    const numRepeatedAddresses = repeatedAddresses.length;

    // If too few repeated addresses, ALT won't help much
    if (numRepeatedAddresses < 3) {
        return {
            currentSize,
            potentialSize: currentSize,
            bytesSaved: 0,
            percentReduction: 0,
            compressionRatio: 1.0,
            worthOptimizing: false,
            numRepeatedAddresses,
            recommendedAddresses: [],
            rating: 'minimal',
        };
    }

    // Calculate savings
    // Each address reference: 32 bytes → 1 byte (31 bytes saved)
    // ALT overhead: 33 bytes total (table address + version byte + compact array encoding)
    const BYTES_PER_ADDRESS = 31; // 32 byte address becomes 1 byte index
    const ALT_OVERHEAD = 33;

    const totalSaved = numRepeatedAddresses * BYTES_PER_ADDRESS - ALT_OVERHEAD;
    const bytesSaved = Math.max(0, totalSaved);
    const potentialSize = currentSize - bytesSaved;
    const percentReduction = currentSize > 0 ? (bytesSaved / currentSize) * 100 : 0;
    const compressionRatio = potentialSize > 0 ? currentSize / potentialSize : 1.0;

    // Determine if worth optimizing (>20% savings is the threshold)
    const worthOptimizing = percentReduction >= 20;

    // Get recommended addresses (sorted by frequency/count)
    const recommendedAddresses = repeatedAddresses
        .sort(([addrA, countA], [addrB, countB]) => {
            const freqA = frequencyMap?.get(addrA) || countA;
            const freqB = frequencyMap?.get(addrB) || countB;
            return freqB - freqA;
        })
        .map(([addr]) => addr);

    // Rate the optimization opportunity
    let rating: ALTSavingsAnalysis['rating'];
    if (percentReduction >= 50) {
        rating = 'excellent';
    } else if (percentReduction >= 30) {
        rating = 'good';
    } else if (percentReduction >= 15) {
        rating = 'moderate';
    } else {
        rating = 'minimal';
    }

    return {
        currentSize,
        potentialSize,
        bytesSaved,
        percentReduction,
        compressionRatio,
        worthOptimizing,
        numRepeatedAddresses,
        recommendedAddresses,
        rating,
    };
}

/**
 * Suggest best addresses for ALT based on frequency analysis
 *
 * @param addresses - All addresses from current transaction
 * @param frequencyMap - Global frequency map across all transactions
 * @returns Address suggestions with rationale
 */
export function suggestALTAddresses(addresses: string[], frequencyMap: Map<string, number>): AddressSuggestion {
    // Sort addresses by global frequency
    const sortedByFrequency = addresses
        .map(addr => ({
            address: addr,
            frequency: frequencyMap.get(addr) || 1,
        }))
        .sort((a, b) => b.frequency - a.frequency);

    // Take top addresses (up to 256, which is ALT limit, but typically top 10-20 is enough)
    const topAddresses = sortedByFrequency.slice(0, 20);

    // Calculate expected savings
    const expectedSavings = topAddresses.reduce((total, { frequency }) => {
        // Each occurrence saves 31 bytes (after first use which adds overhead)
        return total + (frequency > 1 ? (frequency - 1) * 31 : 0);
    }, 0);

    // Generate rationale
    const highFrequency = topAddresses.filter(a => a.frequency >= 5);
    let rationale: string;

    if (highFrequency.length > 0) {
        rationale = `${highFrequency.length} addresses appear 5+ times. Strong ALT candidate.`;
    } else if (topAddresses.length >= 10) {
        rationale = `${topAddresses.length} addresses used repeatedly. Good ALT candidate.`;
    } else if (topAddresses.length >= 5) {
        rationale = `${topAddresses.length} addresses detected. Moderate ALT benefit.`;
    } else {
        rationale = `Only ${topAddresses.length} repeated addresses. Limited ALT benefit.`;
    }

    return {
        recommended: topAddresses.map(a => a.address),
        expectedSavings,
        rationale,
    };
}

/**
 * Get a user-friendly description of the optimization rating
 *
 * @param rating - Optimization quality rating
 * @returns Human-readable description
 */
export function getRatingDescription(rating: ALTSavingsAnalysis['rating']): string {
    switch (rating) {
        case 'excellent':
            return 'Highly recommended - significant savings possible';
        case 'good':
            return 'Recommended - solid optimization opportunity';
        case 'moderate':
            return 'Optional - modest improvements possible';
        case 'minimal':
            return 'Not recommended - limited benefit';
    }
}

/**
 * Get color for optimization rating (for UI)
 *
 * @param rating - Optimization quality rating
 * @returns Hex color code
 */
export function getRatingColor(rating: ALTSavingsAnalysis['rating']): string {
    switch (rating) {
        case 'excellent':
            return '#22c55e'; // green
        case 'good':
            return '#3b82f6'; // blue
        case 'moderate':
            return '#eab308'; // yellow
        case 'minimal':
            return '#6b7280'; // gray
    }
}

/**
 * Estimate transaction size if it were using an ALT
 * This is a rough estimation for visualization purposes
 *
 * @param analysis - Transaction size analysis
 * @param numAddressesInALT - Number of addresses that would be in the ALT
 * @returns Estimated size with ALT
 */
export function estimateSizeWithALT(currentSize: number, numAddressesInALT: number): number {
    // Each address: 32 bytes → 1 byte (save 31 bytes each)
    // Add ALT overhead: 33 bytes
    const savings = numAddressesInALT * 31;
    const overhead = 33;
    const netSavings = savings - overhead;

    return Math.max(0, currentSize - netSavings);
}
