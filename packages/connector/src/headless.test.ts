/**
 * Tests for Headless entry point (headless.ts)
 *
 * Verifies framework-agnostic core exports without React dependencies
 */

import { describe, it, expect } from 'vitest';
import * as ConnectorKitHeadless from './headless';

describe('Headless Entry Point (headless.ts)', () => {
    describe('core client', () => {
        it('should export ConnectorClient', () => {
            expect(ConnectorKitHeadless.ConnectorClient).toBeDefined();
            expect(typeof ConnectorKitHeadless.ConnectorClient).toBe('function');
        });

        it('should export wallet registry access', () => {
            expect(ConnectorKitHeadless.getWalletsRegistry).toBeDefined();
            expect(typeof ConnectorKitHeadless.getWalletsRegistry).toBe('function');
        });
    });

    describe('configuration', () => {
        it('should export getDefaultConfig', () => {
            expect(ConnectorKitHeadless.getDefaultConfig).toBeDefined();
            expect(typeof ConnectorKitHeadless.getDefaultConfig).toBe('function');
        });

        it('should export getDefaultMobileConfig', () => {
            expect(ConnectorKitHeadless.getDefaultMobileConfig).toBeDefined();
            expect(typeof ConnectorKitHeadless.getDefaultMobileConfig).toBe('function');
        });

        it('should export createConfig', () => {
            expect(ConnectorKitHeadless.createConfig).toBeDefined();
            expect(typeof ConnectorKitHeadless.createConfig).toBe('function');
        });

        it('should export isUnifiedConfig', () => {
            expect(ConnectorKitHeadless.isUnifiedConfig).toBeDefined();
            expect(typeof ConnectorKitHeadless.isUnifiedConfig).toBe('function');
        });
    });

    describe('transaction signing', () => {
        it('should export createTransactionSigner', () => {
            expect(ConnectorKitHeadless.createTransactionSigner).toBeDefined();
            expect(typeof ConnectorKitHeadless.createTransactionSigner).toBe('function');
        });

        it('should export createKitTransactionSigner', () => {
            expect(ConnectorKitHeadless.createKitTransactionSigner).toBeDefined();
            expect(typeof ConnectorKitHeadless.createKitTransactionSigner).toBe('function');
        });

        it('should export createGillTransactionSigner (deprecated alias)', () => {
            expect(ConnectorKitHeadless.createGillTransactionSigner).toBeDefined();
            expect(typeof ConnectorKitHeadless.createGillTransactionSigner).toBe('function');
            expect(ConnectorKitHeadless.createGillTransactionSigner).toBe(
                ConnectorKitHeadless.createKitTransactionSigner,
            );
        });

        it('should export TransactionSignerError', () => {
            expect(ConnectorKitHeadless.TransactionSignerError).toBeDefined();
            expect(typeof ConnectorKitHeadless.TransactionSignerError).toBe('function');
        });

        it('should export isTransactionSignerError', () => {
            expect(ConnectorKitHeadless.isTransactionSignerError).toBeDefined();
            expect(typeof ConnectorKitHeadless.isTransactionSignerError).toBe('function');
        });
    });

    describe('storage system', () => {
        it('should export EnhancedStorage', () => {
            expect(ConnectorKitHeadless.EnhancedStorage).toBeDefined();
            expect(typeof ConnectorKitHeadless.EnhancedStorage).toBe('function');
        });

        it('should export EnhancedStorageAdapter', () => {
            expect(ConnectorKitHeadless.EnhancedStorageAdapter).toBeDefined();
            expect(typeof ConnectorKitHeadless.EnhancedStorageAdapter).toBe('function');
        });

        it('should export storage creation functions', () => {
            expect(ConnectorKitHeadless.createEnhancedStorageAccount).toBeDefined();
            expect(ConnectorKitHeadless.createEnhancedStorageCluster).toBeDefined();
            expect(ConnectorKitHeadless.createEnhancedStorageWallet).toBeDefined();
            expect(typeof ConnectorKitHeadless.createEnhancedStorageAccount).toBe('function');
            expect(typeof ConnectorKitHeadless.createEnhancedStorageCluster).toBe('function');
            expect(typeof ConnectorKitHeadless.createEnhancedStorageWallet).toBe('function');
        });
    });

    describe('error handling', () => {
        it('should export error classes', () => {
            expect(ConnectorKitHeadless.ConnectorError).toBeDefined();
            expect(ConnectorKitHeadless.ConnectionError).toBeDefined();
            expect(ConnectorKitHeadless.ValidationError).toBeDefined();
            expect(ConnectorKitHeadless.ConfigurationError).toBeDefined();
            expect(ConnectorKitHeadless.NetworkError).toBeDefined();
            expect(ConnectorKitHeadless.TransactionError).toBeDefined();
            expect(typeof ConnectorKitHeadless.ConnectorError).toBe('function');
        });

        it('should export error utilities', () => {
            expect(ConnectorKitHeadless.Errors).toBeDefined();
            expect(ConnectorKitHeadless.isConnectorError).toBeDefined();
            expect(ConnectorKitHeadless.isConnectionError).toBeDefined();
            expect(ConnectorKitHeadless.isValidationError).toBeDefined();
            expect(ConnectorKitHeadless.isConfigurationError).toBeDefined();
            expect(ConnectorKitHeadless.isNetworkError).toBeDefined();
            expect(ConnectorKitHeadless.isTransactionError).toBeDefined();
            expect(ConnectorKitHeadless.toConnectorError).toBeDefined();
            expect(ConnectorKitHeadless.getUserFriendlyMessage).toBeDefined();
            expect(typeof ConnectorKitHeadless.isConnectorError).toBe('function');
            expect(typeof ConnectorKitHeadless.toConnectorError).toBe('function');
        });

        it('should export wallet error utilities', () => {
            expect(ConnectorKitHeadless.WalletErrorType).toBeDefined();
        });
    });

    describe('utility functions', () => {
        it('should export clipboard utilities', () => {
            expect(ConnectorKitHeadless.copyToClipboard).toBeDefined();
            expect(ConnectorKitHeadless.copyAddressToClipboard).toBeDefined();
            expect(ConnectorKitHeadless.copySignatureToClipboard).toBeDefined();
            expect(typeof ConnectorKitHeadless.copyToClipboard).toBe('function');
        });

        it('should export formatting utilities', () => {
            expect(ConnectorKitHeadless.formatAddress).toBeDefined();
            expect(ConnectorKitHeadless.formatSOL).toBeDefined();
            expect(ConnectorKitHeadless.formatSignature).toBeDefined();
            expect(typeof ConnectorKitHeadless.formatAddress).toBe('function');
            expect(typeof ConnectorKitHeadless.formatSOL).toBe('function');
        });

        it('should export cluster utilities', () => {
            expect(ConnectorKitHeadless.getClusterRpcUrl).toBeDefined();
            expect(ConnectorKitHeadless.getClusterName).toBeDefined();
            expect(ConnectorKitHeadless.isMainnetCluster).toBeDefined();
            expect(typeof ConnectorKitHeadless.getClusterRpcUrl).toBe('function');
            expect(typeof ConnectorKitHeadless.isMainnetCluster).toBe('function');
        });

        it('should export network utilities', () => {
            expect(ConnectorKitHeadless.normalizeNetwork).toBeDefined();
            expect(ConnectorKitHeadless.toClusterId).toBeDefined();
            expect(ConnectorKitHeadless.getDefaultRpcUrl).toBeDefined();
            expect(ConnectorKitHeadless.getNetworkDisplayName).toBeDefined();
            expect(typeof ConnectorKitHeadless.normalizeNetwork).toBe('function');
            expect(typeof ConnectorKitHeadless.getDefaultRpcUrl).toBe('function');
        });
    });

    describe('explorer URLs', () => {
        it('should export explorer URL functions', () => {
            expect(ConnectorKitHeadless.getSolanaExplorerUrl).toBeDefined();
            expect(ConnectorKitHeadless.getSolscanUrl).toBeDefined();
            expect(ConnectorKitHeadless.getXrayUrl).toBeDefined();
            expect(ConnectorKitHeadless.getSolanaFmUrl).toBeDefined();
            expect(ConnectorKitHeadless.getAllExplorerUrls).toBeDefined();
            expect(typeof ConnectorKitHeadless.getSolanaExplorerUrl).toBe('function');
            expect(typeof ConnectorKitHeadless.getSolscanUrl).toBe('function');
        });

        it('should export signature utilities', () => {
            expect(ConnectorKitHeadless.formatSignature).toBeDefined();
            expect(ConnectorKitHeadless.copySignature).toBeDefined();
            expect(typeof ConnectorKitHeadless.formatSignature).toBe('function');
            expect(typeof ConnectorKitHeadless.copySignature).toBe('function');
        });
    });

    describe('browser compatibility', () => {
        it('should export polyfill functions', () => {
            expect(ConnectorKitHeadless.installPolyfills).toBeDefined();
            expect(ConnectorKitHeadless.isPolyfillInstalled).toBeDefined();
            expect(ConnectorKitHeadless.isCryptoAvailable).toBeDefined();
            expect(ConnectorKitHeadless.getPolyfillStatus).toBeDefined();
            expect(typeof ConnectorKitHeadless.installPolyfills).toBe('function');
            expect(typeof ConnectorKitHeadless.isPolyfillInstalled).toBe('function');
        });
    });

    describe('wallet-ui integration', () => {
        it('should export cluster creation functions', () => {
            expect(ConnectorKitHeadless.createSolanaMainnet).toBeDefined();
            expect(ConnectorKitHeadless.createSolanaDevnet).toBeDefined();
            expect(ConnectorKitHeadless.createSolanaTestnet).toBeDefined();
            expect(ConnectorKitHeadless.createSolanaLocalnet).toBeDefined();
            expect(typeof ConnectorKitHeadless.createSolanaMainnet).toBe('function');
        });
    });

    describe('type guards', () => {
        it('should export isWalletName type guard', () => {
            expect(ConnectorKitHeadless.isWalletName).toBeDefined();
            expect(typeof ConnectorKitHeadless.isWalletName).toBe('function');
        });

        it('should export isAccountAddress type guard', () => {
            expect(ConnectorKitHeadless.isAccountAddress).toBeDefined();
            expect(typeof ConnectorKitHeadless.isAccountAddress).toBe('function');
        });
    });

    describe('no React dependencies', () => {
        it('should not export React-specific components', () => {
            const exports = Object.keys(ConnectorKitHeadless);
            expect(exports).not.toContain('ConnectorProvider');
            expect(exports).not.toContain('useConnector');
            expect(exports).not.toContain('useAccount');
            expect(exports).not.toContain('useCluster');
        });

        it('should be usable in non-React environments', () => {
            // Verify we can access core functionality without React
            const { ConnectorClient, createTransactionSigner, getDefaultConfig } = ConnectorKitHeadless;

            expect(ConnectorClient).toBeDefined();
            expect(createTransactionSigner).toBeDefined();
            expect(getDefaultConfig).toBeDefined();
        });
    });

    describe('no circular dependencies', () => {
        it('should import without errors', () => {
            // ESM modules are already imported at the top of this file
            // If there were circular dependencies, the import would fail
            expect(ConnectorKitHeadless).toBeDefined();
            expect(Object.keys(ConnectorKitHeadless).length).toBeGreaterThan(0);
        });
    });

    describe('tree-shaking compatibility', () => {
        it('should have named exports', () => {
            const exports = Object.keys(ConnectorKitHeadless);
            expect(exports.length).toBeGreaterThan(0);
            expect(exports).not.toContain('default');
        });

        it('should allow selective imports', () => {
            const { ConnectorClient, createTransactionSigner, getDefaultConfig, EnhancedStorage } =
                ConnectorKitHeadless;

            expect(ConnectorClient).toBeDefined();
            expect(createTransactionSigner).toBeDefined();
            expect(getDefaultConfig).toBeDefined();
            expect(EnhancedStorage).toBeDefined();
        });
    });
});
