import type { Wallet, WalletAccount, WalletIcon } from '@wallet-standard/base';
import type {
    StandardConnectFeature,
    StandardDisconnectFeature,
    StandardEventsFeature,
    StandardEventsListeners,
    StandardEventsNames,
} from '@wallet-standard/features';
import { getBase58Encoder } from '@solana/codecs';
import type {
    NativeLocalhostConfig,
    NativeLocalhostConfigInput,
    NativeLocalhostResolvedConfig,
} from '../../types/native-localhost';
import { decodeBase64, encodeBase64 } from '../../remote/protocol';

const SUPPORTED_SIGNING_FEATURES = [
    'solana:signMessage',
    'solana:signTransaction',
    'solana:signAndSendTransaction',
] as const;

const DEFAULT_NATIVE_ICON: WalletIcon =
    'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAFgwJ/lU7D9QAAAABJRU5ErkJggg==';

export const DEFAULT_NATIVE_LOCALHOST_CONFIG: NativeLocalhostResolvedConfig = {
    enabled: false,
    host: '127.0.0.1',
    port: 51884,
    protocolVersion: '1',
    timeoutMs: 250,
};

export interface NativeLocalhostDiscoverResponse {
    name: string;
    icon?: string;
    version: string;
    protocolVersion: '1';
    chains: readonly string[];
    features: readonly string[];
}

interface NativeLocalhostConnectAccount {
    address: string;
    publicKey: number[] | string;
    chains: readonly string[];
    features: readonly string[];
    label?: string;
    icon?: string;
}

interface NativeLocalhostConnectResponse {
    accounts: NativeLocalhostConnectAccount[];
}

interface NativeSignMessageResponse {
    signatureBase64: string;
}

interface NativeSignTransactionResponse {
    signedTransactionBase64: string;
    signature?: string;
}

interface NativeSignAndSendTransactionResponse {
    signature: string;
}

interface SignMessageInput {
    account: WalletAccount;
    message: Uint8Array;
    chain?: string;
}

interface SignTransactionInput {
    account: WalletAccount;
    transaction?: Uint8Array;
    transactions?: Uint8Array[];
    chain?: string;
}

interface SignAndSendTransactionInput {
    account: WalletAccount;
    transaction: Uint8Array;
    chain?: string;
    options?: Record<string, unknown>;
}

export class NativeLocalhostWalletError extends Error {
    constructor(
        message: string,
        public code: string,
        public details?: unknown,
    ) {
        super(message);
        this.name = 'NativeLocalhostWalletError';
    }
}

export function resolveNativeLocalhostConfig(input?: NativeLocalhostConfigInput): NativeLocalhostResolvedConfig {
    if (input === true) {
        return { ...DEFAULT_NATIVE_LOCALHOST_CONFIG, enabled: true };
    }

    if (!input) {
        return { ...DEFAULT_NATIVE_LOCALHOST_CONFIG };
    }

    return {
        ...DEFAULT_NATIVE_LOCALHOST_CONFIG,
        ...input,
        enabled: input.enabled === true,
        protocolVersion: input.protocolVersion ?? DEFAULT_NATIVE_LOCALHOST_CONFIG.protocolVersion,
    };
}

export async function discoverNativeLocalhostWallet(input?: NativeLocalhostConfigInput): Promise<Wallet | null> {
    const config = resolveNativeLocalhostConfig(input);
    if (!config.enabled || typeof window === 'undefined' || typeof fetch === 'undefined') {
        return null;
    }

    const controller = typeof AbortController !== 'undefined' ? new AbortController() : undefined;
    const timeout = controller
        ? setTimeout(() => {
              controller.abort();
          }, config.timeoutMs)
        : undefined;

    try {
        const discovery = await requestJson<NativeLocalhostDiscoverResponse>(config, '/v1/discover', {
            method: 'GET',
            signal: controller?.signal,
        });

        if (!isCompatibleDiscovery(discovery)) {
            return null;
        }

        return createNativeLocalhostWallet(discovery, config);
    } catch {
        return null;
    } finally {
        if (timeout) {
            clearTimeout(timeout);
        }
    }
}

