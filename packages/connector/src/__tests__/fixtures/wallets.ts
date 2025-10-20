/**
 * Wallet test fixtures
 *
 * Pre-configured wallet instances for testing
 */

import type { WalletInfo } from '../../types/wallets';
import {
    createMockPhantomWallet,
    createMockSolflareWallet,
    createMockBackpackWallet,
} from '../mocks/wallet-standard-mock';

export const PHANTOM_WALLET_INFO: WalletInfo = {
    wallet: createMockPhantomWallet(),
    installed: true,
    connectable: true,
};

export const SOLFLARE_WALLET_INFO: WalletInfo = {
    wallet: createMockSolflareWallet(),
    installed: true,
    connectable: true,
};

export const BACKPACK_WALLET_INFO: WalletInfo = {
    wallet: createMockBackpackWallet(),
    installed: true,
    connectable: true,
};

/**
 * Create a set of test wallets
 */
export function createTestWallets() {
    return {
        phantom: createMockPhantomWallet(),
        solflare: createMockSolflareWallet(),
        backpack: createMockBackpackWallet(),
    };
}

/**
 * Create a wallet that fails to connect
 */
export function createFailingWallet() {
    return createMockPhantomWallet({
        name: 'Failing Wallet',
        connectBehavior: 'error',
    });
}

/**
 * Create a wallet that times out on connect
 */
export function createTimeoutWallet() {
    return createMockPhantomWallet({
        name: 'Timeout Wallet',
        connectBehavior: 'timeout',
    });
}
