/**
 * @connector-kit/connector - Unified configuration
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
 * Extends DefaultConfigOptions with network translation support
 */
export interface UnifiedConfigOptions extends Omit<DefaultConfigOptions, 'network'> {
    /**
     * Solana network to connect to
     * Accepts various naming conventions: 'mainnet', 'mainnet-beta', 'devnet', etc.
     */
    network?: string;
    /** Custom RPC URL (overrides default for network) */
    rpcUrl?: string;
}

/**
 * Unified configuration output
 * Contains all configs needed for ConnectorKit and integrations
 */
export interface UnifiedConfig {
    /** ConnectorKit configuration */
    connectorConfig: ExtendedConnectorConfig;
    /** Mobile Wallet Adapter configuration (optional) */
    mobile?: MobileWalletAdapterConfig;
    /** Normalized network name ('mainnet', 'devnet', 'testnet', 'localnet') */
    network: SolanaNetwork;
    /** RPC endpoint URL */
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
 * @example
 * ```tsx
 * import { createConfig, AppProvider } from '@connector-kit/connector'
 * import { ArmaProvider } from '@armadura/sdk'
 *
 * const config = createConfig({
 *   appName: 'My App',
 *   network: 'mainnet', // Works with 'mainnet' or 'mainnet-beta'
 *   enableMobile: true
 * })
 *
 * <AppProvider connectorConfig={config.connectorConfig} mobile={config.mobile}>
 *   <ArmaProvider
 *     config={{
 *       network: config.network,
 *       rpcUrl: config.rpcUrl,
 *       providers: [...]
 *     }}
 *     useConnector="auto"
 *   >
 *     {children}
 *   </ArmaProvider>
 * </AppProvider>
 * ```
 */
export function createConfig(options: UnifiedConfigOptions): UnifiedConfig {
    const { network = 'mainnet', rpcUrl: customRpcUrl, ...restOptions } = options;

    // Normalize network name and determine RPC URL
    const normalizedNetwork = normalizeNetwork(network);
    const rpcUrl = customRpcUrl || getDefaultRpcUrl(normalizedNetwork);

    // Convert to RPC format for configs that expect it (mainnet -> mainnet-beta)
    const rpcNetwork = normalizedNetwork === 'mainnet' ? 'mainnet-beta' : normalizedNetwork;

    // Create ConnectorKit config with all options
    const connectorConfig = getDefaultConfig({
        ...restOptions,
        network: rpcNetwork, // Use RPC convention for internal consistency
    });

    // Create mobile config if enabled (mobile doesn't support localnet)
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
            url: connectorConfig.appUrl || 'https://localhost:3000',
        },
    };
}

/**
 * Type guard to check if a config is a unified config
 */
export function isUnifiedConfig(config: any): config is UnifiedConfig {
    return (
        config && typeof config === 'object' && 'connectorConfig' in config && 'network' in config && 'rpcUrl' in config
    );
}
