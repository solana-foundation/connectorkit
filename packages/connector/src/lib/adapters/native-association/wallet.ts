import type { Wallet, WalletAccount, WalletIcon } from '@wallet-standard/base';
import type {
    StandardConnectFeature,
    StandardDisconnectFeature,
    StandardEventsFeature,
    StandardEventsListeners,
    StandardEventsNames,
} from '@wallet-standard/features';
import { getBase58Encoder } from '@solana/codecs';
import type { NativeAssociationResolvedConfig } from '../../../types/native-association';
import { decodeBase64, encodeBase64 } from '../../../remote/protocol';
import type { AssociationCrypto } from './crypto';
import { createAssociationCrypto } from './crypto';
import type { NativeAssociationStorage, NativeAssociationStoredSession } from './storage';
import { createNativeAssociationStorage } from './storage';
import type { NativeAssociationTransport } from './localhost-transport';
import { NativeAssociationWalletError } from './localhost-transport';
import type {
    AssociationDiscoverResponse,
    AssociationEnvelope,
    AssociationHandshakeResponse,
    AssociationRequestPayload,
    AssociationResponsePayload,
    AssociationRPCRequestPayload,
    AssociationRPCResponsePayload,
    NativeAssociationAccount,
    SignMessageInput,
    SignTransactionInput,
} from './protocol';
import { isAssociationEnvelope, isSolanaChain } from './protocol';

const SUPPORTED_SIGNING_FEATURES = ['solana:signMessage', 'solana:signTransaction'] as const;

const DEFAULT_NATIVE_ICON: WalletIcon =
    'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAFgwJ/lU7D9QAAAABJRU5ErkJggg==';

export interface NativeAssociationWalletDeps {
    transport: NativeAssociationTransport;
    crypto?: AssociationCrypto;
    storage?: NativeAssociationStorage;
    origin?: string;
    appName?: string;
    appIcon?: string;
}

