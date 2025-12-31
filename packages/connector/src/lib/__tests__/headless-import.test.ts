/**
 * Headless Import Smoke Test
 *
 * Verifies that the headless entrypoint does not import React.
 * This ensures headless.ts can be used in non-React environments.
 */

import { describe, it, expect } from 'vitest';

describe('headless entrypoint', () => {
    it('should export ConnectorClient without React', async () => {
        // Dynamic import to simulate real usage
        const headless = await import('../../headless');

        // Verify key exports exist
        expect(headless.ConnectorClient).toBeDefined();
        expect(typeof headless.ConnectorClient).toBe('function');
    });

    it('should export WalletErrorType without React', async () => {
        const headless = await import('../../headless');

        // Verify error types are exported
        expect(headless.WalletErrorType).toBeDefined();
        expect(headless.WalletErrorType.CONNECTION_FAILED).toBe('CONNECTION_FAILED');
        expect(headless.WalletErrorType.USER_REJECTED).toBe('USER_REJECTED');
    });

    it('should export session types and functions', async () => {
        const headless = await import('../../headless');

        // Verify session functions are exported
        expect(headless.createConnectorId).toBeDefined();
        expect(typeof headless.createConnectorId).toBe('function');

        expect(headless.isWalletConnectorId).toBeDefined();
        expect(typeof headless.isWalletConnectorId).toBe('function');

        expect(headless.INITIAL_WALLET_STATUS).toBeDefined();
        expect(headless.INITIAL_WALLET_STATUS.status).toBe('disconnected');
    });

    it('should export storage utilities', async () => {
        const headless = await import('../../headless');

        // Verify storage exports
        expect(headless.createEnhancedStorageWallet).toBeDefined();
        expect(headless.createEnhancedStorageWalletState).toBeDefined();
        expect(headless.EnhancedStorage).toBeDefined();
    });

    it('should export error handling utilities', async () => {
        const headless = await import('../../headless');

        // Verify error exports
        expect(headless.ConnectorError).toBeDefined();
        expect(headless.ConnectionError).toBeDefined();
        expect(headless.TransactionError).toBeDefined();
        expect(headless.isConnectorError).toBeDefined();
        expect(headless.tryCatch).toBeDefined();
    });

    it('should not export React-specific components', async () => {
        const headless = await import('../../headless');

        // These should NOT be in headless exports
        expect((headless as Record<string, unknown>).ConnectorProvider).toBeUndefined();
        expect((headless as Record<string, unknown>).useConnector).toBeUndefined();
        expect((headless as Record<string, unknown>).useWallet).toBeUndefined();
        expect((headless as Record<string, unknown>).ConnectorErrorBoundary).toBeUndefined();
    });
});
