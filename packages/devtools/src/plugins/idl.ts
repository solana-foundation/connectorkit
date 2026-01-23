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
import { fetchProgramMetadataIdl } from '../utils/idl';
import { PublicKey } from '@solana/web3.js';

type IdlSource = 'program-metadata' | 'anchor-idl' | 'paste' | 'file';

interface AnchorIdlInstructionAccount {
    name: string;
    isMut?: boolean;
    isSigner?: boolean;
    optional?: boolean;
    /** Optional PDA definition (Anchor >= 0.30) */
    pda?: unknown;
    /** Optional fixed address (some IDLs include this) */
    address?: string;
}

interface AnchorIdlInstructionAccountGroup {
    name: string;
    accounts: AnchorIdlInstructionAccountItem[];
}

type AnchorIdlInstructionAccountItem = AnchorIdlInstructionAccount | AnchorIdlInstructionAccountGroup;

interface AnchorIdlInstructionArg {
    name: string;
    type: unknown;
}

interface AnchorIdlInstruction {
    name: string;
    accounts?: AnchorIdlInstructionAccountItem[];
    args?: AnchorIdlInstructionArg[];
}

interface AnchorIdlLike {
    address?: string;
    metadata?: { name?: string; version?: string; spec?: string };
    instructions?: AnchorIdlInstruction[];
}

interface IdlPluginState {
    source: IdlSource;
    programIdInput: string;
    pasteJson: string;
    isFetchingIdl: boolean;
    fetchError: string | null;
    idl: unknown | null;
    idlKind: 'anchor' | 'unsupported' | null;
    selectedIxName: string | null;
    /** Keyed as `${ixName}.${fieldName}` */
    accountValues: Record<string, string>;
    /** Keyed as `${ixName}.${argName}` */
    argValues: Record<string, string>;
    /**
     * Tracks last auto-filled values, keyed by field key.
     * If a user edits a field to something else, we stop auto-updating it.
     */
    autoFilled: Record<string, string>;
    /** When true, PDA fields auto-filled by devtools are read-only. */
    lockPdas: boolean;
    isExecuting: boolean;
    executeError: string | null;
    lastSignature: string | null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
    return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function isModernAnchorIdl(idl: unknown): idl is AnchorIdlLike {
    if (!isRecord(idl)) return false;
    const maybe = idl as AnchorIdlLike;
    if (typeof maybe.address !== 'string') return false;
    const hasMetadata = Boolean(
        isRecord(maybe.metadata) && (typeof maybe.metadata?.version === 'string' || typeof maybe.metadata?.spec === 'string'),
    );
    if (!hasMetadata) return false;
    return Array.isArray(maybe.instructions);
}

function escapeHtml(text: string): string {
    return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function escapeAttr(text: string): string {
    // Conservative: treat same as HTML escaping (prevents breaking out of attribute values)
    return escapeHtml(text);
}

function getRpcUrl(ctx: PluginContext): string | null {
    const cfg = ctx.getConfig();
    return cfg.rpcUrl ?? ctx.client.getRpcUrl() ?? null;
}

function isMainnetCluster(clusterId: string | null | undefined): boolean {
    if (!clusterId) return false;
    return clusterId.includes('mainnet');
}

function getExplorerUrl(signature: string, cluster?: string) {
    const baseUrl = 'https://explorer.solana.com';
    let clusterParam = '';
    if (cluster?.includes('devnet')) clusterParam = '?cluster=devnet';
    else if (cluster?.includes('testnet')) clusterParam = '?cluster=testnet';
    else if (cluster?.includes('custom')) clusterParam = '?cluster=custom';
    return `${baseUrl}/tx/${signature}${clusterParam}`;
}

async function readFileAsText(file: File): Promise<string> {
    return await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onerror = () => reject(reader.error ?? new Error('Failed to read file'));
        reader.onload = () => resolve(String(reader.result ?? ''));
        reader.readAsText(file);
    });
}

function generateNameVariations(words: string[], additionalKeys: string[] = []): string[] {
    return [...generateConventions(words), ...additionalKeys];
}

function generateConventions(words: string[]): string[] {
    const lowerWords = words.map(w => w.toLowerCase());
    const capitalize = (word: string) => word.charAt(0).toUpperCase() + word.slice(1);

    return [
        lowerWords[0] + lowerWords.slice(1).map(capitalize).join(''), // camelCase
        lowerWords.join('_'), // snake_case
        lowerWords.join(' '), // space separated
        lowerWords.join(''), // concatenated
    ];
}

function normalizePatternKey(value: string): string {
    return value.toLowerCase().replace(/[^a-z0-9]/g, '');
}

