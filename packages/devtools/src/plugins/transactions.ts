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

    function escapeHtml(text: string): string {
        return text
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    function toBigIntOrNull(value: unknown): bigint | null {
        if (value === null || value === undefined) return null;
        if (typeof value === 'bigint') return value;
        if (typeof value === 'number') {
            if (!Number.isFinite(value)) return null;
            return BigInt(Math.trunc(value));
        }
        if (typeof value === 'string') {
            if (value.trim() === '') return null;
            try {
                return BigInt(value);
            } catch {
                return null;
            }
        }
        return null;
    }

    function formatIntegerLike(value: unknown): string {
        const big = toBigIntOrNull(value);
        if (big !== null) return big.toString();
        if (typeof value === 'string') return value;
        if (typeof value === 'number') return Number.isFinite(value) ? String(value) : 'N/A';
        if (value === null) return 'null';
        if (value === undefined) return 'N/A';
        return safeJsonStringify(value, 0);
    }

    const LAMPORTS_PER_SOL = 1_000_000_000n;

    function formatSolFromLamports(lamports: bigint): string {
        const sign = lamports < 0n ? '-' : '';
        const abs = lamports < 0n ? -lamports : lamports;
        const whole = abs / LAMPORTS_PER_SOL;
        const frac = abs % LAMPORTS_PER_SOL;

        const fracStr = frac.toString().padStart(9, '0').replace(/0+$/, '');
        return fracStr ? `${sign}${whole.toString()}.${fracStr}` : `${sign}${whole.toString()}`;
    }

    function formatBlockTime(blockTime: unknown): string {
        const seconds = toBigIntOrNull(blockTime);
        if (seconds === null) return 'N/A';
        const ms = Number(seconds) * 1000;
        if (!Number.isFinite(ms)) return seconds.toString();
        return new Date(ms).toLocaleString('en-US', { hour12: false });
    }

    function getAccountPubkey(accountKey: unknown): string {
        if (!accountKey) return '';
        if (typeof accountKey === 'string') return accountKey;
        if (typeof accountKey === 'object' && 'pubkey' in accountKey) return String((accountKey as any).pubkey);
        return safeJsonStringify(accountKey, 0);
    }

    function renderKeyValueRows(rows: Array<{ key: string; value: string }>, className = 'cdt-kv'): string {
        return `
            <div class="${className}">
                ${rows
                    .map(
                        row => `
                            <div class="cdt-k">${escapeHtml(row.key)}</div>
                            <div class="cdt-v">${escapeHtml(row.value)}</div>
                        `,
                    )
                    .join('')}
            </div>
        `;
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
                const clusterId = ctx.client.getCluster()?.id;
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

                function renderSentTransactionDetailsPanel(): string {
                    if (!selectedTx) return '';

                    const explorerUrl = getExplorerUrl(selectedTx.signature, selectedTx.cluster ?? clusterId);
                    const rpcTx = selectedDetails?.tx as any;
                    const rpcMeta = rpcTx && typeof rpcTx === 'object' ? (rpcTx as any).meta : undefined;
                    const rpcTransaction = rpcTx && typeof rpcTx === 'object' ? (rpcTx as any).transaction : undefined;
                    const rpcMessage = rpcTransaction && typeof rpcTransaction === 'object' ? (rpcTransaction as any).message : undefined;

                    const rpcInstructions = Array.isArray(rpcMessage?.instructions) ? (rpcMessage.instructions as any[]) : [];
                    const rpcAccountKeys = Array.isArray(rpcMessage?.accountKeys) ? (rpcMessage.accountKeys as any[]) : [];
                    const rpcLogs = Array.isArray(rpcMeta?.logMessages) ? (rpcMeta.logMessages as string[]) : [];

                    const feeLamports = toBigIntOrNull(rpcMeta?.fee);
                    const computeUnitsConsumed = toBigIntOrNull(rpcMeta?.computeUnitsConsumed);

                    const summaryRows: Array<{ key: string; value: string }> = [
                        { key: 'signature', value: selectedTx.signature },
                        { key: 'status', value: selectedTx.status },
                        { key: 'cluster', value: selectedTx.cluster ?? 'N/A' },
                        { key: 'method', value: selectedTx.method ?? 'N/A' },
                        { key: 'slot', value: formatIntegerLike(rpcTx?.slot) },
                        { key: 'block time', value: formatBlockTime(rpcTx?.blockTime) },
                        { key: 'version', value: formatIntegerLike(rpcTx?.version) },
                        ...(selectedTxDecoded?.summary.feePayer
                            ? [{ key: 'fee payer (wire)', value: selectedTxDecoded.summary.feePayer }]
                            : []),
                        ...(feeLamports !== null
                            ? [
                                  {
                                      key: 'fee',
                                      value: `${feeLamports.toString()} lamports (${formatSolFromLamports(feeLamports)} SOL)`,
                                  },
                              ]
                            : []),
                        ...(computeUnitsConsumed !== null
                            ? [{ key: 'compute units', value: computeUnitsConsumed.toString() }]
                            : []),
                        ...(selectedDetails?.status?.confirmations !== null &&
                        selectedDetails?.status?.confirmations !== undefined
                            ? [{ key: 'confirmations', value: String(selectedDetails.status.confirmations) }]
                            : []),
                        ...(selectedDetails?.status?.confirmationStatus
                            ? [{ key: 'confirmation status', value: String(selectedDetails.status.confirmationStatus) }]
                            : []),
                    ];

                    const instructionsHtml = rpcInstructions.length
                        ? rpcInstructions
                              .map((ix, idx) => {
                                  const program = typeof ix.program === 'string' ? ix.program : '';
                                  const programId = typeof ix.programId === 'string' ? ix.programId : '';
                                  const parsedType = typeof ix.parsed?.type === 'string' ? ix.parsed.type : '';
                                  const stackHeight =
                                      ix.stackHeight !== null && ix.stackHeight !== undefined
                                          ? String(ix.stackHeight)
                                          : '';

                                  const titlePieces = [
                                      `#${idx}`,
                                      program ? program : programId ? truncateMiddle(programId, 6, 6) : 'unknown',
                                      parsedType ? `:${parsedType}` : '',
                                  ].filter(Boolean);

                                  const info = ix.parsed?.info;
                                  const infoEntries =
                                      info && typeof info === 'object' && !Array.isArray(info)
                                          ? Object.entries(info as Record<string, unknown>)
                                          : [];

                                  const infoRows = infoEntries.map(([k, v]) => ({
                                      key: k,
                                      value:
                                          typeof v === 'string'
                                              ? v
                                              : typeof v === 'number'
                                                  ? String(v)
                                                  : typeof v === 'bigint'
                                                      ? v.toString()
                                                      : safeJsonStringify(v, 0),
                                  }));

                                  const headerRows: Array<{ key: string; value: string }> = [
                                      ...(programId ? [{ key: 'program id', value: programId }] : []),
                                      ...(stackHeight ? [{ key: 'stack height', value: stackHeight }] : []),
                                  ];

                                  return `
                                      <div class="cdt-card">
                                          <div class="cdt-card-title">${escapeHtml(titlePieces.join(' '))}</div>
                                          ${
                                              headerRows.length
                                                  ? renderKeyValueRows(headerRows, 'cdt-kv cdt-kv-compact')
                                                  : ''
                                          }
                                          ${
                                              infoRows.length
                                                  ? renderKeyValueRows(infoRows, 'cdt-kv cdt-kv-compact')
                                                  : `<div class="cdt-empty" style="padding: 8px 0;">No parsed info</div>`
                                          }
                                      </div>
                                  `;
                              })
                              .join('')
                        : `<div class="cdt-empty">No instructions.</div>`;

                    const accountsHtml = rpcAccountKeys.length
                        ? rpcAccountKeys
                              .map((ak, idx) => {
                                  const pubkey = getAccountPubkey(ak);
                                  const signer = Boolean((ak as any)?.signer);
                                  const writable = Boolean((ak as any)?.writable);
                                  const source = (ak as any)?.source ? String((ak as any).source) : '';

                                  const badges = [
                                      signer ? `<span class="cdt-pill info">signer</span>` : '',
                                      writable
                                          ? `<span class="cdt-pill warn">writable</span>`
                                          : `<span class="cdt-pill">readonly</span>`,
                                      source ? `<span class="cdt-pill">${escapeHtml(source)}</span>` : '',
                                  ].filter(Boolean);

                                  return `
                                      <div class="cdt-account-row">
                                          <div class="cdt-account-idx">#${idx}</div>
                                          <div class="cdt-account-key">${escapeHtml(pubkey)}</div>
                                          <div class="cdt-account-badges">${badges.join(' ')}</div>
                                      </div>
                                  `;
                              })
                              .join('')
                        : `<div class="cdt-empty">No accounts.</div>`;

                    const balancesHtml = (() => {
                        const pre = Array.isArray(rpcMeta?.preBalances) ? (rpcMeta.preBalances as unknown[]) : [];
                        const post = Array.isArray(rpcMeta?.postBalances) ? (rpcMeta.postBalances as unknown[]) : [];
                        const len = Math.max(pre.length, post.length, rpcAccountKeys.length);

                        const rows: string[] = [];
                        for (let i = 0; i < len; i++) {
                            const preLamports = toBigIntOrNull(pre[i]);
                            const postLamports = toBigIntOrNull(post[i]);
                            if (preLamports === null || postLamports === null) continue;

                            const delta = postLamports - preLamports;
                            if (delta === 0n) continue;

                            const pubkey = getAccountPubkey(rpcAccountKeys[i]);
                            const deltaStr = `${delta.toString()} lamports (${formatSolFromLamports(delta)} SOL)`;
                            const postStr = `${postLamports.toString()} lamports (${formatSolFromLamports(postLamports)} SOL)`;

                            rows.push(`
                                <div class="cdt-balance-row">
                                    <div class="cdt-balance-key">${escapeHtml(pubkey)}</div>
                                    <div class="cdt-balance-delta ${delta < 0n ? 'neg' : 'pos'}">${escapeHtml(deltaStr)}</div>
                                    <div class="cdt-balance-post">${escapeHtml(postStr)}</div>
                                </div>
                            `);
                        }

                        if (rows.length === 0) return `<div class="cdt-empty">No non-zero SOL balance changes.</div>`;
                        return `<div class="cdt-balance-list">${rows.join('')}</div>`;
                    })();

                    const logsHtml = rpcLogs.length
                        ? `
                            <div class="cdt-logs">
                                ${rpcLogs
                                    .map(
                                        (line, i) => `
                                            <div class="cdt-log-line">
                                                <div class="cdt-log-num">${i + 1}</div>
                                                <div class="cdt-log-text">${escapeHtml(line)}</div>
                                            </div>
                                        `,
                                    )
                                    .join('')}
                            </div>
                        `
                        : `<div class="cdt-empty">No logs.</div>`;

                    const rawJson = selectedDetails?.tx ? escapeHtml(safeJsonStringify(selectedDetails.tx, 2)) : 'null';

                    return `
                        <div class="cdt-details-header">
                            <div class="cdt-details-title">Transaction</div>
                            <div style="display:flex; gap:6px; flex-wrap: wrap; justify-content: flex-end;">
                                ${selectedTx.wireTransactionBase64 ? `<button class="cdt-btn cdt-btn-secondary" id="copy-selected-bytes">Copy base64</button>` : ''}
                            </div>
                        </div>

                        ${
                            selectedDetails?.error
                                ? `<div class="cdt-json" style="border-color: color-mix(in srgb, var(--cdt-error) 40%, var(--cdt-border)); color: var(--cdt-error);">${escapeHtml(selectedDetails.error)}</div>`
                                : ''
                        }

                        ${selectedDetails?.isLoading ? `<div class="cdt-empty">Loading RPC details…</div>` : ''}

                        <div class="cdt-card">
                            <div class="cdt-card-title">Summary</div>
                            ${renderKeyValueRows(summaryRows)}
                        </div>

                        <details class="cdt-details-section" open>
                            <summary><span class="cdt-chevron">${ICONS.chevronDown}</span>Instructions (${rpcInstructions.length})</summary>
                            <div class="cdt-details-section-content">
                                ${instructionsHtml}
                            </div>
                        </details>

                        <details class="cdt-details-section" open>
                            <summary><span class="cdt-chevron">${ICONS.chevronDown}</span>Accounts (${rpcAccountKeys.length})</summary>
                            <div class="cdt-details-section-content">
                                ${accountsHtml}
                            </div>
                        </details>

                        <details class="cdt-details-section" open>
                            <summary><span class="cdt-chevron">${ICONS.chevronDown}</span>Balance changes (SOL)</summary>
                            <div class="cdt-details-section-content">
                                ${balancesHtml}
                            </div>
                        </details>

                        <details class="cdt-details-section" open>
                            <summary><span class="cdt-chevron">${ICONS.chevronDown}</span>Logs (${rpcLogs.length})</summary>
                            <div class="cdt-details-section-content">
                                ${logsHtml}
                            </div>
                        </details>

                        <details class="cdt-details-section">
                            <summary><span class="cdt-chevron">${ICONS.chevronDown}</span>Raw JSON</summary>
                            <div class="cdt-details-section-content">
                                <button class="cdt-copy-json-btn" data-copy-json>
                                    <span class="cdt-copy-icon">${ICONS.copy}</span>
                                    Copy JSON
                                </button>
                                <pre class="cdt-json">${rawJson}</pre>
                            </div>
                        </details>
                    `;
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
                            @keyframes cdt-spin { to { transform: rotate(360deg); } }

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

                            .cdt-card {
                                margin-top: 10px;
                                border: 1px solid var(--cdt-border);
                                border-radius: 12px;
                                background: var(--cdt-bg-panel);
                                padding: 10px 12px;
                            }

                            .cdt-card-title {
                                font-size: 12px;
                                font-weight: 700;
                                color: var(--cdt-text);
                                margin-bottom: 8px;
                            }

                            .cdt-kv-compact {
                                margin-top: 6px;
                                grid-template-columns: 120px 1fr;
                                font-size: 11px;
                            }

                            .cdt-details-section {
                                margin-top: 10px;
                                border: 1px solid var(--cdt-border);
                                border-radius: 12px;
                                background: var(--cdt-bg-panel);
                                overflow: hidden;
                            }

                            .cdt-details-section summary {
                                cursor: pointer;
                                padding: 10px 12px;
                                font-size: 12px;
                                font-weight: 700;
                                color: var(--cdt-text);
                                list-style: none;
                                background: var(--cdt-bg-panel);
                                display: flex;
                                align-items: center;
                                gap: 6px;
                            }

                            .cdt-details-section summary::-webkit-details-marker {
                                display: none;
                            }

                            .cdt-chevron {
                                display: inline-flex;
                                width: 14px;
                                height: 14px;
                                transition: transform 0.15s ease;
                                transform: rotate(-90deg);
                                flex-shrink: 0;
                            }

                            .cdt-chevron svg {
                                width: 100%;
                                height: 100%;
                            }

                            .cdt-details-section[open] .cdt-chevron {
                                transform: rotate(0deg);
                            }

                            .cdt-details-section[open] summary {
                                border-bottom: 1px solid var(--cdt-border);
                            }

                            .cdt-copy-json-btn {
                                display: inline-flex;
                                align-items: center;
                                gap: 6px;
                                margin-bottom: 10px;
                                padding: 6px 12px;
                                font-size: 11px;
                                font-weight: 500;
                                color: var(--cdt-text-muted);
                                background: var(--cdt-bg);
                                border: 1px solid var(--cdt-border);
                                border-radius: 6px;
                                cursor: pointer;
                                transition: all 0.15s ease;
                            }

                            .cdt-copy-json-btn:hover {
                                color: var(--cdt-text);
                                border-color: var(--cdt-primary);
                                background: color-mix(in srgb, var(--cdt-primary) 10%, var(--cdt-bg));
                            }

                            .cdt-copy-icon {
                                display: inline-flex;
                                width: 12px;
                                height: 12px;
                            }

                            .cdt-copy-icon svg {
                                width: 100%;
                                height: 100%;
                            }

                            .cdt-details-section-content {
                                padding: 10px 12px;
                            }

                            .cdt-account-row {
                                display: grid;
                                grid-template-columns: 44px 1fr auto;
                                gap: 10px;
                                padding: 8px 0;
                                border-bottom: 1px solid var(--cdt-border);
                                align-items: center;
                            }

                            .cdt-account-row:last-child {
                                border-bottom: none;
                            }

                            .cdt-account-idx {
                                font-size: 11px;
                                color: var(--cdt-text-muted);
                                font-family: ui-monospace, monospace;
                            }

                            .cdt-account-key {
                                font-size: 12px;
                                color: var(--cdt-text);
                                font-family: ui-monospace, monospace;
                                word-break: break-all;
                            }

                            .cdt-account-badges {
                                display: flex;
                                gap: 6px;
                                flex-wrap: wrap;
                                justify-content: flex-end;
                            }

                            .cdt-balance-list {
                                display: flex;
                                flex-direction: column;
                                gap: 8px;
                            }

                            .cdt-balance-row {
                                display: grid;
                                grid-template-columns: 1fr;
                                gap: 6px;
                                padding: 10px;
                                border: 1px solid var(--cdt-border);
                                border-radius: 10px;
                                background: var(--cdt-bg);
                            }

                            .cdt-balance-key {
                                font-family: ui-monospace, monospace;
                                font-size: 12px;
                                color: var(--cdt-text);
                                word-break: break-all;
                            }

                            .cdt-balance-delta {
                                font-family: ui-monospace, monospace;
                                font-size: 11px;
                            }

                            .cdt-balance-delta.pos { color: var(--cdt-success); }
                            .cdt-balance-delta.neg { color: var(--cdt-error); }

                            .cdt-balance-post {
                                font-family: ui-monospace, monospace;
                                font-size: 11px;
                                color: var(--cdt-text-muted);
                            }

                            .cdt-logs {
                                display: flex;
                                flex-direction: column;
                                gap: 6px;
                            }

                            .cdt-log-line {
                                display: grid;
                                grid-template-columns: 32px 1fr;
                                gap: 10px;
                                align-items: start;
                            }

                            .cdt-log-num {
                                text-align: right;
                                color: var(--cdt-text-muted);
                                font-size: 11px;
                                font-family: ui-monospace, monospace;
                            }

                            .cdt-log-text {
                                font-family: ui-monospace, monospace;
                                font-size: 11px;
                                color: var(--cdt-text);
                                white-space: pre-wrap;
                                word-break: break-word;
                            }

                            .cdt-empty {
                                padding: 18px;
                                color: var(--cdt-text-muted);
                                font-size: 12px;
                            }

                            .cdt-loading {
                                display: flex;
                                align-items: center;
                                gap: 10px;
                            }

                            .cdt-spinner {
                                width: 18px;
                                height: 18px;
                                animation: cdt-spin 0.8s linear infinite;
                                color: var(--cdt-text-muted);
                                flex: none;
                            }

                            .cdt-spinner-track { opacity: 0.25; }
                            .cdt-spinner-head { opacity: 0.75; }
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
                                            <div class="cdt-tx-actions" style="display:flex; gap:4px;">
                                                <button class="cdt-btn cdt-btn-ghost cdt-btn-icon" data-copy-sig="${tx.signature}" title="Copy signature">
                                                    ${ICONS.copy}
                                                </button>
                                                <a class="cdt-btn cdt-btn-ghost cdt-btn-icon" href="${getExplorerUrl(tx.signature, tx.cluster)}" target="_blank" rel="noopener noreferrer" title="View on Solana Explorer">
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
                                            ${
                                                selectedInflight.transactionBase64
                                                    ? `<button class="cdt-btn cdt-btn-secondary" id="copy-inflight-bytes">Copy base64</button>`
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
                                            ? renderSentTransactionDetailsPanel()
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

                // Copy signature buttons in list rows
                el.querySelectorAll<HTMLButtonElement>('[data-copy-sig]').forEach(btn => {
                    btn.addEventListener('click', (e) => {
                        e.stopPropagation(); // Prevent row selection
                        const sig = btn.getAttribute('data-copy-sig');
                        if (sig) copyToClipboard(sig);
                    });
                });

                const copySelectedBytesBtn = el.querySelector<HTMLButtonElement>('#copy-selected-bytes');
                copySelectedBytesBtn?.addEventListener('click', () => {
                    if (selectedTx?.wireTransactionBase64) copyToClipboard(selectedTx.wireTransactionBase64);
                });

                const copyInflightBytesBtn = el.querySelector<HTMLButtonElement>('#copy-inflight-bytes');
                copyInflightBytesBtn?.addEventListener('click', () => {
                    if (selectedInflight?.transactionBase64) copyToClipboard(selectedInflight.transactionBase64);
                });

                // Copy JSON button in Raw JSON section
                const copyJsonBtn = el.querySelector<HTMLButtonElement>('[data-copy-json]');
                copyJsonBtn?.addEventListener('click', () => {
                    if (selectedSignature) {
                        const details = detailsBySignature.get(selectedSignature);
                        if (details?.tx) {
                            copyToClipboard(safeJsonStringify(details.tx, 2));
                        }
                    }
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
