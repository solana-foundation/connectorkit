import { PublicKey } from '@solana/web3.js';
import { isAccountGroup } from './account-tree';
import { isRecord } from './guards';
import { getInputKey } from './keys';
import { camelCase } from './naming';
import type {
    AnchorIdlInstruction,
    AnchorIdlInstructionAccount,
    AnchorIdlInstructionAccountItem,
    AnchorIdlInstructionArg,
    AnchorIdlLike,
} from './types';

export interface PdaGenerationResult {
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

function buildArgsMap(
    ixName: string,
    args: AnchorIdlInstructionArg[],
    argValues: Record<string, string>,
): Record<string, string> {
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

export interface ComputePdasForInstructionParams {
    idl: AnchorIdlLike;
    instruction: AnchorIdlInstruction;
    ixName: string;
    argValues: Record<string, string>;
    accountValues: Record<string, string>;
}

export function computePdasForInstruction(
    params: ComputePdasForInstructionParams,
): Record<string, PdaGenerationResult> {
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

            const derivationProgramId = resolveDerivationProgramId(
                defaultProgramId,
                pda.program as IdlSeed | undefined,
                {
                    args,
                    accounts: accountsTree,
                },
            );

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
