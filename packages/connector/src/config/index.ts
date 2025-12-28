export { getDefaultConfig, getDefaultMobileConfig } from './default-config';
export type { DefaultConfigOptions, ExtendedConnectorConfig } from './default-config';

// Configuration validation schemas
export {
    validateConfigOptions,
    parseConfigOptions,
    // Individual schemas for advanced use
    solanaNetworkSchema,
    solanaClusterIdSchema,
    solanaClusterSchema,
    coinGeckoConfigSchema,
    defaultConfigOptionsSchema,
} from './schemas';
export type {
    SolanaNetworkInput,
    SolanaClusterIdInput,
    CoinGeckoConfigInput,
    DefaultConfigOptionsInput,
} from './schemas';
