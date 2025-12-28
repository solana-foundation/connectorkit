/**
 * Tests for Configuration System
 *
 * Comprehensive tests for default configuration creation
 */

import { describe, it, expect } from 'vitest';
import { getDefaultConfig, getDefaultMobileConfig } from './default-config';
import type { DefaultConfigOptions } from './default-config';
import type { SolanaCluster } from '@wallet-ui/core';

describe('Configuration System', () => {
    describe('getDefaultConfig', () => {
        const baseOptions: DefaultConfigOptions = {
            appName: 'Test App',
        };

        it('should create config with required appName', () => {
            const config = getDefaultConfig(baseOptions);

            expect(config.appName).toBe('Test App');
        });

        it('should default to mainnet-beta network', () => {
            const config = getDefaultConfig(baseOptions);

            expect(config.network).toBe('mainnet-beta');
        });

        it('should enable autoConnect by default', () => {
            const config = getDefaultConfig(baseOptions);

            expect(config.autoConnect).toBe(true);
        });

        it('should enable mobile by default', () => {
            const config = getDefaultConfig(baseOptions);

            expect(config.enableMobile).toBe(true);
        });

        it('should enable error boundary by default', () => {
            const config = getDefaultConfig(baseOptions);

            expect(config.errorBoundary?.enabled).toBe(true);
        });

        it('should default to 3 max retries', () => {
            const config = getDefaultConfig(baseOptions);

            expect(config.errorBoundary?.maxRetries).toBe(3);
        });

        it('should use provided network', () => {
            const config = getDefaultConfig({
                ...baseOptions,
                network: 'devnet',
            });

            expect(config.network).toBe('devnet');
        });

        it('should accept mainnet-beta convention', () => {
            const config = getDefaultConfig({
                ...baseOptions,
                network: 'mainnet-beta',
            });

            expect(config.network).toBe('mainnet-beta');
        });

        it('should disable autoConnect when specified', () => {
            const config = getDefaultConfig({
                ...baseOptions,
                autoConnect: false,
            });

            expect(config.autoConnect).toBe(false);
        });

        it('should disable mobile when specified', () => {
            const config = getDefaultConfig({
                ...baseOptions,
                enableMobile: false,
            });

            expect(config.enableMobile).toBe(false);
        });

        it('should include appUrl when provided', () => {
            const config = getDefaultConfig({
                ...baseOptions,
                appUrl: 'https://test.com',
            });

            expect(config.appUrl).toBe('https://test.com');
        });

        it('should enable debug mode when specified', () => {
            const config = getDefaultConfig({
                ...baseOptions,
                debug: true,
            });

            expect(config.debug).toBe(true);
        });

        it('should have default clusters', () => {
            const config = getDefaultConfig(baseOptions);

            expect(config.cluster).toBeDefined();
            expect(config.cluster?.clusters).toBeDefined();
            expect(Array.isArray(config.cluster?.clusters)).toBe(true);
            expect(config.cluster?.clusters.length).toBeGreaterThan(0);
        });

        it('should include localnet cluster when network is localnet', () => {
            const config = getDefaultConfig({
                ...baseOptions,
                network: 'localnet',
            });

            const clusterIds = config.cluster!.clusters.map(c => c.id);
            expect(clusterIds).toContain('solana:localnet');
        });

        it('should accept custom clusters', () => {
            const customCluster = {
                id: 'solana:custom',
                label: 'Custom',
                url: 'https://custom.com',
            } satisfies SolanaCluster;

            const config = getDefaultConfig({
                ...baseOptions,
                customClusters: [customCluster],
            });

            expect(config.cluster!.clusters.some(c => c.id === 'solana:custom')).toBe(true);
        });

        it('should persist cluster selection by default', () => {
            const config = getDefaultConfig(baseOptions);

            expect(config.cluster?.persistSelection).toBe(true);
        });

        it('should allow disabling cluster persistence', () => {
            const config = getDefaultConfig({
                ...baseOptions,
                persistClusterSelection: false,
            });

            expect(config.cluster?.persistSelection).toBe(false);
        });

        it('should configure error boundary with custom options', () => {
            const onError = () => {};
            const config = getDefaultConfig({
                ...baseOptions,
                enableErrorBoundary: false,
                maxRetries: 5,
                onError,
            });

            expect(config.errorBoundary?.enabled).toBe(false);
            expect(config.errorBoundary?.maxRetries).toBe(5);
            expect(config.errorBoundary?.onError).toBe(onError);
        });

        it('should have storage configuration', () => {
            const config = getDefaultConfig(baseOptions);

            expect(config.storage).toBeDefined();
        });
    });

    describe('getDefaultMobileConfig', () => {
        const baseOptions = {
            appName: 'Test App',
        };

        it('should create mobile config', () => {
            const config = getDefaultMobileConfig(baseOptions);

            expect(config).toBeDefined();
            expect(config.appIdentity).toBeDefined();
            expect(config.appIdentity.name).toBe('Test App');
        });

        it('should have cluster configuration', () => {
            const config = getDefaultMobileConfig(baseOptions);

            expect(config.cluster).toBeDefined();
            expect(config.cluster).toBe('mainnet-beta');
        });

        it('should accept appUrl in appIdentity', () => {
            const config = getDefaultMobileConfig({
                ...baseOptions,
                appUrl: 'https://test.com',
            });

            expect(config.appIdentity.uri).toBe('https://test.com');
        });

        it('should include icon path in appIdentity', () => {
            const config = getDefaultMobileConfig({
                ...baseOptions,
                appUrl: 'https://test.com',
            });

            expect(config.appIdentity.icon).toContain('favicon.ico');
        });
    });

    describe('configuration merging', () => {
        it('should merge custom clusters with defaults', () => {
            const customCluster = {
                id: 'solana:custom',
                label: 'Custom',
                url: 'https://custom.com',
            } satisfies SolanaCluster;

            const config = getDefaultConfig({
                appName: 'Test',
                customClusters: [customCluster],
            });

            expect(config.cluster!.clusters.length).toBeGreaterThan(1);
            expect(config.cluster!.clusters.some(c => c.id === 'solana:custom')).toBe(true);
        });

        it('should override defaults with explicit values', () => {
            const config = getDefaultConfig({
                appName: 'Test',
                autoConnect: false,
                enableMobile: false,
                persistClusterSelection: false,
            });

            expect(config.autoConnect).toBe(false);
            expect(config.enableMobile).toBe(false);
            expect(config.cluster?.persistSelection).toBe(false);
        });
    });

    describe('network conventions', () => {
        it('should handle both mainnet conventions', () => {
            const config1 = getDefaultConfig({
                appName: 'Test',
                network: 'mainnet',
            });
            const config2 = getDefaultConfig({
                appName: 'Test',
                network: 'mainnet-beta',
            });

            expect(config1.network).toBeDefined();
            expect(config2.network).toBeDefined();
        });

        it('should support all standard networks', () => {
            const networks: Array<'mainnet' | 'mainnet-beta' | 'devnet' | 'testnet' | 'localnet'> = [
                'mainnet',
                'mainnet-beta',
                'devnet',
                'testnet',
                'localnet',
            ];

            networks.forEach(network => {
                const config = getDefaultConfig({
                    appName: 'Test',
                    network,
                });

                expect(config.network).toBe(network);
            });
        });
    });

    describe('edge cases', () => {
        it('should handle empty appName', () => {
            const config = getDefaultConfig({
                appName: '',
            });

            expect(config.appName).toBe('');
        });

        it('should handle very long appName', () => {
            const longName = 'A'.repeat(1000);
            const config = getDefaultConfig({
                appName: longName,
            });

            expect(config.appName).toBe(longName);
        });

        it('should handle special characters in appName', () => {
            const config = getDefaultConfig({
                appName: 'Test™ App® 🚀',
            });

            expect(config.appName).toBe('Test™ App® 🚀');
        });

        it('should handle undefined optional fields', () => {
            const config = getDefaultConfig({
                appName: 'Test',
                appUrl: undefined,
                debug: undefined,
            });

            expect(config.appName).toBe('Test');
            expect(config.appUrl).toBeUndefined();
            expect(config.debug).toBeFalsy();
        });
    });
});
