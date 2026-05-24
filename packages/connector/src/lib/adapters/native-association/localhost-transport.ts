import type { NativeAssociationResolvedConfig } from '../../../types/native-association';

export class NativeAssociationWalletError extends Error {
    constructor(
        message: string,
        public code: string,
        public details?: unknown,
    ) {
        super(message);
        this.name = 'NativeAssociationWalletError';
    }
}

export interface NativeAssociationTransport {
    get<T>(path: string, options?: { signal?: AbortSignal }): Promise<T>;
    post<T>(path: string, body: unknown): Promise<T>;
}

export function createLocalhostAssociationTransport(
    config: NativeAssociationResolvedConfig,
): NativeAssociationTransport {
    return {
        get(path, options) {
            return requestJson(config, path, { method: 'GET', signal: options?.signal });
        },
        post(path, body) {
            return requestJson(config, path, { method: 'POST', body });
        },
    };
}

async function requestJson<T>(
    config: NativeAssociationResolvedConfig,
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
            throw new NativeAssociationWalletError('Native wallet request failed', 'REQUEST_FAILED', {
                status: response.status,
            });
        }
        throw error;
    }

    if (!response.ok || isErrorResponse(data)) {
        throw toNativeAssociationError(data, response.status);
    }

    return data as T;
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

function toNativeAssociationError(data: unknown, status: number): NativeAssociationWalletError {
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

    return new NativeAssociationWalletError(message, code, error?.details ?? { status });
}