export function createNativeLocalhostWallet(
    discovery: NativeLocalhostDiscoverResponse,
    config: NativeLocalhostResolvedConfig,
): Wallet {
    const solanaChains = discovery.chains.filter(isSolanaChain) as `${string}:${string}`[];
    const discoveryFeatures = new Set(discovery.features);
    const supportsSignAndSend = discoveryFeatures.has('solana:signAndSendTransaction');

    let accounts: WalletAccount[] = [];
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

    function endpointRequest<T>(path: string, body: unknown): Promise<T> {
        return requestJson<T>(config, path, {
            method: 'POST',
            body,
        });
    }

    const features: Record<`${string}:${string}`, unknown> = {
        'standard:connect': {
            version: '1.0.0',
            connect: async (input?: { silent?: boolean }) => {
                const response = await endpointRequest<NativeLocalhostConnectResponse>('/v1/connect', {
                    protocolVersion: config.protocolVersion,
                    metadata: getOriginMetadata(),
                    silent: Boolean(input?.silent),
                });

                accounts = Array.isArray(response.accounts)
                    ? response.accounts
                          .map(account => toWalletAccount(account, supportsSignAndSend))
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
                    const response = await endpointRequest<NativeSignMessageResponse>('/v1/sign-message', {
                        ...createSigningRequestBase(config, input),
                        messageBase64: encodeBase64(input.message),
                    });

                    results.push({ signature: decodeBase64(response.signatureBase64) });
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
                        const response = await signNativeTransaction(config, input, transaction, endpointRequest);
                        signedTransactions.push(decodeBase64(response.signedTransactionBase64));
                    }
                    return { signedTransactions };
                }

                const results = [];
                for (const input of inputs) {
                    if (!input.transaction) {
                        throw new NativeLocalhostWalletError('Missing transaction bytes', 'INVALID_REQUEST');
                    }

                    const response = await signNativeTransaction(config, input, input.transaction, endpointRequest);
                    results.push({ signedTransaction: decodeBase64(response.signedTransactionBase64) });
                }

                return inputs.length === 1 ? results[0] : results;
            },
        },
    };

    if (supportsSignAndSend) {
        features['solana:signAndSendTransaction'] = {
            version: '1.0.0',
            supportedTransactionVersions: ['legacy', 0],
            signAndSendTransaction: async (...inputs: SignAndSendTransactionInput[]) => {
                ensureConnected(accounts);
                const results = [];

                for (const input of inputs) {
                    const response = await endpointRequest<NativeSignAndSendTransactionResponse>(
                        '/v1/sign-and-send-transaction',
                        {
                            ...createSigningRequestBase(config, input),
                            transactionBase64: encodeBase64(input.transaction),
                            options: input.options,
                        },
                    );
                    results.push({ signature: getBase58Encoder().encode(response.signature) });
                }

                return inputs.length === 1 ? results[0] : results;
            },
        };
    }

    const wallet: Wallet = {
        version: '1.0.0',
        name: normalizeWalletName(discovery.name),
        icon: toTrustedWalletIcon(discovery.icon) ?? DEFAULT_NATIVE_ICON,
        chains: solanaChains,
        get accounts() {
            return accounts;
        },
        features: features as Wallet['features'],
    };

    return wallet;
}

async function signNativeTransaction(
    config: NativeLocalhostResolvedConfig,
    input: SignTransactionInput,
    transaction: Uint8Array,
    request: <T>(path: string, body: unknown) => Promise<T>,
): Promise<NativeSignTransactionResponse> {
    return request<NativeSignTransactionResponse>('/v1/sign-transaction', {
        ...createSigningRequestBase(config, input),
        transactionBase64: encodeBase64(transaction),
    });
}

