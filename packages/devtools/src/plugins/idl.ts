/**
 * IDL Plugin
 *
 * Goal: Provide an Explorer-like "Interact with IDL" experience inside @solana/devtools,
 * but using the currently-connected @solana/connector wallet session.
 *
 * Notes:
 * - DOM-only UI (framework-agnostic)
 * - Chain-first IDL sourcing via Program Metadata (seed: "idl")
 * - Optional local overrides (paste / file upload)
 */

import type { ConnectorDevtoolsPlugin, PluginContext } from '../types';
import { ICONS } from '../components/icons';
import { escapeAttr, escapeHtml, getExplorerUrl, getRpcUrl } from '../utils/dom';
import { fetchProgramMetadataIdl } from '../utils/idl';
import { PublicKey } from '@solana/web3.js';
import { isAccountGroup } from './idl/account-tree';
import { getInstructionList, isModernAnchorIdl } from './idl/anchor-idl';
import { findKnownAddressForAccountName, isPrefilledAccountName, isWalletAccountName } from './idl/account-patterns';
import { buildAnchorInstruction } from './idl/build-anchor-instruction';
import { findDefaultValueForArgumentType } from './idl/default-values';
import { isRecord } from './idl/guards';
import { readFileAsText } from './idl/file';
import { getInputKey } from './idl/keys';
import { camelCase } from './idl/naming';
import { computePdasForInstruction, type PdaGenerationResult } from './idl/pda';
import { IDL_STYLES } from './idl/styles';
import type {
    AnchorIdlInstruction,
    AnchorIdlInstructionAccount,
    AnchorIdlInstructionAccountItem,
    AnchorIdlInstructionArg,
    AnchorIdlLike,
    IdlPluginState,
    IdlSource,
} from './idl/types';

function isMainnetCluster(clusterId: string | null | undefined): boolean {
    if (!clusterId) return false;
    return clusterId.includes('mainnet');
}

