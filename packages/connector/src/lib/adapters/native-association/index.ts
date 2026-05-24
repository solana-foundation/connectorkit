import type { Wallet } from '@wallet-standard/base';
import type {
    NativeAssociationConfig,
    NativeAssociationConfigInput,
    NativeAssociationResolvedConfig,
} from '../../../types/native-association';
import { discoverLocalhostWallet } from '@wallet-association/transport-localhost';
import { createLocalhostAssociationTransport } from './localhost-transport';
import type { NativeAssociationTransport } from './localhost-transport';
import type { AssociationDiscoverResponse } from './protocol';
import { createNativeAssociationWallet } from './wallet';
import type { NativeAssociationWalletDeps } from './wallet';

export const DEFAULT_NATIVE_ASSOCIATION_CONFIG: NativeAssociationResolvedConfig = {
    enabled: false,
    host: '127.0.0.1',
    port: 51884,
    protocolVersion: '2',
    timeoutMs: 250,
    storageKey: 'solana.connector.nativeAssociation',
};

export interface DiscoverNativeAssociationWalletDeps extends Partial<NativeAssociationWalletDeps> {
    transport?: NativeAssociationTransport;
}

export function resolveNativeAssociationConfig(input?: NativeAssociationConfigInput): NativeAssociationResolvedConfig {
    if (input === true) {
        return { ...DEFAULT_NATIVE_ASSOCIATION_CONFIG, enabled: true };
    }

    if (!input) {
        return { ...DEFAULT_NATIVE_ASSOCIATION_CONFIG };
    }

    return {
        ...DEFAULT_NATIVE_ASSOCIATION_CONFIG,
        ...input,
        enabled: input.enabled === true,
        protocolVersion: input.protocolVersion ?? DEFAULT_NATIVE_ASSOCIATION_CONFIG.protocolVersion,
        storageKey: input.storageKey ?? DEFAULT_NATIVE_ASSOCIATION_CONFIG.storageKey,
    };
}

export async function discoverNativeAssociationWallet(
    input?: NativeAssociationConfigInput,
    deps: DiscoverNativeAssociationWalletDeps = {},
): Promise<Wallet | null> {
    const config = resolveNativeAssociationConfig(input);
    if (!config.enabled || typeof window === 'undefined' || typeof fetch === 'undefined') {
        return null;
    }

    const transport = deps.transport ?? createLocalhostAssociationTransport(config);
    try {
        const discovery = await discoverLocalhostWallet(config, {
            transport,
        });
        if (!discovery) {
            return null;
        }

        return createNativeAssociationWallet(discovery, config, {
            ...deps,
            transport,
        });
    } catch {
        return null;
    }
}

export { createNativeAssociationWallet };
export type { NativeAssociationWalletDeps };
export type {
    AssociationDiscoverResponse,
    AssociationEnvelope,
    AssociationRequestPayload,
    AssociationResponsePayload,
    AssociationRPCRequestPayload,
    AssociationRPCResponsePayload,
    NativeAssociationAccount,
} from './protocol';
export { createAssociationCrypto, type AssociationCrypto } from './crypto';
export {
    createLocalhostAssociationTransport,
    NativeAssociationWalletError,
    type NativeAssociationTransport,
} from './localhost-transport';
export {
    createNativeAssociationStorage,
    type NativeAssociationStorage,
    type NativeAssociationStoredSession,
} from './storage';

export type {
    NativeAssociationConfig,
    NativeAssociationConfigInput,
    NativeAssociationResolvedConfig,
} from '../../../types/native-association';

// Backward-compatible v1 adapter names now resolve to the v2 association adapter.
export const DEFAULT_NATIVE_LOCALHOST_CONFIG = DEFAULT_NATIVE_ASSOCIATION_CONFIG;
export const discoverNativeLocalhostWallet = discoverNativeAssociationWallet;
export const resolveNativeLocalhostConfig = resolveNativeAssociationConfig;
export const createNativeLocalhostWallet = createNativeAssociationWallet;
