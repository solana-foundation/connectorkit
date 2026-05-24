export {
    WALLET_ASSOCIATION_ENCRYPTION as NATIVE_ASSOCIATION_ENCRYPTION,
    WALLET_ASSOCIATION_PROTOCOL_VERSION as NATIVE_ASSOCIATION_PROTOCOL_VERSION,
    isAssociationEnvelope,
    isCompatibleDiscovery,
    isSolanaChain,
    type AssociationDiscoverResponse,
    type AssociationEnvelope,
    type AssociationHandshakeResponse,
    type AssociationRequestPayload,
    type AssociationResponsePayload,
    type AssociationRPCRequestPayload,
    type AssociationRPCResponsePayload,
    type AssociationTransportDescriptor,
    type SignMessageInput,
    type SignTransactionInput,
} from '@wallet-association/core';
export type { AssociationAccount as NativeAssociationAccount } from '@wallet-association/core';
