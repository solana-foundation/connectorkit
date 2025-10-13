/**
 * @connector-kit/debugger - Address Frequency Tracker
 * 
 * Tracks address usage across transactions to identify ALT candidates.
 * Addresses that appear frequently across multiple transactions are good
 * candidates for Address Lookup Tables.
 */

/**
 * Address usage statistics
 */
export interface AddressStats {
    /** The address (base58 encoded) */
    address: string;
    /** Number of times this address appeared */
    count: number;
    /** Estimated bytes saved if included in ALT (31 bytes per occurrence after overhead) */
    potentialSavings: number;
    /** Human-readable name if it's a known program */
    displayName?: string;
}

/**
 * Session-wide address frequency tracker
 * Singleton pattern to maintain state across component lifecycle
 */
class AddressTrackerClass {
    private frequencies = new Map<string, number>();
    private transactionCount = 0;

    /**
     * Track addresses from a transaction
     * 
     * @param addresses - Array of account addresses from transaction
     */
    trackTransaction(addresses: string[]): void {
        this.transactionCount++;

        // Deduplicate addresses within the same transaction
        const uniqueAddresses = Array.from(new Set(addresses));

        uniqueAddresses.forEach(addr => {
            this.frequencies.set(addr, (this.frequencies.get(addr) || 0) + 1);
        });
    }

    /**
     * Get addresses that appear frequently (ALT candidates)
     * 
     * @param minFrequency - Minimum number of appearances (default: 3)
     * @returns Array of address statistics sorted by frequency (descending)
     */
    getTopCandidates(minFrequency = 3): AddressStats[] {
        return Array.from(this.frequencies.entries())
            .filter(([_, count]) => count >= minFrequency)
            .sort(([_, a], [__, b]) => b - a)
            .map(([address, count]) => this.createAddressStats(address, count));
    }

    /**
     * Get all tracked addresses with their frequencies
     * 
     * @returns Array of all address statistics sorted by frequency (descending)
     */
    getAllAddresses(): AddressStats[] {
        return Array.from(this.frequencies.entries())
            .sort(([_, a], [__, b]) => b - a)
            .map(([address, count]) => this.createAddressStats(address, count));
    }

    /**
     * Get frequency for a specific address
     * 
     * @param address - Address to query
     * @returns Number of times address appeared
     */
    getFrequency(address: string): number {
        return this.frequencies.get(address) || 0;
    }

    /**
     * Get total number of unique addresses tracked
     */
    getUniqueAddressCount(): number {
        return this.frequencies.size;
    }

    /**
     * Get total number of transactions tracked
     */
    getTransactionCount(): number {
        return this.transactionCount;
    }

    /**
     * Calculate total potential savings if all frequent addresses were in ALT
     * 
     * @param minFrequency - Minimum frequency to consider (default: 3)
     * @returns Total bytes that could be saved
     */
    getTotalPotentialSavings(minFrequency = 3): number {
        return this.getTopCandidates(minFrequency).reduce((sum, addr) => sum + addr.potentialSavings, 0);
    }

    /**
     * Reset all tracked data
     */
    reset(): void {
        this.frequencies.clear();
        this.transactionCount = 0;
    }

    /**
     * Create address statistics object with calculated savings
     * 
     * @param address - The address
     * @param count - Number of occurrences
     * @returns Address statistics with potential savings
     */
    private createAddressStats(address: string, count: number): AddressStats {
        // Each address in a transaction is 32 bytes
        // In an ALT, it becomes 1 byte (index)
        // So we save 31 bytes per occurrence
        // But we need to account for ALT overhead (~33 bytes total for the table reference)
        // So actual savings = (count * 31) - 33, but only if count >= 2
        const potentialSavings = count >= 2 ? count * 31 - 33 : 0;

        return {
            address,
            count,
            potentialSavings: Math.max(0, potentialSavings),
            displayName: getProgramName(address),
        };
    }
}

/**
 * Singleton instance of address tracker
 */
export const AddressTracker = new AddressTrackerClass();

/**
 * Get human-readable name for known Solana programs
 * 
 * @param address - Program address
 * @returns Display name or undefined
 */
function getProgramName(address: string): string | undefined {
    const knownPrograms: Record<string, string> = {
        '11111111111111111111111111111111': 'System Program',
        TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA: 'Token Program',
        TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb: 'Token-2022 Program',
        ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL: 'Associated Token Program',
        'Memo1UhkJRfHyvLMcVucJwxXeuD728EqVDDwQDxFMNo': 'Memo Program',
        MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr: 'Memo Program (v2)',
        ComputeBudget111111111111111111111111111111: 'Compute Budget Program',
        Ed25519SigVerify111111111111111111111111111: 'Ed25519 Program',
        KeccakSecp256k11111111111111111111111111111: 'Secp256k1 Program',
        // Add more known programs as needed
    };

    return knownPrograms[address];
}

/**
 * Extract account addresses from a transaction for tracking
 * 
 * @param transaction - Transaction object (from RPC response)
 * @returns Array of account addresses
 */
export function extractAccountAddresses(transaction: unknown): string[] {
    try {
        if (!transaction || typeof transaction !== 'object') {
            return [];
        }

        // Handle RPC transaction response format
        if ('transaction' in transaction) {
            const tx = (transaction as { transaction: unknown }).transaction;
            if (tx && typeof tx === 'object' && 'message' in tx) {
                const message = (tx as { message: unknown }).message;
                if (message && typeof message === 'object' && 'accountKeys' in message) {
                    const accountKeys = (message as { accountKeys: unknown }).accountKeys;
                    if (Array.isArray(accountKeys)) {
                        return accountKeys
                            .map(key => {
                                // Handle both string format and object format { pubkey: string }
                                if (typeof key === 'string') {
                                    return key;
                                }
                                if (key && typeof key === 'object' && 'pubkey' in key) {
                                    return String((key as { pubkey: unknown }).pubkey);
                                }
                                return null;
                            })
                            .filter((addr): addr is string => addr !== null);
                    }
                }
            }
        }

        // Handle direct message format
        if ('message' in transaction) {
            const message = (transaction as { message: unknown }).message;
            if (message && typeof message === 'object' && 'accountKeys' in message) {
                const accountKeys = (message as { accountKeys: unknown }).accountKeys;
                if (Array.isArray(accountKeys)) {
                    return accountKeys
                        .map(key => (typeof key === 'string' ? key : null))
                        .filter((addr): addr is string => addr !== null);
                }
            }
        }

        return [];
    } catch (error) {
        console.warn('Failed to extract account addresses:', error);
        return [];
    }
}