function camelCase(value: string): string {
    const trimmed = value.trim();
    if (!trimmed) return '';

    // If it already looks like camelCase / PascalCase (no separators), keep internal capitals.
    if (!/[\s._-]/.test(trimmed) && /[A-Z]/.test(trimmed)) {
        return trimmed.charAt(0).toLowerCase() + trimmed.slice(1);
    }

    const parts = trimmed.split(/[^a-zA-Z0-9]+/g).filter(Boolean);
    if (!parts.length) return '';
    const head = parts[0].toLowerCase();
    const tail = parts
        .slice(1)
        .map(p => p.charAt(0).toUpperCase() + p.slice(1).toLowerCase())
        .join('');
    return `${head}${tail}`;
}

const KNOWN_PATTERN_TO_ADDRESS: Map<string, string> = (() => {
    const map = new Map<string, string>();

    function add(address: string, patterns: string[]) {
        patterns.forEach(p => map.set(normalizePatternKey(p), address));
    }

    // Common program ids / sysvars
    add('11111111111111111111111111111111', generateNameVariations(['system', 'program'], ['system']));
    add(
        'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',
        generateNameVariations(['token', 'program'], ['token']),
    );
    add(
        'ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL',
        [
            ...generateNameVariations(['associated', 'token', 'program'], ['associatedToken', 'associated']),
            ...generateNameVariations(['ata', 'program'], ['ata']),
        ],
    );
    add(
        'ComputeBudget111111111111111111111111111111',
        generateNameVariations(['compute', 'budget', 'program'], ['computeBudget', 'computeBudgetProgram']),
    );
    add(
        'MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr',
        generateNameVariations(['memo', 'program'], ['memo']),
    );

    add('SysvarRent111111111111111111111111111111111', generateNameVariations(['rent'], ['rentSysvar', 'sysvarRent']));
    add(
        'SysvarC1ock11111111111111111111111111111111',
        generateNameVariations(['clock'], ['clockSysvar', 'sysvarClock']),
    );
    add(
        'Sysvar1nstructions1111111111111111111111111',
        generateNameVariations(['instructions'], ['instructionsSysvar', 'sysvarInstructions']),
    );

    // Known non-program accounts
    add(
        'So11111111111111111111111111111111111111112',
        generateNameVariations(['wsol', 'mint'], ['wsol', 'wrappedSol', 'nativeMint']),
    );

    return map;
})();

function findKnownAddressForAccountName(accountName: string): string | null {
    return KNOWN_PATTERN_TO_ADDRESS.get(normalizePatternKey(accountName)) ?? null;
}

function isPrefilledAccountName(accountName: string): boolean {
    return KNOWN_PATTERN_TO_ADDRESS.has(normalizePatternKey(accountName));
}

const WALLET_PATTERN_KEYS = new Set(
    [
        ...generateNameVariations(['authority']),
        ...generateNameVariations(['owner']),
        ...generateNameVariations(['payer'], ['feePayer']),
        ...generateNameVariations(['signer']),
        ...generateNameVariations(['user']),
    ].map(normalizePatternKey),
);

function isWalletAccountName(accountName: string): boolean {
    return WALLET_PATTERN_KEYS.has(normalizePatternKey(accountName));
}

const DEFAULT_ARG_VALUES_PER_TYPE: Record<string, string> = {
    bool: 'false',
    u8: '1',
    u16: '1',
    u32: '1',
    u64: '1',
    u128: '1',
    i8: '1',
    i16: '1',
    i32: '1',
    i64: '1',
    i128: '1',
    f32: '1.0',
    f64: '1.0',
    string: 'default',
    bytes: 'data',
    pubkey: '11111111111111111111111111111111',
    publicKey: '11111111111111111111111111111111',
} as const;

function findDefaultValueForArgumentType(type: unknown, walletAddress: string | null): string {
    if (typeof type === 'string') {
        if (type === 'pubkey' || type === 'publicKey') return walletAddress ?? DEFAULT_ARG_VALUES_PER_TYPE[type];
        return DEFAULT_ARG_VALUES_PER_TYPE[type] ?? '';
    }

    if (!isRecord(type)) return '';

    if ('vec' in type) return findDefaultValueForArgumentType((type as any).vec, walletAddress);
    if ('option' in type) return findDefaultValueForArgumentType((type as any).option, walletAddress);
    if ('coption' in type) return findDefaultValueForArgumentType((type as any).coption, walletAddress);
    if ('array' in type && Array.isArray((type as any).array) && (type as any).array.length >= 1) {
        const [innerType, length] = (type as any).array as [unknown, unknown];
        const innerDefault = findDefaultValueForArgumentType(innerType, walletAddress);
        if (typeof length === 'number' && length > 1) return Array.from({ length }, () => innerDefault).join(', ');
        return innerDefault;
    }

    return '';
}

