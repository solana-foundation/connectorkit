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

export async function simulateWireTransactionBase64(
    rpcUrl: string,
    transactionBase64: Base64EncodedWireTransaction,
    config?: {
        commitment?: 'processed' | 'confirmed' | 'finalized';
        replaceRecentBlockhash?: boolean;
    },
) {
    const rpc = createRpc(rpcUrl);
    return await rpc
        .simulateTransaction(transactionBase64, {
            commitment: config?.commitment ?? 'confirmed',
            encoding: 'base64',
            replaceRecentBlockhash: config?.replaceRecentBlockhash ?? true,
            sigVerify: false,
        })
        .send();
}
