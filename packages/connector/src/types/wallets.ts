/**
 * Wallet-related types
 * Re-exports from @wallet-standard/base and custom wallet types
 */

import type { Wallet, WalletAccount } from '@wallet-standard/base';

// Re-export standard types
export type { Wallet, WalletAccount };

/**
 * Wallet name as a branded string for type safety
 * Represents the unique identifier for a wallet (e.g., "Phantom", "Solflare")
 */
export type WalletName = string & { readonly __brand: 'WalletName' };

/**
 * Account address as a branded string for type safety
 * Represents a Solana address (base58-encoded public key)
 *
 * @deprecated Use `Address` from '@solana/addresses' instead for consistent address typing
 */
export type AccountAddress = string & { readonly __brand: 'AccountAddress' };

/**
 * Type guard to check if a string is a valid wallet name
 */
export function isWalletName(value: string): value is WalletName {
    return typeof value === 'string' && value.length > 0;
}

/**
 * Type guard to check if a string is a valid account address
 *
 * @deprecated Use `isAddress` from '@solana/addresses' instead for proper address validation
 */
export function isAccountAddress(value: string): value is AccountAddress {
    // Basic validation: Solana addresses are typically 32-44 characters
    return typeof value === 'string' && value.length >= 32 && value.length <= 44;
}

/**
 * Extended wallet information with capability metadata
 */
export interface WalletInfo {
    /** The Wallet Standard wallet object */
    wallet: Wallet;
    /** Whether the wallet extension is installed */
    installed: boolean;
    /** Precomputed capability flag for UI convenience */
    connectable?: boolean;
}