function isAccountGroup(item: AnchorIdlInstructionAccountItem): item is AnchorIdlInstructionAccountGroup {
    return isRecord(item) && Array.isArray((item as any).accounts);
}

interface PdaGenerationResult {
    generated: string | null;
    seeds: Array<{ name: string; value: string | null }>;
}

type IdlSeed = { kind: 'const' | 'arg' | 'account'; path?: string; value?: number[] } & Record<string, unknown>;

function toHex(bytes: Uint8Array): string {
    return Array.from(bytes)
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
}

const INTEGER_SIZE_MAP: Record<string, number> = {
    i128: 16,
    i16: 2,
    i32: 4,
    i64: 8,
    i8: 1,
    u128: 16,
    u16: 2,
    u32: 4,
    u64: 8,
    u8: 1,
} as const;

function bigintToLeBytes(value: bigint, byteLength: number): Uint8Array {
    // Two's complement for negative values (best-effort for signed ints)
    const mod = 1n << BigInt(byteLength * 8);
    let v = value;
    if (v < 0n) v = mod + v;

    const out = new Uint8Array(byteLength);
    for (let i = 0; i < byteLength; i++) {
        out[i] = Number(v & 0xffn);
        v >>= 8n;
    }
    return out;
}

function convertArgToSeedBytes(value: string, type: unknown): Uint8Array | null {
    if (!value || typeof type !== 'string') return null;

    const size = INTEGER_SIZE_MAP[type];
    if (size !== undefined) {
        try {
            const trimmed = value.trim();
            const bigintValue = trimmed.startsWith('0x') ? BigInt(trimmed) : BigInt(trimmed);
            return bigintToLeBytes(bigintValue, size);
        } catch {
            return null;
        }
    }

    if (type === 'pubkey' || type === 'publicKey') {
        try {
            return new PublicKey(value).toBytes();
        } catch {
            return null;
        }
    }

    if (type === 'string' || type === 'bytes') {
        return new TextEncoder().encode(value);
    }

    return null;
}

function getStringFromPath(root: unknown, path: string): string | null {
    if (!path) return null;

    // Try exact key first.
    if (isRecord(root) && typeof root[path] === 'string') return String(root[path]);

    // Try camelCase variant.
    const camel = camelCase(path);
    if (isRecord(root) && typeof root[camel] === 'string') return String(root[camel]);

    // Try dot path traversal.
    const parts = path.split('.').filter(Boolean);
    if (parts.length > 1 && isRecord(root)) {
        let current: unknown = root;
        for (const part of parts) {
            if (!isRecord(current)) return null;
            const next = current[part] ?? current[camelCase(part)];
            current = next;
        }
        return typeof current === 'string' ? current : null;
    }

    return null;
}

function buildArgsMap(ixName: string, args: AnchorIdlInstructionArg[], argValues: Record<string, string>): Record<string, string> {
    const out: Record<string, string> = {};
    for (const arg of args) {
        if (!arg || typeof arg.name !== 'string') continue;
        const key = getInputKey(ixName, arg.name);
        const raw = (argValues[key] ?? '').trim();
        if (!raw) continue;

        out[arg.name] = raw;
        out[camelCase(arg.name)] = raw;
    }
    return out;
}

function buildAccountsValueTree(
    ixName: string,
    items: AnchorIdlInstructionAccountItem[],
    accountValues: Record<string, string>,
    path: string[] = [],
): Record<string, string | Record<string, any>> {
    const out: Record<string, any> = {};

    for (const item of items) {
        if (!item || typeof (item as any).name !== 'string') continue;

        if (isAccountGroup(item)) {
            out[item.name] = buildAccountsValueTree(ixName, item.accounts ?? [], accountValues, [...path, item.name]);
            continue;
        }

        const meta = item as AnchorIdlInstructionAccount;
        const key = getInputKey(ixName, ...path, meta.name);
        const value = (accountValues[key] ?? '').trim();
        if (value) {
            out[meta.name] = value;
            out[camelCase(meta.name)] = value;
        }
    }

    return out;
}

