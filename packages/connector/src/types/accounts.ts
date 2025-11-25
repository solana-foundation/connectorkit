/**
 * Account-related types
 */

import type { WalletAccount } from './wallets';
import type { Address } from '@solana/addresses';

/**
 * Extended account information with formatted address
 */
export interface AccountInfo {
    /** Formatted Solana address */
    address: Address;
    /** Optional account icon/avatar URL */
    icon?: string;
    /** Raw wallet account object from Wallet Standard */
    raw: WalletAccount;
}