async function requestJson<T>(
    config: NativeLocalhostResolvedConfig,
    path: string,
    options: {
        method: 'GET' | 'POST';
        body?: unknown;
        signal?: AbortSignal;
    },
): Promise<T> {
    const response = await fetch(`http://${config.host}:${config.port}${path}`, {
        method: options.method,
        credentials: 'omit',
        headers: {
            'Content-Type': 'application/json',
        },
        body: options.method === 'POST' ? JSON.stringify(options.body) : undefined,
        signal: options.signal,
    });

    let data: unknown;
    try {
        data = await response.json();
    } catch (error) {
        if (!response.ok) {
            throw new NativeLocalhostWalletError('Native wallet request failed', 'REQUEST_FAILED', {
                status: response.status,
            });
        }
        throw error;
    }

    if (!response.ok || isErrorResponse(data)) {
        throw toNativeWalletError(data, response.status);
    }

    return data as T;
}

function isCompatibleDiscovery(value: unknown): value is NativeLocalhostDiscoverResponse {
    if (!value || typeof value !== 'object') {
        return false;
    }

    const response = value as Partial<NativeLocalhostDiscoverResponse>;
    return (
        response.protocolVersion === '1' &&
        typeof response.version === 'string' &&
        Array.isArray(response.chains) &&
        response.chains.some(isSolanaChain) &&
        Array.isArray(response.features) &&
        response.features.includes('solana:signMessage') &&
        response.features.includes('solana:signTransaction')
    );
}

function isSolanaChain(value: unknown): value is `${string}:${string}` {
    return typeof value === 'string' && value.startsWith('solana:');
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

function toWalletAccount(account: NativeLocalhostConnectAccount, supportsSignAndSend: boolean): WalletAccount | null {
    const publicKey = decodePublicKey(account.publicKey);
    if (!publicKey || typeof account.address !== 'string' || account.address.length === 0) {
        return null;
    }

    const chains = Array.isArray(account.chains) ? account.chains.filter(isSolanaChain) : [];
    if (chains.length === 0) {
        return null;
    }

    const allowedFeatures = new Set<string>(SUPPORTED_SIGNING_FEATURES);
    if (!supportsSignAndSend) {
        allowedFeatures.delete('solana:signAndSendTransaction');
    }

    const features = Array.isArray(account.features)
        ? account.features.filter(feature => allowedFeatures.has(feature))
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
        throw new NativeLocalhostWalletError('Native wallet not connected', 'NOT_CONNECTED');
    }
}

function createSigningRequestBase(
    config: NativeLocalhostResolvedConfig,
    input: { account: WalletAccount; chain?: string },
) {
    return {
        protocolVersion: config.protocolVersion,
        accountAddress: input.account.address,
        chain: input.chain,
        metadata: getOriginMetadata(),
    };
}

function getOriginMetadata(): { origin: string } {
    return {
        origin: typeof window !== 'undefined' ? window.location.origin : '',
    };
}

function isErrorResponse(data: unknown): data is { error: { code?: string; message?: string; details?: unknown } } {
    return (
        typeof data === 'object' &&
        data !== null &&
        'error' in data &&
        typeof (data as { error?: unknown }).error === 'object' &&
        (data as { error?: unknown }).error !== null
    );
}

function toNativeWalletError(data: unknown, status: number): NativeLocalhostWalletError {
    const error = isErrorResponse(data) ? data.error : undefined;
    const code = typeof error?.code === 'string' ? error.code : `HTTP_${status}`;
    const rawMessage = typeof error?.message === 'string' ? error.message : 'Native wallet request failed';
    const lower = `${code} ${rawMessage}`.toLowerCase();
    const message =
        status === 400 ||
        status === 401 ||
        status === 403 ||
        lower.includes('reject') ||
        lower.includes('denied') ||
        lower.includes('forbidden') ||
        lower.includes('unauthorized')
            ? `user rejected: ${rawMessage}`
            : rawMessage;

    return new NativeLocalhostWalletError(message, code, error?.details ?? { status });
}
