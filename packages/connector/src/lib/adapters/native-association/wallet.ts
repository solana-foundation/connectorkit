import type { Wallet } from '@wallet-standard/base';
import { createWalletAssociationWallet } from '@wallet-association/wallet-standard';
import type { NativeAssociationResolvedConfig } from '../../../types/native-association';
import type { AssociationCrypto } from './crypto';
import type { NativeAssociationTransport } from './localhost-transport';
import type { NativeAssociationStorage } from './storage';
import type { AssociationDiscoverResponse } from './protocol';

export interface NativeAssociationWalletDeps {
    transport: NativeAssociationTransport;
    crypto?: AssociationCrypto;
    storage?: NativeAssociationStorage;
    origin?: string;
    appName?: string;
    appIcon?: string;
}

export function createNativeAssociationWallet(
    discovery: AssociationDiscoverResponse,
    config: NativeAssociationResolvedConfig,
    deps: NativeAssociationWalletDeps,
): Wallet {
    return createWalletAssociationWallet({
        discovery,
        transport: deps.transport,
        crypto: deps.crypto,
        storage: deps.storage,
        origin: deps.origin,
        appName: deps.appName,
        appIcon: deps.appIcon,
        requestedChains: discovery.chains,
        requestedFeatures: discovery.features,
        transportId: `localhost:${config.host}:${config.port}`,
        storageKey: config.storageKey,
    });
}
