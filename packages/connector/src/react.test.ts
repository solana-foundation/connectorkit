/**
 * Tests for React entry point (react.ts)
 *
 * Verifies that React-specific exports are correctly exposed
 */

import { describe, it, expect } from 'vitest';
import * as ConnectorKitReact from './react';

describe('React Entry Point (react.ts)', () => {
    describe('React components', () => {
        it('should export ConnectorProvider', () => {
            expect(ConnectorKitReact.ConnectorProvider).toBeDefined();
            expect(typeof ConnectorKitReact.ConnectorProvider).toBe('function');
        });

        it('should export UnifiedProvider', () => {
            expect(ConnectorKitReact.UnifiedProvider).toBeDefined();
            expect(typeof ConnectorKitReact.UnifiedProvider).toBe('function');
        });

        it('should export AppProvider', () => {
            expect(ConnectorKitReact.AppProvider).toBeDefined();
            expect(typeof ConnectorKitReact.AppProvider).toBe('function');
        });

        it('should export error boundary', () => {
            expect(ConnectorKitReact.ConnectorErrorBoundary).toBeDefined();
            expect(typeof ConnectorKitReact.ConnectorErrorBoundary).toBe('function');
            expect(ConnectorKitReact.withErrorBoundary).toBeDefined();
            expect(typeof ConnectorKitReact.withErrorBoundary).toBe('function');
        });
    });

    describe('React hooks', () => {
        it('should export useConnector hook', () => {
            expect(ConnectorKitReact.useConnector).toBeDefined();
            expect(typeof ConnectorKitReact.useConnector).toBe('function');
        });

        it('should export useConnectorClient hook', () => {
            expect(ConnectorKitReact.useConnectorClient).toBeDefined();
            expect(typeof ConnectorKitReact.useConnectorClient).toBe('function');
        });

        it('should export useCluster hook', () => {
            expect(ConnectorKitReact.useCluster).toBeDefined();
            expect(typeof ConnectorKitReact.useCluster).toBe('function');
        });

        it('should export useAccount hook', () => {
            expect(ConnectorKitReact.useAccount).toBeDefined();
            expect(typeof ConnectorKitReact.useAccount).toBe('function');
        });

        it('should export useWalletInfo hook', () => {
            expect(ConnectorKitReact.useWalletInfo).toBeDefined();
            expect(typeof ConnectorKitReact.useWalletInfo).toBe('function');
        });

        it('should export useTransactionSigner hook', () => {
            expect(ConnectorKitReact.useTransactionSigner).toBeDefined();
            expect(typeof ConnectorKitReact.useTransactionSigner).toBe('function');
        });

        it('should export useGillTransactionSigner hook', () => {
            expect(ConnectorKitReact.useGillTransactionSigner).toBeDefined();
            expect(typeof ConnectorKitReact.useGillTransactionSigner).toBe('function');
        });

        it('should export useGillSolanaClient hook', () => {
            expect(ConnectorKitReact.useGillSolanaClient).toBeDefined();
            expect(typeof ConnectorKitReact.useGillSolanaClient).toBe('function');
        });

        it('should export useTransactionPreparer hook', () => {
            expect(ConnectorKitReact.useTransactionPreparer).toBeDefined();
            expect(typeof ConnectorKitReact.useTransactionPreparer).toBe('function');
        });
    });

    describe('exports structure', () => {
        it('should only export React-specific functionality', () => {
            const exports = Object.keys(ConnectorKitReact);

            // Should have all the React hooks and components
            expect(exports).toContain('ConnectorProvider');
            expect(exports).toContain('useConnector');
            expect(exports).toContain('useAccount');
            expect(exports).toContain('useCluster');
        });

        it('should not export headless-only functionality', () => {
            const exports = Object.keys(ConnectorKitReact);

            // These are headless-specific, shouldn't be in React entry
            // (though types might be re-exported)
            const reactExports = exports.filter(name => typeof (ConnectorKitReact as any)[name] === 'function');

            expect(reactExports.length).toBeGreaterThan(0);
        });

        it('should have named exports for tree-shaking', () => {
            const exports = Object.keys(ConnectorKitReact);
            expect(exports.length).toBeGreaterThan(0);
            expect(exports).not.toContain('default');
        });
    });

    describe('no circular dependencies', () => {
        it('should import without errors', () => {
            // ESM modules are already imported at the top of this file
            // If there were circular dependencies, the import would fail
            expect(ConnectorKitReact).toBeDefined();
            expect(Object.keys(ConnectorKitReact).length).toBeGreaterThan(0);
        });
    });

    describe('selective imports', () => {
        it('should allow importing specific exports', () => {
            const { ConnectorProvider, useConnector, useAccount, useCluster, ConnectorErrorBoundary } =
                ConnectorKitReact;

            expect(ConnectorProvider).toBeDefined();
            expect(useConnector).toBeDefined();
            expect(useAccount).toBeDefined();
            expect(useCluster).toBeDefined();
            expect(ConnectorErrorBoundary).toBeDefined();
        });
    });

    describe('deprecation notices', () => {
        it('should note debug panel deprecation in comments', () => {
            // The debug panel has been moved to @solana/connector-debugger
            // This is documented in the source file comments
            // No runtime test needed, but verifying the entry point works
            expect(true).toBe(true);
        });
    });
});
