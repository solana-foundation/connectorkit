import type { DevtoolsTrackedTransaction, PluginContext } from '../../types';
import { getRpcUrl } from '../../utils/dom';
import { fetchSignatureStatus, fetchTransactionJsonParsed, type SignatureStatusSummary } from '../../utils/rpc';
import { safeJsonStringify, unwrapRpcValue } from './format';

export interface TransactionDetailsEntry {
    isLoading: boolean;
    status: SignatureStatusSummary | null;
    tx: unknown | null;
    error?: string;
}

export interface TransactionDetailsState {
    detailsBySignature: Map<string, TransactionDetailsEntry>;
    detailsRequestId: number;
}

export function createTransactionDetailsState(): TransactionDetailsState {
    return {
        detailsBySignature: new Map(),
        detailsRequestId: 0,
    };
}

export function mergeTransactions(ctx: PluginContext): DevtoolsTrackedTransaction[] {
    const cacheTxs = ctx.getCache?.().transactions.items ?? [];
    const debugTxs = ctx.client.getDebugState().transactions ?? [];

    const bySig = new Map<string, DevtoolsTrackedTransaction>();

    // Base: persisted cache
    cacheTxs.forEach(tx => bySig.set(tx.signature, { ...tx }));

    // Overlay: connector debug state (has method/cluster/error, etc.)
    debugTxs.forEach(tx => {
        const signature = String(tx.signature);
        const existing = bySig.get(signature);
        bySig.set(signature, {
            ...(existing ?? { signature, timestamp: tx.timestamp, status: tx.status }),
            cluster: tx.cluster,
            error: tx.error,
            feePayer: tx.feePayer ? String(tx.feePayer) : existing?.feePayer,
            method: tx.method,
            size: (tx.metadata as any)?.size ?? existing?.size,
            status: tx.status,
            timestamp: tx.timestamp,
        });
    });

    const list = Array.from(bySig.values());
    list.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    return list;
}

export async function fetchTransactionDetails(
    signature: string,
    ctx: PluginContext,
    state: TransactionDetailsState,
    onChange: () => void,
): Promise<void> {
    const rpcUrl = getRpcUrl(ctx);
    if (!rpcUrl) {
        state.detailsBySignature.set(signature, {
            error: 'No RPC URL available (set devtools config.rpcUrl or ensure connector has an RPC URL).',
            isLoading: false,
            status: null,
            tx: null,
        });
        onChange();
        return;
    }

    const requestId = ++state.detailsRequestId;
    const prev = state.detailsBySignature.get(signature);
    state.detailsBySignature.set(signature, { ...(prev ?? { status: null, tx: null }), isLoading: true });
    onChange();

    try {
        const [status, txResp] = await Promise.all([
            fetchSignatureStatus(rpcUrl, signature),
            fetchTransactionJsonParsed(rpcUrl, signature),
        ]);

        if (requestId !== state.detailsRequestId) return;

        const tx = unwrapRpcValue<unknown>(txResp);
        state.detailsBySignature.set(signature, { isLoading: false, status, tx });

        // Best-effort: update connector + persisted cache when we can determine final status.
        if (status) {
            const nextStatus: DevtoolsTrackedTransaction['status'] = status.err
                ? 'failed'
                : status.confirmationStatus === 'confirmed' || status.confirmationStatus === 'finalized'
                  ? 'confirmed'
                  : 'pending';

            if (nextStatus !== 'pending') {
                ctx.client.updateTransactionStatus(
                    signature,
                    nextStatus,
                    status.err ? safeJsonStringify(status.err, 0) : undefined,
                );
            }

            ctx.updateCache?.(cache => {
                const idx = cache.transactions.items.findIndex(t => t.signature === signature);
                if (idx === -1) return cache;
                const nextItems = cache.transactions.items.map((t, i) =>
                    i === idx
                        ? {
                              ...t,
                              confirmations: status.confirmations ?? null,
                              slot: status.slot ?? undefined,
                              status: nextStatus,
                          }
                        : t,
                );
                return { ...cache, transactions: { ...cache.transactions, items: nextItems } };
            });
        }
    } catch (err) {
        if (requestId !== state.detailsRequestId) return;
        state.detailsBySignature.set(signature, {
            error: err instanceof Error ? err.message : 'Failed to fetch transaction details',
            isLoading: false,
            status: null,
            tx: null,
        });
    } finally {
        onChange();
    }
}
