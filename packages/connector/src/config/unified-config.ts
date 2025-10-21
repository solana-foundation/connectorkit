/**
 * @solana/connector - Unified configuration
 *
 * Simplified configuration for apps using ConnectorKit
 * Eliminates config duplication and provides a single source of truth
 */

import type { ExtendedConnectorConfig, DefaultConfigOptions } from './default-config';
import type { MobileWalletAdapterConfig } from '../ui/connector-provider';
import { getDefaultConfig, getDefaultMobileConfig } from './default-config';
import { normalizeNetwork, getDefaultRpcUrl, type SolanaNetwork } from '../utils/network';

/**
 * Options for creating a unified configuration
 * Maintains type safety while providing flexibility
 */
export interface UnifiedConfigOptions extends DefaultConfigOptions {
    /**
     * Custom RPC URL (optional - overrides default for network)
     * Note: For production apps, use environment variables to avoid exposing API keys
     * @see packages/connector/src/utils/cluster.ts for secure RPC URL patterns
     */
    rpcUrl?: string;
}

/**
 * Unified configuration output
 * Contains all configs needed for ConnectorKit and integrations
 *
 * Important: The `rpcUrl` property is intended for:
 * 1. Server-side rendering (SSR) setup
 * 2. Passing to external libraries that need RPC configuration
 * 3. Development/testing environments
 *
 * For production client-side code, use the connector client's `getRpcUrl()` method
 * which supports environment variable patterns and proxy configurations.
 */
export interface UnifiedConfig {
    /** ConnectorKit configuration */
    connectorConfig: ExtendedConnectorConfig;
    /** Mobile Wallet Adapter configuration (optional) */
    mobile?: MobileWalletAdapterConfig;
    /** Normalized network name ('mainnet', 'devnet', 'testnet', 'localnet') */
    network: SolanaNetwork;
    /**
     * RPC endpoint URL
     * For external library integration only - client code should use connector client
     * @deprecated in client components - use `useConnectorClient().getRpcUrl()` instead
     */
    rpcUrl: string;
    /** Application metadata */
    app: {
        name: string;
        url: string;
    };
}

/**
 * Create a unified configuration for ConnectorKit
 *
 * This helper eliminates configuration duplication by creating all necessary
 * configs from a single source of truth. It automatically handles network
 * name translation between different conventions.
 *
 * @example Basic usage
 * ```tsx
 * import { createConfig, AppProvider } from '@solana/connector';
 *
 * const config = createConfig({
 *   appName: 'My App',
 *   network: 'mainnet', // Works with 'mainnet' or 'mainnet-beta'
 *   enableMobile: true
 * });
 *
 * <AppProvider config={config}>
 *   {children}
 * </AppProvider>
 * ```
 *
 * @example Integration with external libraries
 * ```tsx
 * import { createConfig, AppProvider } from '@solana/connector';
 * import { ArmaProvider } from '@armadura/sdk';
 *
 * const config = createConfig({
 *   appName: 'My App',
 *   network: 'mainnet',
 * });
 *
 * <AppProvider config={config}>
 *   <ArmaProvider
 *     config={{
 *       network: config.network,
 *       rpcUrl: config.rpcUrl, // Safe - for external library initialization
 *       providers: [...]
 *     }}
 *     useConnector="auto"
 *   >
 *     {children}
 *   </ArmaProvider>
 * </AppProvider>
 * ```
 *
 * @example Production with environment variables
 * ```tsx
 * // Use environment variables to avoid exposing API keys
 * const config = createConfig({
 *   appName: 'My App',
 *   network: 'mainnet',
 *   // RPC URL comes from process.env on server
 *   // Client-side code should use connector client's getRpcUrl()
 * });
 * ```
 *
 * @example Custom clusters
 * ```tsx
 * const config = createConfig({
 *   appName: 'My App',
 *   network: 'mainnet',
 *   customClusters: [
 *     {
 *       id: 'solana:custom',
 *       label: 'Custom RPC',
 *       url: process.env.CUSTOM_RPC_URL || 'https://...'
 *     }
 *   ]
 * });
 * ```
 */
export function createConfig(options: UnifiedConfigOptions): UnifiedConfig {
    // Extract network and rpcUrl, use remaining options for connector config
    const { network = 'mainnet-beta', rpcUrl: customRpcUrl, ...connectorOptions } = options;

    // Normalize network name for consistency
    const normalizedNetwork = normalizeNetwork(typeof network === 'string' ? network : 'mainnet-beta');

    // Get RPC URL (custom or default)
    const rpcUrl = customRpcUrl || getDefaultRpcUrl(normalizedNetwork);

    // Convert normalized network to RPC format (mainnet -> mainnet-beta)
    const rpcNetwork = normalizedNetwork === 'mainnet' ? 'mainnet-beta' : normalizedNetwork;

    // Create connector configuration
    const connectorConfig = getDefaultConfig({
        ...connectorOptions,
        network: rpcNetwork,
    });

    // Create mobile configuration (if enabled)
    const mobile =
        options.enableMobile !== false && normalizedNetwork !== 'localnet'
            ? getDefaultMobileConfig({
                  appName: options.appName,
                  appUrl: connectorConfig.appUrl,
                  network: rpcNetwork as 'mainnet-beta' | 'devnet' | 'testnet',
              })
            : undefined;

    return {
        connectorConfig,
        mobile,
        network: normalizedNetwork,
        rpcUrl,
        app: {
            name: options.appName,
            url:
                connectorConfig.appUrl ||
                (typeof window !== 'undefined' ? window.location.origin : 'https://localhost:3000'),
        },
    };
}

/**
 * Type guard to check if a config is a unified config
 *
 * @example
 * ```ts
 * if (isUnifiedConfig(someConfig)) {
 *   // TypeScript knows this is UnifiedConfig
 *   console.log(someConfig.network, someConfig.rpcUrl);
 * }
 * ```
 */
export function isUnifiedConfig(config: unknown): config is UnifiedConfig {
    return Boolean(
        config &&
            typeof config === 'object' &&
            'connectorConfig' in config &&
            'network' in config &&
            'rpcUrl' in config &&
            'app' in config,
    );
}
