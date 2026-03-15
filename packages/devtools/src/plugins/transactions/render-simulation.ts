import { ICONS } from '../../components/icons';
import { renderCdtDropdown } from '../../components/dropdown';
import { escapeHtml, truncateMiddle } from '../../utils/dom';
import { formatSolFromLamports, safeJsonStringify } from './format';
import type {
    SimulationBalanceChange,
    SimulationCommitment,
    SimulationInstructionDecoded,
    SimulationWritableAccount,
    TransactionSimulationEntry,
    TransactionSimulationResult,
} from './simulation/state';

function formatLamportsDelta(delta: bigint): string {
    const sol = formatSolFromLamports(delta);
    return `${delta.toString()} lamports (${sol} SOL)`;
}

function renderWarnings(warnings: TransactionSimulationResult['warnings']): string {
    if (!warnings.length) return `<div class="cdt-empty">No warnings.</div>`;
    return `
        <div style="display:flex; flex-wrap: wrap; gap: 8px;">
            ${warnings
                .map(w => {
                    const tone = w.severity === 'critical' ? 'error' : 'warn';
                    const label = w.account ? `${w.shortMessage} • ${truncateMiddle(w.account, 5, 5)}` : w.shortMessage;
                    return `<span class="cdt-pill ${tone}" title="${escapeHtml(w.message)}">${escapeHtml(label)}</span>`;
                })
                .join('')}
        </div>
    `;
}

function renderBalanceChanges(changes: SimulationBalanceChange[]): string {
    if (!changes.length) return `<div class="cdt-empty">No non-zero balance changes detected.</div>`;

    const rows = changes
        .slice()
        .sort((a, b) => (a.kind === b.kind ? 0 : a.kind === 'sol' ? -1 : 1))
        .map(ch => {
            const amountLabel =
                ch.kind === 'sol'
                    ? formatLamportsDelta(ch.amount)
                    : `${ch.amount.toString()}${ch.mint ? ` (mint ${truncateMiddle(ch.mint, 5, 5)})` : ''}`;

            return `
                <div class="cdt-balance-row">
                    <div class="cdt-balance-key">${escapeHtml(truncateMiddle(ch.address, 10, 10))}</div>
                    <div class="cdt-balance-delta ${ch.amount < 0n ? 'neg' : 'pos'}">${escapeHtml(amountLabel)}</div>
                    <div class="cdt-balance-post">${escapeHtml(ch.kind === 'sol' ? 'SOL' : 'SPL')}</div>
                </div>
            `;
        })
        .join('');

    return `<div class="cdt-balance-list">${rows}</div>`;
}

function renderWritableAccountsTable(accounts: SimulationWritableAccount[], includeSnapshots: boolean): string {
    if (!accounts.length) return `<div class="cdt-empty">No writable accounts found.</div>`;

    return `
        <div class="cdt-card">
            <div class="cdt-card-title">Writable accounts (${accounts.length})</div>
            <div class="cdt-empty" style="padding: 0 0 10px;">
                ${includeSnapshots ? 'Changed-in-simulation is computed from lamports + account data bytes.' : 'Snapshots disabled; diffs not computed.'}
            </div>
            <div class="cdt-logs">
                ${accounts
                    .map(a => {
                        const chipTone = a.changedInSimulation ? 'success' : 'warn';
                        const chipLabel = a.changedInSimulation ? 'changed' : 'unchanged';
                        const flags = [
                            a.isSigner ? `<span class="cdt-pill info">signer</span>` : '',
                            a.isWritable
                                ? `<span class="cdt-pill warn">writable</span>`
                                : `<span class="cdt-pill">readonly</span>`,
                        ]
                            .filter(Boolean)
                            .join(' ');

                        const delta = includeSnapshots ? (a.post.lamports ?? 0n) - (a.pre.lamports ?? 0n) : null;

                        const deltaLabel = includeSnapshots && delta !== null ? formatLamportsDelta(delta) : 'N/A';
                        const tokenDelta = (() => {
                            if (!includeSnapshots) return null;
                            const pre = a.tokenPre?.amount ?? 0n;
                            const post = a.tokenPost?.amount ?? 0n;
                            const mint = a.tokenPost?.mint ?? a.tokenPre?.mint ?? null;
                            const d = post - pre;
                            if (!mint || d === 0n) return null;
                            return `${d.toString()} (mint ${truncateMiddle(mint, 5, 5)})`;
                        })();

                        return `
                            <div class="cdt-card" style="margin-top: 0;">
                                <div style="display:flex; align-items:center; justify-content: space-between; gap: 10px;">
                                    <div style="display:flex; flex-direction: column; gap: 4px; min-width: 0;">
                                        <div style="display:flex; gap: 8px; align-items: center; min-width: 0;">
                                            <span class="cdt-pill ${chipTone}">${escapeHtml(chipLabel)}</span>
                                            <span class="cdt-pill" title="${escapeHtml(a.address)}">${escapeHtml(truncateMiddle(a.address, 10, 10))}</span>
                                        </div>
                                        <div style="display:flex; gap: 6px; flex-wrap: wrap;">${flags}</div>
                                    </div>
                                    <div style="display:flex; gap: 6px; flex-wrap: wrap; justify-content: flex-end;">
                                        ${
                                            includeSnapshots
                                                ? `<span class="cdt-pill ${delta !== null && delta < 0n ? 'error' : 'success'}" title="Lamports delta">${escapeHtml(deltaLabel)}</span>`
                                                : ''
                                        }
                                        ${tokenDelta ? `<span class="cdt-pill" title="Token delta">${escapeHtml(tokenDelta)}</span>` : ''}
                                    </div>
                                </div>
                            </div>
                        `;
                    })
                    .join('')}
            </div>
        </div>
    `;
}

