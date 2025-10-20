/**
 * Account test fixtures
 *
 * Pre-configured account data for testing
 */

import type { AccountInfo } from '../../types/accounts';
import type { WalletAccount } from '@wallet-standard/base';

/**
 * Test account addresses
 */
export const TEST_ADDRESSES = {
    ACCOUNT_1: 'HMJfh9P8FEF5eVHp3XypYWThUYCQ9sWNZZQQxVP2jjr1',
    ACCOUNT_2: '9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM',
    ACCOUNT_3: 'FpqDXqs8fvFmvf9F7Qz5xQVpbVaWqvZvG8M9KJ9qDqJq',
} as const;

/**
 * Create a mock WalletAccount
 */
export function createMockWalletAccount(
    address: string = TEST_ADDRESSES.ACCOUNT_1,
    options: {
        chains?: `${string}:${string}`[];
        features?: string[];
        label?: string;
    } = {},
): WalletAccount {
    return {
        address,
        publicKey: new Uint8Array(32).fill(1),
        chains: (options.chains ?? ['solana:mainnet', 'solana:devnet']) as `${string}:${string}`[],
        features: options.features ?? [],
        label: options.label,
    };
}

/**
 * Create a mock AccountInfo
 */
export function createMockAccountInfo(
    address: string = TEST_ADDRESSES.ACCOUNT_1,
    options: {
        label?: string;
        chains?: `${string}:${string}`[];
    } = {},
): AccountInfo {
    return {
        address: address as any,
        label: options.label,
        chains: (options.chains ?? ['solana:mainnet', 'solana:devnet']) as `${string}:${string}`[],
    };
}

/**
 * Create multiple test accounts
 */
export function createTestAccounts(count: number = 3): AccountInfo[] {
    const addresses = Object.values(TEST_ADDRESSES);
    return Array.from({ length: Math.min(count, addresses.length) }, (_, i) =>
        createMockAccountInfo(addresses[i], {
            label: `Account ${i + 1}`,
        }),
    );
}

/**
 * Create multiple wallet accounts
 */
export function createTestWalletAccounts(count: number = 3): WalletAccount[] {
    const addresses = Object.values(TEST_ADDRESSES);
    return Array.from({ length: Math.min(count, addresses.length) }, (_, i) =>
        createMockWalletAccount(addresses[i], {
            label: `Account ${i + 1}`,
        }),
    );
}
