/**
 * Overview Plugin
 *
 * Displays:
 * - Connection state (wallet, account, cluster)
 * - RPC health (latency, slot)
 * - Debug metrics
 * - Storage reset action
 */

import type { ConnectorDevtoolsPlugin, PluginContext } from '../types';
import { ICONS } from '../components/icons';

// Helper to get CSS class for cluster styling
function getClusterStyleClass(clusterId: string): string {
    if (clusterId.includes('mainnet')) return 'mainnet';
    if (clusterId.includes('devnet')) return 'devnet';
    if (clusterId.includes('testnet')) return 'testnet';
    return 'custom';
}

// Helper to format RPC URL for display
function formatRpcUrl(url: string | null): string {
    if (!url) return 'N/A';

    // Strip protocol and show the rest
    return url.replace(/^https?:\/\//, '');
}

// RPC health state
interface RpcHealth {
    status: 'checking' | 'healthy' | 'slow' | 'error';
    latency?: number;
    slot?: number;
    error?: string;
}

// Storage keys used by connector
const STORAGE_KEYS = {
    account: 'connector-kit:v1:account',
    wallet: 'connector-kit:v1:wallet',
    cluster: 'connector-kit:v1:cluster',
} as const;

// Get persistence info - what happens on reload?
interface PersistenceInfo {
    hasStoredWallet: boolean;
    storedWallet: string | null;
    storedCluster: string | null;
    willAutoConnect: boolean;
}

function getPersistenceInfo(autoConnect: boolean): PersistenceInfo {
    if (typeof window === 'undefined') {
        return { hasStoredWallet: false, storedWallet: null, storedCluster: null, willAutoConnect: false };
    }

    try {
        const walletRaw = localStorage.getItem(STORAGE_KEYS.wallet);
        const clusterRaw = localStorage.getItem(STORAGE_KEYS.cluster);

        const storedWallet = walletRaw ? JSON.parse(walletRaw) : null;
        const storedCluster = clusterRaw ? JSON.parse(clusterRaw) : null;

        return {
            hasStoredWallet: Boolean(storedWallet),
            storedWallet,
            storedCluster,
            willAutoConnect: autoConnect && Boolean(storedWallet),
        };
    } catch {
        return { hasStoredWallet: false, storedWallet: null, storedCluster: null, willAutoConnect: false };
    }
}

// Clear all connector storage
function clearAllStorage(): void {
    if (typeof window === 'undefined') return;

    try {
        localStorage.removeItem(STORAGE_KEYS.account);
        localStorage.removeItem(STORAGE_KEYS.wallet);
        localStorage.removeItem(STORAGE_KEYS.cluster);
    } catch {
        // Ignore errors
    }
}

// Check RPC health by getting current slot
async function checkRpcHealth(rpcUrl: string): Promise<RpcHealth> {
    const start = performance.now();
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);

    try {
        const response = await fetch(rpcUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            signal: controller.signal,
            body: JSON.stringify({
                jsonrpc: '2.0',
                id: 1,
                method: 'getSlot',
                params: [{ commitment: 'processed' }],
            }),
        });

        const latency = Math.round(performance.now() - start);
        const data = await response.json();

        if (data.error) {
            return { status: 'error', latency, error: data.error.message };
        }

        const slot = data.result;
        const status = latency > 1000 ? 'slow' : 'healthy';

        return { status, latency, slot };
    } catch (err) {
        const latency = Math.round(performance.now() - start);
        const errorMessage =
            err instanceof DOMException && err.name === 'AbortError'
                ? 'Request timed out'
                : err instanceof Error
                  ? err.message
                  : 'Failed to connect';
        return {
            status: 'error',
            latency,
            error: errorMessage,
        };
    } finally {
        clearTimeout(timeoutId);
    }
}