function renderInstructions(instructions: SimulationInstructionDecoded[]): string {
    if (!instructions.length) return `<div class="cdt-empty">No decoded instructions.</div>`;

    return `
        <div class="cdt-logs">
            ${instructions
                .map(ix => {
                    const programLabel = ix.programName ? ix.programName : truncateMiddle(ix.programAddress, 6, 6);
                    const title = `${programLabel}${ix.parsed?.name ? `:${ix.parsed.name}` : ''}`;
                    const argsJson = ix.parsed ? escapeHtml(safeJsonStringify(ix.parsed.args, 2)) : '';
                    const dataPreview =
                        ix.raw.dataHex.length > 120 ? `${ix.raw.dataHex.slice(0, 120)}…` : ix.raw.dataHex || '';

                    const accountsHtml = (ix.parsed?.accounts ?? ix.raw.accounts ?? []).length
                        ? (ix.parsed?.accounts ?? ix.raw.accounts)
                              .map(a => {
                                  const badges = [
                                      a.isSigner ? `<span class="cdt-pill info">signer</span>` : '',
                                      a.isWritable
                                          ? `<span class="cdt-pill warn">writable</span>`
                                          : `<span class="cdt-pill">readonly</span>`,
                                      a.name ? `<span class="cdt-pill">${escapeHtml(a.name)}</span>` : '',
                                  ]
                                      .filter(Boolean)
                                      .join(' ');
                                  return `
                                      <div class="cdt-account-row">
                                          <div class="cdt-account-idx">#</div>
                                          <div class="cdt-account-key">${escapeHtml(a.address)}</div>
                                          <div class="cdt-account-badges">${badges}</div>
                                      </div>
                                  `;
                              })
                              .join('')
                        : `<div class="cdt-empty">No accounts.</div>`;

                    return `
                        <details class="cdt-details-section">
                            <summary><span class="cdt-chevron">${ICONS.chevronDown}</span>#${ix.index} ${escapeHtml(title)}</summary>
                            <div class="cdt-details-section-content">
                                <div class="cdt-card" style="margin-top: 0;">
                                    <div class="cdt-card-title">Program</div>
                                    <div class="cdt-kv cdt-kv-compact">
                                        <div class="cdt-k">program</div><div class="cdt-v">${escapeHtml(ix.programAddress)}</div>
                                    </div>
                                </div>

                                ${
                                    ix.parsed
                                        ? `
                                    <div class="cdt-card">
                                        <div class="cdt-card-title">Args (Anchor)</div>
                                        <pre class="cdt-json">${argsJson}</pre>
                                    </div>
                                `
                                        : `
                                    <div class="cdt-card">
                                        <div class="cdt-card-title">Data (hex)</div>
                                        <div class="cdt-json">${escapeHtml(dataPreview || 'N/A')}</div>
                                    </div>
                                `
                                }

                                <div class="cdt-card">
                                    <div class="cdt-card-title">Accounts</div>
                                    ${accountsHtml}
                                </div>
                            </div>
                        </details>
                    `;
                })
                .join('')}
        </div>
    `;
}

function renderLogs(logs: string[] | null): string {
    if (!logs?.length) return `<div class="cdt-empty">No logs.</div>`;
    const maxLines = 200;
    const truncated = logs.length > maxLines;
    const display = logs.slice(0, maxLines);

    return `
        ${truncated ? `<div class="cdt-empty">Showing first ${maxLines} lines (of ${logs.length}).</div>` : ''}
        <div class="cdt-logs">
            ${display
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
    `;
}

export interface RenderTransactionSimulationPanelParams {
    simulationEntry?: TransactionSimulationEntry;
    commitment: SimulationCommitment;
    includeSnapshots: boolean;
    canSimulate: boolean;
    missingReason?: string;
}