export function createNativeAssociationWallet(
    discovery: AssociationDiscoverResponse,
    config: NativeAssociationResolvedConfig,
    deps: NativeAssociationWalletDeps,
): Wallet {
    const crypto = deps.crypto ?? createAssociationCrypto();
    const origin = deps.origin ?? getOrigin();
    const storage =
        deps.storage ??
        createNativeAssociationStorage({
            config,
            discovery,
            origin,
        });

    const solanaChains = discovery.chains.filter(isSolanaChain) as `${string}:${string}`[];
    const supportedFeatures = new Set(SUPPORTED_SIGNING_FEATURES);

    let accounts: WalletAccount[] = [];
    let session: NativeAssociationStoredSession | null = null;
    const listeners = new Set<(properties: { accounts?: readonly WalletAccount[] }) => void>();

    function emitChange() {
        for (const listener of listeners) {
            try {
                listener({ accounts });
            } catch {
                // Ignore listener errors.
            }
        }
    }

    async function connectAssociation(): Promise<AssociationResponsePayload> {
        const storedSession = storage.get();
        if (storedSession) {
            try {
                return await associate({
                    kind: 'resume',
                    resumeSessionId: storedSession.sessionId,
                    resumeSessionTokenBase64: storedSession.sessionTokenBase64,
                });
            } catch (error) {
                if (!(error instanceof NativeAssociationWalletError) || error.code !== 'session_invalid') {
                    throw error;
                }
                storage.clear();
            }
        }

        return associate({
            kind: 'create',
            requestedChains: solanaChains,
            requestedFeatures: [...SUPPORTED_SIGNING_FEATURES],
        });
    }

    async function associate(payload: AssociationRequestPayload): Promise<AssociationResponsePayload> {
        const keyPair = crypto.generateKeyPair();
        const handshake = await deps.transport.post<AssociationHandshakeResponse>('/v2/handshake', {
            protocolVersion: config.protocolVersion,
            dappPublicKeyBase64: keyPair.publicKeyBase64,
            metadata: {
                origin,
                appName: deps.appName,
                appIcon: deps.appIcon,
            },
        });

        if (handshake.protocolVersion !== config.protocolVersion || typeof handshake.handshakeId !== 'string') {
            throw new NativeAssociationWalletError('Native wallet handshake failed', 'MALFORMED_HANDSHAKE');
        }

        const handshakeKey = crypto.deriveHandshakeKey({
            secretKey: keyPair.secretKey,
            walletPublicKeyBase64: handshake.walletPublicKeyBase64,
            handshakeId: handshake.handshakeId,
            origin,
        });
        const envelope = crypto.sealJson(handshake.handshakeId, handshakeKey, payload);
        const encryptedResponse = await deps.transport.post<AssociationEnvelope>('/v2/associate', envelope);

        if (!isAssociationEnvelope(encryptedResponse) || encryptedResponse.keyId !== handshake.handshakeId) {
            throw new NativeAssociationWalletError(
                'Native wallet returned a malformed association response',
                'MALFORMED_RESPONSE',
            );
        }

        return crypto.openJson<AssociationResponsePayload>(handshakeKey, encryptedResponse);
    }

    async function sendRpc(
        payload: Omit<AssociationRPCRequestPayload, 'requestId' | 'issuedAt' | 'sessionTokenBase64'>,
    ) {
        if (!session) {
            throw new NativeAssociationWalletError('Native wallet not connected', 'NOT_CONNECTED');
        }

        const requestId = crypto.randomUUID();
        const requestPayload: AssociationRPCRequestPayload = {
            requestId,
            issuedAt: crypto.now().toISOString(),
            sessionTokenBase64: session.sessionTokenBase64,
            ...payload,
        };
        const sessionKey = crypto.deriveSessionKey({
            sessionTokenBase64: session.sessionTokenBase64,
            sessionId: session.sessionId,
            origin,
        });
        const envelope = crypto.sealJson(session.sessionId, sessionKey, requestPayload);
        const encryptedResponse = await deps.transport.post<AssociationEnvelope>('/v2/rpc', envelope);

        if (!isAssociationEnvelope(encryptedResponse) || encryptedResponse.keyId !== session.sessionId) {
            throw new NativeAssociationWalletError(
                'Native wallet returned a malformed signing response',
                'MALFORMED_RESPONSE',
            );
        }

        const response = crypto.openJson<AssociationRPCResponsePayload>(sessionKey, encryptedResponse);
        if (response.requestId !== requestId) {
            throw new NativeAssociationWalletError(
                'Native wallet returned a mismatched signing response',
                'MALFORMED_RESPONSE',
            );
        }
        return response;
    }

    const features: Record<`${string}:${string}`, unknown> = {
        'standard:connect': {
            version: '1.0.0',
            connect: async () => {
                const response = await connectAssociation();
                session = {
                    sessionId: response.sessionId,
                    sessionTokenBase64: response.sessionTokenBase64,
                    expiresAt: response.expiresAt,
                    origin,
                    walletName: normalizeWalletName(discovery.name),
                    walletVersion: discovery.version,
                };
                storage.set(session);

                accounts = Array.isArray(response.accounts)
                    ? response.accounts
                          .map(account => toWalletAccount(account, supportedFeatures))
                          .filter((account): account is WalletAccount => account !== null)
                    : [];
                emitChange();

                return { accounts };
            },
        } satisfies StandardConnectFeature['standard:connect'],

        'standard:disconnect': {
            version: '1.0.0',
            disconnect: async () => {
                accounts = [];
                session = null;
                emitChange();
            },
        } satisfies StandardDisconnectFeature['standard:disconnect'],

        'standard:events': {
            version: '1.0.0',
            on: <E extends StandardEventsNames>(event: E, listener: StandardEventsListeners[E]) => {
                if (event !== 'change') {
                    return () => {};
                }

                const changeListener = listener as (properties: { accounts?: readonly WalletAccount[] }) => void;
                listeners.add(changeListener);
                return () => {
                    listeners.delete(changeListener);
                };
            },
        } satisfies StandardEventsFeature['standard:events'],

        'solana:signMessage': {
            version: '1.0.0',
            signMessage: async (...inputs: SignMessageInput[]) => {
                ensureConnected(accounts);
                const results = [];

                for (const input of inputs) {
                    const response = await sendRpc({
                        method: 'solana.signMessage',
                        params: {
                            accountAddress: input.account.address,
                            chain: input.chain,
                            messageBase64: encodeBase64(input.message),
                        },
                    });

                    if (!('signatureBase64' in response.result)) {
                        throw new NativeAssociationWalletError(
                            'Native wallet returned a malformed message signature',
                            'MALFORMED_RESPONSE',
                        );
                    }
                    results.push({ signature: decodeBase64(response.result.signatureBase64) });
                }

                return inputs.length === 1 ? results[0] : results;
            },
        },

        'solana:signTransaction': {
            version: '1.0.0',
            supportedTransactionVersions: ['legacy', 0],
            signTransaction: async (...inputs: SignTransactionInput[]) => {
                ensureConnected(accounts);

                const transactions = inputs.length === 1 ? inputs[0].transactions : undefined;
                if (Array.isArray(transactions)) {
                    const input = inputs[0];
                    const signedTransactions = [];
                    for (const transaction of transactions) {
                        signedTransactions.push(await signTransaction(input, transaction));
                    }
                    return { signedTransactions };
                }

                const results = [];
                for (const input of inputs) {
                    if (!input.transaction) {
                        throw new NativeAssociationWalletError('Missing transaction bytes', 'INVALID_REQUEST');
                    }
                    results.push({ signedTransaction: await signTransaction(input, input.transaction) });
                }

                return inputs.length === 1 ? results[0] : results;
            },
        },
    };

    async function signTransaction(input: SignTransactionInput, transaction: Uint8Array): Promise<Uint8Array> {
        const response = await sendRpc({
            method: 'solana.signTransaction',
            params: {
                accountAddress: input.account.address,
                chain: input.chain,
                transactionBase64: encodeBase64(transaction),
            },
        });

        if (!('signedTransactionBase64' in response.result)) {
            throw new NativeAssociationWalletError(
                'Native wallet returned a malformed signed transaction',
                'MALFORMED_RESPONSE',
            );
        }
        return decodeBase64(response.result.signedTransactionBase64);
    }

    return {
        version: '1.0.0',
        name: normalizeWalletName(discovery.name),
        icon: DEFAULT_NATIVE_ICON,
        chains: solanaChains,
        get accounts() {
            return accounts;
        },
        features: features as Wallet['features'],
    };
}

