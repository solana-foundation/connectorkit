import { WalletAssociationError, type AssociationClientTransport } from '@wallet-association/core';
import {
    createLocalhostTransport,
    type AssociationTransport,
} from '@wallet-association/transport-localhost';
import type { NativeAssociationResolvedConfig } from '../../../types/native-association';

export class NativeAssociationWalletError extends WalletAssociationError {
    constructor(message: string, code: string, details?: unknown) {
        super(message, code, details);
        this.name = 'NativeAssociationWalletError';
    }
}

export type NativeAssociationTransport = AssociationTransport | AssociationClientTransport;
export type { AssociationTransport };

export function createLocalhostAssociationTransport(
    config: NativeAssociationResolvedConfig,
): AssociationTransport {
    const transport = createLocalhostTransport(config);

    return {
        async get<T>(path: string, options?: { signal?: AbortSignal }): Promise<T> {
            try {
                return await transport.get<T>(path, options);
            } catch (error) {
                throw toNativeAssociationWalletError(error);
            }
        },
        async post<T>(path: string, body: unknown, options?: { signal?: AbortSignal }): Promise<T> {
            try {
                return await transport.post<T>(path, body, options);
            } catch (error) {
                throw toNativeAssociationWalletError(error);
            }
        },
    };
}

function toNativeAssociationWalletError(error: unknown): unknown {
    if (error instanceof NativeAssociationWalletError) {
        return error;
    }
    if (error instanceof WalletAssociationError) {
        return new NativeAssociationWalletError(error.message, error.code, error.details);
    }
    return error;
}
