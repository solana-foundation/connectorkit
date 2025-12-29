/**
 * Ambient module declarations for WalletConnect optional dependencies
 *
 * These declarations allow TypeScript to compile without errors when
 * @walletconnect/universal-provider is not installed. The actual import
 * is done dynamically at runtime.
 */

declare module '@walletconnect/universal-provider' {
    export interface UniversalProviderOpts {
        projectId: string;
        metadata?: {
            name: string;
            description: string;
            url: string;
            icons: string[];
        };
        relayUrl?: string;
    }

    export interface ConnectParams {
        namespaces?: {
            solana?: {
                chains: string[];
                methods: string[];
                events: string[];
            };
        };
        optionalNamespaces?: {
            solana?: {
                chains: string[];
                methods: string[];
                events: string[];
            };
        };
    }

    export interface SessionTypes {
        struct: {
            topic: string;
            namespaces: Record<string, unknown>;
        };
    }

    export default class UniversalProvider {
        static init(opts: UniversalProviderOpts): Promise<UniversalProvider>;

        connect(params: ConnectParams): Promise<SessionTypes['struct'] | undefined>;
        disconnect(): Promise<void>;

        request<T = unknown>(args: {
            method: string;
            params?: unknown;
            chainId?: string;
        }): Promise<T>;

        on(event: 'display_uri', listener: (uri: string) => void): void;
        on(event: 'session_ping', listener: () => void): void;
        on(event: 'session_event', listener: (event: unknown) => void): void;
        on(event: 'session_update', listener: (event: unknown) => void): void;
        on(event: 'session_delete', listener: () => void): void;
        on(event: string, listener: (...args: unknown[]) => void): void;

        off(event: string, listener: (...args: unknown[]) => void): void;

        session: SessionTypes['struct'] | undefined;
    }
}
