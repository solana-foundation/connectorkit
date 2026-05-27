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
    /** Relay rendezvous pairing for Native desktop paste-URI flows. */
    relay?: NativeAssociationRelayConfig;
}

export interface NativeAssociationRelayConfig {
    /** Explicitly enable Native relay pairing. */
    enabled?: boolean;
    /** Reference relay HTTP URL used to create WAP relay rooms. */
    relayHttpUrl?: string;
    /** Called with the wap://associate URI after room creation. */
    onDisplayUri?: (uri: string) => void;
    /** Called when the relay connection completes. */
    onSessionEstablished?: () => void;
    /** Called when the relay wallet disconnects or the pairing is cancelled. */
    onSessionDisconnected?: () => void;
    /** localStorage key namespace for persisted native relay sessions. */
    storageKey?: string;
}

export interface NativeAssociationResolvedConfig {
    enabled: boolean;
    host: string;
    port: number;
    protocolVersion: '2';
    timeoutMs: number;
    storageKey: string;
    relay: NativeAssociationResolvedRelayConfig;
}

export interface NativeAssociationResolvedRelayConfig {
    enabled: boolean;
    relayHttpUrl: string;
    onDisplayUri?: (uri: string) => void;
    onSessionEstablished?: () => void;
    onSessionDisconnected?: () => void;
    storageKey: string;
}

export type NativeAssociationConfigInput = boolean | NativeAssociationConfig;