export function createIdlPlugin(): ConnectorDevtoolsPlugin {
    let unsubscribeClient: (() => void) | undefined;
    let unsubscribeContext: (() => void) | undefined;

    let renderFn: (() => void) | undefined;
    let fetchRequestId = 0;
    let executeRequestId = 0;

    let state: IdlPluginState = {
        source: 'program-metadata',
        programIdInput: '',
        pasteJson: '',
        isFetchingIdl: false,
        fetchError: null,
        idl: null,
        idlKind: null,
        selectedIxName: null,
        accountValues: {},
        argValues: {},
        autoFilled: {},
        lockPdas: true,
        isExecuting: false,
        executeError: null,
        lastSignature: null,
    };

    function setState(partial: Partial<IdlPluginState>) {
        state = { ...state, ...partial };
        renderFn?.();
    }

    function setIdl(nextIdl: unknown | null, opts?: { resetSelection?: boolean }) {
        const idlKind: IdlPluginState['idlKind'] = nextIdl
            ? isModernAnchorIdl(nextIdl)
                ? 'anchor'
                : 'unsupported'
            : null;
        const instructions = nextIdl ? getInstructionList(nextIdl) : [];

        const nextSelection =
            opts?.resetSelection === false ? state.selectedIxName : instructions.length ? instructions[0].name : null;

        setState({
            idl: nextIdl,
            idlKind,
            selectedIxName: nextSelection,
            fetchError: null,
            executeError: null,
            lastSignature: null,
        });
    }

    async function loadFromProgramMetadata(ctx: PluginContext) {
        const programId = state.programIdInput.trim();
        const rpcUrl = getRpcUrl(ctx);

        if (!programId) {
            setState({ fetchError: 'Enter a program id.', isFetchingIdl: false });
            return;
        }
        if (!rpcUrl) {
            setState({
                fetchError: 'No RPC URL available (set devtools config.rpcUrl or ensure connector has an RPC URL).',
                isFetchingIdl: false,
            });
            return;
        }

        const requestId = ++fetchRequestId;
        setState({ isFetchingIdl: true, fetchError: null });

        try {
            const idl = await fetchProgramMetadataIdl({ programId, rpcUrl });
            if (requestId !== fetchRequestId) return;
            setIdl(idl, { resetSelection: true });
        } catch (err) {
            if (requestId !== fetchRequestId) return;
            setIdl(null, { resetSelection: true });
            setState({ fetchError: err instanceof Error ? err.message : 'Failed to fetch IDL' });
        } finally {
            if (requestId === fetchRequestId) setState({ isFetchingIdl: false });
        }
    }

    async function loadFromAnchorIdl(ctx: PluginContext) {
        const programIdStr = state.programIdInput.trim();
        const rpcUrl = getRpcUrl(ctx);

        if (!programIdStr) {
            setState({ fetchError: 'Enter a program id.', isFetchingIdl: false });
            return;
        }
        if (!rpcUrl) {
            setState({
                fetchError: 'No RPC URL available (set devtools config.rpcUrl or ensure connector has an RPC URL).',
                isFetchingIdl: false,
            });
            return;
        }

        const requestId = ++fetchRequestId;
        setState({ isFetchingIdl: true, fetchError: null });

        try {
            const [{ Connection, Keypair, PublicKey }, anchorMod] = await Promise.all([
                import('@solana/web3.js'),
                import('@coral-xyz/anchor'),
            ]);

            const { AnchorProvider, Program } = anchorMod as any;

            const connection = new Connection(rpcUrl, 'confirmed');

            const snapshot = ctx.client.getSnapshot();
            const payerPubkey = snapshot.selectedAccount
                ? new PublicKey(String(snapshot.selectedAccount))
                : Keypair.generate().publicKey;

            const walletForAnchor = {
                publicKey: payerPubkey,
                signTransaction: async (tx: any) => tx,
                signAllTransactions: async (txs: any[]) => txs,
            };

            const provider = new AnchorProvider(connection, walletForAnchor, {});
            const programId = new PublicKey(programIdStr);

            const idl = await Program.fetchIdl(programId, provider);
            if (!idl) throw new Error('Anchor IDL not found for this program.');

            const normalized = (() => {
                if (!isRecord(idl)) return idl;

                const maybeMetadata = isRecord((idl as any).metadata)
                    ? ((idl as any).metadata as Record<string, unknown>)
                    : {};
                const rootVersion = typeof (idl as any).version === 'string' ? (idl as any).version : undefined;
                const metaVersion =
                    typeof maybeMetadata.version === 'string'
                        ? (maybeMetadata.version as string)
                        : (rootVersion ?? 'unknown');

                const metaSpec = typeof maybeMetadata.spec === 'string' ? (maybeMetadata.spec as string) : undefined;

                return {
                    ...(idl as any),
                    address: typeof (idl as any).address === 'string' ? (idl as any).address : programIdStr,
                    metadata: {
                        ...(maybeMetadata as any),
                        ...(metaSpec ? { spec: metaSpec } : {}),
                        ...(metaVersion ? { version: metaVersion } : {}),
                    },
                } as unknown;
            })();

            if (requestId !== fetchRequestId) return;
            setIdl(normalized, { resetSelection: true });
        } catch (err) {
            if (requestId !== fetchRequestId) return;
            setIdl(null, { resetSelection: true });
            setState({ fetchError: err instanceof Error ? err.message : 'Failed to fetch Anchor IDL' });
        } finally {
            if (requestId === fetchRequestId) setState({ isFetchingIdl: false });
        }
    }

    function loadFromPaste() {
        const raw = state.pasteJson.trim();
        if (!raw) {
            setState({ fetchError: 'Paste an IDL JSON first.' });
            return;
        }
        try {
            const parsed = JSON.parse(raw) as unknown;
            setIdl(parsed, { resetSelection: true });
        } catch (err) {
            setIdl(null, { resetSelection: true });
            setState({ fetchError: err instanceof Error ? err.message : 'Failed to parse JSON' });
        }
    }

    async function loadFromFile(file: File) {
        try {
            const text = await readFileAsText(file);
            const parsed = JSON.parse(text) as unknown;
            setIdl(parsed, { resetSelection: true });
        } catch (err) {
            setIdl(null, { resetSelection: true });
            setState({ fetchError: err instanceof Error ? err.message : 'Failed to load file' });
        }
    }

    function getConnectedWalletState(ctx: PluginContext) {
        const snapshot = ctx.client.getSnapshot();
        const wallet = snapshot.selectedWallet ?? null;
        const selectedAccount = snapshot.selectedAccount ? String(snapshot.selectedAccount) : null;
        const accountInfo = selectedAccount ? snapshot.accounts.find(a => String(a.address) === selectedAccount) : null;
        const accountRaw = accountInfo?.raw ?? null;

        return {
            snapshot,
            wallet,
            selectedAccount,
            accountRaw,
        };
    }

    async function executeSelectedInstruction(ctx: PluginContext, ixName: string) {
        const { snapshot, wallet, accountRaw } = getConnectedWalletState(ctx);
        if (!snapshot.connected || !wallet || !accountRaw) {
            setState({ executeError: 'Connect a wallet first.', isExecuting: false });
            return;
        }

        if (!state.idl || state.idlKind !== 'anchor') {
            setState({
                executeError: 'No supported IDL loaded. Fetch or load a modern Anchor IDL first.',
                isExecuting: false,
            });
            return;
        }

        const requestId = ++executeRequestId;
        setState({ isExecuting: true, executeError: null, lastSignature: null });

        try {
            const clusterId = snapshot.cluster?.id ?? ctx.client.getCluster()?.id;
            if (isMainnetCluster(clusterId)) {
                const ok = confirm(
                    `You are on mainnet. This will send a real transaction.\n\nInstruction: ${ixName}\nProgram: ${state.programIdInput.trim()}\n\nContinue?`,
                );
                if (!ok) {
                    setState({ isExecuting: false, executeError: 'Cancelled.' });
                    return;
                }
            }

            const { tx } = await buildAnchorInstruction({
                ctx,
                idl: state.idl as AnchorIdlLike,
                ixName,
                programIdInput: state.programIdInput,
                accountValues: state.accountValues,
                argValues: state.argValues,
            });

            // Serialize for Wallet Standard.
            const serialized = tx.serialize({ requireAllSignatures: false, verifySignatures: false });

            // Emit devtools-friendly lifecycle events (consumed by core.ts cache + Transactions tab).
            ctx.client.emitEvent({
                type: 'transaction:preparing',
                transaction: serialized,
                size: serialized.length,
                timestamp: new Date().toISOString(),
            } as any);

            ctx.client.emitEvent({
                type: 'transaction:signing',
                timestamp: new Date().toISOString(),
            } as any);

            const sendFeature = (wallet as any).features?.['solana:signAndSendTransaction'];
            if (!sendFeature || typeof sendFeature.signAndSendTransaction !== 'function') {
                throw new Error('Wallet does not support solana:signAndSendTransaction.');
            }

            const inputBase: Record<string, unknown> = {
                account: accountRaw,
                ...(snapshot.cluster ? { chain: snapshot.cluster.id } : {}),
            };

            let result: unknown;
            try {
                result = await sendFeature.signAndSendTransaction({
                    ...inputBase,
                    transactions: [serialized],
                });
            } catch {
                result = await sendFeature.signAndSendTransaction({
                    ...inputBase,
                    transaction: serialized,
                });
            }

            // Extract signature (string or bytes) as base58 string.
            const { getBase58Decoder } = await import('@solana/codecs');
            const base58Decoder = getBase58Decoder();

            function signatureBytesToBase58(bytes: Uint8Array): string {
                if (bytes.length !== 64)
                    throw new Error(`Invalid signature length: expected 64 bytes, got ${bytes.length}`);
                return base58Decoder.decode(bytes);
            }

            function extractSignatureString(value: unknown): string {
                if (typeof value === 'string') return value;
                if (value instanceof Uint8Array) return signatureBytesToBase58(value);
                if (Array.isArray(value) && value.length > 0) return extractSignatureString(value[0]);
                if (value && typeof value === 'object') {
                    const record = value as Record<string, unknown>;
                    if ('signature' in record) return extractSignatureString(record.signature);
                    if (Array.isArray(record.signatures) && record.signatures.length > 0)
                        return extractSignatureString(record.signatures[0]);
                }
                throw new Error('Unexpected wallet response format for signAndSendTransaction');
            }

            const signature = extractSignatureString(result);

            ctx.client.emitEvent({
                type: 'transaction:sent',
                signature,
                timestamp: new Date().toISOString(),
            } as any);

            if (requestId !== executeRequestId) return;
            setState({ lastSignature: signature, isExecuting: false });
        } catch (err) {
            if (requestId !== executeRequestId) return;
            setState({
                executeError: err instanceof Error ? err.message : 'Failed to execute instruction',
                isExecuting: false,
            });
        }
    }

    return {
        id: 'idl',
        name: 'IDL',
        icon: ICONS.idl,

        render(el: HTMLElement, ctx: PluginContext) {
            function renderContent() {
                const snapshot = ctx.client.getSnapshot();
                const rpcUrl = getRpcUrl(ctx);
                const instructions = state.idl ? getInstructionList(state.idl) : [];
                const selectedIx = state.selectedIxName
                    ? (instructions.find(ix => ix.name === state.selectedIxName) ?? null)
                    : null;

                const clusterId = snapshot.cluster?.id ?? ctx.client.getCluster()?.id ?? null;
                const walletAddress = snapshot.selectedAccount ? String(snapshot.selectedAccount) : null;

                let pdaByKey: Record<string, PdaGenerationResult> = {};

                // Explorer-like prefills: default args, known accounts, wallet accounts, PDAs.
                if (state.idlKind === 'anchor' && state.idl && selectedIx) {
                    const ixName = selectedIx.name;

                    // 1) Default argument values (best-effort, only fill empty fields).
                    for (const arg of selectedIx.args ?? []) {
                        if (!arg || typeof arg.name !== 'string') continue;
                        const key = getInputKey(ixName, arg.name);
                        const current = (state.argValues[key] ?? '').trim();
                        if (current) continue;
                        const next = findDefaultValueForArgumentType(arg.type, walletAddress);
                        if (next) state.argValues[key] = next;
                    }

                    // 2) Known + wallet account prefills (only fill empty fields).
                    const walkAccounts = (items: AnchorIdlInstructionAccountItem[], path: string[] = []) => {
                        for (const item of items) {
                            if (!item || typeof (item as any).name !== 'string') continue;
                            if (isAccountGroup(item)) {
                                walkAccounts(item.accounts ?? [], [...path, item.name]);
                                continue;
                            }

                            const meta = item as AnchorIdlInstructionAccount;
                            const key = getInputKey(ixName, ...path, meta.name);
                            const current = (state.accountValues[key] ?? '').trim();
                            if (current) continue;

                            // Fixed address (if present) overrides other prefills.
                            if (typeof meta.address === 'string' && meta.address.trim()) {
                                state.accountValues[key] = meta.address.trim();
                                state.autoFilled[key] = meta.address.trim();
                                continue;
                            }

                            const known = findKnownAddressForAccountName(meta.name);
                            if (known) {
                                state.accountValues[key] = known;
                                state.autoFilled[key] = known;
                                continue;
                            }

                            if (!walletAddress) continue;
                            if (isPrefilledAccountName(meta.name)) continue;

                            const hasPda = Boolean(meta.pda);
                            const shouldPrefillWallet =
                                Boolean(meta.isSigner) || isWalletAccountName(meta.name) || (meta.isMut && !hasPda);

                            if (shouldPrefillWallet) {
                                state.accountValues[key] = walletAddress;
                                state.autoFilled[key] = walletAddress;
                            }
                        }
                    };

                    walkAccounts(selectedIx.accounts ?? []);

                    // 3) PDA prefills (compute and fill when empty/auto-filled).
                    pdaByKey = computePdasForInstruction({
                        accountValues: state.accountValues,
                        argValues: state.argValues,
                        idl: state.idl as AnchorIdlLike,
                        instruction: selectedIx,
                        ixName,
                    });

                    for (const [key, result] of Object.entries(pdaByKey)) {
                        if (!result.generated) continue;

                        const current = (state.accountValues[key] ?? '').trim();
                        const lastAuto = state.autoFilled[key];

                        const isEmpty = !current;
                        const neverTracked = lastAuto === undefined;
                        const wasAutoFilled = lastAuto !== undefined && current === lastAuto;

                        const shouldAutoFill = isEmpty || wasAutoFilled || neverTracked;
                        if (shouldAutoFill && current !== result.generated) {
                            state.accountValues[key] = result.generated;
                            state.autoFilled[key] = result.generated;
                        }
                    }
                }

                const idlHeader = (() => {
                    if (!state.idl) return `<span class="cdt-pill">No IDL loaded</span>`;
                    if (state.idlKind === 'anchor') return `<span class="cdt-pill success">Modern Anchor IDL</span>`;
                    return `<span class="cdt-pill warn">Unsupported IDL</span>`;
                })();

                const fetchStatus = state.isFetchingIdl
                    ? `<span class="cdt-pill">Fetching…</span>`
                    : state.fetchError
                      ? `<span class="cdt-pill warn">${escapeHtml(state.fetchError)}</span>`
                      : '';

                const executeStatus = state.isExecuting
                    ? `<span class="cdt-pill">Executing…</span>`
                    : state.executeError
                      ? `<span class="cdt-pill warn">${escapeHtml(state.executeError)}</span>`
                      : state.lastSignature
                        ? `<span class="cdt-pill success">Sent</span>`
                        : '';

                const sourceControls = (() => {
                    if (state.source === 'program-metadata' || state.source === 'anchor-idl') {
                        return `
                            <button class="cdt-btn cdt-btn-secondary" id="cdt-idl-fetch" ${state.isFetchingIdl ? 'disabled' : ''}>
                                ${ICONS.refresh} Fetch
                            </button>
                        `;
                    }
                    if (state.source === 'paste') {
                        return `
                            <button class="cdt-btn cdt-btn-secondary" id="cdt-idl-load-paste">
                                ${ICONS.check} Load
                            </button>
                        `;
                    }
                    return `
                        <label class="cdt-btn cdt-btn-secondary" style="display:inline-flex; align-items:center; gap:6px; cursor:pointer;">
                            ${ICONS.copy} Choose file
                            <input type="file" id="cdt-idl-file" accept="application/json" style="display:none;" />
                        </label>
                    `;
                })();

                const pasteArea =
                    state.source === 'paste'
                        ? `
                            <textarea class="cdt-textarea" id="cdt-idl-paste" placeholder="Paste IDL JSON here...">${escapeHtml(state.pasteJson)}</textarea>
                        `
                        : '';

                const instructionsHtml = instructions.length
                    ? instructions
                          .map(ix => {
                              const selected = selectedIx?.name === ix.name;
                              return `
                                <div class="cdt-idl-item" data-ix="${escapeAttr(ix.name)}" data-selected="${selected}">
                                    <div class="cdt-idl-item-name">${escapeHtml(ix.name)}</div>
                                    <div class="cdt-idl-item-meta">
                                        <span class="cdt-pill">${(ix.accounts?.length ?? 0).toString()} accts</span>
                                        <span class="cdt-pill">${(ix.args?.length ?? 0).toString()} args</span>
                                    </div>
                                </div>
                            `;
                          })
                          .join('')
                    : `<div class="cdt-empty">${state.idl ? 'No instructions found.' : 'Load an IDL to begin.'}</div>`;

                const detailsHtml = (() => {
                    if (!state.idl) {
                        return `
                            <div class="cdt-empty">
                                Provide a program id, fetch IDL from chain (Program Metadata), or load a local IDL.\n
                                RPC: ${escapeHtml(rpcUrl ?? 'N/A')}\n
                                Wallet: ${escapeHtml(walletAddress ?? 'Not connected')}
                            </div>
                        `;
                    }

                    if (state.idlKind !== 'anchor') {
                        return `
                            <div class="cdt-empty">
                                This IDL format isn’t supported yet. For v1, devtools supports modern Anchor IDLs.\n
                                Tip: Use the “Paste JSON” source to load an Anchor IDL directly.
                            </div>
                        `;
                    }

                    if (!selectedIx) {
                        return `<div class="cdt-empty">Select an instruction.</div>`;
                    }

                    const selectedIxName = selectedIx.name;

                    const accountsMeta = (selectedIx.accounts ?? []) as AnchorIdlInstructionAccountItem[];
                    const argsMeta = (selectedIx.args ?? []) as AnchorIdlInstructionArg[];

                    function countAccountLeaves(items: AnchorIdlInstructionAccountItem[]): number {
                        let count = 0;
                        for (const item of items) {
                            if (!item || typeof (item as any).name !== 'string') continue;
                            if (isAccountGroup(item)) count += countAccountLeaves(item.accounts ?? []);
                            else count += 1;
                        }
                        return count;
                    }

                    function renderAccountItems(items: AnchorIdlInstructionAccountItem[], path: string[] = []): string {
                        if (!items.length) return '';

                        return items
                            .map(item => {
                                if (!item || typeof (item as any).name !== 'string') return '';

                                if (isAccountGroup(item)) {
                                    const inner = renderAccountItems(item.accounts ?? [], [...path, item.name]);
                                    if (!inner) return '';
                                    return `
                                        <div class="cdt-field-group">
                                            <div class="cdt-field-group-title">${escapeHtml(item.name)}</div>
                                            <div class="cdt-field-group-body">${inner}</div>
                                        </div>
                                    `;
                                }

                                const meta = item as AnchorIdlInstructionAccount;
                                const key = getInputKey(selectedIxName, ...path, meta.name);
                                const value = state.accountValues[key] ?? '';

                                const isAuto =
                                    state.autoFilled[key] !== undefined && value.trim() === state.autoFilled[key];
                                const pdaInfo = pdaByKey[key];
                                const isPda = Boolean(pdaInfo);
                                const isKnown = Boolean(findKnownAddressForAccountName(meta.name) || meta.address);
                                const isWalletValue = Boolean(walletAddress && value.trim() === walletAddress);

                                const badges = [
                                    meta.optional ? `<span class="cdt-pill">optional</span>` : '',
                                    meta.isSigner
                                        ? `<span class="cdt-pill info">signer</span>`
                                        : `<span class="cdt-pill">account</span>`,
                                    meta.isMut === true
                                        ? `<span class="cdt-pill warn">writable</span>`
                                        : `<span class="cdt-pill">readonly</span>`,
                                    isPda ? `<span class="cdt-pill">pda</span>` : '',
                                    isKnown ? `<span class="cdt-pill">known</span>` : '',
                                    isWalletValue ? `<span class="cdt-pill info">wallet</span>` : '',
                                    isAuto ? `<span class="cdt-pill info">auto</span>` : '',
                                ]
                                    .filter(Boolean)
                                    .join(' ');

                                const showUseWallet = Boolean(walletAddress);
                                const pdaSeedsHtml =
                                    isPda && pdaInfo?.seeds?.length
                                        ? `
                                            <details style="margin-top: 8px;">
                                                <summary style="cursor:pointer; font-size: 11px; color: var(--cdt-text-muted);">PDA seeds</summary>
                                                <div class="cdt-kv cdt-kv-compact" style="margin-top: 8px;">
                                                    ${pdaInfo.seeds
                                                        .map(s => {
                                                            const v = s.value ?? 'N/A';
                                                            return `<div class="cdt-k">${escapeHtml(s.name)}</div><div class="cdt-v">${escapeHtml(v)}</div>`;
                                                        })
                                                        .join('')}
                                                </div>
                                            </details>
                                        `
                                        : '';

                                const readOnlyAttr = isPda && state.lockPdas && isAuto ? 'readonly' : '';

                                return `
                                    <div class="cdt-field">
                                        <div class="cdt-field-head">
                                            <div class="cdt-field-name">${escapeHtml(meta.name)}</div>
                                            <div class="cdt-field-badges">${badges}</div>
                                        </div>
                                        <div class="cdt-field-input-row">
                                            <input class="cdt-input" data-kind="account" data-key="${escapeAttr(key)}" value="${escapeAttr(value)}" placeholder="pubkey (base58)" ${readOnlyAttr} />
                                            ${
                                                showUseWallet
                                                    ? `<button class="cdt-btn cdt-btn-ghost cdt-btn-icon" data-use-wallet="${escapeAttr(key)}" title="Use connected wallet address">${ICONS.wallet}</button>`
                                                    : ''
                                            }
                                        </div>
                                        ${pdaSeedsHtml}
                                    </div>
                                `;
                            })
                            .join('');
                    }

                    const accountsLeafCount = countAccountLeaves(accountsMeta);
                    const accountsRows = accountsLeafCount
                        ? renderAccountItems(accountsMeta)
                        : `<div class="cdt-empty">No accounts.</div>`;

                    const argsRows = argsMeta.length
                        ? argsMeta
                              .map(meta => {
                                  const key = getInputKey(selectedIxName, meta.name);
                                  const value = state.argValues[key] ?? '';
                                  const typePreview = isRecord(meta.type)
                                      ? safeTypePreview(meta.type)
                                      : String(meta.type ?? '');
                                  return `
                                        <div class="cdt-field">
                                            <div class="cdt-field-head">
                                                <div class="cdt-field-name">${escapeHtml(meta.name)}</div>
                                                <div class="cdt-field-badges"><span class="cdt-pill">${escapeHtml(typePreview)}</span></div>
                                            </div>
                                            <input class="cdt-input" data-kind="arg" data-key="${escapeAttr(key)}" value="${escapeAttr(value)}" placeholder="value" />
                                        </div>
                                    `;
                              })
                              .join('')
                        : `<div class="cdt-empty">No arguments.</div>`;

                    const sigHtml = state.lastSignature
                        ? `
                            <div class="cdt-card">
                                <div class="cdt-card-title">Last signature</div>
                                <div class="cdt-kv cdt-kv-compact">
                                    <div class="cdt-k">signature</div>
                                    <div class="cdt-v">${escapeHtml(state.lastSignature)}</div>
                                </div>
                                <div style="margin-top: 8px; display:flex; gap:6px; flex-wrap:wrap;">
                                    <button class="cdt-btn cdt-btn-secondary" id="cdt-idl-copy-sig">${ICONS.copy} Copy</button>
                                    <a class="cdt-btn cdt-btn-ghost" href="${getExplorerUrl(state.lastSignature, clusterId ?? undefined)}" target="_blank" rel="noopener noreferrer">
                                        ${ICONS.external} Explorer
                                    </a>
                                </div>
                            </div>
                        `
                        : '';

                    return `
                        <div class="cdt-details-header">
                            <div class="cdt-details-title">${escapeHtml(selectedIx.name)}</div>
                            <div style="display:flex; gap:6px; flex-wrap:wrap; justify-content:flex-end;">
                                <button class="cdt-btn cdt-btn-secondary" id="cdt-idl-reset" title="Clear inputs and re-apply auto-prefills">
                                    ${ICONS.refresh} Reset
                                </button>
                                <button class="cdt-btn cdt-btn-secondary" id="cdt-idl-toggle-pda-lock" title="Toggle whether PDA fields are editable">
                                    ${state.lockPdas ? 'PDAs: Locked' : 'PDAs: Editable'}
                                </button>
                                <button class="cdt-btn cdt-btn-primary" id="cdt-idl-exec" ${state.isExecuting ? 'disabled' : ''}>
                                    ${ICONS.play} Execute
                                </button>
                            </div>
                        </div>

                        ${executeStatus ? `<div class="cdt-status-row">${executeStatus}</div>` : ''}

                        <details class="cdt-details-section" open>
                            <summary><span class="cdt-chevron">${ICONS.chevronDown}</span>Accounts (${accountsLeafCount})</summary>
                            <div class="cdt-details-section-content">${accountsRows}</div>
                        </details>

                        <details class="cdt-details-section" open>
                            <summary><span class="cdt-chevron">${ICONS.chevronDown}</span>Arguments (${argsMeta.length})</summary>
                            <div class="cdt-details-section-content">${argsRows}</div>
                        </details>

                        ${sigHtml}
                    `;
                })();

                el.innerHTML = `
                    <div class="cdt-idl">
                        <style>${IDL_STYLES}</style>

                        <div class="cdt-idl-toolbar">
                            <div class="cdt-idl-toolbar-left">
                                ${idlHeader}
                                ${fetchStatus}
                                ${rpcUrl ? `<span class="cdt-pill">RPC ${escapeHtml(rpcUrl.replace(/^https?:\/\//, ''))}</span>` : `<span class="cdt-pill warn">No RPC</span>`}
                                ${walletAddress ? `<span class="cdt-pill info">Wallet ${escapeHtml(walletAddress.slice(0, 4))}…${escapeHtml(walletAddress.slice(-4))}</span>` : `<span class="cdt-pill">Wallet none</span>`}
                                ${clusterId ? `<span class="cdt-pill">${escapeHtml(clusterId)}</span>` : ''}
                            </div>
                            <div class="cdt-idl-toolbar-right">
                                <input class="cdt-input" id="cdt-program-id" placeholder="Program id (base58)" value="${escapeAttr(state.programIdInput)}" />
                                <select class="cdt-events-filter" id="cdt-idl-source">
                                    <option value="program-metadata" ${state.source === 'program-metadata' ? 'selected' : ''}>Program Metadata</option>
                                    <option value="anchor-idl" ${state.source === 'anchor-idl' ? 'selected' : ''}>Anchor IDL</option>
                                    <option value="paste" ${state.source === 'paste' ? 'selected' : ''}>Paste JSON</option>
                                    <option value="file" ${state.source === 'file' ? 'selected' : ''}>Upload JSON</option>
                                </select>
                                ${sourceControls}
                            </div>
                        </div>

                        ${pasteArea ? `<div style="padding: 12px; border-bottom: 1px solid var(--cdt-border); background: var(--cdt-bg);">${pasteArea}</div>` : ''}

                        <div class="cdt-idl-body">
                            <div class="cdt-idl-pane">
                                <div class="cdt-section-title">Instructions</div>
                                <div>${instructionsHtml}</div>
                            </div>
                            <div class="cdt-idl-details">
                                ${detailsHtml}
                            </div>
                        </div>
                    </div>
                `;

                function updatePdasInDom() {
                    if (state.idlKind !== 'anchor' || !state.idl || !selectedIx) return;

                    const ixName = selectedIx.name;
                    const next = computePdasForInstruction({
                        accountValues: state.accountValues,
                        argValues: state.argValues,
                        idl: state.idl as AnchorIdlLike,
                        instruction: selectedIx,
                        ixName,
                    });

                    // Build quick lookup for current account inputs.
                    const inputs = new Map<string, HTMLInputElement>();
                    el.querySelectorAll<HTMLInputElement>('input[data-kind="account"][data-key]').forEach(input => {
                        const k = input.getAttribute('data-key');
                        if (k) inputs.set(k, input);
                    });

                    for (const [key, result] of Object.entries(next)) {
                        if (!result.generated) continue;

                        const current = (state.accountValues[key] ?? '').trim();
                        const lastAuto = state.autoFilled[key];

                        const isEmpty = !current;
                        const neverTracked = lastAuto === undefined;
                        const wasAutoFilled = lastAuto !== undefined && current === lastAuto;

                        const shouldAutoFill = isEmpty || wasAutoFilled;
                        if (!shouldAutoFill) continue;

                        if (current !== result.generated) {
                            state.accountValues[key] = result.generated;
                            state.autoFilled[key] = result.generated;

                            const input = inputs.get(key);
                            if (input) {
                                // Only mutate the DOM if the input still has the old value.
                                if (input.value.trim() === current) input.value = result.generated;
                            }
                        }
                    }
                }

                // --- Wire up handlers ---
                const programIdInput = el.querySelector<HTMLInputElement>('#cdt-program-id');
                programIdInput?.addEventListener('input', () => {
                    state.programIdInput = programIdInput.value;
                });

                const sourceSelect = el.querySelector<HTMLSelectElement>('#cdt-idl-source');
                sourceSelect?.addEventListener('change', () => {
                    const next = (sourceSelect.value as IdlSource) ?? 'program-metadata';
                    setState({ source: next, fetchError: null });
                });

                const fetchBtn = el.querySelector<HTMLButtonElement>('#cdt-idl-fetch');
                fetchBtn?.addEventListener('click', () => {
                    if (state.source === 'anchor-idl') {
                        loadFromAnchorIdl(ctx);
                        return;
                    }
                    loadFromProgramMetadata(ctx);
                });

                const loadPasteBtn = el.querySelector<HTMLButtonElement>('#cdt-idl-load-paste');
                loadPasteBtn?.addEventListener('click', () => {
                    loadFromPaste();
                });

                const pasteEl = el.querySelector<HTMLTextAreaElement>('#cdt-idl-paste');
                pasteEl?.addEventListener('input', () => {
                    state.pasteJson = pasteEl.value;
                });

                const fileEl = el.querySelector<HTMLInputElement>('#cdt-idl-file');
                fileEl?.addEventListener('change', async () => {
                    const file = fileEl.files?.[0];
                    if (!file) return;
                    await loadFromFile(file);
                });

                el.querySelectorAll<HTMLElement>('.cdt-idl-item[data-ix]').forEach(item => {
                    item.addEventListener('click', () => {
                        const ix = item.getAttribute('data-ix');
                        if (!ix) return;
                        setState({ selectedIxName: ix });
                    });
                });

                el.querySelectorAll<HTMLInputElement>('[data-kind="account"][data-key]').forEach(input => {
                    input.addEventListener('input', () => {
                        const key = input.getAttribute('data-key');
                        if (!key) return;
                        state.accountValues = { ...state.accountValues, [key]: input.value };

                        const auto = state.autoFilled[key];
                        if (auto !== undefined && input.value.trim() !== auto) {
                            const next = { ...state.autoFilled };
                            delete next[key];
                            state.autoFilled = next;
                        }

                        updatePdasInDom();
                    });
                });

                el.querySelectorAll<HTMLInputElement>('[data-kind="arg"][data-key]').forEach(input => {
                    input.addEventListener('input', () => {
                        const key = input.getAttribute('data-key');
                        if (!key) return;
                        state.argValues = { ...state.argValues, [key]: input.value };
                        updatePdasInDom();
                    });
                });

                el.querySelectorAll<HTMLButtonElement>('[data-use-wallet]').forEach(btn => {
                    btn.addEventListener('click', e => {
                        e.preventDefault();
                        const key = btn.getAttribute('data-use-wallet');
                        if (!key || !walletAddress) return;
                        state.accountValues = { ...state.accountValues, [key]: walletAddress };
                        renderFn?.();
                    });
                });

                const resetBtn = el.querySelector<HTMLButtonElement>('#cdt-idl-reset');
                resetBtn?.addEventListener('click', () => {
                    if (!selectedIx) return;
                    const prefix = `${selectedIx.name}.`;

                    const nextAccounts = Object.fromEntries(
                        Object.entries(state.accountValues).filter(([k]) => !k.startsWith(prefix)),
                    );
                    const nextArgs = Object.fromEntries(
                        Object.entries(state.argValues).filter(([k]) => !k.startsWith(prefix)),
                    );
                    const nextAuto = Object.fromEntries(
                        Object.entries(state.autoFilled).filter(([k]) => !k.startsWith(prefix)),
                    );

                    setState({
                        accountValues: nextAccounts,
                        argValues: nextArgs,
                        autoFilled: nextAuto,
                        executeError: null,
                        lastSignature: null,
                    });
                });

                const pdaLockBtn = el.querySelector<HTMLButtonElement>('#cdt-idl-toggle-pda-lock');
                pdaLockBtn?.addEventListener('click', () => {
                    setState({ lockPdas: !state.lockPdas });
                });

                const execBtn = el.querySelector<HTMLButtonElement>('#cdt-idl-exec');
                execBtn?.addEventListener('click', () => {
                    if (!selectedIx) return;
                    executeSelectedInstruction(ctx, selectedIx.name);
                });

                const copySigBtn = el.querySelector<HTMLButtonElement>('#cdt-idl-copy-sig');
                copySigBtn?.addEventListener('click', async () => {
                    if (!state.lastSignature) return;
                    try {
                        await navigator.clipboard.writeText(state.lastSignature);
                    } catch {
                        // ignore
                    }
                });
            }

            function safeTypePreview(type: Record<string, unknown>): string {
                if ('option' in type) return `option`;
                if ('vec' in type) return `vec`;
                if ('array' in type) return `array`;
                if ('defined' in type) return `defined`;
                return 'complex';
            }

            // Store render function for updates
            renderFn = renderContent;

            // Subscribe to connector state changes (wallet, cluster, etc.)
            unsubscribeClient = ctx.client.subscribe(() => renderContent());
            unsubscribeContext = ctx.subscribe(() => renderContent());

            // Initial render
            renderContent();
        },

        destroy() {
            unsubscribeClient?.();
            unsubscribeClient = undefined;
            unsubscribeContext?.();
            unsubscribeContext = undefined;
            renderFn = undefined;
        },
    };
}