export function renderTransactionSimulationPanel({
    simulationEntry,
    commitment,
    includeSnapshots,
    canSimulate,
    missingReason,
}: RenderTransactionSimulationPanelParams): string {
    const result = simulationEntry?.result ?? null;

    const inspectorUrl = result?.explorerInspectorUrl ?? null;
    const isLoading = Boolean(simulationEntry?.isLoading);
    const error = simulationEntry?.error ?? null;

    return `
        <div class="cdt-details-header" style="margin-bottom: 10px;">
            <div class="cdt-details-title">Simulation</div>
            <div style="display:flex; gap:6px; flex-wrap: wrap; justify-content: flex-end;">
                <div
                    title="Commitment used for simulation and account snapshots"
                    style="display:flex; align-items:center; gap: 8px;"
                >
                    <span style="font-size: 11px; font-weight: 650; color: var(--cdt-text-muted);">commitment</span>
                    ${renderCdtDropdown({
                        id: 'cdt-sim-commitment',
                        ariaLabel: 'Simulation commitment',
                        value: commitment,
                        options: (['processed', 'confirmed', 'finalized'] as const).map(c => ({ value: c, label: c })),
                        triggerClassName: 'cdt-select cdt-select-compact',
                    })}
                </div>

                <label class="cdt-pill" title="When enabled, fetch pre-state + request post-state snapshots for writable accounts (more RPC work)">
                    <input id="cdt-sim-snapshots" type="checkbox" ${includeSnapshots ? 'checked' : ''} />
                    <span style="margin-left: 6px;">snapshots</span>
                </label>

                <button class="cdt-btn cdt-btn-secondary" id="cdt-sim-run" ${!canSimulate || isLoading ? 'disabled' : ''}>
                    ${ICONS.play}
                    ${result ? 'Re-run' : 'Run'}
                </button>
            </div>
        </div>

        ${
            !canSimulate
                ? `<div class="cdt-json" style="border-color: color-mix(in srgb, var(--cdt-warning) 40%, var(--cdt-border)); color: var(--cdt-warning);">${escapeHtml(
                      missingReason ?? 'Simulation unavailable.',
                  )}</div>`
                : ''
        }

        ${error ? `<div class="cdt-json" style="border-color: color-mix(in srgb, var(--cdt-error) 40%, var(--cdt-border)); color: var(--cdt-error);">${escapeHtml(error)}</div>` : ''}

        ${isLoading ? `<div class="cdt-loading"><span class="cdt-spinner">${ICONS.refresh}</span><span>Simulating…</span></div>` : ''}

        ${
            result
                ? `
            <div class="cdt-card" style="margin-top: 10px;">
                <div class="cdt-card-title">Summary</div>
                <div class="cdt-kv">
                    <div class="cdt-k">status</div><div class="cdt-v">${escapeHtml(result.error ? 'failed' : 'ok')}</div>
                    <div class="cdt-k">units</div><div class="cdt-v">${result.unitsConsumed !== null ? escapeHtml(String(result.unitsConsumed)) : 'N/A'}</div>
                    <div class="cdt-k">writable accounts</div><div class="cdt-v">${escapeHtml(String(result.writableAccounts.length))}${result.truncatedWritableAccounts ? ' (truncated)' : ''}</div>
                    <div class="cdt-k">started</div><div class="cdt-v">${escapeHtml(new Date(result.startedAt).toLocaleTimeString('en-US', { hour12: false }))}</div>
                    <div class="cdt-k">duration</div><div class="cdt-v">${escapeHtml(String(result.finishedAt - result.startedAt))}ms</div>
                    ${
                        inspectorUrl
                            ? `<div class="cdt-k">inspector</div><div class="cdt-v"><a href="${escapeHtml(
                                  inspectorUrl,
                              )}" target="_blank" rel="noopener noreferrer">${escapeHtml(inspectorUrl)}</a></div>`
                            : ''
                    }
                </div>
            </div>

            <details class="cdt-details-section" open>
                <summary><span class="cdt-chevron">${ICONS.chevronDown}</span>Warnings (${result.warnings.length})</summary>
                <div class="cdt-details-section-content">
                    ${renderWarnings(result.warnings)}
                </div>
            </details>

            <details class="cdt-details-section" open>
                <summary><span class="cdt-chevron">${ICONS.chevronDown}</span>Balance changes (${result.balanceChanges.length})</summary>
                <div class="cdt-details-section-content">
                    ${renderBalanceChanges(result.balanceChanges)}
                </div>
            </details>

            <details class="cdt-details-section" open>
                <summary><span class="cdt-chevron">${ICONS.chevronDown}</span>Writable accounts</summary>
                <div class="cdt-details-section-content">
                    ${renderWritableAccountsTable(result.writableAccounts, result.includeSnapshots)}
                </div>
            </details>

            <details class="cdt-details-section">
                <summary><span class="cdt-chevron">${ICONS.chevronDown}</span>Instructions (${result.instructions.length})</summary>
                <div class="cdt-details-section-content">
                    ${renderInstructions(result.instructions)}
                </div>
            </details>

            <details class="cdt-details-section">
                <summary><span class="cdt-chevron">${ICONS.chevronDown}</span>Logs (${result.logs?.length ?? 0})</summary>
                <div class="cdt-details-section-content">
                    ${renderLogs(result.logs)}
                </div>
            </details>

            <details class="cdt-details-section">
                <summary><span class="cdt-chevron">${ICONS.chevronDown}</span>Raw simulation</summary>
                <div class="cdt-details-section-content">
                    <pre class="cdt-json">${escapeHtml(safeJsonStringify(result.rawSimulation, 2))}</pre>
                </div>
            </details>
        `
                : `<div class="cdt-empty">Run a simulation to see results.</div>`
        }
    `;
}
