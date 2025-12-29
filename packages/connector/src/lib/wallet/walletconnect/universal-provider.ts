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
    };

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
        console.log('[WalletConnect Transport] Setting up event listeners');
        provider.on('display_uri', (uri: string) => {
            console.log('[WalletConnect Transport] display_uri event received!');
            logger.debug('WalletConnect display_uri event', { uri: uri.substring(0, 50) + '...' });

            if (config.onDisplayUri) {
                console.log('[WalletConnect Transport] Calling onDisplayUri callback');
                config.onDisplayUri(uri);
            } else if (process.env.NODE_ENV === 'development') {
                // Log to console in development if no handler provided
                console.log('[WalletConnect] Connection URI:', uri);
            }
        });

        provider.on('session_delete', () => {
            logger.debug('WalletConnect session deleted');
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
            console.log('[WalletConnect Transport] connect() called');
            if (state.connecting) {
                logger.warn('WalletConnect connection already in progress');
                return;
            }

            state.connecting = true;

            try {
                console.log('[WalletConnect Transport] Initializing provider...');
                const provider = await initProvider();
                console.log('[WalletConnect Transport] Provider initialized');

                // Check if we already have a session
                if (provider.session) {
                    logger.debug('WalletConnect: using existing session');
                    if (config.onSessionEstablished) {
                        config.onSessionEstablished();
                    }
                    return;
                }

                // Create a new session
                logger.debug('WalletConnect: creating new session');
                console.log('[WalletConnect Transport] Creating new session...');

                // Request ALL Solana chains so the session supports any cluster
                // The actual chain used for requests will be determined by the current cluster
                console.log('[WalletConnect Transport] Requesting all Solana chains:', ALL_SOLANA_CAIP_CHAINS);

                await provider.connect({
                    namespaces: {
                        solana: {
                            chains: [...ALL_SOLANA_CAIP_CHAINS],
                            methods: [...SOLANA_METHODS],
                            events: [],
                        },
                    },
                });
                console.log('[WalletConnect Transport] Session created successfully');

                if (config.onSessionEstablished) {
                    config.onSessionEstablished();
                }
            } finally {
                state.connecting = false;
            }
        },

        async disconnect(): Promise<void> {
            if (!state.provider) {
                return;
            }

            try {
                await state.provider.disconnect();
            } catch (error) {
                logger.warn('Error disconnecting WalletConnect', { error });
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

            console.log('[WalletConnect Transport] request()', { method: args.method, chainId: args.chainId });

            try {
                const result = await provider.request<T>({
                    method: args.method,
                    params: args.params,
                    chainId: args.chainId,
                });

                console.log('[WalletConnect Transport] request() success:', { method: args.method, result });
                return result;
            } catch (error) {
                console.error('[WalletConnect Transport] request() error:', { method: args.method, error });
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
            
            // Log session chains for debugging
            console.log('[WalletConnect Transport] Session chains:', namespaces?.solana?.chains);
            console.log('[WalletConnect Transport] Session raw accounts:', namespaces?.solana?.accounts);
            
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

            console.log('[WalletConnect Transport] Session accounts:', accounts);
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
