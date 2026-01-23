import type { DevtoolsTrackedTransaction } from '../../types';
import { ICONS } from '../../components/icons';
import { escapeHtml, truncateMiddle } from '../../utils/dom';
import type { TransactionDetailsEntry } from './details';
import { formatSolFromLamports, getAccountPubkey, safeJsonStringify, toBigIntOrNull } from './format';

export interface RenderTransactionFlowPanelParams {
    selectedTx: DevtoolsTrackedTransaction;
    selectedDetails?: TransactionDetailsEntry;
}

interface FlowAccountNode {
    index: number;
    pubkey: string;
    signer: boolean;
    writable: boolean;
    source?: string;
}

interface FlowInstructionNode {
    index: number;
    programId: string;
    programName?: string;
    parsedType?: string;
    accountPubkeys: string[];
    summary?: string;
    transferFrom?: string;
    transferTo?: string;
}

interface FlowProgramNode {
    programId: string;
    label: string;
}

function collectStringValues(value: unknown, out: string[]): void {
    if (value === null || value === undefined) return;
    if (typeof value === 'string') {
        out.push(value);
        return;
    }
    if (Array.isArray(value)) {
        value.forEach(v => collectStringValues(v, out));
        return;
    }
    if (typeof value === 'object') {
        Object.values(value as Record<string, unknown>).forEach(v => collectStringValues(v, out));
    }
}

function buildAccountNodes(rpcAccountKeys: unknown[]): FlowAccountNode[] {
    return rpcAccountKeys.map((ak, index) => {
        const pubkey = getAccountPubkey(ak);
        const signer = Boolean((ak as any)?.signer);
        const writable = Boolean((ak as any)?.writable);
        const source = (ak as any)?.source ? String((ak as any).source) : undefined;
        return { index, pubkey, signer, writable, source };
    });
}

function getInstructionProgramId(ix: any, accountPubkeys: string[]): string {
    if (typeof ix?.programId === 'string') return ix.programId;
    const programIdIndex = ix?.programIdIndex;
    if (typeof programIdIndex === 'number' && Number.isFinite(programIdIndex)) return accountPubkeys[programIdIndex] ?? '';
    return '';
}

function getInstructionAccountPubkeys(ix: any, accountPubkeys: string[], knownPubkeys: Set<string>): string[] {
    const accounts = new Set<string>();

    // 1) If we have explicit accounts (either pubkeys or indices)
    if (Array.isArray(ix?.accounts)) {
        for (const entry of ix.accounts) {
            if (typeof entry === 'string') accounts.add(entry);
            if (typeof entry === 'number' && Number.isFinite(entry)) {
                const pk = accountPubkeys[entry];
                if (pk) accounts.add(pk);
            }
        }
    }

    // 2) Best-effort: extract pubkeys from parsed.info object
    const info = ix?.parsed?.info;
    if (info && typeof info === 'object') {
        const strings: string[] = [];
        collectStringValues(info, strings);
        for (const s of strings) if (knownPubkeys.has(s)) accounts.add(s);
    }

    return Array.from(accounts);
}

