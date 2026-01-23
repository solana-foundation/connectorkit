/**
 * Transactions Plugin
 *
 * Displays:
 * - In-flight transactions (preparing/signing)
 * - Transaction history (connector + persisted devtools cache)
 * - Transaction details (wire decode + RPC fetch)
 */

import type { ConnectorDevtoolsPlugin, PluginContext } from '../types';
import { ICONS } from '../components/icons';

import { bytesToHexPreview, formatByteSize } from '../utils/tx-bytes';
import { decodeWireTransactionBase64 } from '../utils/tx-decode';
import { copyToClipboard, escapeHtml, getExplorerUrl, truncateMiddle } from '../utils/dom';
import { createTransactionDetailsState, fetchTransactionDetails, mergeTransactions } from './transactions/details';
import { formatRelativeTime, safeJsonStringify } from './transactions/format';
import { renderSentTransactionDetailsPanel } from './transactions/render-sent-details';

export function createTransactionsPlugin(_maxTransactions = 50): ConnectorDevtoolsPlugin {
    let unsubscribeCache: (() => void) | undefined;
    let pollInterval: number | undefined;

    let selectedSignature: string | null = null;
    let selectedInflightId: string | null = null;
    const detailsState = createTransactionDetailsState();

    function stopPolling() {
        if (pollInterval !== undefined) window.clearInterval(pollInterval);
        pollInterval = undefined;
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

                const selectedDetails = selectedSignature
                    ? detailsState.detailsBySignature.get(selectedSignature)
                    : undefined;

                const selectedInflight = selectedInflightId
                    ? (inflight.find(ix => ix.id === selectedInflightId) ?? null)
                    : null;

                let selectedInflightDecoded: ReturnType<typeof decodeWireTransactionBase64> | null = null;

                if (selectedInflight?.transactionBase64) {
                    try {
                        selectedInflightDecoded = decodeWireTransactionBase64(selectedInflight.transactionBase64);
                    } catch {
                        selectedInflightDecoded = null;
                    }
                }

                const selectedTx = selectedSignature
                    ? (transactions.find(t => t.signature === selectedSignature) ?? null)
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
                                <button class="cdt-btn cdt-btn-ghost cdt-btn-icon" id="refresh-selected" ${selectedSignature ? '' : 'disabled'} title="Refresh selected transaction">
                                    ${ICONS.refresh}
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
                                                          const decoded = decodeWireTransactionBase64(
                                                              ix.transactionBase64,
                                                          );
                                                          feePayer = decoded.summary.feePayer
                                                              ? truncateMiddle(decoded.summary.feePayer, 6, 6)
                                                              : '';
                                                          if (decoded.summary.computeUnitLimit)
                                                              cuHint = `CU ${decoded.summary.computeUnitLimit.toLocaleString('en-US')}`;
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
                                                program:
                                                    selectedInflightDecoded!.compiledMessage.staticAccounts[
                                                        ix.programAddressIndex
                                                    ],
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
                                          ? renderSentTransactionDetailsPanel({
                                                selectedTx,
                                                selectedTxDecoded,
                                                selectedDetails,
                                            })
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
                    detailsState.detailsRequestId += 1;
                    detailsState.detailsBySignature.clear();
                    ctx.clearCache?.('transactions');
                    ctx.client.clearTransactionHistory();
                    renderContent();
                });

                const refreshBtn = el.querySelector<HTMLButtonElement>('#refresh-selected');
                refreshBtn?.addEventListener('click', () => {
                    if (selectedSignature) fetchTransactionDetails(selectedSignature, ctx, detailsState, renderContent);
                });

                el.querySelectorAll<HTMLElement>('.cdt-tx-item[data-kind="tx"]').forEach(item => {
                    item.addEventListener('click', () => {
                        const sig = item.getAttribute('data-sig');
                        if (!sig) return;
                        selectedSignature = sig;
                        selectedInflightId = null;
                        fetchTransactionDetails(sig, ctx, detailsState, renderContent);
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
                    btn.addEventListener('click', e => {
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
                        const details = detailsState.detailsBySignature.get(selectedSignature);
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
                fetchTransactionDetails(selectedSignature, ctx, detailsState, renderContent);
            }, 5000);
        },

        destroy() {
            unsubscribeCache?.();
            unsubscribeCache = undefined;
            stopPolling();
        },
    };
}
