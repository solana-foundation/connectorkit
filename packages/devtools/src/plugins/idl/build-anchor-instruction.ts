import type { PluginContext } from '../../types';
import { getRpcUrl } from '../../utils/dom';
import { isAccountGroup } from './account-tree';
import { findKnownAddressForAccountName, isWalletAccountName } from './account-patterns';
import { isRecord } from './guards';
import { getInputKey } from './keys';
import type {
    AnchorIdlInstructionAccount,
    AnchorIdlInstructionAccountItem,
    AnchorIdlInstructionArg,
    AnchorIdlLike,
} from './types';

export interface BuildAnchorInstructionParams {
    ctx: PluginContext;
    idl: AnchorIdlLike;
    ixName: string;
    programIdInput: string;
    accountValues: Record<string, string>;
    argValues: Record<string, string>;
}

export async function buildAnchorInstruction({
    ctx,
    idl,
    ixName,
    programIdInput,
    accountValues,
    argValues,
}: BuildAnchorInstructionParams): Promise<{ tx: import('@solana/web3.js').Transaction }> {
    const rpcUrl = getRpcUrl(ctx);
    if (!rpcUrl) throw new Error('No RPC URL available.');

    const snapshot = ctx.client.getSnapshot();
    const selectedAccount = snapshot.selectedAccount ? String(snapshot.selectedAccount) : null;
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

    const programIdStr = programIdInput.trim() || idl.address || '';
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
            return trimmed
                .split(',')
                .map(s => s.trim())
                .filter(Boolean);
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

    function buildAccountsObject(items: AnchorIdlInstructionAccountItem[], path: string[] = []): Record<string, any> {
        const result: Record<string, any> = {};

        for (const item of items) {
            if (!item || typeof (item as any).name !== 'string') continue;

            if (isAccountGroup(item)) {
                result[item.name] = buildAccountsObject(item.accounts ?? [], [...path, item.name]);
                continue;
            }

            const meta = item as AnchorIdlInstructionAccount;
            const key = getInputKey(ixName, ...path, meta.name);
            const raw = accountValues[key]?.trim() ?? '';

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
                const shouldPrefillWallet =
                    Boolean(meta.isSigner) || isWalletAccountName(meta.name) || (meta.isMut && !hasPda);
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
        const raw = argValues[key] ?? '';

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
    const ix = await ixBuilder(...args)
        .accounts(accounts)
        .instruction();

    const tx = new Transaction().add(ix);
    tx.feePayer = walletForAnchor.publicKey;
    const { blockhash } = await connection.getLatestBlockhash();
    tx.recentBlockhash = blockhash;

    return { tx };
}
