import type { NativeAssociationResolvedConfig } from '../../../types/native-association';
import type { AssociationDiscoverResponse } from './protocol';

export interface NativeAssociationStoredSession {
    sessionId: string;
    sessionTokenBase64: string;
    expiresAt: string;
    origin: string;
    walletName: string;
    walletVersion: string;
}

export interface NativeAssociationStorage {
    get(): NativeAssociationStoredSession | null;
    set(session: NativeAssociationStoredSession): void;
    clear(): void;
}

export function createNativeAssociationStorage(input: {
    config: NativeAssociationResolvedConfig;
    discovery: AssociationDiscoverResponse;
    origin: string;
}): NativeAssociationStorage {
    const key = sessionStorageKey(input);

    return {
        get() {
            if (!isLocalStorageAvailable()) {
                return null;
            }

            try {
                const raw = window.localStorage.getItem(key);
                if (!raw) {
                    return null;
                }
                const session = JSON.parse(raw) as Partial<NativeAssociationStoredSession>;
                if (!isStoredSession(session) || session.origin !== input.origin || isExpired(session.expiresAt)) {
                    window.localStorage.removeItem(key);
                    return null;
                }
                return session;
            } catch {
                return null;
            }
        },

        set(session) {
            if (!isLocalStorageAvailable()) {
                return;
            }

            try {
                window.localStorage.setItem(key, JSON.stringify(session));
            } catch {
                // Ignore storage quota and privacy mode failures.
            }
        },

        clear() {
            if (!isLocalStorageAvailable()) {
                return;
            }

            try {
                window.localStorage.removeItem(key);
            } catch {
                // Ignore storage failures.
            }
        },
    };
}

function sessionStorageKey(input: {
    config: NativeAssociationResolvedConfig;
    discovery: AssociationDiscoverResponse;
    origin: string;
}): string {
    const walletName = encodeURIComponent(input.discovery.name || 'Native');
    const origin = encodeURIComponent(input.origin);
    return `${input.config.storageKey}:${origin}:${input.config.host}:${input.config.port}:${walletName}`;
}

function isStoredSession(value: Partial<NativeAssociationStoredSession>): value is NativeAssociationStoredSession {
    return (
        typeof value.sessionId === 'string' &&
        typeof value.sessionTokenBase64 === 'string' &&
        typeof value.expiresAt === 'string' &&
        typeof value.origin === 'string' &&
        typeof value.walletName === 'string' &&
        typeof value.walletVersion === 'string'
    );
}

function isExpired(expiresAt: string): boolean {
    const timestamp = Date.parse(expiresAt);
    return Number.isNaN(timestamp) || timestamp <= Date.now();
}

function isLocalStorageAvailable(): boolean {
    return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
}
