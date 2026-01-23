import type { DevtoolsTrackedTransaction } from '../../types';
import { ICONS } from '../../components/icons';
import { escapeHtml, truncateMiddle } from '../../utils/dom';
import {
    formatBlockTime,
    formatIntegerLike,
    formatSolFromLamports,
    getAccountPubkey,
    renderKeyValueRows,
    safeJsonStringify,
    toBigIntOrNull,
} from './format';
import type { TransactionDetailsEntry } from './details';

interface DecodedWireTransactionLike {
    summary: {
        feePayer?: string | null;
    };
}

export interface RenderSentTransactionDetailsPanelParams {
    selectedTx: DevtoolsTrackedTransaction;
    selectedTxDecoded: DecodedWireTransactionLike | null;
    selectedDetails?: TransactionDetailsEntry;
}

export function renderSentTransactionDetailsPanel({
    selectedTx,
    selectedTxDecoded,
    selectedDetails,
}: RenderSentTransactionDetailsPanelParams): string {
    const rpcTx = selectedDetails?.tx as any;
    const rpcMeta = rpcTx && typeof rpcTx === 'object' ? (rpcTx as any).meta : undefined;
    const rpcTransaction = rpcTx && typeof rpcTx === 'object' ? (rpcTx as any).transaction : undefined;
    const rpcMessage =
        rpcTransaction && typeof rpcTransaction === 'object' ? (rpcTransaction as any).message : undefined;

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
        ...(computeUnitsConsumed !== null ? [{ key: 'compute units', value: computeUnitsConsumed.toString() }] : []),
        ...(selectedDetails?.status?.confirmations !== null && selectedDetails?.status?.confirmations !== undefined
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
                      ix.stackHeight !== null && ix.stackHeight !== undefined ? String(ix.stackHeight) : '';

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
                          ${headerRows.length ? renderKeyValueRows(headerRows, 'cdt-kv cdt-kv-compact') : ''}
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