function buildInstructionNodes(rpcInstructions: unknown[], accountPubkeys: string[]): FlowInstructionNode[] {
    const knownPubkeys = new Set(accountPubkeys);

    return rpcInstructions.map((ix, index) => {
        const programId = getInstructionProgramId(ix, accountPubkeys);
        const programName = typeof (ix as any)?.program === 'string' ? String((ix as any).program) : undefined;
        const parsedType =
            typeof (ix as any)?.parsed?.type === 'string' ? String((ix as any).parsed.type) : undefined;
        const accountPubkeysForIx = getInstructionAccountPubkeys(ix, accountPubkeys, knownPubkeys);

        const info = (ix as any)?.parsed?.info;
        const infoObj = info && typeof info === 'object' && !Array.isArray(info) ? (info as any) : null;

        const maybeFrom = infoObj && typeof infoObj.source === 'string' ? String(infoObj.source) : undefined;
        const maybeTo = infoObj && typeof infoObj.destination === 'string' ? String(infoObj.destination) : undefined;
        const isTransfer = Boolean(parsedType && parsedType.toLowerCase().includes('transfer'));

        let summary: string | undefined;
        let transferFrom: string | undefined;
        let transferTo: string | undefined;

        if (isTransfer) {
            transferFrom = maybeFrom;
            transferTo = maybeTo;
        }

        if (programName === 'system' && parsedType === 'transfer' && infoObj) {
            const lamports = toBigIntOrNull(infoObj.lamports);
            const amountLabel = lamports !== null ? `${formatSolFromLamports(lamports)} SOL` : undefined;
            const routeLabel =
                maybeFrom && maybeTo
                    ? maybeFrom === maybeTo
                        ? 'to self'
                        : `${truncateMiddle(maybeFrom, 5, 5)} → ${truncateMiddle(maybeTo, 5, 5)}`
                    : undefined;

            summary = [amountLabel ? `transfer ${amountLabel}` : 'transfer', routeLabel].filter(Boolean).join(' • ');
        }

        if ((programName === 'spl-token' || programName === 'token') && isTransfer && infoObj) {
            const tokenAmount = infoObj.tokenAmount && typeof infoObj.tokenAmount === 'object' ? infoObj.tokenAmount : null;
            const uiAmountString =
                tokenAmount && typeof (tokenAmount as any).uiAmountString === 'string'
                    ? String((tokenAmount as any).uiAmountString)
                    : undefined;
            const amountRaw =
                typeof infoObj.amount === 'string'
                    ? infoObj.amount
                    : typeof infoObj.amount === 'number'
                      ? String(infoObj.amount)
                      : undefined;
            const amountLabel = uiAmountString ?? amountRaw;
            const mint = typeof infoObj.mint === 'string' ? String(infoObj.mint) : undefined;
            const mintLabel = mint ? truncateMiddle(mint, 5, 5) : undefined;

            const routeLabel =
                maybeFrom && maybeTo
                    ? maybeFrom === maybeTo
                        ? 'to self'
                        : `${truncateMiddle(maybeFrom, 5, 5)} → ${truncateMiddle(maybeTo, 5, 5)}`
                    : undefined;

            summary = [
                amountLabel ? `transfer ${amountLabel}${mintLabel ? ` (${mintLabel})` : ''}` : 'transfer',
                routeLabel,
            ]
                .filter(Boolean)
                .join(' • ');
        }

        return {
            index,
            programId,
            programName,
            parsedType,
            accountPubkeys: accountPubkeysForIx,
            summary,
            transferFrom,
            transferTo,
        };
    });
}

function buildProgramNodes(instructions: FlowInstructionNode[]): FlowProgramNode[] {
    const seen = new Set<string>();
    const programs: FlowProgramNode[] = [];

    for (const ix of instructions) {
        if (!ix.programId) continue;
        if (seen.has(ix.programId)) continue;
        seen.add(ix.programId);

        const label = ix.programName ? ix.programName : truncateMiddle(ix.programId, 6, 6);
        programs.push({ programId: ix.programId, label });
    }

    return programs;
}