function toWalletAccount(
    account: NativeAssociationAccount,
    supportedFeatures: ReadonlySet<string>,
): WalletAccount | null {
    const publicKey = decodePublicKey(account.publicKey);
    if (!publicKey || typeof account.address !== 'string' || account.address.length === 0) {
        return null;
    }

    const chains = Array.isArray(account.chains) ? account.chains.filter(isSolanaChain) : [];
    if (chains.length === 0) {
        return null;
    }

    const features = Array.isArray(account.features)
        ? account.features.filter(feature => supportedFeatures.has(feature))
        : [];

    return {
        address: account.address,
        publicKey,
        chains,
        features: features as `${string}:${string}`[],
        label: typeof account.label === 'string' ? account.label : undefined,
        icon: toTrustedWalletIcon(account.icon),
    };
}

function decodePublicKey(publicKey: number[] | string): Uint8Array | null {
    if (Array.isArray(publicKey)) {
        if (publicKey.length !== 32 || publicKey.some(byte => !Number.isInteger(byte) || byte < 0 || byte > 255)) {
            return null;
        }
        return new Uint8Array(publicKey);
    }

    if (typeof publicKey !== 'string' || publicKey.length === 0) {
        return null;
    }

    try {
        const base64Bytes = decodeBase64(publicKey);
        if (base64Bytes.length === 32) {
            return base64Bytes;
        }
    } catch {
        // Fall back to base58.
    }

    try {
        const base58Bytes = getBase58Encoder().encode(publicKey);
        return base58Bytes.length === 32 ? new Uint8Array(base58Bytes) : null;
    } catch {
        return null;
    }
}

function ensureConnected(accounts: WalletAccount[]): void {
    if (accounts.length === 0) {
        throw new NativeAssociationWalletError('Native wallet not connected', 'NOT_CONNECTED');
    }
}

function normalizeWalletName(name: unknown): string {
    return typeof name === 'string' && name.trim().length > 0 ? name.trim() : 'Native';
}

function toTrustedWalletIcon(icon: unknown): WalletIcon | undefined {
    if (typeof icon !== 'string') {
        return undefined;
    }

    return /^data:image\/(svg\+xml|webp|png|gif);base64,/i.test(icon) ? (icon as WalletIcon) : undefined;
}

function getOrigin(): string {
    return typeof window !== 'undefined' ? window.location.origin : '';
}
