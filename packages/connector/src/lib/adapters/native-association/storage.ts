import { type WalletAssociationStorage, type WalletAssociationStoredSession } from '@wallet-association/core';
import { createWalletAssociationStorage } from '@wallet-association/wallet-standard';
import type { NativeAssociationResolvedConfig } from '../../../types/native-association';
import type { AssociationDiscoverResponse } from './protocol';

export type NativeAssociationStoredSession = WalletAssociationStoredSession;
export type NativeAssociationStorage = WalletAssociationStorage;

export function createNativeAssociationStorage(input: {
    config: NativeAssociationResolvedConfig;
    discovery: AssociationDiscoverResponse;
    origin: string;
}): NativeAssociationStorage {
    return createWalletAssociationStorage({
        discovery: input.discovery,
        origin: input.origin,
        transportId: `localhost:${input.config.host}:${input.config.port}`,
        storageKey: input.config.storageKey,
    });
}
