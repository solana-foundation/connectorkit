import {
    createSolanaRpc,
    signature as createSignature,
    type Base64EncodedWireTransaction,
    type Rpc,
    type SolanaRpcApi,
} from '@solana/kit';

export function createRpc(rpcUrl: string): Rpc<SolanaRpcApi> {
    return createSolanaRpc(rpcUrl) as Rpc<SolanaRpcApi>;
}

function unwrapRpcValue<T>(resp: unknown): T | null {
    if (!resp) return null;
    if (typeof resp === 'object' && resp !== null && 'value' in resp) return (resp as any).value as T;
    return resp as T;
}

export interface SignatureStatusSummary {
    slot: number | null;
    confirmationStatus?: string | null;
    confirmations?: number | null;
    err: unknown;
}

export async function fetchSignatureStatus(rpcUrl: string, signature: string): Promise<SignatureStatusSummary | null> {
    const rpc = createRpc(rpcUrl);
    const resp = await rpc
        .getSignatureStatuses([createSignature(signature)], { searchTransactionHistory: true })
        .send();
    const value = resp?.value?.[0] ?? null;
    if (!value) return null;

    function toNumberOrNull(input: unknown): number | null {
        if (input === null || input === undefined) return null;
        if (typeof input === 'number') return Number.isFinite(input) ? input : null;
        if (typeof input === 'bigint') {
            const n = Number(input);
            return Number.isFinite(n) ? n : null;
        }
        return null;
    }

    return {
        confirmationStatus: value.confirmationStatus ?? null,
        confirmations: toNumberOrNull(value.confirmations) ?? null,
        err: value.err ?? null,
        slot: toNumberOrNull(value.slot) ?? null,
    };
}

export async function fetchTransactionJsonParsed(rpcUrl: string, signature: string) {
    const rpc = createRpc(rpcUrl);
    return await rpc
        .getTransaction(createSignature(signature), { encoding: 'jsonParsed', maxSupportedTransactionVersion: 0 })
        .send();
}

export async function fetchTransactionWireBase64(
    rpcUrl: string,
    signature: string,
    config?: { commitment?: 'processed' | 'confirmed' | 'finalized' },
): Promise<string | null> {
    const rpc = createRpc(rpcUrl) as any;
    const resp = await rpc
        .getTransaction(createSignature(signature), {
            commitment: config?.commitment ?? 'confirmed',
            encoding: 'base64',
            maxSupportedTransactionVersion: 0,
        })
        .send();

    const value = unwrapRpcValue<any>(resp);
    const tx = value && typeof value === 'object' ? (value as any).transaction : null;
    if (!tx) return null;

    if (Array.isArray(tx) && typeof tx[0] === 'string') return tx[0];
    if (typeof tx === 'string') return tx;
    return null;
}

export async function fetchMultipleAccountsBase64(
    rpcUrl: string,
    addresses: string[],
    config?: { commitment?: 'processed' | 'confirmed' | 'finalized' },
): Promise<Array<unknown | null>> {
    if (addresses.length === 0) return [];
    const rpc = createRpc(rpcUrl) as any;
    const resp = await rpc
        .getMultipleAccounts(addresses, {
            commitment: config?.commitment ?? 'confirmed',
            encoding: 'base64',
        })
        .send();
    const value = unwrapRpcValue<any>(resp);
    return Array.isArray(value) ? value : [];
}

export async function simulateWireTransactionBase64(
    rpcUrl: string,
    transactionBase64: Base64EncodedWireTransaction,
    config?: {
        commitment?: 'processed' | 'confirmed' | 'finalized';
        replaceRecentBlockhash?: boolean;
        accounts?: { addresses: string[]; encoding?: 'base64' };
    },
) {
    const rpc = createRpc(rpcUrl) as any;

    const accounts =
        config?.accounts?.addresses?.length && config.accounts.addresses.length > 0
            ? { encoding: config.accounts.encoding ?? 'base64', addresses: config.accounts.addresses }
            : undefined;

    return await rpc
        .simulateTransaction(transactionBase64, {
            commitment: config?.commitment ?? 'confirmed',
            encoding: 'base64',
            replaceRecentBlockhash: config?.replaceRecentBlockhash ?? true,
            sigVerify: false,
            ...(accounts ? { accounts } : {}),
        })
        .send();
}
