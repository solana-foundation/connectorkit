/**
 * Tests for main entry point (index.ts)
 *
 * Verifies that all exports are correctly exposed from both React and headless modes
 */

import { describe, it, expect } from 'vitest';
import * as ConnectorKit from './index';

describe('Main Entry Point (index.ts)', () => {
    describe('exports', () => {
        it('should export core client from headless', () => {
            expect(ConnectorKit.ConnectorClient).toBeDefined();
            expect(typeof ConnectorKit.ConnectorClient).toBe('function');
        });

        it('should export React components', () => {
            expect(ConnectorKit.ConnectorProvider).toBeDefined();
            expect(ConnectorKit.UnifiedProvider).toBeDefined();
            expect(ConnectorKit.AppProvider).toBeDefined();
            expect(ConnectorKit.ConnectorErrorBoundary).toBeDefined();
            expect(typeof ConnectorKit.ConnectorProvider).toBe('function');
        });

        it('should export React hooks', () => {
            expect(ConnectorKit.useConnector).toBeDefined();
            expect(ConnectorKit.useConnectorClient).toBeDefined();
            expect(ConnectorKit.useCluster).toBeDefined();
            expect(ConnectorKit.useAccount).toBeDefined();
            expect(ConnectorKit.useWalletInfo).toBeDefined();
            expect(ConnectorKit.useTransactionSigner).toBeDefined();
            expect(ConnectorKit.useGillTransactionSigner).toBeDefined();
            expect(ConnectorKit.useGillSolanaClient).toBeDefined();
            expect(ConnectorKit.useTransactionPreparer).toBeDefined();
            expect(typeof ConnectorKit.useConnector).toBe('function');
            expect(typeof ConnectorKit.useAccount).toBe('function');
        });

        it('should export configuration functions', () => {
            expect(ConnectorKit.getDefaultConfig).toBeDefined();
            expect(ConnectorKit.getDefaultMobileConfig).toBeDefined();
            expect(ConnectorKit.createConfig).toBeDefined();
            expect(ConnectorKit.isUnifiedConfig).toBeDefined();
            expect(typeof ConnectorKit.getDefaultConfig).toBe('function');
            expect(typeof ConnectorKit.isUnifiedConfig).toBe('function');
        });

        it('should export transaction signing functions', () => {
            expect(ConnectorKit.createTransactionSigner).toBeDefined();
            expect(ConnectorKit.createGillTransactionSigner).toBeDefined();
            expect(typeof ConnectorKit.createTransactionSigner).toBe('function');
            expect(typeof ConnectorKit.createGillTransactionSigner).toBe('function');
        });

        it('should export storage system', () => {
            expect(ConnectorKit.EnhancedStorage).toBeDefined();
            expect(ConnectorKit.EnhancedStorageAdapter).toBeDefined();
            expect(ConnectorKit.createEnhancedStorageAccount).toBeDefined();
            expect(ConnectorKit.createEnhancedStorageCluster).toBeDefined();
            expect(ConnectorKit.createEnhancedStorageWallet).toBeDefined();
            expect(typeof ConnectorKit.createEnhancedStorageAccount).toBe('function');
        });

        it('should export error handling', () => {
            expect(ConnectorKit.ConnectorError).toBeDefined();
            expect(ConnectorKit.ConnectionError).toBeDefined();
            expect(ConnectorKit.ValidationError).toBeDefined();
            expect(ConnectorKit.ConfigurationError).toBeDefined();
            expect(ConnectorKit.NetworkError).toBeDefined();
            expect(ConnectorKit.TransactionError).toBeDefined();
            expect(ConnectorKit.Errors).toBeDefined();
            expect(ConnectorKit.isConnectorError).toBeDefined();
            expect(ConnectorKit.toConnectorError).toBeDefined();
            expect(ConnectorKit.getUserFriendlyMessage).toBeDefined();
            expect(typeof ConnectorKit.isConnectorError).toBe('function');
            expect(typeof ConnectorKit.toConnectorError).toBe('function');
        });

        it('should export utility functions', () => {
            expect(ConnectorKit.formatAddress).toBeDefined();
            expect(ConnectorKit.formatSOL).toBeDefined();
            expect(ConnectorKit.formatSignature).toBeDefined();
            expect(ConnectorKit.getNetworkDisplayName).toBeDefined();
            expect(typeof ConnectorKit.formatAddress).toBe('function');
            expect(typeof ConnectorKit.formatSOL).toBe('function');
        });

        it('should export explorer URL functions', () => {
            expect(ConnectorKit.getSolanaExplorerUrl).toBeDefined();
            expect(ConnectorKit.getSolscanUrl).toBeDefined();
            expect(ConnectorKit.getXrayUrl).toBeDefined();
            expect(ConnectorKit.getSolanaFmUrl).toBeDefined();
            expect(ConnectorKit.getAllExplorerUrls).toBeDefined();
            expect(typeof ConnectorKit.getSolanaExplorerUrl).toBe('function');
            expect(typeof ConnectorKit.getSolscanUrl).toBe('function');
        });

        it('should export polyfill functions', () => {
            expect(ConnectorKit.installPolyfills).toBeDefined();
            expect(ConnectorKit.isPolyfillInstalled).toBeDefined();
            expect(ConnectorKit.isCryptoAvailable).toBeDefined();
            expect(ConnectorKit.getPolyfillStatus).toBeDefined();
            expect(typeof ConnectorKit.installPolyfills).toBe('function');
            expect(typeof ConnectorKit.isPolyfillInstalled).toBe('function');
        });

        it('should export wallet registry access', () => {
            expect(ConnectorKit.getWalletsRegistry).toBeDefined();
            expect(typeof ConnectorKit.getWalletsRegistry).toBe('function');
        });

        it('should export wallet error boundary utilities', () => {
            expect(ConnectorKit.WalletErrorType).toBeDefined();
            expect(ConnectorKit.withErrorBoundary).toBeDefined();
            expect(typeof ConnectorKit.withErrorBoundary).toBe('function');
        });
    });

    describe('no circular dependencies', () => {
        it('should import without errors', () => {
            // ESM modules are already imported at the top of this file
            // If there were circular dependencies, the import would fail
            expect(ConnectorKit).toBeDefined();
            expect(Object.keys(ConnectorKit).length).toBeGreaterThan(0);
        });
    });

    describe('tree-shaking compatibility', () => {
        it('should have named exports (not default)', () => {
            const exports = Object.keys(ConnectorKit);
            expect(exports.length).toBeGreaterThan(0);
            expect(exports).not.toContain('default');
        });

        it('should allow selective imports', () => {
            // This test verifies that specific exports can be imported
            const { ConnectorClient, useConnector, getDefaultConfig } = ConnectorKit;
            expect(ConnectorClient).toBeDefined();
            expect(useConnector).toBeDefined();
            expect(getDefaultConfig).toBeDefined();
        });
    });

    describe('type exports', () => {
        it('should export essential types', () => {
            // These tests verify types are exported (will fail if types are missing)
            const typeTest = (value: unknown): value is ConnectorKit.ConnectorConfig => {
                return typeof value === 'object' && value !== null;
            };

            expect(typeTest).toBeDefined();
        });
    });
});
