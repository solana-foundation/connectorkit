/**
 * React testing helpers
 *
 * Utilities for testing React components and hooks
 */

import React from 'react';
import { render, type RenderOptions } from '@testing-library/react';
import { ConnectorProvider } from '../../ui/connector-provider';
import type { ConnectorConfig } from '../../types/connector';
import { mockWalletRegistry } from '../mocks/wallet-standard-mock';
import { createTestWallets } from '../fixtures/wallets';

/**
 * Custom render function with ConnectorProvider wrapper
 */
export function renderWithProvider(
    ui: React.ReactElement,
    options: {
        config?: ConnectorConfig;
        renderOptions?: Omit<RenderOptions, 'wrapper'>;
    } = {},
) {
    const { config, renderOptions } = options;

    function Wrapper({ children }: { children: React.ReactNode }) {
        return <ConnectorProvider config={config}>{children}</ConnectorProvider>;
    }

    return render(ui, { wrapper: Wrapper, ...renderOptions });
}

/**
 * Setup test environment with wallets
 */
export function setupTestEnvironment(options: { walletCount?: number; config?: ConnectorConfig } = {}) {
    const { walletCount = 3, config } = options;

    // Create test wallets
    const testWallets = createTestWallets();
    const wallets = Object.values(testWallets).slice(0, walletCount);

    // Mock the wallet registry
    const registry = mockWalletRegistry(wallets);

    // Mock window.solana (Phantom injection)
    if (typeof window !== 'undefined') {
        // @ts-expect-error - Mocking window.solana
        window.solana = {
            isPhantom: true,
            publicKey: null,
            connect: testWallets.phantom.features['standard:connect']?.connect,
            disconnect: testWallets.phantom.features['standard:disconnect']?.disconnect,
        };
    }

    return {
        wallets: testWallets,
        registry,
        cleanup: () => {
            if (typeof window !== 'undefined') {
                // @ts-expect-error - Cleaning up mock
                delete window.solana;
            }
        },
    };
}

/**
 * Wait for React state updates to complete
 */
export async function waitForReactUpdates() {
    await new Promise(resolve => setTimeout(resolve, 0));
}

/**
 * Create a test wrapper for hooks
 */
export function createHookWrapper(config?: ConnectorConfig) {
    return function Wrapper({ children }: { children: React.ReactNode }) {
        return <ConnectorProvider config={config}>{children}</ConnectorProvider>;
    };
}
