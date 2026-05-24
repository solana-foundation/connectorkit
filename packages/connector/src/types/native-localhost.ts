/**
 * Native localhost wallet discovery configuration.
 *
 * Localhost is only a transport to a native app. The native app must still
 * authorize origins and individual account/signing requests.
 */
export interface NativeLocalhostConfig {
    /** Explicitly enable the localhost probe. Object configs are disabled unless this is true. */
    enabled?: boolean;
    /** Loopback host to probe. Defaults to 127.0.0.1. */
    host?: string;
    /** Loopback port to probe. Defaults to 51884. */
    port?: number;
    /** Native protocol version. Defaults to "1". */
    protocolVersion?: '1';
    /** Discovery timeout in milliseconds. Defaults to 250. */
    timeoutMs?: number;
}

export interface NativeLocalhostResolvedConfig {
    enabled: boolean;
    host: string;
    port: number;
    protocolVersion: '1';
    timeoutMs: number;
}

export type NativeLocalhostConfigInput = boolean | NativeLocalhostConfig;