function renderAccountInstructionProgramGraph(params: {
    accounts: FlowAccountNode[];
    instructions: FlowInstructionNode[];
    programs: FlowProgramNode[];
}): string {
    const { accounts, instructions, programs } = params;

    const nodeH = 112;
    const rowGap = 18;
    const rowStride = nodeH + rowGap;
    const sectionHeaderH = 24;
    const sectionGap = 26;
    const canvasPadX = 18;
    const canvasPadY = 18;
    const nodeW = 300;

    type Rect = { x: number; y: number; w: number; h: number };
    type Point = { x: number; y: number };

    const viewBoxWidth = 500;
    const x = (viewBoxWidth - nodeW) / 2;
    const w = nodeW;

    const yAccounts = canvasPadY;
    const yAccountsNodes = yAccounts + sectionHeaderH;

    const accountPosByPubkey = new Map<string, Rect>();
    accounts.forEach((a, i) => {
        const y = yAccountsNodes + i * rowStride;
        accountPosByPubkey.set(a.pubkey, { x, y, w, h: nodeH });
    });

    const yInstructions = yAccountsNodes + accounts.length * rowStride + sectionGap;
    const yInstructionsNodes = yInstructions + sectionHeaderH;

    const instructionPosByIndex = new Map<number, Rect>();
    instructions.forEach((ix, i) => {
        const y = yInstructionsNodes + i * rowStride;
        instructionPosByIndex.set(ix.index, { x, y, w, h: nodeH });
    });

    const yPrograms = yInstructionsNodes + instructions.length * rowStride + sectionGap;
    const yProgramsNodes = yPrograms + sectionHeaderH;

    const programPosByProgramId = new Map<string, Rect>();
    programs.forEach((p, i) => {
        const y = yProgramsNodes + i * rowStride;
        programPosByProgramId.set(p.programId, { x, y, w, h: nodeH });
    });

    const width = viewBoxWidth;
    const height = yProgramsNodes + programs.length * rowStride + canvasPadY;

    function centerX(pos: Rect): number {
        return pos.x + pos.w / 2;
    }

    function topHandle(pos: Rect): Point {
        return { x: centerX(pos), y: pos.y };
    }

    function bottomHandle(pos: Rect): Point {
        return { x: centerX(pos), y: pos.y + pos.h };
    }

    function edgePath(from: Point, to: Point): string {
        return `M${from.x} ${from.y} L${to.x} ${to.y}`;
    }

    function renderSectionLabel(label: string, y: number): string {
        return `
            <text x="${x}" y="${y}" fill="var(--cdt-text-muted)" font-size="11" font-weight="700" font-family="ui-monospace, monospace">
                ${escapeHtml(label)}
            </text>
        `;
    }

    function renderHandleCircle(p: Point, stroke: string): string {
        return `
            <circle cx="${p.x}" cy="${p.y}" r="6" fill="var(--cdt-bg-panel)" stroke="${stroke}" stroke-width="2" />
            <circle cx="${p.x}" cy="${p.y}" r="2" fill="${stroke}" opacity="0.9" />
        `;
    }

    function renderCardNode(params: {
        pos: Rect;
        kind: 'account' | 'instruction' | 'program';
        iconSvg: string;
        title: string;
        chip: { label: string; tone?: 'default' | 'accent' | 'info' | 'warning' | 'success' };
        bodyPrimary: string;
        bodySecondary?: string;
        tooltip?: string;
    }): string {
        const { pos, kind, iconSvg, title, chip, bodyPrimary, bodySecondary, tooltip } = params;
        const tone = chip.tone ?? 'default';
        const tooltipAttr = tooltip ? `title="${escapeHtml(tooltip)}"` : '';
        return `
            <foreignObject x="${pos.x}" y="${pos.y}" width="${pos.w}" height="${pos.h}">
                <div xmlns="http://www.w3.org/1999/xhtml" class="cdt-flow-node-card" data-kind="${kind}" ${tooltipAttr}>
                    <div class="cdt-flow-node-header">
                        <div class="cdt-flow-node-title">${escapeHtml(title)}</div>
                        <span class="cdt-flow-node-chip" data-tone="${tone}">
                            <span class="cdt-flow-node-chip-icon">${iconSvg}</span>
                            ${escapeHtml(chip.label)}
                        </span>
                    </div>
                    <div class="cdt-flow-node-body">
                        <div class="cdt-flow-node-body-primary">${escapeHtml(bodyPrimary)}</div>
                        ${bodySecondary ? `<div class="cdt-flow-node-body-secondary">${escapeHtml(bodySecondary)}</div>` : ''}
                    </div>
                </div>
            </foreignObject>
        `;
    }

    const accountToIxEdges: string[] = [];
    const ixToProgramEdges: string[] = [];

    for (const ix of instructions) {
        const ixPos = instructionPosByIndex.get(ix.index);
        if (!ixPos) continue;

        const edgeAccounts = (() => {
            const set = new Set<string>();
            if (ix.transferFrom) set.add(ix.transferFrom);
            if (ix.transferTo) set.add(ix.transferTo);
            if (set.size) return Array.from(set);
            return ix.accountPubkeys.slice(0, 6);
        })();

        for (const pk of edgeAccounts) {
            const aPos = accountPosByPubkey.get(pk);
            if (!aPos) continue;
            accountToIxEdges.push(
                `<path d="${edgePath(bottomHandle(aPos), topHandle(ixPos))}" stroke="var(--cdt-text-muted)" stroke-opacity="0.40" stroke-width="1.4" stroke-dasharray="6 6" stroke-linecap="round" fill="none" />`,
            );
        }

        const pPos = ix.programId ? programPosByProgramId.get(ix.programId) : undefined;
        if (pPos) {
            ixToProgramEdges.push(
                `<path d="${edgePath(bottomHandle(ixPos), topHandle(pPos))}" stroke="var(--cdt-accent)" stroke-opacity="0.65" stroke-width="1.5" stroke-dasharray="6 6" stroke-linecap="round" fill="none" />`,
            );
        }
    }

    const accountNodes = accounts
        .map(a => {
            const pos = accountPosByPubkey.get(a.pubkey);
            if (!pos) return '';

            const tooltip = [
                `Account #${a.index}`,
                a.pubkey,
                ...(a.source ? [`source: ${a.source}`] : []),
                ...(a.signer ? ['signer'] : []),
                ...(a.writable ? ['writable'] : ['readonly']),
            ].join('\n');

            const flags = [
                ...(a.signer ? ['signer'] : []),
                a.writable ? 'writable' : 'readonly',
            ].join(' • ');

            const tone = a.signer ? 'info' : a.writable ? 'warning' : 'default';

            return renderCardNode({
                pos,
                kind: 'account',
                iconSvg: ICONS.wallet,
                title: `Account #${a.index}`,
                chip: { label: 'Account', tone },
                bodyPrimary: truncateMiddle(a.pubkey, 8, 8),
                bodySecondary: flags,
                tooltip,
            });
        })
        .join('');

    const instructionNodes = instructions
        .map(ix => {
            const pos = instructionPosByIndex.get(ix.index);
            if (!pos) return '';

            const tooltip = [
                `Instruction #${ix.index}`,
                ix.programId ? `program: ${ix.programId}` : 'program: unknown',
                ...(ix.parsedType ? [`type: ${ix.parsedType}`] : []),
                ...(ix.summary ? [`summary: ${ix.summary}`] : []),
                ...(ix.accountPubkeys.length ? [`accounts: ${ix.accountPubkeys.length}`] : []),
            ].join('\n');

            const programLabel = ix.programName
                ? ix.programName
                : ix.programId
                  ? truncateMiddle(ix.programId, 6, 6)
                  : 'unknown';
            const typeSuffix = ix.parsedType ? `:${ix.parsedType}` : '';
            const headerTitle = `${programLabel}${typeSuffix}`;

            const isTransfer = Boolean(ix.parsedType && ix.parsedType.toLowerCase().includes('transfer'));
            const chip = isTransfer ? { label: 'Transfer', tone: 'success' as const } : { label: 'Instruction', tone: 'accent' as const };

            const bodyPrimary = ix.summary ? ix.summary : `Ix #${ix.index}`;
            const bodySecondary = ix.summary
                ? `Ix #${ix.index} • ${ix.accountPubkeys.length} accounts`
                : ix.accountPubkeys.length
                  ? `${ix.accountPubkeys.length} accounts`
                  : undefined;

            return renderCardNode({
                pos,
                kind: 'instruction',
                iconSvg: ICONS.transactions,
                title: headerTitle,
                chip,
                bodyPrimary,
                bodySecondary,
                tooltip,
            });
        })
        .join('');

    const programNodes = programs
        .map(p => {
            const pos = programPosByProgramId.get(p.programId);
            if (!pos) return '';

            const tooltip = `Program\n${p.programId}`;
            return renderCardNode({
                pos,
                kind: 'program',
                iconSvg: ICONS.code,
                title: p.label,
                chip: { label: 'Program', tone: 'default' },
                bodyPrimary: truncateMiddle(p.programId, 10, 10),
                bodySecondary: undefined,
                tooltip,
            });
        })
        .join('');

    const handleMarks = (() => {
        const marks: string[] = [];

        for (const a of accounts) {
            const pos = accountPosByPubkey.get(a.pubkey);
            if (!pos) continue;
            const stroke = a.signer ? 'var(--cdt-info)' : a.writable ? 'var(--cdt-warning)' : 'var(--cdt-border)';
            marks.push(renderHandleCircle(bottomHandle(pos), stroke));
        }

        for (const ix of instructions) {
            const pos = instructionPosByIndex.get(ix.index);
            if (!pos) continue;
            const stroke = 'var(--cdt-accent)';
            marks.push(renderHandleCircle(topHandle(pos), stroke));
            marks.push(renderHandleCircle(bottomHandle(pos), stroke));
        }

        for (const p of programs) {
            const pos = programPosByProgramId.get(p.programId);
            if (!pos) continue;
            marks.push(renderHandleCircle(topHandle(pos), 'var(--cdt-accent)'));
        }

        return marks.join('');
    })();

    return `
        <svg
            class="cdt-flow-svg"
            width="100%"
            height="100%"
            viewBox="0 0 ${width} ${height}"
            preserveAspectRatio="xMidYMid meet"
            role="img"
            aria-label="Accounts to instructions to programs flow"
        >
            ${renderSectionLabel('Accounts', yAccounts + 16)}
            ${renderSectionLabel('Instructions', yInstructions + 16)}
            ${renderSectionLabel('Programs', yPrograms + 16)}

            ${accountToIxEdges.join('')}
            ${ixToProgramEdges.join('')}

            ${accountNodes}
            ${instructionNodes}
            ${programNodes}

            ${handleMarks}
        </svg>
    `;
}

