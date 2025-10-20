/**
 * Mock implementation of Wallet Standard API
 *
 * Provides configurable mock wallets for testing wallet connection flows
 */

import type { Wallet as StandardWallet, WalletAccount } from '@wallet-standard/base';
import type {
    StandardConnectFeature,
    StandardDisconnectFeature,
    StandardEventsFeature,
} from '@wallet-standard/features';
import { vi } from 'vitest';

export interface MockWalletOptions {
    name: string;
    icon?: string;
    accounts?: WalletAccount[];
    chains?: string[];
    features?: string[];
    connectBehavior?: 'success' | 'error' | 'timeout';
    disconnectBehavior?: 'success' | 'error';
}

export function createMockWallet(options: MockWalletOptions): StandardWallet {
    const {
        name,
        icon = 'data:image/svg+xml,<svg></svg>',
        accounts = [],
        chains = ['solana:mainnet', 'solana:devnet'],
        features: additionalFeatures = [],
        connectBehavior = 'success',
        disconnectBehavior = 'success',
    } = options;

    let currentAccounts = [...accounts];
    const eventListeners = new Map<string, Set<(...args: unknown[]) => void>>();

    const connectMock = vi.fn(async () => {
        if (connectBehavior === 'timeout') {
            return new Promise(() => {}); // Never resolves
        }

        if (connectBehavior === 'error') {
            throw new Error(`Failed to connect to ${name}`);
        }

        // Simulate successful connection
        if (currentAccounts.length === 0) {
            // Create a default account if none exist
            const mockAccount: WalletAccount = {
                address: 'HMJfh9P8FEF5eVHp3XypYWThUYCQ9sWNZZQQxVP2jjr1',
                publicKey: new Uint8Array(32).fill(1),
                chains,
                features: [],
            };
            currentAccounts = [mockAccount];
        }

        // Emit change event
        const changeListeners = eventListeners.get('change');
        if (changeListeners) {
            changeListeners.forEach(listener => {
                listener({ accounts: currentAccounts });
            });
        }

        return { accounts: currentAccounts };
    });

    const disconnectMock = vi.fn(async () => {
        if (disconnectBehavior === 'error') {
            throw new Error(`Failed to disconnect from ${name}`);
        }

        currentAccounts = [];

        // Emit change event
        const changeListeners = eventListeners.get('change');
        if (changeListeners) {
            changeListeners.forEach(listener => {
                listener({ accounts: [] });
            });
        }
    });

    const onMock = vi.fn((event: string, listener: (...args: unknown[]) => void) => {
        if (!eventListeners.has(event)) {
            eventListeners.set(event, new Set());
        }
        eventListeners.get(event)!.add(listener);

        // Return unsubscribe function
        return () => {
            eventListeners.get(event)?.delete(listener);
        };
    });

    const wallet: StandardWallet = {
        version: '1.0.0',
        name,
        icon,
        chains,
        features: {
            'standard:connect': {
                version: '1.0.0',
                connect: connectMock,
            } as StandardConnectFeature['standard:connect'],
            'standard:disconnect': {
                version: '1.0.0',
                disconnect: disconnectMock,
            } as StandardDisconnectFeature['standard:disconnect'],
            'standard:events': {
                version: '1.0.0',
                on: onMock,
            } as StandardEventsFeature['standard:events'],
            ...Object.fromEntries(additionalFeatures.map(feature => [feature, { version: '1.0.0' }])),
        },
        accounts: currentAccounts,
    };

    return wallet;
}

export function createMockPhantomWallet(overrides?: Partial<MockWalletOptions>): StandardWallet {
    return createMockWallet({
        name: 'Phantom',
        icon: 'data:image/svg+xml,<svg><text>P</text></svg>',
        chains: ['solana:mainnet', 'solana:devnet', 'solana:testnet'],
        features: ['solana:signTransaction', 'solana:signMessage'],
        ...overrides,
    });
}

export function createMockSolflareWallet(overrides?: Partial<MockWalletOptions>): StandardWallet {
    return createMockWallet({
        name: 'Solflare',
        icon: 'data:image/svg+xml,<svg><text>S</text></svg>',
        chains: ['solana:mainnet', 'solana:devnet', 'solana:testnet'],
        features: ['solana:signTransaction', 'solana:signMessage'],
        ...overrides,
    });
}

export function createMockBackpackWallet(overrides?: Partial<MockWalletOptions>): StandardWallet {
    return createMockWallet({
        name: 'Backpack',
        icon: 'data:image/svg+xml,<svg><text>B</text></svg>',
        chains: ['solana:mainnet', 'solana:devnet'],
        features: ['solana:signTransaction'],
        ...overrides,
    });
}

/**
 * Mock the global wallet registry
 */
export function mockWalletRegistry(wallets: StandardWallet[]) {
    const listeners = new Set<() => void>();

    const mockRegistry = {
        get: () => wallets,
        on: (event: string, listener: () => void) => {
            if (event === 'register' || event === 'unregister') {
                listeners.add(listener);
            }
            return () => listeners.delete(listener);
        },
        register: (wallet: StandardWallet) => {
            wallets.push(wallet);
            listeners.forEach(listener => listener());
        },
        unregister: (wallet: StandardWallet) => {
            const index = wallets.indexOf(wallet);
            if (index > -1) {
                wallets.splice(index, 1);
                listeners.forEach(listener => listener());
            }
        },
    };

    return mockRegistry;
}
