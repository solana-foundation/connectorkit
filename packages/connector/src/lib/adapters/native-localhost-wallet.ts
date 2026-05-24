export {
    DEFAULT_NATIVE_LOCALHOST_CONFIG,
    NativeAssociationWalletError as NativeLocalhostWalletError,
    createNativeLocalhostWallet,
    discoverNativeLocalhostWallet,
    resolveNativeLocalhostConfig,
} from './native-association';
export type {
    AssociationDiscoverResponse as NativeLocalhostDiscoverResponse,
    NativeAssociationConfig as NativeLocalhostConfig,
    NativeAssociationConfigInput as NativeLocalhostConfigInput,
    NativeAssociationResolvedConfig as NativeLocalhostResolvedConfig,
} from './native-association';
