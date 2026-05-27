import type { Wallet, WalletAccount } from '@wallet-standard/base';
import type { StandardEventsListeners, StandardEventsNames } from '@wallet-standard/features';
import { createRelayDappTransport, type RelayDappTransport } from '@wallet-association/transport-relay';
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
    transportId?: string;
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
        transportId: deps.transportId ?? `localhost:${config.host}:${config.port}`,
        storageKey: config.storageKey,
    });
}

export function createNativeRelayAssociationWallet(
    config: NativeAssociationResolvedConfig,
    deps: Omit<Partial<NativeAssociationWalletDeps>, 'transport'> = {},
): Wallet {
    let activeWallet: Wallet | null = null;
    let activeTransport: RelayDappTransport | null = null;
    let activeEventsUnsubscribe: (() => void) | null = null;
    const listeners = new Set<(properties: { accounts?: readonly WalletAccount[] }) => void>();

    const emitChange = (properties: { accounts?: readonly WalletAccount[] }) => {
        for (const listener of listeners) {
            listener(properties);
        }
    };

    const wallet = {
        version: '1.0.0',
        name: 'Native Relay',
        icon: nativeRelayIcon(),
        get chains() {
            return activeWallet?.chains ?? ['solana:mainnet', 'solana:devnet', 'solana:testnet', 'solana:localnet'];
        },
        get features() {
            return relayFeatures;
        },
        get accounts() {
            return activeWallet?.accounts ?? [];
        },
    } as Wallet;

    const relayFeatures: Wallet['features'] = {
        'standard:connect': {
            version: '1.0.0',
            connect: async () => {
                await closeActiveRelay();
                const origin = deps.origin ?? getOrigin();
                const transport = await createRelayDappTransport({
                    relayHttpUrl: config.relay.relayHttpUrl,
                    origin,
                });
                activeTransport = transport;
                config.relay.onDisplayUri?.(transport.connectionUri);
                await transport.waitForWallet();
                const discovery = await transport.request<AssociationDiscoverResponse>('discover');
                activeWallet = createNativeAssociationWallet(discovery, config, {
                    ...deps,
                    transport,
                    origin,
                    transportId: `relay:${config.relay.relayHttpUrl}`,
                });
                activeEventsUnsubscribe = subscribeToActiveWalletEvents(activeWallet, emitChange);
                const connectFeature = activeWallet.features['standard:connect'] as
                    | { connect(options?: unknown): Promise<{ accounts: readonly WalletAccount[] }> }
                    | undefined;
                if (!connectFeature) {
                    throw new Error('Native relay wallet does not support standard connect');
                }
                const result = await connectFeature.connect();
                config.relay.onSessionEstablished?.();
                return result;
            },
        },
        'standard:disconnect': {
            version: '1.0.0',
            disconnect: async () => {
                await closeActiveRelay();
                emitChange({ accounts: [] });
                config.relay.onSessionDisconnected?.();
            },
        },
        'standard:events': {
            version: '1.0.0',
            on: <E extends StandardEventsNames>(event: E, listener: StandardEventsListeners[E]) => {
                if (event !== 'change') {
                    return () => {};
                }
                const changeListener = listener as (properties: { accounts?: readonly WalletAccount[] }) => void;
                listeners.add(changeListener);
                return () => {
                    listeners.delete(changeListener);
                };
            },
        },
        'solana:signMessage': {
            version: '1.0.0',
            signMessage: (...inputs: unknown[]) => activeFeature('solana:signMessage', 'signMessage')(...inputs),
        },
        'solana:signTransaction': {
            version: '1.0.0',
            signTransaction: (...inputs: unknown[]) =>
                activeFeature('solana:signTransaction', 'signTransaction')(...inputs),
        },
    };

    async function closeActiveRelay() {
        activeEventsUnsubscribe?.();
        activeEventsUnsubscribe = null;
        const disconnect = activeWallet?.features['standard:disconnect'] as
            | { disconnect(): Promise<void> | void }
            | undefined;
        await disconnect?.disconnect();
        activeWallet = null;
        activeTransport?.close?.();
        activeTransport = null;
    }

    function activeFeature(featureName: string, methodName: string): (...inputs: unknown[]) => Promise<unknown> {
        const feature = activeWallet?.features[featureName as `${string}:${string}`] as
            | Record<string, (...inputs: unknown[]) => Promise<unknown>>
            | undefined;
        const method = feature?.[methodName];
        if (!method) {
            throw new Error(`Native relay wallet is not connected or does not support ${featureName}`);
        }
        return method.bind(feature);
    }

    return wallet;
}

function subscribeToActiveWalletEvents(
    wallet: Wallet,
    listener: (properties: { accounts?: readonly WalletAccount[] }) => void,
): (() => void) | null {
    const events = wallet.features['standard:events'] as
        | {
              on<E extends StandardEventsNames>(event: E, listener: StandardEventsListeners[E]): () => void;
          }
        | undefined;
    if (!events) return null;
    return events.on('change', listener as StandardEventsListeners['change']);
}

function getOrigin(): string {
    return typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000';
}

function nativeRelayIcon(): Wallet['icon'] {
    return 'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 64 64%22%3E%3Crect width=%2264%22 height=%2264%22 rx=%2216%22 fill=%22%2313171f%22/%3E%3Cpath d=%22M18 22h28v20H18z%22 fill=%22%2324d18f%22 opacity=%22.18%22/%3E%3Cpath d=%22M22 26h20v12H22z%22 fill=%22%2324d18f%22/%3E%3Cpath d=%22M16 18h32v28H16z%22 fill=%22none%22 stroke=%22white%22 stroke-width=%224%22/%3E%3Cpath d=%22M24 50h16%22 stroke=%22white%22 stroke-width=%224%22 stroke-linecap=%22round%22/%3E%3C/svg%3E' as Wallet['icon'];
}