function buildSeedsWithInfo(
    seeds: IdlSeed[],
    args: Record<string, string>,
    accountsTree: Record<string, any>,
    instruction: AnchorIdlInstruction,
): { buffers: Uint8Array[] | null; info: Array<{ name: string; value: string | null }> } {
    const seedBuffers: Uint8Array[] = [];
    const seedInfo: Array<{ name: string; value: string | null }> = [];
    let buffersValid = true;

    function findArgDef(seedPath: string): AnchorIdlInstructionArg | null {
        const camel = camelCase(seedPath);
        return (
            (instruction.args ?? []).find(a => a.name === seedPath) ??
            (instruction.args ?? []).find(a => camelCase(a.name) === camel) ??
            null
        );
    }

    for (const seed of seeds) {
        if (!seed || typeof seed.kind !== 'string') {
            seedInfo.push({ name: 'unknown', value: null });
            buffersValid = false;
            continue;
        }

        if (seed.kind === 'const') {
            const bytes = new Uint8Array(Array.isArray(seed.value) ? seed.value : []);
            const hex = `0x${toHex(bytes)}`;
            seedBuffers.push(bytes);
            seedInfo.push({ name: hex, value: hex });
            continue;
        }

        if (seed.kind === 'arg') {
            const path = typeof seed.path === 'string' ? seed.path : '';
            const value = args[path] ?? args[camelCase(path)] ?? null;
            seedInfo.push({ name: camelCase(path) || path || 'arg', value });

            if (!value) {
                buffersValid = false;
                continue;
            }

            const argDef = findArgDef(path);
            const buffer = argDef ? convertArgToSeedBytes(value, argDef.type) : null;
            if (buffer) seedBuffers.push(buffer);
            else buffersValid = false;
            continue;
        }

        if (seed.kind === 'account') {
            const path = typeof seed.path === 'string' ? seed.path : '';
            const value = getStringFromPath(accountsTree, path);
            seedInfo.push({ name: camelCase(path) || path || 'account', value });

            if (!value) {
                buffersValid = false;
                continue;
            }

            try {
                seedBuffers.push(new PublicKey(value).toBytes());
            } catch {
                buffersValid = false;
            }
            continue;
        }

        seedInfo.push({ name: 'unknown', value: null });
        buffersValid = false;
    }

    return { buffers: buffersValid ? seedBuffers : null, info: seedInfo };
}

function resolveDerivationProgramId(
    defaultProgramId: PublicKey,
    pdaProgram: IdlSeed | undefined,
    context: { args: Record<string, string>; accounts: Record<string, any> },
): PublicKey | null {
    if (!pdaProgram) return defaultProgramId;

    if (pdaProgram.kind === 'const') {
        const bytes = new Uint8Array(Array.isArray(pdaProgram.value) ? pdaProgram.value : []);
        try {
            return new PublicKey(bytes);
        } catch {
            return null;
        }
    }

    const path = typeof pdaProgram.path === 'string' ? pdaProgram.path : '';

    if (pdaProgram.kind === 'arg') {
        const value = context.args[path] ?? context.args[camelCase(path)];
        if (!value) return null;
        try {
            return new PublicKey(value);
        } catch {
            return null;
        }
    }

    if (pdaProgram.kind === 'account') {
        const value = getStringFromPath(context.accounts, path);
        if (!value) return null;
        try {
            return new PublicKey(value);
        } catch {
            return null;
        }
    }

    return defaultProgramId;
}

function computePdasForInstruction(params: {
    idl: AnchorIdlLike;
    instruction: AnchorIdlInstruction;
    ixName: string;
    argValues: Record<string, string>;
    accountValues: Record<string, string>;
}): Record<string, PdaGenerationResult> {
    const { idl, instruction, ixName, argValues, accountValues } = params;

    const results: Record<string, PdaGenerationResult> = {};

    const programIdStr = typeof idl.address === 'string' ? idl.address : null;
    if (!programIdStr) return results;

    let defaultProgramId: PublicKey;
    try {
        defaultProgramId = new PublicKey(programIdStr);
    } catch {
        return results;
    }

    const args = buildArgsMap(ixName, instruction.args ?? [], argValues);
    const accountsTree = buildAccountsValueTree(ixName, instruction.accounts ?? [], accountValues);

    function walk(items: AnchorIdlInstructionAccountItem[], path: string[]) {
        for (const item of items) {
            if (!item || typeof (item as any).name !== 'string') continue;

            if (isAccountGroup(item)) {
                walk(item.accounts ?? [], [...path, item.name]);
                continue;
            }

            const meta = item as AnchorIdlInstructionAccount;
            const pda = (meta as any).pda as any;

            // Skip if pda is absent or is just a boolean (older Anchor versions).
            if (!pda || typeof pda === 'boolean' || !isRecord(pda) || !Array.isArray(pda.seeds)) continue;

            const seeds = pda.seeds as IdlSeed[];
            const { buffers, info } = buildSeedsWithInfo(seeds, args, accountsTree, instruction);

            const derivationProgramId = resolveDerivationProgramId(defaultProgramId, pda.program as IdlSeed | undefined, {
                args,
                accounts: accountsTree,
            });

            let generated: string | null = null;
            if (buffers && derivationProgramId) {
                try {
                    // PublicKey expects Buffer[], but Uint8Array works at runtime; cast for TS.
                    const [pdaPk] = (PublicKey as any).findProgramAddressSync(buffers as any, derivationProgramId);
                    generated = pdaPk.toBase58();
                } catch {
                    generated = null;
                }
            }

            const key = getInputKey(ixName, ...path, meta.name);
            results[key] = { generated, seeds: info };
        }
    }

    walk(instruction.accounts ?? [], []);
    return results;
}

