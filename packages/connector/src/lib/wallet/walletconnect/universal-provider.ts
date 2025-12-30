/**
 * WalletConnect Universal Provider Adapter
 *
 * Provides a thin adapter around @walletconnect/universal-provider that:
 * - Lazily imports the provider (optional dependency)
 * - Handles display_uri events and forwards to onDisplayUri callback
 * - Implements the WalletConnectTransport interface
 *
 * @see https://docs.walletconnect.network/wallet-sdk/chain-support/solana
 */

import type { WalletConnectConfig, WalletConnectTransport } from '../../../types/walletconnect';
import { createLogger } from '../../utils/secure-logger';

const logger = createLogger('WalletConnectProvider');

// Solana JSON-RPC methods we need to support
const SOLANA_METHODS = [
    'solana_getAccounts',
    'solana_requestAccounts',
    'solana_signMessage',
    'solana_signTransaction',
    'solana_signAllTransactions',
    'solana_signAndSendTransaction',
] as const;

// CAIP-2 chain IDs for Solana networks
// Format: solana:<genesis_hash_first_32_chars>
export const SOLANA_CAIP_CHAINS = {
    'solana:mainnet': 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp',
    'solana:devnet': 'solana:EtWTRABZaYq6iMfeYKouRu166VU2xqa1',
    'solana:testnet': 'solana:4uhcVJyU9pJkvQyS88uRDiswHXSCkY3z',
} as const;

// All CAIP chain IDs as an array (for requesting all chains)
const ALL_SOLANA_CAIP_CHAINS = Object.values(SOLANA_CAIP_CHAINS);

/**
 * State for the WalletConnect provider instance
 */
interface ProviderState {
    provider: import('@walletconnect/universal-provider').default | null;
    initialized: boolean;
    connecting: boolean;
    connectPromise: Promise<void> | null;
    cancelConnect: (() => void) | null;
}

/**
 * Create a WalletConnect transport adapter
 *
 * This adapter lazily loads @walletconnect/universal-provider and implements
 * the WalletConnectTransport interface for use with the WalletConnect wallet shim.
 */