export function createOverviewPlugin(): ConnectorDevtoolsPlugin {
    let unsubscribe: (() => void) | undefined;
    let unsubscribeContext: (() => void) | undefined;
    let rpcHealth: RpcHealth = { status: 'checking' };
    let isRefreshingRpcHealth = false;
    let rpcHealthRefreshMode: 'manual' | 'poll' | undefined;
    let rpcHealthCheckedAt: number | undefined;
    let healthCheckInterval: ReturnType<typeof setInterval> | undefined;
    let renderLatest: (() => void) | undefined;

    return {
        id: 'overview',
        name: 'Overview',
        icon: ICONS.overview,
        defaultOpen: true,

        render(el: HTMLElement, ctx: PluginContext) {
            const { client } = ctx;

            function renderContent() {
                const snapshot = client.getSnapshot();
                const health = client.getHealth();
                const config = ctx.getConfig();
                const rpcUrl = config.rpcUrl ?? client.getRpcUrl();
                const metrics = client.getDebugMetrics();
                const clientConfig = client.getConfig();
                const persistence = getPersistenceInfo(clientConfig.autoConnect ?? false);

                // Truncate address for display
                const truncateAddress = (addr: string | null) => {
                    if (!addr) return 'None';
                    return `${addr.slice(0, 4)}...${addr.slice(-4)}`;
                };

                // Get status badge
                const getStatusBadge = (connected: boolean, connecting: boolean) => {
                    if (connecting) return '<span class="cdt-badge cdt-badge-warning">Connecting</span>';
                    if (connected) return '<span class="cdt-badge cdt-badge-success">Connected</span>';
                    return '<span class="cdt-badge cdt-badge-muted">Disconnected</span>';
                };

                // Get RPC status badge
                const getRpcStatusBadge = (health: RpcHealth) => {
                    switch (health.status) {
                        case 'checking':
                            return '<span class="cdt-badge cdt-badge-muted">Checking...</span>';
                        case 'healthy':
                            return '<span class="cdt-badge cdt-badge-success">Healthy</span>';
                        case 'slow':
                            return '<span class="cdt-badge cdt-badge-warning">Slow</span>';
                        case 'error':
                            return '<span class="cdt-badge cdt-badge-error">Error</span>';
                    }
                };

                // Get latency class for color coding
                const getLatencyClass = (latency?: number) => {
                    if (latency === undefined) return '';
                    if (latency < 200) return 'cdt-text-success';
                    if (latency < 500) return 'cdt-text-warning';
                    return 'cdt-text-error';
                };

                const lastCheckedLabel = rpcHealthCheckedAt ? new Date(rpcHealthCheckedAt).toLocaleTimeString() : '—';
                const shouldSpinRefresh = isRefreshingRpcHealth && rpcHealthRefreshMode === 'manual';

                el.innerHTML = `
                    <div class="cdt-overview">
                        <style>
                            .cdt-overview {
                                height: 100%;
                                display: flex;
                                flex-direction: column;
                            }

                            .cdt-overview-main {
                                flex: 1;
                                overflow-y: auto;
                            }

                            .cdt-overview-grid {
                                display: grid;
                                grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
                                gap: 1px;
                                background: var(--cdt-border);
                            }

                            .cdt-overview-card {
                                background: var(--cdt-bg);
                                padding: 16px;
                            }

                            .cdt-overview-card-header {
                                display: flex;
                                align-items: center;
                                justify-content: space-between;
                                margin-bottom: 12px;
                            }

                            .cdt-overview-card-title {
                                display: flex;
                                align-items: center;
                                gap: 8px;
                                font-size: 11px;
                                font-weight: 600;
                                text-transform: uppercase;
                                letter-spacing: 0.05em;
                                color: var(--cdt-text-muted);
                            }

                            .cdt-overview-card-title svg {
                                width: 14px;
                                height: 14px;
                            }

                            .cdt-overview-rows {
                                display: flex;
                                flex-direction: column;
                                gap: 8px;
                            }

                            .cdt-overview-row {
                                display: flex;
                                align-items: center;
                                justify-content: space-between;
                                font-size: 12px;
                            }

                            .cdt-overview-label {
                                color: var(--cdt-text-muted);
                            }

                            .cdt-overview-value {
                                color: var(--cdt-text);
                                font-family: ui-monospace, monospace;
                            }

                            .cdt-overview-value.cdt-truncate {
                                max-width: 150px;
                                overflow: hidden;
                                text-overflow: ellipsis;
                                white-space: nowrap;
                            }

                            .cdt-overview-actions {
                                padding: 16px;
                                border-top: 1px solid var(--cdt-border);
                                display: flex;
                                gap: 8px;
                            }

                            .cdt-overview-footer {
                                flex: none;
                                border-top: 1px solid var(--cdt-border);
                                background: var(--cdt-bg-panel);
                            }

                            .cdt-overview-rpcbar {
                                display: flex;
                                align-items: stretch;
                                justify-content: space-between;
                                gap: 0;
                                padding: 0;
                                min-height: 44px;
                            }

                            .cdt-overview-rpcbar-left {
                                display: flex;
                                align-items: center;
                                gap: 12px;
                                min-width: 0;
                                padding: 10px 12px;
                            }

                            .cdt-overview-rpcbar-title {
                                display: inline-flex;
                                align-items: center;
                                gap: 6px;
                                font-size: 11px;
                                font-weight: 600;
                                text-transform: uppercase;
                                letter-spacing: 0.05em;
                                color: var(--cdt-text-muted);
                                white-space: nowrap;
                            }

                            .cdt-overview-rpcbar-title svg {
                                width: 14px;
                                height: 14px;
                            }

                            .cdt-overview-rpcbar-metrics {
                                display: flex;
                                align-items: center;
                                gap: 10px;
                                min-width: 0;
                                flex-wrap: wrap;
                            }

                            .cdt-overview-rpcbar-metric {
                                display: inline-flex;
                                align-items: baseline;
                                gap: 6px;
                                font-size: 12px;
                            }

                            .cdt-overview-rpcbar-divider {
                                width: 1px;
                                height: 16px;
                                background: var(--cdt-border);
                            }

                            .cdt-overview-rpcbar-actions {
                                display: flex;
                                align-items: stretch;
                            }

                            #rpc-refresh-btn {
                                display: flex;
                                align-items: center;
                                gap: 8px;
                                padding: 0 12px;
                                height: 100%;
                                border-left: 1px solid var(--cdt-border);
                                border-radius: 0;
                                background: transparent;
                                color: var(--cdt-text-muted);
                                transition: background-color 0.15s ease, color 0.15s ease;
                                margin-left: 0;
                            }

                            #rpc-refresh-btn:hover:not(:disabled) {
                                background: var(--cdt-bg-hover);
                                color: var(--cdt-text);
                            }

                            #rpc-refresh-btn:disabled {
                                opacity: 0.6;
                                cursor: not-allowed;
                            }

                            #rpc-refresh-btn .cdt-refresh-label {
                                display: flex;
                                align-items: center;
                                gap: 6px;
                                font-size: 11px;
                                color: var(--cdt-text-dim);
                                white-space: nowrap;
                            }

                            #rpc-refresh-btn .cdt-refresh-state-label {
                                color: var(--cdt-text-muted);
                            }

                            #rpc-refresh-btn .cdt-refresh-state {
                                font-weight: 500;
                                color: var(--cdt-text);
                            }

                            #rpc-refresh-btn .cdt-refresh-state.cdt-text-error {
                                color: var(--cdt-error);
                            }

                            #rpc-refresh-btn .cdt-refresh-separator {
                                color: var(--cdt-text-dim);
                                opacity: 0.5;
                            }

                            #rpc-refresh-btn .cdt-refresh-time {
                                color: var(--cdt-text-dim);
                            }

                            #rpc-refresh-btn:hover:not(:disabled) .cdt-refresh-label {
                                color: var(--cdt-text);
                            }

                            #rpc-refresh-btn:hover:not(:disabled) .cdt-refresh-time {
                                color: var(--cdt-text-muted);
                            }

                            #rpc-refresh-btn svg {
                                width: 14px;
                                height: 14px;
                                flex-shrink: 0;
                            }

                            #rpc-refresh-btn.cdt-is-loading svg {
                                animation: cdt-spin 0.9s linear infinite;
                                transform-origin: 50% 50%;
                                transform-box: fill-box;
                            }

                            @keyframes cdt-spin {
                                from {
                                    transform: rotate(0deg);
                                }
                                to {
                                    transform: rotate(360deg);
                                }
                            }

                            .cdt-overview-footer-details {
                                padding: 0 12px 12px;
                            }

                            .cdt-cluster-badge {
                                display: inline-flex;
                                align-items: center;
                                padding: 2px 8px;
                                border-radius: 4px;
                                font-size: 11px;
                                font-weight: 500;
                                background: var(--cdt-bg-hover);
                                color: var(--cdt-text);
                            }

                            .cdt-cluster-badge.mainnet {
                                background: color-mix(in srgb, var(--cdt-success) 15%, transparent);
                                color: var(--cdt-success);
                            }

                            .cdt-cluster-badge.devnet {
                                background: color-mix(in srgb, var(--cdt-info) 15%, transparent);
                                color: var(--cdt-info);
                            }

                            .cdt-cluster-badge.testnet {
                                background: color-mix(in srgb, var(--cdt-warning) 15%, transparent);
                                color: var(--cdt-warning);
                            }

                            .cdt-errors-list {
                                margin-top: 8px;
                                padding: 8px;
                                background: color-mix(in srgb, var(--cdt-error) 10%, transparent);
                                border-radius: 4px;
                                font-size: 11px;
                                color: var(--cdt-error);
                            }

                            .cdt-error-item {
                                padding: 2px 0;
                            }

                            .cdt-metrics-grid {
                                display: grid;
                                grid-template-columns: repeat(2, 1fr);
                                gap: 8px;
                            }

                            .cdt-metric-item {
                                display: flex;
                                flex-direction: column;
                                gap: 2px;
                            }

                            .cdt-metric-value {
                                font-size: 18px;
                                font-weight: 600;
                                color: var(--cdt-text);
                            }

                            .cdt-metric-label {
                                font-size: 10px;
                                text-transform: uppercase;
                                letter-spacing: 0.05em;
                                color: var(--cdt-text-muted);
                            }

                            .cdt-text-success {
                                color: var(--cdt-success) !important;
                            }

                            .cdt-text-warning {
                                color: var(--cdt-warning) !important;
                            }

                            .cdt-text-error {
                                color: var(--cdt-error) !important;
                            }

                            .cdt-persistence-hint {
                                margin-top: 12px;
                                padding: 8px;
                                font-size: 11px;
                                color: var(--cdt-text-muted);
                                background: var(--cdt-bg-hover);
                                border-radius: 4px;
                                line-height: 1.4;
                            }

                            .cdt-persistence-hint strong {
                                color: var(--cdt-text);
                            }
                        </style>

                        <div class="cdt-overview-main">
                            <div class="cdt-overview-grid">
                                <!-- Connection Card -->
                                <div class="cdt-overview-card">
                                    <div class="cdt-overview-card-header">
                                        <div class="cdt-overview-card-title">
                                            ${ICONS.wallet}
                                            Connection
                                        </div>
                                        ${getStatusBadge(snapshot.connected, snapshot.connecting)}
                                    </div>
                                    <div class="cdt-overview-rows">
                                        <div class="cdt-overview-row">
                                            <span class="cdt-overview-label">Wallet</span>
                                            <span class="cdt-overview-value">${snapshot.selectedWallet?.name ?? 'None'}</span>
                                        </div>
                                        <div class="cdt-overview-row">
                                            <span class="cdt-overview-label">Account</span>
                                            <span class="cdt-overview-value cdt-truncate" title="${snapshot.selectedAccount ?? ''}">${truncateAddress(snapshot.selectedAccount)}</span>
                                        </div>
                                        <div class="cdt-overview-row">
                                            <span class="cdt-overview-label">Accounts</span>
                                            <span class="cdt-overview-value">${snapshot.accounts.length}</span>
                                        </div>
                                        <div class="cdt-overview-row">
                                            <span class="cdt-overview-label">Wallets Detected</span>
                                            <span class="cdt-overview-value">${snapshot.wallets.length}</span>
                                        </div>
                                    </div>
                                </div>

                                <!-- Network Card -->
                                <div class="cdt-overview-card">
                                    <div class="cdt-overview-card-header">
                                        <div class="cdt-overview-card-title">
                                            ${ICONS.network}
                                            Network
                                        </div>
                                        ${snapshot.cluster ? `<span class="cdt-cluster-badge ${getClusterStyleClass(snapshot.cluster.id)}">${snapshot.cluster.label}</span>` : '<span class="cdt-badge cdt-badge-muted">None</span>'}
                                    </div>
                                    <div class="cdt-overview-rows">
                                        <div class="cdt-overview-row">
                                            <span class="cdt-overview-label">Cluster ID</span>
                                            <span class="cdt-overview-value">${snapshot.cluster?.id ?? 'N/A'}</span>
                                        </div>
                                        <div class="cdt-overview-row">
                                            <span class="cdt-overview-label">RPC URL</span>
                                            <span class="cdt-overview-value cdt-truncate" title="${rpcUrl ?? ''}">${formatRpcUrl(rpcUrl)}</span>
                                        </div>
                                        <div class="cdt-overview-row">
                                            <span class="cdt-overview-label">Available Clusters</span>
                                            <span class="cdt-overview-value">${snapshot.clusters.length}</span>
                                        </div>
                                    </div>
                                </div>

                                <!-- Persistence Card -->
                                <div class="cdt-overview-card">
                                    <div class="cdt-overview-card-header">
                                        <div class="cdt-overview-card-title">
                                            ${ICONS.info}
                                            On Reload
                                        </div>
                                        ${
                                            persistence.willAutoConnect
                                                ? '<span class="cdt-badge cdt-badge-success">Auto-connect</span>'
                                                : '<span class="cdt-badge cdt-badge-muted">Fresh start</span>'
                                        }
                                    </div>
                                    <div class="cdt-overview-rows">
                                        <div class="cdt-overview-row">
                                            <span class="cdt-overview-label">Auto-Connect</span>
                                            <span class="cdt-overview-value">${clientConfig.autoConnect ? 'Enabled' : 'Disabled'}</span>
                                        </div>
                                        <div class="cdt-overview-row">
                                            <span class="cdt-overview-label">Remembered Wallet</span>
                                            <span class="cdt-overview-value">${persistence.storedWallet ?? 'None'}</span>
                                        </div>
                                        <div class="cdt-overview-row">
                                            <span class="cdt-overview-label">Remembered Network</span>
                                            <span class="cdt-overview-value">${persistence.storedCluster ?? 'Default'}</span>
                                        </div>
                                    </div>
                                    <div class="cdt-persistence-hint">
                                        ${
                                            persistence.willAutoConnect
                                                ? `Will reconnect to <strong>${persistence.storedWallet}</strong> on page reload.`
                                                : persistence.hasStoredWallet
                                                  ? `Wallet stored but auto-connect is disabled.`
                                                  : `No stored wallet. User will see connect prompt.`
                                        }
                                    </div>
                                </div>

                                <!-- Metrics Card -->
                                <div class="cdt-overview-card">
                                    <div class="cdt-overview-card-header">
                                        <div class="cdt-overview-card-title">
                                            ${ICONS.events}
                                            Metrics
                                        </div>
                                    </div>
                                    <div class="cdt-metrics-grid">
                                        <div class="cdt-metric-item">
                                            <span class="cdt-metric-value">${metrics.stateUpdates}</span>
                                            <span class="cdt-metric-label">State Updates</span>
                                        </div>
                                        <div class="cdt-metric-item">
                                            <span class="cdt-metric-value">${metrics.optimizationRate.toFixed(0)}%</span>
                                            <span class="cdt-metric-label">Optimization</span>
                                        </div>
                                        <div class="cdt-metric-item">
                                            <span class="cdt-metric-value">${metrics.eventListenerCount}</span>
                                            <span class="cdt-metric-label">Event Listeners</span>
                                        </div>
                                        <div class="cdt-metric-item">
                                            <span class="cdt-metric-value">${metrics.avgUpdateTimeMs.toFixed(1)}ms</span>
                                            <span class="cdt-metric-label">Avg Update</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <!-- Actions -->
                            <div class="cdt-overview-actions">
                                <button class="cdt-btn cdt-btn-secondary" id="fresh-user-btn" title="Clear stored wallet/account/network and reload page">
                                    ${ICONS.trash}
                                    Simulate Fresh User
                                </button>
                            </div>
                        </div>

                        <!-- Pinned RPC Health -->
                        <div class="cdt-overview-footer">
                            <div class="cdt-overview-rpcbar">
                                <div class="cdt-overview-rpcbar-left">
                                    <div class="cdt-overview-rpcbar-title">
                                        ${ICONS.network}
                                        RPC Health
                                    </div>
                                    ${getRpcStatusBadge(rpcHealth)}
                                    <div class="cdt-overview-rpcbar-metrics">
                                        <div class="cdt-overview-rpcbar-metric" title="Round-trip latency for getSlot">
                                            <span class="cdt-overview-label">Latency</span>
                                            <span class="cdt-overview-value ${getLatencyClass(rpcHealth.latency)}">${rpcHealth.latency !== undefined ? `${rpcHealth.latency}ms` : '...'}</span>
                                        </div>
                                        <div class="cdt-overview-rpcbar-divider"></div>
                                        <div class="cdt-overview-rpcbar-metric">
                                            <span class="cdt-overview-label">Slot</span>
                                            <span class="cdt-overview-value">${rpcHealth.slot !== undefined ? rpcHealth.slot.toLocaleString() : '...'}</span>
                                        </div>
                                    </div>
                                </div>
                                <div class="cdt-overview-rpcbar-actions">
                                    <button
                                        class="${shouldSpinRefresh ? 'cdt-is-loading' : ''}"
                                        id="rpc-refresh-btn"
                                        aria-label="Refresh RPC health"
                                        title="Refresh RPC health"
                                        ${isRefreshingRpcHealth ? 'disabled' : ''}
                                    >
                                        ${ICONS.refresh}
                                        <span class="cdt-refresh-label">
                                            <span class="cdt-refresh-state-label">State</span>
                                            <span class="cdt-refresh-state ${health.errors.length > 0 ? 'cdt-text-error' : ''}">${health.errors.length > 0 ? `${health.errors.length} issues` : 'OK'}</span>
                                            <span class="cdt-refresh-separator">•</span>
                                            <span class="cdt-refresh-time">Last checked: ${lastCheckedLabel}</span>
                                        </span>
                                    </button>
                                </div>
                            </div>
                            ${
                                rpcHealth.error || health.errors.length > 0
                                    ? `
                                <div class="cdt-overview-footer-details">
                                    ${
                                        rpcHealth.error
                                            ? `
                                        <div class="cdt-errors-list">
                                            <div class="cdt-error-item">• ${rpcHealth.error}</div>
                                        </div>
                                    `
                                            : ''
                                    }
                                    ${
                                        health.errors.length > 0
                                            ? `
                                        <div class="cdt-errors-list">
                                            ${health.errors.map(err => `<div class="cdt-error-item">• ${err}</div>`).join('')}
                                        </div>
                                    `
                                            : ''
                                    }
                                </div>
                            `
                                    : ''
                            }
                        </div>
                    </div>
                `;

                // Attach action handlers
                const freshUserBtn = el.querySelector('#fresh-user-btn');
                const rpcRefreshBtn = el.querySelector('#rpc-refresh-btn');

                freshUserBtn?.addEventListener('click', () => {
                    if (confirm('This will clear all stored data and reload the page. Continue?')) {
                        clearAllStorage();
                        window.location.reload();
                    }
                });

                rpcRefreshBtn?.addEventListener('click', () => void refreshRpcHealth('manual'));
            }

            // Check RPC health
            async function refreshRpcHealth(mode: 'manual' | 'poll') {
                if (isRefreshingRpcHealth) return;

                isRefreshingRpcHealth = true;
                rpcHealthRefreshMode = mode;
                try {
                    rpcHealth = { ...rpcHealth, status: 'checking', error: undefined };
                    renderLatest?.();

                    const config = ctx.getConfig();
                    const rpcUrlToCheck = config.rpcUrl ?? client.getRpcUrl();

                    if (!rpcUrlToCheck) {
                        rpcHealth = { status: 'error', error: 'No RPC URL configured' };
                        return;
                    }

                    rpcHealth = await checkRpcHealth(rpcUrlToCheck);
                    rpcHealthCheckedAt = Date.now();
                } catch (err) {
                    rpcHealth = {
                        status: 'error',
                        error: err instanceof Error ? err.message : 'Failed to check RPC health',
                    };
                } finally {
                    isRefreshingRpcHealth = false;
                    rpcHealthRefreshMode = undefined;
                    renderLatest?.();
                }
            }

            // Always render into the latest DOM container (the panel recreates plugins on reopen)
            renderLatest = renderContent;

            // Initial render
            renderLatest?.();

            // Initial RPC health check
            void refreshRpcHealth('poll');

            // Periodic RPC health check (every 30s)
            if (healthCheckInterval) clearInterval(healthCheckInterval);
            healthCheckInterval = setInterval(() => void refreshRpcHealth('poll'), 30000);

            // Subscribe to state changes
            unsubscribe = client.subscribe(() => renderLatest?.());

            // Subscribe to context changes
            unsubscribeContext = ctx.subscribe(() => renderLatest?.());
        },

        destroy() {
            unsubscribe?.();
            unsubscribeContext?.();
            if (healthCheckInterval) {
                clearInterval(healthCheckInterval);
                healthCheckInterval = undefined;
            }
            renderLatest = undefined;
            unsubscribe = undefined;
            unsubscribeContext = undefined;
        },
    };
}
