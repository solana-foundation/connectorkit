import type { AccountInfo } from '../../types/accounts';
import type { WalletAccount } from '@wallet-standard/base';
import { address as toAddress } from '@solana/addresses';

export const TEST_ADDRESSES = {
    ACCOUNT_1: 'HMJfh9P8FEF5eVHp3XypYWThUYCQ9sWNZZQQxVP2jjr1',
    ACCOUNT_2: '9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM',
    ACCOUNT_3: 'FpqDXqs8fvFmvf9F7Qz5xQVpbVaWqvZvG8M9KJ9qDqJq',
} as const;

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
        features: (options.features ?? []) as WalletAccount['features'],
        label: options.label,
    };
}

export function createMockAccountInfo(
    address: string = TEST_ADDRESSES.ACCOUNT_1,
    options: {
        label?: string;
        chains?: `${string}:${string}`[];
    } = {},
): AccountInfo {
    return {
        address: toAddress(address),
        raw: createMockWalletAccount(address, options),
    };
}

export function createTestAccounts(count: number = 3): AccountInfo[] {
    const addresses = Object.values(TEST_ADDRESSES);
    return Array.from({ length: Math.min(count, addresses.length) }, (_, i) =>
        createMockAccountInfo(addresses[i], {
            label: `Account ${i + 1}`,
        }),
    );
}

export function createTestWalletAccounts(count: number = 3): WalletAccount[] {
    const addresses = Object.values(TEST_ADDRESSES);
    return Array.from({ length: Math.min(count, addresses.length) }, (_, i) =>
        createMockWalletAccount(addresses[i], {
            label: `Account ${i + 1}`,
        }),
    );
}
