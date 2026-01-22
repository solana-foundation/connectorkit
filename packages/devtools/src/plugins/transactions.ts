/**
 * Transactions Plugin
 *
 * Displays:
 * - In-flight transactions (preparing/signing)
 * - Transaction history (connector + persisted devtools cache)
 * - Transaction details (wire decode + RPC fetch)
 */

import type {
    ConnectorDevtoolsPlugin,
    PluginContext,
    DevtoolsInflightTransaction,
    DevtoolsTrackedTransaction,
} from '../types';
import { ICONS } from '../components/icons';

import { bytesToHexPreview, formatByteSize } from '../utils/tx-bytes';
import { decodeWireTransactionBase64 } from '../utils/tx-decode';
import { fetchSignatureStatus, fetchTransactionJsonParsed, type SignatureStatusSummary } from '../utils/rpc';

export function createTransactionsPlugin(_maxTransactions = 50): ConnectorDevtoolsPlugin {
    let unsubscribeCache: (() => void) | undefined;
    let pollInterval: number | undefined;

    let selectedSignature: string | null = null;
    let selectedInflightId: string | null = null;
    let detailsRequestId = 0;

    const detailsBySignature = new Map<
        string,
        {
            isLoading: boolean;
            status: SignatureStatusSummary | null;
            tx: unknown | null;
            error?: string;
        }
    >();

    function stopPolling() {
        if (pollInterval !== undefined) window.clearInterval(pollInterval);
        pollInterval = undefined;
    }

    function unwrapRpcValue<T>(resp: any): T | null {
        if (!resp) return null;
        if (typeof resp === 'object' && 'value' in resp) return (resp as any).value as T;
        return resp as T;
    }

    function safeJsonStringify(value: unknown, space = 2): string {
        try {
            return JSON.stringify(
                value,
                (_key, v) => (typeof v === 'bigint' ? v.toString() : v),
                space,
            );
        } catch (err) {
            return err instanceof Error ? err.message : String(err);
        }
    }

    function getRpcUrl(ctx: PluginContext): string | null {
        const cfg = ctx.getConfig();
        return cfg.rpcUrl ?? ctx.client.getRpcUrl() ?? null;
    }

    function truncateMiddle(value: string, head = 8, tail = 8): string {
        if (value.length <= head + tail + 3) return value;
        return `${value.slice(0, head)}...${value.slice(-tail)}`;
    }

    function formatRelativeTime(timestamp: string): string {
        const now = Date.now();
        const then = new Date(timestamp).getTime();
        const diff = now - then;

        if (diff < 1000) return 'just now';
        if (diff < 60000) return `${Math.floor(diff / 1000)}s ago`;
        if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
        return new Date(timestamp).toLocaleTimeString('en-US', {
            hour12: false,
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
        });
    }

    async function copyToClipboard(text: string) {
        try {
            await navigator.clipboard.writeText(text);
        } catch {
            const textarea = document.createElement('textarea');
            textarea.value = text;
            document.body.appendChild(textarea);
            textarea.select();
            document.execCommand('copy');
            document.body.removeChild(textarea);
        }
    }

    function getExplorerUrl(signature: string, cluster?: string) {
        const baseUrl = 'https://explorer.solana.com';
        let clusterParam = '';
        if (cluster?.includes('devnet')) clusterParam = '?cluster=devnet';
        else if (cluster?.includes('testnet')) clusterParam = '?cluster=testnet';
        else if (cluster?.includes('custom')) clusterParam = '?cluster=custom';
        return `${baseUrl}/tx/${signature}${clusterParam}`;
    }

    function mergeTransactions(ctx: PluginContext): DevtoolsTrackedTransaction[] {
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

    async function fetchDetails(signature: string, ctx: PluginContext, render: () => void) {
        const rpcUrl = getRpcUrl(ctx);
        if (!rpcUrl) {
            detailsBySignature.set(signature, {
                error: 'No RPC URL available (set devtools config.rpcUrl or ensure connector has an RPC URL).',
                isLoading: false,
                status: null,
                tx: null,
            });
            render();
            return;
        }

        const requestId = ++detailsRequestId;
        const prev = detailsBySignature.get(signature);
        detailsBySignature.set(signature, { ...(prev ?? { status: null, tx: null }), isLoading: true });
        render();

        try {
            const [status, txResp] = await Promise.all([
                fetchSignatureStatus(rpcUrl, signature),
                fetchTransactionJsonParsed(rpcUrl, signature),
            ]);

            if (requestId !== detailsRequestId) return;

            const tx = unwrapRpcValue<unknown>(txResp);
            detailsBySignature.set(signature, { isLoading: false, status, tx });

            // Best-effort: update connector + persisted cache when we can determine final status.
            if (status) {
                const nextStatus: DevtoolsTrackedTransaction['status'] =
                    status.err
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
            if (requestId !== detailsRequestId) return;
            detailsBySignature.set(signature, {
                error: err instanceof Error ? err.message : 'Failed to fetch transaction details',
                isLoading: false,
                status: null,
                tx: null,
            });
        } finally {
            render();
        }
    }

    return {
        id: 'transactions',
        name: 'Transactions',
        icon: ICONS.transactions,

        render(el: HTMLElement, ctx: PluginContext) {
            const maxTransactions = ctx.getConfig().maxTransactions;

            function renderContent() {
                const cache = ctx.getCache?.();
                const inflight = cache?.transactions.inflight ?? [];
                const merged = mergeTransactions(ctx);
                const transactions = merged.slice(0, maxTransactions);
                const statusBySignature = new Map(merged.map(tx => [tx.signature, tx.status] as const));

                // Show inflight entries that don't have a signature yet, or that are still pending.
                const inflightDisplay = inflight.filter(ix => {
                    if (!ix.signature) return true;
                    const status = statusBySignature.get(ix.signature);
                    return !status || status === 'pending';
                });

                const pendingCount = transactions.filter(t => t.status === 'pending').length;
                const confirmedCount = transactions.filter(t => t.status === 'confirmed').length;
                const failedCount = transactions.filter(t => t.status === 'failed').length;

                const selectedDetails = selectedSignature ? detailsBySignature.get(selectedSignature) : undefined;

                const selectedInflight = selectedInflightId
                    ? inflight.find(ix => ix.id === selectedInflightId) ?? null
                    : null;

                let selectedInflightDecoded:
                    | ReturnType<typeof decodeWireTransactionBase64>
                    | null = null;

                if (selectedInflight?.transactionBase64) {
                    try {
                        selectedInflightDecoded = decodeWireTransactionBase64(selectedInflight.transactionBase64);
                    } catch {
                        selectedInflightDecoded = null;
                    }
                }

                const selectedTx = selectedSignature
                    ? transactions.find(t => t.signature === selectedSignature) ?? null
                    : null;

                let selectedTxDecoded: ReturnType<typeof decodeWireTransactionBase64> | null = null;
                if (selectedTx?.wireTransactionBase64) {
                    try {
                        selectedTxDecoded = decodeWireTransactionBase64(selectedTx.wireTransactionBase64);
                    } catch {
                        selectedTxDecoded = null;
                    }
                }

                el.innerHTML = `
                    <div class="cdt-transactions">
                        <style>
                            .cdt-transactions {
                                display: flex;
                                flex-direction: column;
                                height: 100%;
                            }

                            .cdt-tx-toolbar {
                                display: flex;
                                align-items: center;
                                justify-content: space-between;
                                padding: 8px 12px;
                                border-bottom: 1px solid var(--cdt-border);
                                background: var(--cdt-bg-panel);
                                gap: 12px;
                            }

                            .cdt-tx-stats {
                                display: flex;
                                gap: 12px;
                                font-size: 11px;
                                align-items: center;
                            }

                            .cdt-tx-stat { display: flex; align-items: center; gap: 6px; }

                            .cdt-tx-stat-dot {
                                width: 8px;
                                height: 8px;
                                border-radius: 50%;
                            }

                            .cdt-tx-stat-dot.pending { background: var(--cdt-warning); animation: pulse 1.5s ease-in-out infinite; }
                            .cdt-tx-stat-dot.confirmed { background: var(--cdt-success); }
                            .cdt-tx-stat-dot.failed { background: var(--cdt-error); }

                            @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }

                            .cdt-tx-split {
                                display: grid;
                                grid-template-columns: 1fr 1fr;
                                min-height: 0;
                                flex: 1;
                            }

                            @media (max-width: 720px) {
                                .cdt-tx-split { grid-template-columns: 1fr; grid-template-rows: 1fr 1fr; }
                            }

                            .cdt-tx-pane {
                                min-width: 0;
                                overflow: auto;
                                border-right: 1px solid var(--cdt-border);
                            }

                            @media (max-width: 720px) {
                                .cdt-tx-pane { border-right: none; border-bottom: 1px solid var(--cdt-border); }
                            }

                            .cdt-tx-details {
                                min-width: 0;
                                overflow: auto;
                                padding: 12px;
                            }

                            .cdt-tx-section-title {
                                font-size: 11px;
                                font-weight: 700;
                                letter-spacing: 0.06em;
                                text-transform: uppercase;
                                color: var(--cdt-text-muted);
                                padding: 10px 12px;
                                border-bottom: 1px solid var(--cdt-border);
                                background: var(--cdt-bg-panel);
                            }

                            .cdt-tx-list { }

                            .cdt-tx-item {
                                display: flex;
                                align-items: center;
                                padding: 10px 12px;
                                border-bottom: 1px solid var(--cdt-border);
                                gap: 12px;
                                cursor: pointer;
                                transition: background 0.1s;
                            }

                            .cdt-tx-item:hover { background: var(--cdt-bg-hover); }
                            .cdt-tx-item[data-selected="true"] { background: var(--cdt-bg-active); }

                            .cdt-tx-status {
                                width: 10px;
                                height: 10px;
                                border-radius: 50%;
                                flex-shrink: 0;
                            }

                            .cdt-tx-status.pending { background: var(--cdt-warning); animation: pulse 1.5s ease-in-out infinite; }
                            .cdt-tx-status.confirmed { background: var(--cdt-success); }
                            .cdt-tx-status.failed { background: var(--cdt-error); }

                            .cdt-tx-info { flex: 1; min-width: 0; }

                            .cdt-tx-sigline {
                                display: flex;
                                align-items: center;
                                gap: 8px;
                                font-family: ui-monospace, monospace;
                                font-size: 12px;
                                color: var(--cdt-text);
                            }

                            .cdt-tx-meta {
                                display: flex;
                                gap: 10px;
                                margin-top: 4px;
                                font-size: 11px;
                                color: var(--cdt-text-muted);
                                flex-wrap: wrap;
                            }

                            .cdt-pill {
                                display: inline-flex;
                                align-items: center;
                                padding: 2px 8px;
                                border-radius: 999px;
                                font-size: 10px;
                                border: 1px solid var(--cdt-border);
                                background: var(--cdt-bg);
                                color: var(--cdt-text-muted);
                            }

                            .cdt-pill.warn { color: var(--cdt-warning); border-color: color-mix(in srgb, var(--cdt-warning) 40%, var(--cdt-border)); }
                            .cdt-pill.info { color: var(--cdt-info); border-color: color-mix(in srgb, var(--cdt-info) 40%, var(--cdt-border)); }
                            .cdt-pill.success { color: var(--cdt-success); border-color: color-mix(in srgb, var(--cdt-success) 40%, var(--cdt-border)); }

                            .cdt-details-header {
                                display: flex;
                                align-items: center;
                                justify-content: space-between;
                                gap: 10px;
                                margin-bottom: 10px;
                            }

                            .cdt-details-title {
                                font-size: 13px;
                                font-weight: 700;
                                color: var(--cdt-text);
                            }

                            .cdt-kv {
                                display: grid;
                                grid-template-columns: 140px 1fr;
                                gap: 6px 12px;
                                font-size: 12px;
                                margin-top: 8px;
                            }

                            .cdt-k { color: var(--cdt-text-muted); }
                            .cdt-v { color: var(--cdt-text); font-family: ui-monospace, monospace; word-break: break-all; }

                            .cdt-json {
                                margin-top: 10px;
                                padding: 10px;
                                border: 1px solid var(--cdt-border);
                                border-radius: 10px;
                                background: var(--cdt-bg-panel);
                                font-family: ui-monospace, monospace;
                                font-size: 11px;
                                line-height: 1.5;
                                white-space: pre-wrap;
                                word-break: break-all;
                            }

                            .cdt-empty {
                                padding: 18px;
                                color: var(--cdt-text-muted);
                                font-size: 12px;
                            }
                        </style>

                        <div class="cdt-tx-toolbar">
                            <div class="cdt-tx-stats">
                                <div class="cdt-tx-stat"><span class="cdt-tx-stat-dot pending"></span><span>${pendingCount} pending</span></div>
                                <div class="cdt-tx-stat"><span class="cdt-tx-stat-dot confirmed"></span><span>${confirmedCount} confirmed</span></div>
                                <div class="cdt-tx-stat"><span class="cdt-tx-stat-dot failed"></span><span>${failedCount} failed</span></div>
                                ${inflightDisplay.length ? `<span class="cdt-pill warn">${inflightDisplay.length} inflight</span>` : ''}
                            </div>
                            <div style="display:flex; gap:6px;">
                                <button class="cdt-btn cdt-btn-secondary" id="refresh-selected" ${selectedSignature ? '' : 'disabled'}>
                                    Refresh
                                </button>
                                <button class="cdt-btn cdt-btn-ghost cdt-btn-icon" id="clear-tx" title="Clear history">
                                    ${ICONS.trash}
                                </button>
                            </div>
                        </div>

                        <div class="cdt-tx-split">
                            <div class="cdt-tx-pane">
                                <div class="cdt-tx-section-title">In-flight</div>
                                <div class="cdt-tx-list">
                                    ${
                                        inflightDisplay.length
                                            ? inflightDisplay
                                                  .map(ix => {
                                                      let feePayer = '';
                                                      let cuHint = '';
                                                      try {
                                                          const decoded = decodeWireTransactionBase64(ix.transactionBase64);
                                                          feePayer = decoded.summary.feePayer ? truncateMiddle(decoded.summary.feePayer, 6, 6) : '';
                                                          if (decoded.summary.computeUnitLimit) cuHint = `CU ${decoded.summary.computeUnitLimit.toLocaleString('en-US')}`;
                                                      } catch {}

                                                      return `
                                            <div class="cdt-tx-item" data-kind="inflight" data-id="${ix.id}" data-selected="${selectedInflightId === ix.id}">
                                                <div class="cdt-tx-status pending"></div>
                                                <div class="cdt-tx-info">
                                                    <div class="cdt-tx-sigline">
                                                        <span>${ix.stage}</span>
                                                        ${ix.signature ? `<span class="cdt-pill">${truncateMiddle(ix.signature)}</span>` : ''}
                                                        ${feePayer ? `<span class="cdt-pill info">feePayer ${feePayer}</span>` : ''}
                                                        ${cuHint ? `<span class="cdt-pill">${cuHint}</span>` : ''}
                                                    </div>
                                                    <div class="cdt-tx-meta">
                                                        <span>${formatRelativeTime(ix.timestamp)}</span>
                                                        <span>${formatByteSize(ix.size)}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        `;
                                                  })
                                                  .join('')
                                            : `<div class="cdt-empty">No inflight transactions.</div>`
                                    }
                                </div>

                                <div class="cdt-tx-section-title">History</div>
                                <div class="cdt-tx-list">
                                    ${
                                        transactions.length
                                            ? transactions
                                                  .map(
                                                      tx => `
                                        <div class="cdt-tx-item" data-kind="tx" data-sig="${tx.signature}" data-selected="${selectedSignature === tx.signature}">
                                            <div class="cdt-tx-status ${tx.status}"></div>
                                            <div class="cdt-tx-info">
                                                <div class="cdt-tx-sigline">
                                                    <span>${truncateMiddle(tx.signature)}</span>
                                                    ${tx.method ? `<span class="cdt-pill">${tx.method}</span>` : ''}
                                                </div>
                                                <div class="cdt-tx-meta">
                                                    <span>${formatRelativeTime(tx.timestamp)}</span>
                                                    ${tx.slot ? `<span>slot ${tx.slot}</span>` : ''}
                                                    ${tx.confirmations !== undefined && tx.confirmations !== null ? `<span>${tx.confirmations} conf</span>` : ''}
                                                    ${tx.size ? `<span>${formatByteSize(tx.size)}</span>` : ''}
                                                </div>
                                                ${tx.error ? `<div class="cdt-tx-meta" style="color: var(--cdt-error); font-family: ui-monospace, monospace;">${tx.error}</div>` : ''}
                                            </div>
                                            <div class="cdt-tx-actions">
                                                <button class="cdt-btn cdt-btn-ghost cdt-btn-icon" data-copy="${tx.signature}" title="Copy signature">
                                                    ${ICONS.copy}
                                                </button>
                                                <a class="cdt-btn cdt-btn-ghost cdt-btn-icon" href="${getExplorerUrl(tx.signature, tx.cluster)}" target="_blank" rel="noopener noreferrer" title="View on Explorer">
                                                    ${ICONS.external}
                                                </a>
                                            </div>
                                        </div>
                                    `,
                                                  )
                                                  .join('')
                                            : `<div class="cdt-empty">No transactions yet.</div>`
                                    }
                                </div>
                            </div>

                            <div class="cdt-tx-details">
                                ${
                                    selectedInflight
                                        ? `
                                    <div class="cdt-details-header">
                                        <div class="cdt-details-title">In-flight transaction</div>
                                        <div style="display:flex; gap:6px;">
                                            ${selectedInflight.signature ? `<button class="cdt-btn cdt-btn-secondary" id="copy-inflight-sig">Copy sig</button>` : ''}
                                            ${
                                                selectedInflight.transactionBase64
                                                    ? `<button class="cdt-btn cdt-btn-secondary" id="copy-inflight-bytes">Copy base64</button>`
                                                    : ''
                                            }
                                            ${
                                                selectedInflight.signature
                                                    ? `<a class="cdt-btn cdt-btn-secondary" href="${getExplorerUrl(selectedInflight.signature, selectedTx?.cluster)}" target="_blank" rel="noopener noreferrer">Explorer</a>`
                                                    : ''
                                            }
                                        </div>
                                    </div>
                                    <div class="cdt-kv">
                                        <div class="cdt-k">stage</div><div class="cdt-v">${selectedInflight.stage}</div>
                                        ${selectedInflight.signature ? `<div class="cdt-k">signature</div><div class="cdt-v">${selectedInflight.signature}</div>` : ''}
                                        <div class="cdt-k">timestamp</div><div class="cdt-v">${selectedInflight.timestamp}</div>
                                        <div class="cdt-k">size</div><div class="cdt-v">${selectedInflight.size} bytes</div>
                                        ${
                                            selectedInflightDecoded
                                                ? `
                                        <div class="cdt-k">version</div><div class="cdt-v">${String(selectedInflightDecoded.summary.version)}</div>
                                        <div class="cdt-k">fee payer</div><div class="cdt-v">${selectedInflightDecoded.summary.feePayer ?? 'N/A'}</div>
                                        <div class="cdt-k">required signers</div><div class="cdt-v">${selectedInflightDecoded.summary.requiredSigners}</div>
                                        <div class="cdt-k">instructions</div><div class="cdt-v">${selectedInflightDecoded.summary.instructionCount}</div>
                                        <div class="cdt-k">CU limit</div><div class="cdt-v">${selectedInflightDecoded.summary.computeUnitLimit ?? 'N/A'}</div>
                                        <div class="cdt-k">CU price</div><div class="cdt-v">${selectedInflightDecoded.summary.computeUnitPriceMicroLamports ? `${selectedInflightDecoded.summary.computeUnitPriceMicroLamports.toString()} µ-lamports/CU` : 'N/A'}</div>
                                        `
                                                : `
                                        <div class="cdt-k">decode</div><div class="cdt-v">Failed to decode bytes</div>
                                        `
                                        }
                                    </div>
                                    ${
                                        selectedInflightDecoded
                                            ? `
                                        <div class="cdt-json">${safeJsonStringify(
                                            selectedInflightDecoded.compiledMessage.instructions.map(ix => ({
                                                dataHexPreview: ix.data ? bytesToHexPreview(ix.data, 32) : '',
                                                program: selectedInflightDecoded!.compiledMessage.staticAccounts[ix.programAddressIndex],
                                                programAddressIndex: ix.programAddressIndex,
                                                accounts: ix.accountIndices?.length ?? 0,
                                            })),
                                            2,
                                        )}</div>
                                    `
                                            : ''
                                    }
                                `
                                        : selectedTx
                                            ? `
                                    <div class="cdt-details-header">
                                        <div class="cdt-details-title">Transaction</div>
                                        <div style="display:flex; gap:6px;">
                                            <button class="cdt-btn cdt-btn-secondary" id="copy-selected-sig">Copy sig</button>
                                            ${selectedTx.wireTransactionBase64 ? `<button class="cdt-btn cdt-btn-secondary" id="copy-selected-bytes">Copy base64</button>` : ''}
                                        </div>
                                    </div>
                                    <div class="cdt-kv">
                                        <div class="cdt-k">signature</div><div class="cdt-v">${selectedTx.signature}</div>
                                        <div class="cdt-k">status</div><div class="cdt-v">${selectedTx.status}</div>
                                        <div class="cdt-k">cluster</div><div class="cdt-v">${selectedTx.cluster ?? 'N/A'}</div>
                                        <div class="cdt-k">method</div><div class="cdt-v">${selectedTx.method ?? 'N/A'}</div>
                                        ${selectedTx.size ? `<div class="cdt-k">size</div><div class="cdt-v">${selectedTx.size} bytes</div>` : ''}
                                        ${selectedTxDecoded ? `<div class="cdt-k">fee payer</div><div class="cdt-v">${selectedTxDecoded.summary.feePayer ?? 'N/A'}</div>` : ''}
                                    </div>

                                    ${
                                        selectedDetails?.error
                                            ? `<div class="cdt-json" style="border-color: color-mix(in srgb, var(--cdt-error) 40%, var(--cdt-border)); color: var(--cdt-error);">${selectedDetails.error}</div>`
                                            : ''
                                    }

                                    ${
                                        selectedDetails?.isLoading
                                            ? `<div class="cdt-empty">Loading RPC details…</div>`
                                            : selectedDetails
                                                ? `
                                            <div class="cdt-kv">
                                                <div class="cdt-k">slot</div><div class="cdt-v">${selectedDetails.status?.slot ?? 'N/A'}</div>
                                                <div class="cdt-k">confirmations</div><div class="cdt-v">${selectedDetails.status?.confirmations ?? 'N/A'}</div>
                                                <div class="cdt-k">rpc err</div><div class="cdt-v">${selectedDetails.status?.err ? safeJsonStringify(selectedDetails.status.err, 0) : 'null'}</div>
                                            </div>
                                            <div class="cdt-json">${safeJsonStringify(selectedDetails.tx, 2)}</div>
                                        `
                                                : `<div class="cdt-empty">Select a transaction to view details.</div>`
                                    }
                                `
                                            : `<div class="cdt-empty">Select an inflight or sent transaction.</div>`
                                }
                            </div>
                        </div>
                    </div>
                `;

                // Wire up handlers
                const clearBtn = el.querySelector<HTMLButtonElement>('#clear-tx');
                clearBtn?.addEventListener('click', () => {
                    selectedSignature = null;
                    selectedInflightId = null;
                    detailsBySignature.clear();
                    ctx.clearCache?.('transactions');
                    ctx.client.clearTransactionHistory();
                    renderContent();
                });

                const refreshBtn = el.querySelector<HTMLButtonElement>('#refresh-selected');
                refreshBtn?.addEventListener('click', () => {
                    if (selectedSignature) fetchDetails(selectedSignature, ctx, renderContent);
                });

                el.querySelectorAll<HTMLElement>('.cdt-tx-item[data-kind="tx"]').forEach(item => {
                    item.addEventListener('click', () => {
                        const sig = item.getAttribute('data-sig');
                        if (!sig) return;
                        selectedSignature = sig;
                        selectedInflightId = null;
                        fetchDetails(sig, ctx, renderContent);
                        renderContent();
                    });
                });

                el.querySelectorAll<HTMLElement>('.cdt-tx-item[data-kind="inflight"]').forEach(item => {
                    item.addEventListener('click', () => {
                        const id = item.getAttribute('data-id');
                        if (!id) return;
                        selectedInflightId = id;
                        selectedSignature = null;
                        renderContent();
                    });
                });

                el.querySelectorAll<HTMLElement>('[data-copy]').forEach(btn => {
                    btn.addEventListener('click', e => {
                        e.preventDefault();
                        e.stopPropagation();
                        const sig = btn.getAttribute('data-copy');
                        if (sig) copyToClipboard(sig);
                    });
                });

                const copySelectedSigBtn = el.querySelector<HTMLButtonElement>('#copy-selected-sig');
                copySelectedSigBtn?.addEventListener('click', () => {
                    if (selectedTx) copyToClipboard(selectedTx.signature);
                });

                const copySelectedBytesBtn = el.querySelector<HTMLButtonElement>('#copy-selected-bytes');
                copySelectedBytesBtn?.addEventListener('click', () => {
                    if (selectedTx?.wireTransactionBase64) copyToClipboard(selectedTx.wireTransactionBase64);
                });

                const copyInflightBytesBtn = el.querySelector<HTMLButtonElement>('#copy-inflight-bytes');
                copyInflightBytesBtn?.addEventListener('click', () => {
                    if (selectedInflight?.transactionBase64) copyToClipboard(selectedInflight.transactionBase64);
                });

                const copyInflightSigBtn = el.querySelector<HTMLButtonElement>('#copy-inflight-sig');
                copyInflightSigBtn?.addEventListener('click', () => {
                    if (selectedInflight?.signature) copyToClipboard(selectedInflight.signature);
                });
            }

            // Subscribe to cache updates from the core so inflight txs update live.
            unsubscribeCache = ctx.subscribeCache?.(() => {
                renderContent();
            });

            // Initial render
            renderContent();

            // Poll selected pending transaction status.
            stopPolling();
            pollInterval = window.setInterval(() => {
                if (!selectedSignature) return;
                const tx = mergeTransactions(ctx).find(t => t.signature === selectedSignature);
                if (!tx || tx.status !== 'pending') return;
                fetchDetails(selectedSignature, ctx, renderContent);
            }, 5000);
        },

        destroy() {
            unsubscribeCache?.();
            unsubscribeCache = undefined;
            stopPolling();
        },
    };
}
