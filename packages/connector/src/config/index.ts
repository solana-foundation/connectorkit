export { getDefaultConfig, getDefaultMobileConfig } from './default-config';
export type { DefaultConfigOptions, ExtendedConnectorConfig, SimplifiedWalletConnectConfig } from './default-config';

// Configuration validation schemas
export {
    validateConfigOptions,
    parseConfigOptions,
    // Individual schemas for advanced use
    solanaNetworkSchema,
    solanaClusterIdSchema,
    solanaClusterSchema,
    coinGeckoConfigSchema,
    nativeAssociationConfigSchema,
    nativeLocalhostConfigSchema,
    defaultConfigOptionsSchema,
} from './schemas';
export type {
    SolanaNetworkInput,
    SolanaClusterIdInput,
    CoinGeckoConfigInput,
    NativeAssociationConfigInput,
    NativeLocalhostConfigInput,
    DefaultConfigOptionsInput,
} from './schemas';
export type { NativeAssociationConfig, NativeAssociationResolvedConfig } from '../types/native-association';
export type { NativeLocalhostConfig, NativeLocalhostResolvedConfig } from '../types/native-localhost';