function getInputKey(ixName: string, ...path: string[]): string {
    return [ixName, ...path].join('.');
}

function getInstructionList(idl: unknown): AnchorIdlInstruction[] {
    if (!isModernAnchorIdl(idl)) return [];
    return (idl.instructions ?? []).filter(ix => Boolean(ix && typeof ix.name === 'string'));
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
            opts?.resetSelection === false
                ? state.selectedIxName
                : instructions.length
                  ? instructions[0].name
                  : null;

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

                const maybeMetadata = isRecord((idl as any).metadata) ? ((idl as any).metadata as Record<string, unknown>) : {};
                const rootVersion = typeof (idl as any).version === 'string' ? (idl as any).version : undefined;
                const metaVersion =
                    typeof maybeMetadata.version === 'string' ? (maybeMetadata.version as string) : rootVersion ?? 'unknown';

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

    async function buildAnchorInstruction(ctx: PluginContext, idl: AnchorIdlLike, ixName: string) {
        const rpcUrl = getRpcUrl(ctx);
        if (!rpcUrl) throw new Error('No RPC URL available.');

        const { snapshot, selectedAccount } = getConnectedWalletState(ctx);
        if (!snapshot.connected || !selectedAccount) throw new Error('Wallet not connected.');

        const ixDef = (idl.instructions ?? []).find(ix => ix.name === ixName);
        if (!ixDef) throw new Error(`Instruction "${ixName}" not found in IDL.`);

        // Dynamic imports to keep the plugin lightweight at module init.
        const [{ Connection, PublicKey, Transaction }, anchorMod, bnMod] = await Promise.all([
            import('@solana/web3.js'),
            import('@coral-xyz/anchor'),
            import('bn.js'),
        ]);

        const BN = (bnMod as any).default ?? (bnMod as any);
        const { AnchorProvider, Program } = anchorMod as any;

        const programIdStr = state.programIdInput.trim() || idl.address || '';
        if (!programIdStr) throw new Error('Program id is required.');

        const programId = new PublicKey(programIdStr);

        // Anchor's provider wallet adapter (we only need publicKey for instruction building).
        const walletPubkey = new PublicKey(selectedAccount);
        const walletForAnchor = {
            publicKey: walletPubkey,
            signTransaction: async (tx: any) => tx,
            signAllTransactions: async (txs: any[]) => txs,
        };

        const connection = new Connection(rpcUrl, 'confirmed');
        const provider = new AnchorProvider(connection, walletForAnchor, {});
        const program = new Program(idl as any, programId, provider);

        function parseArrayInput(value: unknown): unknown[] {
            if (Array.isArray(value)) return value;
            if (typeof value === 'string') {
                const trimmed = value.trim();
                if (!trimmed) return [];
                try {
                    const parsed = JSON.parse(trimmed);
                    if (Array.isArray(parsed)) return parsed;
                } catch {
                    // fallthrough
                }
                return trimmed.split(',').map(s => s.trim()).filter(Boolean);
            }
            return [];
        }

        function parseArgValue(raw: string, type: unknown): unknown {
            // Handle option<T>
            if (isRecord(type) && 'option' in type) {
                if (raw.trim() === '') return null;
                return parseArgValue(raw, (type as any).option);
            }

            function hexToBytes(hex: string): Uint8Array {
                const clean = hex.length % 2 === 0 ? hex : `0${hex}`;
                const bytes = new Uint8Array(clean.length / 2);
                for (let i = 0; i < bytes.length; i++) {
                    bytes[i] = Number.parseInt(clean.slice(i * 2, i * 2 + 2), 16);
                }
                return bytes;
            }

            function base64ToBytes(base64: string): Uint8Array {
                const binary = atob(base64);
                const bytes = new Uint8Array(binary.length);
                for (let i = 0; i < binary.length; i++) {
                    bytes[i] = binary.charCodeAt(i);
                }
                return bytes;
            }

            // Primitives
            if (typeof type === 'string') {
                const trimmed = raw.trim();

                if (
                    type === 'u8' ||
                    type === 'u16' ||
                    type === 'u32' ||
                    type === 'u64' ||
                    type === 'u128' ||
                    type === 'i8' ||
                    type === 'i16' ||
                    type === 'i32' ||
                    type === 'i64' ||
                    type === 'i128'
                ) {
                    if (!trimmed) throw new Error('Missing integer argument');
                    const base = trimmed.startsWith('0x') ? 16 : 10;
                    const value = trimmed.startsWith('0x') ? trimmed.slice(2) : trimmed;
                    return new BN(value, base);
                }

                if (type === 'bool') {
                    if (!trimmed) throw new Error('Missing boolean argument');
                    return trimmed === 'true' || trimmed === '1';
                }

                if (type === 'string') {
                    // Allow empty string
                    return raw;
                }

                if (type === 'pubkey' || type === 'publicKey') {
                    if (!trimmed) throw new Error('Missing pubkey argument');
                    return new PublicKey(trimmed);
                }

                if (type === 'bytes') {
                    if (trimmed.startsWith('0x')) return hexToBytes(trimmed.slice(2));
                    if (trimmed.startsWith('base64:')) return base64ToBytes(trimmed.slice('base64:'.length));
                    return new TextEncoder().encode(raw);
                }

                return raw;
            }

            // vec<T>
            if (isRecord(type) && 'vec' in type) {
                const items = parseArrayInput(raw);
                return items.map(item => parseArgValue(String(item), (type as any).vec));
            }

            // array<T, N>
            if (isRecord(type) && 'array' in type && Array.isArray((type as any).array) && (type as any).array.length) {
                const items = parseArrayInput(raw);
                return items.map(item => parseArgValue(String(item), (type as any).array[0]));
            }

            // defined types: accept JSON object as a best-effort (Anchor expects object shapes)
            if (isRecord(type) && 'defined' in type) {
                const trimmed = raw.trim();
                if (!trimmed) throw new Error('Missing defined-type argument');
                try {
                    return JSON.parse(trimmed);
                } catch {
                    return raw;
                }
            }

            return raw;
        }

        const accountsMeta = (ixDef.accounts ?? []) as AnchorIdlInstructionAccountItem[];
        const argsMeta = (ixDef.args ?? []) as AnchorIdlInstructionArg[];

        function buildAccountsObject(
            items: AnchorIdlInstructionAccountItem[],
            path: string[] = [],
        ): Record<string, PublicKey | null | Record<string, any>> {
            const result: Record<string, any> = {};

            for (const item of items) {
                if (!item || typeof (item as any).name !== 'string') continue;

                if (isAccountGroup(item)) {
                    result[item.name] = buildAccountsObject(item.accounts ?? [], [...path, item.name]);
                    continue;
                }

                const meta = item as AnchorIdlInstructionAccount;
                const key = getInputKey(ixName, ...path, meta.name);
                const raw = state.accountValues[key]?.trim() ?? '';

                if (!raw) {
                    // Priority 1: fixed/known addresses
                    const fixed = typeof meta.address === 'string' ? meta.address : null;
                    const known = fixed ?? findKnownAddressForAccountName(meta.name);
                    if (known) {
                        result[meta.name] = new PublicKey(known);
                        continue;
                    }

                    // Priority 2: wallet prefill (signers / common wallet-controlled accounts)
                    const hasPda = Boolean(meta.pda);
                    const shouldPrefillWallet = Boolean(meta.isSigner) || isWalletAccountName(meta.name) || (meta.isMut && !hasPda);
                    if (shouldPrefillWallet) {
                        result[meta.name] = walletPubkey;
                        continue;
                    }

                    // Priority 3: optional accounts
                    if (meta.optional) {
                        result[meta.name] = null;
                        continue;
                    }

                    throw new Error(`Missing account "${meta.name}".`);
                }

                result[meta.name] = new PublicKey(raw);
            }

            return result;
        }

        const accounts = buildAccountsObject(accountsMeta);

        const args = argsMeta.map(arg => {
            const key = getInputKey(ixName, arg.name);
            const raw = state.argValues[key] ?? '';

            // For option types, allow blank -> null.
            if (isRecord(arg.type) && 'option' in arg.type && raw.trim() === '') return null;
            if (typeof arg.type === 'string' && arg.type === 'string') return raw;
            if (raw.trim() === '') throw new Error(`Missing argument "${arg.name}".`);
            return parseArgValue(raw, arg.type);
        });

        if (!(ixName in (program.methods as any))) {
            const available = Object.keys((program.methods as any) ?? {});
            throw new Error(`Instruction "${ixName}" not found. Available: ${available.slice(0, 30).join(', ')}`);
        }

        const ixBuilder = (program.methods as any)[ixName];
        const ix = await ixBuilder(...args).accounts(accounts).instruction();

        const tx = new Transaction().add(ix);
        tx.feePayer = walletForAnchor.publicKey;
        const { blockhash } = await connection.getLatestBlockhash();
        tx.recentBlockhash = blockhash;

        return { tx, connection };
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

            const { tx } = await buildAnchorInstruction(ctx, state.idl as AnchorIdlLike, ixName);

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
                if (bytes.length !== 64) throw new Error(`Invalid signature length: expected 64 bytes, got ${bytes.length}`);
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
            setState({ executeError: err instanceof Error ? err.message : 'Failed to execute instruction', isExecuting: false });
        }
    }

    return {
        id: 'idl',
        name: 'IDL',
        icon: ICONS.code ?? ICONS.overview,

        render(el: HTMLElement, ctx: PluginContext) {
            function renderContent() {
                const snapshot = ctx.client.getSnapshot();
                const rpcUrl = getRpcUrl(ctx);
                const instructions = state.idl ? getInstructionList(state.idl) : [];
                const selectedIx = state.selectedIxName
                    ? instructions.find(ix => ix.name === state.selectedIxName) ?? null
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

                                const isAuto = state.autoFilled[key] !== undefined && value.trim() === state.autoFilled[key];
                                const pdaInfo = pdaByKey[key];
                                const isPda = Boolean(pdaInfo);
                                const isKnown = Boolean(findKnownAddressForAccountName(meta.name) || meta.address);
                                const isWalletValue = Boolean(walletAddress && value.trim() === walletAddress);

                                const badges = [
                                    meta.optional ? `<span class="cdt-pill">optional</span>` : '',
                                    meta.isSigner ? `<span class="cdt-pill info">signer</span>` : `<span class="cdt-pill">account</span>`,
                                    meta.isMut === true ? `<span class="cdt-pill warn">writable</span>` : `<span class="cdt-pill">readonly</span>`,
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
                    const accountsRows = accountsLeafCount ? renderAccountItems(accountsMeta) : `<div class="cdt-empty">No accounts.</div>`;

                    const argsRows = argsMeta.length
                        ? argsMeta
                              .map(meta => {
                                  const key = getInputKey(selectedIxName, meta.name);
                                  const value = state.argValues[key] ?? '';
                                  const typePreview = isRecord(meta.type) ? safeTypePreview(meta.type) : String(meta.type ?? '');
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
                        <style>
                            .cdt-idl { display:flex; flex-direction: column; height: 100%; }

                            .cdt-idl-toolbar {
                                display:flex;
                                align-items: center;
                                justify-content: space-between;
                                gap: 10px;
                                padding: 8px 12px;
                                border-bottom: 1px solid var(--cdt-border);
                                background: var(--cdt-bg-panel);
                                flex-wrap: wrap;
                            }

                            .cdt-idl-toolbar-left { display:flex; align-items:center; gap: 8px; flex-wrap: wrap; }
                            .cdt-idl-toolbar-right { display:flex; align-items:center; gap: 8px; flex-wrap: wrap; }

                            .cdt-idl-body {
                                display: grid;
                                grid-template-columns: 1fr 1fr;
                                min-height: 0;
                                flex: 1;
                            }

                            @media (max-width: 720px) {
                                .cdt-idl-body { grid-template-columns: 1fr; grid-template-rows: 1fr 1fr; }
                            }

                            .cdt-idl-pane {
                                min-width: 0;
                                overflow: auto;
                                border-right: 1px solid var(--cdt-border);
                            }

                            @media (max-width: 720px) {
                                .cdt-idl-pane { border-right: none; border-bottom: 1px solid var(--cdt-border); }
                            }

                            .cdt-idl-details { min-width: 0; overflow: auto; padding: 12px; }

                            .cdt-section-title {
                                font-size: 11px;
                                font-weight: 700;
                                letter-spacing: 0.06em;
                                text-transform: uppercase;
                                color: var(--cdt-text-muted);
                                padding: 10px 12px;
                                border-bottom: 1px solid var(--cdt-border);
                                background: var(--cdt-bg-panel);
                            }

                            .cdt-idl-item {
                                display:flex;
                                align-items: center;
                                justify-content: space-between;
                                gap: 10px;
                                padding: 10px 12px;
                                border-bottom: 1px solid var(--cdt-border);
                                cursor: pointer;
                                transition: background 0.1s;
                            }
                            .cdt-idl-item:hover { background: var(--cdt-bg-hover); }
                            .cdt-idl-item[data-selected="true"] { background: var(--cdt-bg-active); }
                            .cdt-idl-item-name { font-family: ui-monospace, monospace; font-size: 12px; color: var(--cdt-text); }
                            .cdt-idl-item-meta { display:flex; gap: 6px; flex-wrap: wrap; justify-content: flex-end; }

                            .cdt-input {
                                width: 260px;
                                max-width: 100%;
                                padding: 6px 10px;
                                border-radius: 8px;
                                border: 1px solid var(--cdt-border);
                                background: var(--cdt-bg);
                                color: var(--cdt-text);
                                font-size: 12px;
                                font-family: ui-monospace, monospace;
                            }

                            .cdt-input[readonly] {
                                opacity: 0.85;
                                background: var(--cdt-bg-panel);
                                border-style: dashed;
                            }

                            .cdt-textarea {
                                width: min(820px, 100%);
                                min-height: 120px;
                                padding: 8px 10px;
                                border-radius: 10px;
                                border: 1px solid var(--cdt-border);
                                background: var(--cdt-bg);
                                color: var(--cdt-text);
                                font-size: 11px;
                                font-family: ui-monospace, monospace;
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

                            .cdt-empty {
                                padding: 18px;
                                color: var(--cdt-text-muted);
                                font-size: 12px;
                                white-space: pre-wrap;
                            }

                            .cdt-details-header {
                                display:flex;
                                align-items: center;
                                justify-content: space-between;
                                gap: 10px;
                                margin-bottom: 10px;
                            }

                            .cdt-details-title { font-size: 13px; font-weight: 700; color: var(--cdt-text); }

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
                                display:flex;
                                align-items:center;
                                gap: 6px;
                            }
                            .cdt-details-section summary::-webkit-details-marker { display:none; }

                            .cdt-chevron {
                                display: inline-flex;
                                width: 14px;
                                height: 14px;
                                transition: transform 0.15s ease;
                                transform: rotate(-90deg);
                                flex-shrink: 0;
                            }
                            .cdt-details-section[open] .cdt-chevron { transform: rotate(0deg); }
                            .cdt-details-section[open] summary { border-bottom: 1px solid var(--cdt-border); }

                            .cdt-details-section-content { padding: 10px 12px; background: var(--cdt-bg); }

                            .cdt-field-group {
                                margin-top: 10px;
                                padding: 10px;
                                border: 1px dashed var(--cdt-border);
                                border-radius: 12px;
                                background: var(--cdt-bg-panel);
                            }

                            .cdt-field-group-title {
                                font-size: 11px;
                                font-weight: 700;
                                letter-spacing: 0.06em;
                                text-transform: uppercase;
                                color: var(--cdt-text-muted);
                                margin-bottom: 8px;
                            }

                            .cdt-field-group-body { }

                            .cdt-field { padding: 10px; border: 1px solid var(--cdt-border); border-radius: 10px; background: var(--cdt-bg); }
                            .cdt-field + .cdt-field { margin-top: 10px; }
                            .cdt-field-head { display:flex; align-items:center; justify-content: space-between; gap: 10px; margin-bottom: 8px; }
                            .cdt-field-name { font-size: 12px; color: var(--cdt-text); font-weight: 650; font-family: ui-monospace, monospace; }
                            .cdt-field-badges { display:flex; gap: 6px; flex-wrap: wrap; justify-content:flex-end; }
                            .cdt-field-input-row { display:flex; gap: 6px; align-items:center; }

                            .cdt-status-row { margin-bottom: 8px; display:flex; justify-content:flex-end; }

                            .cdt-card {
                                margin-top: 10px;
                                border: 1px solid var(--cdt-border);
                                border-radius: 12px;
                                background: var(--cdt-bg-panel);
                                padding: 10px 12px;
                            }
                            .cdt-card-title { font-size: 12px; font-weight: 700; color: var(--cdt-text); margin-bottom: 8px; }

                            .cdt-kv { display:grid; grid-template-columns: 120px 1fr; gap: 6px 12px; font-size: 11px; }
                            .cdt-k { color: var(--cdt-text-muted); }
                            .cdt-v { color: var(--cdt-text); font-family: ui-monospace, monospace; word-break: break-all; }
                        </style>

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
                    const nextArgs = Object.fromEntries(Object.entries(state.argValues).filter(([k]) => !k.startsWith(prefix)));
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

