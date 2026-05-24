import type { WalletAccount } from '@wallet-standard/base';

export const NATIVE_ASSOCIATION_PROTOCOL_VERSION = '2' as const;
export const NATIVE_ASSOCIATION_ENCRYPTION = 'x25519-hkdf-sha256-chacha20poly1305';

export interface AssociationTransportDescriptor {
    type: string;
    host?: string;
    port?: number;
}

export interface AssociationDiscoverResponse {
    name: string;
    version: string;
    protocolVersion: '2';
    transports: AssociationTransportDescriptor[];
    chains: string[];
    features: string[];
    encryption: string;
    sessionTokenTtlSeconds: number;
}

export interface AssociationHandshakeResponse {
    protocolVersion: '2';
    handshakeId: string;
    walletPublicKeyBase64: string;
    expiresAt: string;
}

export interface AssociationEnvelope {
    protocolVersion: '2';
    keyId: string;
    sealedBoxBase64: string;
}

export interface NativeAssociationAccount {
    address: string;
    publicKey: number[] | string;
    chains: readonly string[];
    features: readonly string[];
    label?: string;
    icon?: string;
}

export interface AssociationRequestPayload {
    kind: 'create' | 'resume';
    requestedChains?: string[];
    requestedFeatures?: string[];
    resumeSessionId?: string;
    resumeSessionTokenBase64?: string;
}

export interface AssociationResponsePayload {
    sessionId: string;
    sessionTokenBase64: string;
    expiresAt: string;
    accounts: NativeAssociationAccount[];
    chains: string[];
    features: string[];
    signingPolicy: 'prompt' | 'allowWithoutPrompt';
}

export type AssociationRPCMethod = 'solana.signMessage' | 'solana.signTransaction';

export interface AssociationRPCRequestPayload {
    requestId: string;
    issuedAt: string;
    sessionTokenBase64: string;
    method: AssociationRPCMethod;
    params: {
        accountAddress: string;
        chain?: string;
        messageBase64?: string;
        transactionBase64?: string;
    };
}

export type AssociationRPCResponsePayload =
    | {
          requestId: string;
          result: { signatureBase64: string };
      }
    | {
          requestId: string;
          result: { signedTransactionBase64: string; signature: string };
      };

export interface SignMessageInput {
    account: WalletAccount;
    message: Uint8Array;
    chain?: string;
}

export interface SignTransactionInput {
    account: WalletAccount;
    transaction?: Uint8Array;
    transactions?: Uint8Array[];
    chain?: string;
}

export function isAssociationEnvelope(value: unknown): value is AssociationEnvelope {
    if (!value || typeof value !== 'object') return false;
    const envelope = value as Partial<AssociationEnvelope>;
    return (
        envelope.protocolVersion === NATIVE_ASSOCIATION_PROTOCOL_VERSION &&
        typeof envelope.keyId === 'string' &&
        typeof envelope.sealedBoxBase64 === 'string'
    );
}

export function isCompatibleDiscovery(value: unknown): value is AssociationDiscoverResponse {
    if (!value || typeof value !== 'object') {
        return false;
    }

    const response = value as Partial<AssociationDiscoverResponse>;
    return (
        response.protocolVersion === NATIVE_ASSOCIATION_PROTOCOL_VERSION &&
        typeof response.name === 'string' &&
        typeof response.version === 'string' &&
        Array.isArray(response.transports) &&
        Array.isArray(response.chains) &&
        response.chains.some(isSolanaChain) &&
        Array.isArray(response.features) &&
        response.features.includes('solana:signMessage') &&
        response.features.includes('solana:signTransaction') &&
        typeof response.encryption === 'string' &&
        response.encryption === NATIVE_ASSOCIATION_ENCRYPTION
    );
}

export function isSolanaChain(value: unknown): value is `${string}:${string}` {
    return typeof value === 'string' && value.startsWith('solana:');
}
