/**
 * Native Wallet Association configuration.
 *
 * Localhost is only the transport to a native app. The association handshake,
 * session token, and native-side origin approval are the security boundary.
 */
export interface NativeAssociationConfig {
    /** Explicitly enable the localhost probe. Object configs are disabled unless this is true. */
    enabled?: boolean;
    /** Loopback host to probe. Defaults to 127.0.0.1. */
    host?: string;
    /** Loopback port to probe. Defaults to 51884. */
    port?: number;
    /** Native association protocol version. Defaults to "2". */
    protocolVersion?: '2';
    /** Discovery timeout in milliseconds. Defaults to 250. */
    timeoutMs?: number;
    /** localStorage key namespace for persisted native association sessions. */
    storageKey?: string;
}

export interface NativeAssociationResolvedConfig {
    enabled: boolean;
    host: string;
    port: number;
    protocolVersion: '2';
    timeoutMs: number;
    storageKey: string;
}

export type NativeAssociationConfigInput = boolean | NativeAssociationConfig;