export async function createWalletConnectTransport(
    config: WalletConnectConfig,
): Promise<WalletConnectTransport> {
    const state: ProviderState = {
        provider: null,
        initialized: false,
        connecting: false,
        connectPromise: null,
        cancelConnect: null,
    };

    function hasSolanaNamespace(session: unknown): boolean {
        const namespaces = (session as { namespaces?: Record<string, unknown> } | null | undefined)?.namespaces;
        if (!namespaces) return false;
        return 'solana' in namespaces;
    }

    async function safeCleanupPendingPairings(
        provider: import('@walletconnect/universal-provider').default,
        deletePairings = false,
    ): Promise<void> {
        const cleanup = (provider as unknown as { cleanupPendingPairings?: (opts?: { deletePairings?: boolean }) => Promise<void> })
            .cleanupPendingPairings;
        if (!cleanup) return;
        try {
            await cleanup.call(provider, { deletePairings });
        } catch (error) {
            // ignore errors
        }
    }

    function safeAbortPairingAttempt(provider: import('@walletconnect/universal-provider').default): void {
        const abort = (provider as unknown as { abortPairingAttempt?: () => void }).abortPairingAttempt;
        if (!abort) return;
        try {
            abort.call(provider);
        } catch (error) {
            // ignore errors
        }
    }

    async function safeDisconnectProvider(provider: import('@walletconnect/universal-provider').default): Promise<void> {
        try {
            await provider.disconnect();
        } catch (error) {
            // ignore errors
        }
    }

    /**
     * Initialize the provider lazily
     */
    async function initProvider(): Promise<import('@walletconnect/universal-provider').default> {
        if (state.provider) {
            return state.provider;
        }

        // Dynamically import WalletConnect Universal Provider
        let UniversalProvider: typeof import('@walletconnect/universal-provider').default;

        try {
            const module = await import('@walletconnect/universal-provider');
            UniversalProvider = module.default;
        } catch (error) {
            throw new Error(
                'WalletConnect is enabled but @walletconnect/universal-provider is not installed. ' +
                    'Please install it in your app (e.g. pnpm add @walletconnect/universal-provider).',
            );
        }

        // Initialize the provider
        const provider = await UniversalProvider.init({
            projectId: config.projectId,
            metadata: config.metadata,
            relayUrl: config.relayUrl,
        });

        // Set up event listeners
        provider.on('display_uri', (uri: string) => {
            if (config.onDisplayUri) {
                config.onDisplayUri(uri);
            } else if (process.env.NODE_ENV === 'development') {
                // Log to console in development if no handler provided
            }
        });

        provider.on('session_delete', () => {
            if (config.onSessionDisconnected) {
                config.onSessionDisconnected();
            }
        });

        state.provider = provider;
        state.initialized = true;

        return provider;
    }

    const transport: WalletConnectTransport = {
        async connect(): Promise<void> {
            if (state.connectPromise) {
                await state.connectPromise;
                return;
            }

            state.connectPromise = (async () => {
                state.connecting = true;

                try {
                    const CANCELLED = Symbol('WALLETCONNECT_CANCELLED');
                    type Cancelled = typeof CANCELLED;

                    let cancelResolve: (() => void) | null = null;
                    const cancelPromise = new Promise<Cancelled>(resolve => {
                        cancelResolve = () => resolve(CANCELLED);
                    });

                    let isCancelled = false;
                    state.cancelConnect = () => {
                        if (isCancelled) return;
                        isCancelled = true;
                        cancelResolve?.();
                    };

                    async function raceWithCancel<T>(promise: Promise<T>): Promise<T> {
                        const result = await Promise.race([
                            promise as Promise<T | Cancelled>,
                            cancelPromise as Promise<T | Cancelled>,
                        ]);
                        if (result === CANCELLED) {
                            throw new Error('Connection cancelled');
                        }
                        return result as T;
                    }

                    let provider: import('@walletconnect/universal-provider').default | null = null;
                    let connectAttemptPromise: Promise<unknown> | null = null;

                    provider = await raceWithCancel(initProvider());

                    // If we already have a session, validate that it's actually a Solana session.
                    // WalletConnect can restore sessions from storage; if it's not a Solana session,
                    // we must disconnect and start a fresh pairing so we can request Solana accounts.
                    if (provider.session) {
                        if (hasSolanaNamespace(provider.session)) {
                            if (config.onSessionEstablished) {
                                config.onSessionEstablished();
                            }
                            return;
                        }

                        await raceWithCancel(safeDisconnectProvider(provider));
                        // Clean up old pairings only after explicitly disconnecting an invalid session
                        await raceWithCancel(safeCleanupPendingPairings(provider, false));
                    }

                    // Request ALL Solana chains so the session supports any cluster.
                    // The actual chain used for requests will be determined by the current cluster.
                    connectAttemptPromise = provider.connect({
                        namespaces: {
                            solana: {
                                chains: [...ALL_SOLANA_CAIP_CHAINS],
                                methods: [...SOLANA_METHODS],
                                events: [],
                            },
                        },
                    });

                    try {
                        await raceWithCancel(connectAttemptPromise);
                    } catch (error) {
                        // Prevent unhandled rejections if the underlying connect eventually errors.
                        void connectAttemptPromise?.catch(() => {});
                        throw error;
                    }

                    if (!provider.session) {
                        throw new Error('WalletConnect: connect completed but no session was established');
                    }
                    if (!hasSolanaNamespace(provider.session)) {
                        await raceWithCancel(safeDisconnectProvider(provider));
                        throw new Error('WalletConnect: connected session does not include Solana namespace');
                    }

                    if (config.onSessionEstablished) {
                        config.onSessionEstablished();
                    }
                } finally {
                    state.connecting = false;
                    state.cancelConnect = null;
                    state.connectPromise = null;
                }
            })();

            await state.connectPromise;
        },

        async disconnect(): Promise<void> {
            // Always cancel an in-flight connect attempt, even if the provider isn't initialized yet.
            if (state.cancelConnect) {
                try {
                    state.cancelConnect();
                } catch {
                    // ignore cancellation errors
                }
            }

            if (!state.provider) {
                if (config.onSessionDisconnected) {
                    config.onSessionDisconnected();
                }
                return;
            }

            // Only abort/cleanup if there's no active session (i.e., still pairing)
            if (!state.provider.session) {
                safeAbortPairingAttempt(state.provider);
                // Don't delete pairings aggressively - just clean up expired ones
                await safeCleanupPendingPairings(state.provider, false);
            } else {
                // There's an active session - disconnect it properly
                await safeDisconnectProvider(state.provider);
            }

            if (config.onSessionDisconnected) {
                config.onSessionDisconnected();
            }
        },

        async request<T = unknown>(args: {
            method: string;
            params: unknown;
            chainId?: string;
        }): Promise<T> {
            const provider = await initProvider();

            if (!provider.session) {
                throw new Error('WalletConnect: no active session. Call connect() first.');
            }


            try {
                return await provider.request<T>(
                    {
                        method: args.method,
                        params: args.params as object | Record<string, unknown> | unknown[] | undefined,
                    },
                    args.chainId,
                );
            } catch (error) {
                throw error;
            }
        },

        isConnected(): boolean {
            return state.provider?.session != null;
        },

        getSessionAccounts(): string[] {
            if (!state.provider?.session) {
                return [];
            }

            // Extract accounts from session namespaces
            // WalletConnect session format: namespace:chainId:address
            const accounts: string[] = [];
            const session = state.provider.session;
            const namespaces = session.namespaces as Record<string, { accounts?: string[]; chains?: string[] }> | undefined;

            if (namespaces?.solana?.accounts) {
                for (const account of namespaces.solana.accounts) {
                    // Account format: "solana:chainId:address"
                    // Extract just the address (last part after the last colon)
                    const parts = account.split(':');
                    if (parts.length >= 3) {
                        // The address is everything after "solana:chainId:"
                        const address = parts.slice(2).join(':');
                        if (address && !accounts.includes(address)) {
                            accounts.push(address);
                        }
                    }
                }
            }
            return accounts;
        },
    };

    return transport;
}

/**
 * Create a mock transport for testing purposes
 *
 * This allows testing the WalletConnect wallet shim without actual WalletConnect
 * network dependencies.
 */
export function createMockWalletConnectTransport(
    mockImplementation: Partial<WalletConnectTransport> = {},
): WalletConnectTransport {
    let connected = false;

    const defaultTransport: WalletConnectTransport = {
        async connect(): Promise<void> {
            connected = true;
        },
        async disconnect(): Promise<void> {
            connected = false;
        },
        async request<T = unknown>(): Promise<T> {
            throw new Error('Mock transport: request not implemented');
        },
        isConnected(): boolean {
            return connected;
        },
        getSessionAccounts(): string[] {
            return [];
        },
    };

    return {
        ...defaultTransport,
        ...mockImplementation,
    };
}
