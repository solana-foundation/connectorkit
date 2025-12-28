/**
 * Transactions Plugin
 *
 * Displays:
 * - Transaction history from the connector
 * - Automatic tracking of transaction:sent events
 * - Transaction details and explorer links
 */

import type { ConnectorDevtoolsPlugin, PluginContext } from '../types';
import { ICONS } from '../components/icons';

interface TrackedTransaction {
    signature: string;
    timestamp: string;
    status: 'pending' | 'confirmed' | 'failed';
    method?: string;
    cluster?: string;
    error?: string;
    slot?: number;
    confirmations?: number | null;
}

export function createTransactionsPlugin(_maxTransactions = 50): ConnectorDevtoolsPlugin {
    let transactions: TrackedTransaction[] = [];
    let unsubscribeEvents: (() => void) | undefined;
    let unsubscribeState: (() => void) | undefined;
    let renderFn: (() => void) | undefined;

    return {
        id: 'transactions',
        name: 'Transactions',
        icon: ICONS.transactions,

        render(el: HTMLElement, ctx: PluginContext) {
            const { client } = ctx;
            const maxTransactions = ctx.getConfig().maxTransactions;

            // Get explorer URL for a signature
            const getExplorerUrl = (signature: string, cluster?: string) => {
                const baseUrl = 'https://explorer.solana.com';
                let clusterParam = '';
                if (cluster?.includes('devnet')) clusterParam = '?cluster=devnet';
                else if (cluster?.includes('testnet')) clusterParam = '?cluster=testnet';
                return `${baseUrl}/tx/${signature}${clusterParam}`;
            };

            // Format timestamp
            const formatTime = (timestamp: string) => {
                const date = new Date(timestamp);
                return date.toLocaleTimeString('en-US', {
                    hour12: false,
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit',
                });
            };

            // Format relative time
            const formatRelativeTime = (timestamp: string) => {
                const now = Date.now();
                const then = new Date(timestamp).getTime();
                const diff = now - then;

                if (diff < 1000) return 'just now';
                if (diff < 60000) return `${Math.floor(diff / 1000)}s ago`;
                if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
                return formatTime(timestamp);
            };

            // Truncate signature
            const truncateSignature = (sig: string) => {
                return `${sig.slice(0, 8)}...${sig.slice(-8)}`;
            };

            // Copy to clipboard
            const copyToClipboard = async (text: string) => {
                try {
                    await navigator.clipboard.writeText(text);
                } catch {
                    // Fallback for older browsers
                    const textarea = document.createElement('textarea');
                    textarea.value = text;
                    document.body.appendChild(textarea);
                    textarea.select();
                    document.execCommand('copy');
                    document.body.removeChild(textarea);
                }
            };

            // Render content
            function renderContent() {
                const debugState = client.getDebugState();

                // Merge tracked transactions with connector's transaction history
                const connectorTxs = debugState.transactions || [];
                connectorTxs.forEach(tx => {
                    const exists = transactions.find(t => t.signature === tx.signature);
                    if (!exists) {
                        transactions.push({
                            signature: tx.signature,
                            timestamp: tx.timestamp,
                            status: tx.status,
                            method: tx.method,
                            cluster: tx.cluster,
                            error: tx.error,
                        });
                    } else {
                        // Update existing transaction
                        exists.status = tx.status;
                        exists.error = tx.error;
                    }
                });

                // Sort by timestamp (newest first)
                transactions.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

                // Limit to max
                if (transactions.length > maxTransactions) {
                    transactions = transactions.slice(0, maxTransactions);
                }

                const pendingCount = transactions.filter(t => t.status === 'pending').length;
                const confirmedCount = transactions.filter(t => t.status === 'confirmed').length;
                const failedCount = transactions.filter(t => t.status === 'failed').length;

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
                            }

                            .cdt-tx-stats {
                                display: flex;
                                gap: 12px;
                                font-size: 11px;
                            }

                            .cdt-tx-stat {
                                display: flex;
                                align-items: center;
                                gap: 4px;
                            }

                            .cdt-tx-stat-dot {
                                width: 8px;
                                height: 8px;
                                border-radius: 50%;
                            }

                            .cdt-tx-stat-dot.pending {
                                background: var(--cdt-warning);
                                animation: pulse 1.5s ease-in-out infinite;
                            }

                            .cdt-tx-stat-dot.confirmed {
                                background: var(--cdt-success);
                            }

                            .cdt-tx-stat-dot.failed {
                                background: var(--cdt-error);
                            }

                            @keyframes pulse {
                                0%, 100% { opacity: 1; }
                                50% { opacity: 0.5; }
                            }

                            .cdt-tx-list {
                                flex: 1;
                                overflow-y: auto;
                            }

                            .cdt-tx-item {
                                display: flex;
                                align-items: center;
                                padding: 12px;
                                border-bottom: 1px solid var(--cdt-border);
                                gap: 12px;
                                transition: background 0.1s;
                            }

                            .cdt-tx-item:hover {
                                background: var(--cdt-bg-hover);
                            }

                            .cdt-tx-status {
                                width: 10px;
                                height: 10px;
                                border-radius: 50%;
                                flex-shrink: 0;
                            }

                            .cdt-tx-status.pending {
                                background: var(--cdt-warning);
                                animation: pulse 1.5s ease-in-out infinite;
                            }

                            .cdt-tx-status.confirmed {
                                background: var(--cdt-success);
                            }

                            .cdt-tx-status.failed {
                                background: var(--cdt-error);
                            }

                            .cdt-tx-info {
                                flex: 1;
                                min-width: 0;
                            }

                            .cdt-tx-signature {
                                display: flex;
                                align-items: center;
                                gap: 8px;
                                font-family: ui-monospace, monospace;
                                font-size: 13px;
                                color: var(--cdt-text);
                            }

                            .cdt-tx-meta {
                                display: flex;
                                gap: 12px;
                                margin-top: 4px;
                                font-size: 11px;
                                color: var(--cdt-text-muted);
                            }

                            .cdt-tx-error {
                                margin-top: 4px;
                                font-size: 11px;
                                color: var(--cdt-error);
                                font-family: ui-monospace, monospace;
                            }

                            .cdt-tx-actions {
                                display: flex;
                                gap: 4px;
                                flex-shrink: 0;
                            }

                            .cdt-tx-empty {
                                display: flex;
                                flex-direction: column;
                                align-items: center;
                                justify-content: center;
                                height: 100%;
                                color: var(--cdt-text-dim);
                                gap: 8px;
                            }

                            .cdt-tx-empty svg {
                                width: 32px;
                                height: 32px;
                                opacity: 0.5;
                            }

                            .cdt-tx-method {
                                padding: 2px 6px;
                                background: var(--cdt-bg-hover);
                                border-radius: 4px;
                                font-size: 10px;
                                text-transform: uppercase;
                            }
                        </style>

                        <div class="cdt-tx-toolbar">
                            <div class="cdt-tx-stats">
                                <div class="cdt-tx-stat">
                                    <span class="cdt-tx-stat-dot pending"></span>
                                    <span>${pendingCount} pending</span>
                                </div>
                                <div class="cdt-tx-stat">
                                    <span class="cdt-tx-stat-dot confirmed"></span>
                                    <span>${confirmedCount} confirmed</span>
                                </div>
                                <div class="cdt-tx-stat">
                                    <span class="cdt-tx-stat-dot failed"></span>
                                    <span>${failedCount} failed</span>
                                </div>
                            </div>
                            <div>
                                <button class="cdt-btn cdt-btn-ghost cdt-btn-icon" id="clear-tx" title="Clear history">
                                    ${ICONS.trash}
                                </button>
                            </div>
                        </div>

                        <div class="cdt-tx-list">
                            ${
                                transactions.length === 0
                                    ? `
                                <div class="cdt-tx-empty">
                                    ${ICONS.transactions}
                                    <span>No transactions yet</span>
                                    <span style="font-size: 11px">Transactions will appear when sent</span>
                                </div>
                            `
                                    : transactions
                                          .map(
                                              tx => `
                                <div class="cdt-tx-item">
                                    <div class="cdt-tx-status ${tx.status}"></div>
                                    <div class="cdt-tx-info">
                                        <div class="cdt-tx-signature">
                                            <span>${truncateSignature(tx.signature)}</span>
                                            ${tx.method ? `<span class="cdt-tx-method">${tx.method}</span>` : ''}
                                        </div>
                                        <div class="cdt-tx-meta">
                                            <span>${formatRelativeTime(tx.timestamp)}</span>
                                            ${tx.slot ? `<span>Slot: ${tx.slot}</span>` : ''}
                                            ${tx.confirmations !== undefined && tx.confirmations !== null ? `<span>${tx.confirmations} confirmations</span>` : ''}
                                        </div>
                                        ${tx.error ? `<div class="cdt-tx-error">${tx.error}</div>` : ''}
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
                            }
                        </div>
                    </div>
                `;

                // Attach event handlers
                const clearBtn = el.querySelector('#clear-tx');
                const copyBtns = el.querySelectorAll('[data-copy]');

                clearBtn?.addEventListener('click', () => {
                    transactions = [];
                    client.clearTransactionHistory();
                    renderContent();
                });

                copyBtns.forEach(btn => {
                    btn.addEventListener('click', e => {
                        e.preventDefault();
                        e.stopPropagation();
                        const sig = btn.getAttribute('data-copy');
                        if (sig) copyToClipboard(sig);
                    });
                });
            }

            // Store render function
            renderFn = renderContent;

            // Subscribe to transaction events to track new transactions
            unsubscribeEvents = client.on(event => {
                if (event.type === 'transaction:sent') {
                    const exists = transactions.find(t => t.signature === event.signature);
                    if (!exists) {
                        const cluster = client.getCluster();
                        transactions.unshift({
                            signature: event.signature,
                            timestamp: event.timestamp,
                            status: 'pending',
                            cluster: cluster?.id,
                        });

                        // Track in connector - the signature is already typed as Signature from the event
                        client.trackTransaction({
                            signature: event.signature,
                            status: 'pending',
                            method: 'signAndSendTransaction',
                        });

                        renderContent();
                    }
                } else if (event.type === 'transaction:tracked') {
                    const exists = transactions.find(t => t.signature === event.signature);
                    if (!exists) {
                        const cluster = client.getCluster();
                        transactions.unshift({
                            signature: event.signature,
                            timestamp: event.timestamp,
                            status: event.status,
                            cluster: cluster?.id,
                        });
                        renderContent();
                    }
                } else if (event.type === 'transaction:updated') {
                    const tx = transactions.find(t => t.signature === event.signature);
                    if (tx) {
                        tx.status = event.status;
                        renderContent();
                    }
                }
            });

            // Subscribe to state changes
            unsubscribeState = client.subscribe(() => {
                // Re-render to pick up any changes in debug state
                renderContent();
            });

            // Initial render
            renderContent();
        },

        destroy() {
            unsubscribeEvents?.();
            unsubscribeState?.();
            unsubscribeEvents = undefined;
            unsubscribeState = undefined;
            renderFn = undefined;
        },
    };
}