export function renderTransactionFlowPanel({ selectedTx, selectedDetails }: RenderTransactionFlowPanelParams): string {
    if (!selectedDetails) {
        return `<div class="cdt-empty">No RPC details loaded yet. Select a transaction to fetch details.</div>`;
    }

    if (selectedDetails.error) {
        return `<div class="cdt-json" style="border-color: color-mix(in srgb, var(--cdt-error) 40%, var(--cdt-border)); color: var(--cdt-error);">${escapeHtml(
            selectedDetails.error,
        )}</div>`;
    }

    const rpcTx = selectedDetails.tx as any;
    const rpcTransaction = rpcTx && typeof rpcTx === 'object' ? (rpcTx as any).transaction : undefined;
    const rpcMessage =
        rpcTransaction && typeof rpcTransaction === 'object' ? (rpcTransaction as any).message : undefined;
    const rpcInstructions = Array.isArray(rpcMessage?.instructions) ? (rpcMessage.instructions as unknown[]) : [];
    const rpcAccountKeys = Array.isArray(rpcMessage?.accountKeys) ? (rpcMessage.accountKeys as unknown[]) : [];

    const allAccounts = buildAccountNodes(rpcAccountKeys);
    const accountPubkeys = allAccounts.map(a => a.pubkey);
    const instructions = buildInstructionNodes(rpcInstructions, accountPubkeys);
    const programs = buildProgramNodes(instructions);

    const signatureLabel = truncateMiddle(selectedTx.signature, 10, 10);
    const statusLabel =
        selectedDetails.status?.err && selectedDetails.status.err !== null
            ? 'failed'
            : selectedDetails.status?.confirmationStatus
              ? String(selectedDetails.status.confirmationStatus)
              : selectedTx.status;

    const statusChipClass =
        statusLabel === 'finalized' || statusLabel === 'confirmed'
            ? 'success'
            : statusLabel === 'failed'
              ? 'error'
              : 'info';

    const rawStatus =
        selectedDetails.status?.err && selectedDetails.status.err !== null
            ? safeJsonStringify(selectedDetails.status.err, 2)
            : null;

    const programIds = new Set(programs.map(p => p.programId));
    const displayAccounts = allAccounts.filter(a => !programIds.has(a.pubkey));
    const accountsForGraph = displayAccounts.length ? displayAccounts : allAccounts;

    const graphHtml =
        accountsForGraph.length === 0 && instructions.length === 0
            ? `<div class="cdt-empty">No message accounts/instructions found on this transaction.</div>`
            : `
                <div class="cdt-flow-wrap">
                    ${renderAccountInstructionProgramGraph({ accounts: accountsForGraph, instructions, programs })}
                </div>
            `;

    return `
        <div class="cdt-flow-panel">
            <div class="cdt-details-header" style="margin-bottom: 8px;">
                <div style="display:flex; align-items: center; gap: 10px; min-width: 0;">
                    <div class="cdt-details-title">Flow</div>
                    <span class="cdt-pill ${statusChipClass}">${escapeHtml(statusLabel)}</span>
                    <span class="cdt-pill" title="${escapeHtml(selectedTx.signature)}">${escapeHtml(signatureLabel)}</span>
                </div>
            </div>

            <div class="cdt-flow-legend">
                <div class="cdt-flow-legend-item"><span class="cdt-flow-dot" style="background: var(--cdt-info)"></span><span>signer</span></div>
                <div class="cdt-flow-legend-item"><span class="cdt-flow-dot" style="background: var(--cdt-warning)"></span><span>writable</span></div>
                <div class="cdt-flow-legend-item"><span class="cdt-flow-dot" style="background: var(--cdt-text-muted)"></span><span>readonly</span></div>
                <div class="cdt-flow-legend-item"><span class="cdt-flow-line" style="background: var(--cdt-accent)"></span><span>invokes</span></div>
                <div class="cdt-flow-legend-item"><span class="cdt-flow-line" style="background: var(--cdt-success)"></span><span>transfer trail</span></div>
                <div class="cdt-flow-legend-note">Built from <span class="cdt-mono">message</span> + parsed RPC.</div>
            </div>

            ${selectedDetails.isLoading ? `<div class="cdt-empty">Loading RPC details…</div>` : ''}

            ${graphHtml}

            ${
                rawStatus
                    ? `<details class="cdt-details-section">
                        <summary>Status error</summary>
                        <div class="cdt-details-section-content">
                            <pre class="cdt-json">${escapeHtml(rawStatus)}</pre>
                        </div>
                    </details>`
                    : ''
            }
        </div>
    `;
}

