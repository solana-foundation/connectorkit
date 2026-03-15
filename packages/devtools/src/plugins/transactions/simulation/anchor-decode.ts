import type { Instruction } from '@solana/kit';
import { PublicKey, type AccountMeta as Web3AccountMeta } from '@solana/web3.js';

import { fetchProgramMetadataIdl } from '../../../utils/idl';
import { isModernAnchorIdl } from '../../idl/anchor-idl';
import type { SimulationInstructionAccount, SimulationInstructionDecoded } from './state';

function isSignerRole(role: unknown): boolean {
    return role === 2 || role === 3;
}

function isWritableRole(role: unknown): boolean {
    return role === 1 || role === 3;
}

function bytesToHex(bytes: Uint8Array): string {
    let out = '';
    for (let i = 0; i < bytes.length; i++) out += bytes[i].toString(16).padStart(2, '0');
    return out;
}

function toSimulationAccounts(accounts: readonly any[] | undefined): SimulationInstructionAccount[] {
    if (!accounts?.length) return [];
    return accounts
        .map(acc => {
            const address = typeof acc?.address === 'string' ? acc.address : String(acc?.address ?? '');
            const role = (acc as any)?.role;
            return {
                address,
                isSigner: isSignerRole(role),
                isWritable: isWritableRole(role),
            };
        })
        .filter(a => Boolean(a.address));
}

function toWeb3AccountMetas(accounts: SimulationInstructionAccount[]): Web3AccountMeta[] {
    return accounts.map(a => ({
        pubkey: new PublicKey(a.address),
        isSigner: a.isSigner,
        isWritable: a.isWritable,
    }));
}

export async function decodeInstructionsWithAnchorIdls(params: {
    rpcUrl: string;
    instructions: readonly Instruction[];
    maxPrograms?: number;
}): Promise<SimulationInstructionDecoded[]> {
    const maxPrograms = params.maxPrograms ?? 10;
    const instructions = params.instructions ?? [];

    const uniquePrograms: string[] = [];
    const seen = new Set<string>();
    for (const ix of instructions) {
        const program = typeof (ix as any)?.programAddress === 'string' ? String((ix as any).programAddress) : '';
        if (!program || seen.has(program)) continue;
        seen.add(program);
        uniquePrograms.push(program);
        if (uniquePrograms.length >= maxPrograms) break;
    }

    const idlByProgram = new Map<string, { idl: any; programName?: string }>();

    for (const programAddress of uniquePrograms) {
        try {
            const idl = await fetchProgramMetadataIdl({ programId: programAddress, rpcUrl: params.rpcUrl });
            if (!isModernAnchorIdl(idl)) continue;
            const programName =
                idl &&
                typeof idl === 'object' &&
                (idl as any).metadata &&
                typeof (idl as any).metadata.name === 'string'
                    ? String((idl as any).metadata.name)
                    : undefined;
            idlByProgram.set(programAddress, { idl, programName });
        } catch {
            // best-effort
        }
    }

    const hasAnyIdl = idlByProgram.size > 0;
    const anchorMod = hasAnyIdl ? ((await import('@coral-xyz/anchor')) as any) : null;
    const BorshInstructionCoder = anchorMod?.BorshInstructionCoder;

    const coderByProgram = new Map<string, any>();
    for (const [programAddress, { idl }] of idlByProgram) {
        if (!BorshInstructionCoder) break;
        try {
            coderByProgram.set(programAddress, new BorshInstructionCoder(idl));
        } catch {
            // ignore invalid IDLs
        }
    }

    return instructions.map((ix, index) => {
        const programAddress =
            typeof (ix as any)?.programAddress === 'string' ? String((ix as any).programAddress) : '';
        const rawAccounts = toSimulationAccounts((ix as any)?.accounts);
        const dataBytes = (ix as any)?.data ? new Uint8Array((ix as any).data as Uint8Array) : new Uint8Array();
        const dataHex = dataBytes.length ? bytesToHex(dataBytes) : '';

        const base: SimulationInstructionDecoded = {
            index,
            programAddress,
            programName: idlByProgram.get(programAddress)?.programName,
            raw: { dataHex, accounts: rawAccounts },
        };

        const coder = programAddress ? coderByProgram.get(programAddress) : null;
        if (!coder || !dataHex) return base;

        try {
            const decoded = coder.decode(dataHex, 'hex') as { name: string; data: unknown } | null;
            if (!decoded) return base;

            const formatted = coder.format(decoded, toWeb3AccountMetas(rawAccounts)) as
                | {
                      args: unknown;
                      accounts: Array<{ name?: string; pubkey: PublicKey; isSigner: boolean; isWritable: boolean }>;
                  }
                | null
                | undefined;

            const parsedAccounts = formatted?.accounts?.length
                ? formatted.accounts.map(a => ({
                      name: a.name,
                      address: a.pubkey.toBase58(),
                      isSigner: Boolean(a.isSigner),
                      isWritable: Boolean(a.isWritable),
                  }))
                : rawAccounts;

            return {
                ...base,
                parsed: {
                    name: decoded.name,
                    args: decoded.data,
                    accounts: parsedAccounts,
                },
            };
        } catch {
            return base;
        }
    });
}
