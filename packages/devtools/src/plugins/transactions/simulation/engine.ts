import { type Base64EncodedWireTransaction } from '@solana/kit';

import { getRpcUrl } from '../../../utils/dom';
import { bytesToBase64, base64ToBytes, bytesToHexPreview } from '../../../utils/tx-bytes';
import { decodeWireTransactionBase64, decompileMessageFromWireTransactionBase64 } from '../../../utils/tx-decode';
import {
    fetchMultipleAccountsBase64,
    fetchTransactionWireBase64,
    simulateWireTransactionBase64,
} from '../../../utils/rpc';
import type { PluginContext } from '../../../types';

import { decodeInstructionsWithAnchorIdls } from './anchor-decode';
import type {
    SimulationAccountInfoBase64,
    SimulationBalanceChange,
    SimulationTokenAccountState,
    SimulationWarning,
    SimulationWritableAccount,
    SimulationWritableAccountMeta,
    TransactionSimulationResult,
    SimulationCommitment,
} from './state';
import { PublicKey } from '@solana/web3.js';

function toBigIntOrNull(value: unknown): bigint | null {
    if (value === null || value === undefined) return null;
    if (typeof value === 'bigint') return value;
    if (typeof value === 'number') return Number.isFinite(value) ? BigInt(Math.trunc(value)) : null;
    if (typeof value === 'string') {
        const trimmed = value.trim();
        if (!trimmed) return null;
        try {
            return BigInt(trimmed);
        } catch {
            return null;
        }
    }
    return null;
}

function normalizeAccountInfoBase64(raw: unknown | null | undefined): SimulationAccountInfoBase64 {
    if (!raw || typeof raw !== 'object') return { lamports: null, owner: null, dataBase64: null };
    const r = raw as any;
    const lamports = toBigIntOrNull(r.lamports);
    const owner = typeof r.owner === 'string' ? r.owner : null;
    const dataBase64 = (() => {
        const data = r.data;
        if (Array.isArray(data) && typeof data[0] === 'string') return data[0];
        if (typeof data === 'string') return data;
        return null;
    })();
    const executable = typeof r.executable === 'boolean' ? r.executable : undefined;
    const rentEpoch = toBigIntOrNull(r.rentEpoch);
    return { dataBase64, executable, lamports, owner, rentEpoch };
}

function getExplorerInspectorClusterParam(clusterId: string | null): string {
    if (!clusterId) return 'mainnet-beta';
    if (clusterId.includes('devnet')) return 'devnet';
    if (clusterId.includes('testnet')) return 'testnet';
    if (clusterId.includes('custom')) return 'custom';
    if (clusterId.includes('mainnet')) return 'mainnet-beta';
    return 'mainnet-beta';
}

function getExplorerInspectorUrl(messageBase64: string, clusterId: string | null): string {
    const cluster = getExplorerInspectorClusterParam(clusterId);
    return `https://explorer.solana.com/tx/inspector?cluster=${cluster}&message=${encodeURIComponent(messageBase64)}`;
}

function mergeMeta(byAddress: Map<string, SimulationWritableAccountMeta>, next: SimulationWritableAccountMeta): void {
    const prev = byAddress.get(next.address);
    if (!prev) {
        byAddress.set(next.address, next);
        return;
    }
    byAddress.set(next.address, {
        address: next.address,
        isSigner: prev.isSigner || next.isSigner,
        isWritable: prev.isWritable || next.isWritable,
    });
}

function roleIsSigner(role: unknown): boolean {
    return role === 2 || role === 3;
}

function roleIsWritable(role: unknown): boolean {
    return role === 1 || role === 3;
}

function readU32LE(bytes: Uint8Array, offset: number): number | null {
    if (bytes.byteLength < offset + 4) return null;
    const view = new DataView(bytes.buffer, bytes.byteOffset + offset, 4);
    return view.getUint32(0, true);
}

function readU64LE(bytes: Uint8Array, offset: number): bigint | null {
    if (bytes.byteLength < offset + 8) return null;
    const view = new DataView(bytes.buffer, bytes.byteOffset + offset, 8);
    return view.getBigUint64(0, true);
}

function parseClassicSplTokenAccount(dataBase64: string | null): SimulationTokenAccountState | null {
    if (!dataBase64) return null;
    const bytes = base64ToBytes(dataBase64);
    if (bytes.byteLength !== 165) return null;

    const mint = new PublicKey(bytes.subarray(0, 32)).toBase58();
    const owner = new PublicKey(bytes.subarray(32, 64)).toBase58();
    const amount = readU64LE(bytes, 64);
    if (amount === null) return null;

    const delegateOption = readU32LE(bytes, 72);
    const delegate = delegateOption && delegateOption !== 0 ? new PublicKey(bytes.subarray(76, 108)).toBase58() : null;

    const closeAuthorityOption = readU32LE(bytes, 129);
    const closeAuthority =
        closeAuthorityOption && closeAuthorityOption !== 0 ? new PublicKey(bytes.subarray(133, 165)).toBase58() : null;

    return { amount, closeAuthority, delegate, mint, owner };
}

function isBlockhashNotFound(simulationErr: unknown): boolean {
    if (!simulationErr) return false;
    const s = typeof simulationErr === 'string' ? simulationErr : JSON.stringify(simulationErr);
    return s.includes('BlockhashNotFound') || s.toLowerCase().includes('blockhash not found');
}

function isInsufficientFunds(simulationErr: unknown): boolean {
    if (!simulationErr) return false;
    const s = typeof simulationErr === 'string' ? simulationErr : JSON.stringify(simulationErr);
    return (
        s.includes('InsufficientFunds') ||
        s.includes('insufficient funds') ||
        s.includes('InsufficientFundsForFee') ||
        s.includes('InsufficientFundsForRent')
    );
}

function safeLamportsDelta(pre: SimulationAccountInfoBase64, post: SimulationAccountInfoBase64): bigint | null {
    if (pre.lamports === null && post.lamports === null) return null;
    const preLamports = pre.lamports ?? 0n;
    const postLamports = post.lamports ?? 0n;
    return postLamports - preLamports;
}

function didDataChange(pre: SimulationAccountInfoBase64, post: SimulationAccountInfoBase64): boolean {
    if (pre.dataBase64 === null && post.dataBase64 === null) return false;
    return pre.dataBase64 !== post.dataBase64;
}

function formatAccountNameHint(address: string, walletAddress: string | null): string {
    if (walletAddress && address === walletAddress) return 'Wallet';
    return 'Account';
}

export interface RunTransactionSimulationParams {
    key: string;
    ctx: PluginContext;
    signature?: string | null;
    wireTransactionBase64?: string | null;
    commitment?: SimulationCommitment;
    includeSnapshots?: boolean;
    maxWritableAccounts?: number;
}

export async function runTransactionSimulation(
    params: RunTransactionSimulationParams,
): Promise<TransactionSimulationResult> {
    const startedAt = Date.now();

    const { ctx } = params;
    const rpcUrl = getRpcUrl(ctx);
    if (!rpcUrl)
        throw new Error('No RPC URL available (set devtools config.rpcUrl or ensure connector has an RPC URL).');
    const rpcUrlValue = rpcUrl;

    const snapshot = ctx.client.getSnapshot();
    const walletAddress = snapshot.selectedAccount ? String(snapshot.selectedAccount) : null;
    const clusterId = ctx.client.getCluster()?.id ?? null;

    const commitment = params.commitment ?? 'confirmed';
    const includeSnapshots = params.includeSnapshots ?? true;
    const maxWritableAccounts = params.maxWritableAccounts ?? 64;

    let wireBase64 = params.wireTransactionBase64?.trim() ? String(params.wireTransactionBase64).trim() : '';
    const signature = params.signature?.trim() ? String(params.signature).trim() : null;

    if (!wireBase64 && signature) {
        const maxAttempts = 4;
        for (let attempt = 0; attempt < maxAttempts; attempt++) {
            wireBase64 =
                (await fetchTransactionWireBase64(rpcUrlValue, signature, {
                    commitment,
                })) ?? '';
            if (wireBase64) break;
            if (attempt < maxAttempts - 1) {
                const delayMs = 250 * (attempt + 1);
                await new Promise(r => window.setTimeout(r, delayMs));
            }
        }
    }
    if (!wireBase64) {
        if (signature) {
            throw new Error(
                'Unable to fetch wire transaction bytes from RPC yet. ' +
                    'If this transaction is still pending/unconfirmed, wait a few seconds and try again. ' +
                    'To enable pre-send simulation, send via the connector signer (captures bytes via transaction:preparing) ' +
                    'or call client.previewTransaction(tx) / track with metadata.wireTransactionBase64.',
            );
        }
        throw new Error('No wire transaction bytes available to simulate (missing base64 bytes and signature).');
    }

    const decoded = decodeWireTransactionBase64(wireBase64);
    const messageBase64 = bytesToBase64(new Uint8Array(decoded.transaction.messageBytes as unknown as Uint8Array));
    const explorerInspectorUrl = getExplorerInspectorUrl(messageBase64, clusterId);

    const warnings: SimulationWarning[] = [];

    // Prefer decompiled message (lookup tables resolved) to derive accounts + instructions.
    let decompiledMessage: any | null = null;
    try {
        decompiledMessage = await decompileMessageFromWireTransactionBase64(wireBase64, rpcUrlValue);
    } catch {
        decompiledMessage = null;
    }

    const instructions = (decompiledMessage?.instructions ?? []) as any[];
    const decodedInstructions = await decodeInstructionsWithAnchorIdls({
        instructions: instructions as any,
        rpcUrl: rpcUrlValue,
    });

    const metaByAddress = new Map<string, SimulationWritableAccountMeta>();

    const feePayerAddress =
        (typeof decompiledMessage?.feePayer?.address === 'string'
            ? String(decompiledMessage.feePayer.address)
            : null) ??
        decoded.summary.feePayer ??
        null;

    if (feePayerAddress) {
        mergeMeta(metaByAddress, { address: feePayerAddress, isSigner: true, isWritable: true });
    }

    for (const ix of instructions) {
        const accounts = Array.isArray(ix?.accounts) ? (ix.accounts as any[]) : [];
        for (const acc of accounts) {
            const address = typeof acc?.address === 'string' ? String(acc.address) : '';
            if (!address) continue;
            mergeMeta(metaByAddress, {
                address,
                isSigner: roleIsSigner((acc as any)?.role),
                isWritable: roleIsWritable((acc as any)?.role),
            });
        }
    }

    const writableMetas = Array.from(metaByAddress.values()).filter(m => m.isWritable);
    const truncatedWritableAccounts = writableMetas.length > maxWritableAccounts;
    const writableForSimulation = writableMetas.slice(0, maxWritableAccounts);
    const writableAddresses = writableForSimulation.map(m => m.address);

    if (truncatedWritableAccounts) {
        warnings.push({
            severity: 'warning',
            shortMessage: 'Truncated',
            message: `Only the first ${maxWritableAccounts} writable accounts were simulated to reduce RPC load.`,
        });
    }

    const preByAddress = new Map<string, SimulationAccountInfoBase64>();
    if (includeSnapshots) {
        const pre = await fetchMultipleAccountsBase64(rpcUrlValue, writableAddresses, { commitment });
        for (let i = 0; i < writableAddresses.length; i++) {
            preByAddress.set(writableAddresses[i], normalizeAccountInfoBase64(pre[i]));
        }
    }

    async function simulateOnce(): Promise<any> {
        return await simulateWireTransactionBase64(rpcUrlValue, wireBase64 as Base64EncodedWireTransaction, {
            commitment,
            replaceRecentBlockhash: true,
            ...(includeSnapshots ? { accounts: { addresses: writableAddresses, encoding: 'base64' } } : {}),
        });
    }

    let simResp: any;
    let tries = 0;
    while (true) {
        tries += 1;
        simResp = await simulateOnce();
        const err = simResp?.value?.err ?? null;
        if (!isBlockhashNotFound(err) || tries >= 4) break;
        await new Promise(r => window.setTimeout(r, 150));
    }

    const simValue = simResp?.value ?? null;
    const simErr = simValue?.err ?? null;
    const logs = Array.isArray(simValue?.logs) ? (simValue.logs as string[]) : null;
    const unitsConsumed =
        typeof simValue?.unitsConsumed === 'number' && Number.isFinite(simValue.unitsConsumed)
            ? (simValue.unitsConsumed as number)
            : null;

    if (simErr) {
        warnings.push({
            severity: 'critical',
            shortMessage: 'Simulation Failed',
            message: 'Transaction failed in simulation.',
        });
    }
    if (isInsufficientFunds(simErr)) {
        warnings.push({
            severity: 'critical',
            shortMessage: 'Insufficient Funds',
            message: 'Simulation indicates insufficient funds for this transaction.',
        });
    }

    const postAccountsRaw = Array.isArray(simValue?.accounts) ? (simValue.accounts as Array<unknown | null>) : [];
    const postByAddress = new Map<string, SimulationAccountInfoBase64>();
    if (includeSnapshots) {
        for (let i = 0; i < writableAddresses.length; i++) {
            postByAddress.set(writableAddresses[i], normalizeAccountInfoBase64(postAccountsRaw[i]));
        }
    }

    const writableAccounts: SimulationWritableAccount[] = writableForSimulation.map(meta => {
        const pre = includeSnapshots
            ? (preByAddress.get(meta.address) ?? { lamports: null, owner: null, dataBase64: null })
            : { lamports: null, owner: null, dataBase64: null };
        const post = includeSnapshots
            ? (postByAddress.get(meta.address) ?? { lamports: null, owner: null, dataBase64: null })
            : { lamports: null, owner: null, dataBase64: null };

        const deltaLamports = includeSnapshots ? safeLamportsDelta(pre, post) : null;
        const changedInSimulation = includeSnapshots
            ? Boolean((deltaLamports !== null && deltaLamports !== 0n) || didDataChange(pre, post))
            : false;

        const tokenPre = includeSnapshots ? parseClassicSplTokenAccount(pre.dataBase64) : null;
        const tokenPost = includeSnapshots ? parseClassicSplTokenAccount(post.dataBase64) : null;

        return {
            address: meta.address,
            changedInSimulation,
            isSigner: meta.isSigner,
            isWritable: meta.isWritable,
            post,
            pre,
            tokenPost,
            tokenPre,
        };
    });

    if (includeSnapshots) {
        for (const acc of writableAccounts) {
            if (!acc.changedInSimulation) {
                warnings.push({
                    severity: 'warning',
                    shortMessage: 'Unchanged',
                    message:
                        'Account did not change in simulation but was labeled as writable. Behavior may differ from the simulation.',
                    account: acc.address,
                });
            }

            const preT = acc.tokenPre;
            const postT = acc.tokenPost;

            if (preT && postT) {
                if (!preT.owner || !postT.owner) continue;

                if (preT.delegate === null && postT.delegate) {
                    warnings.push({
                        severity: 'warning',
                        shortMessage: 'Delegated',
                        message: `Delegation was set on a token account. This can allow withdrawals without the owner’s approval.`,
                        account: acc.address,
                    });
                }

                if (preT.owner !== postT.owner) {
                    warnings.push({
                        severity: 'critical',
                        shortMessage: 'Owner Changed',
                        message: `Token account owner changed in simulation.`,
                        account: acc.address,
                    });
                }

                if (preT.closeAuthority !== postT.closeAuthority) {
                    warnings.push({
                        severity: 'warning',
                        shortMessage: 'Close Authority',
                        message: `Token account close authority changed in simulation.`,
                        account: acc.address,
                    });
                }
            }
        }
    }

    const balanceChanges: SimulationBalanceChange[] = [];
    if (includeSnapshots) {
        for (const acc of writableAccounts) {
            const deltaLamports = safeLamportsDelta(acc.pre, acc.post);
            if (deltaLamports !== null && deltaLamports !== 0n) {
                balanceChanges.push({
                    kind: 'sol',
                    address: acc.address,
                    owner: walletAddress && acc.address === walletAddress ? walletAddress : undefined,
                    amount: deltaLamports,
                });
            }

            const preT = acc.tokenPre;
            const postT = acc.tokenPost;
            const mint = postT?.mint ?? preT?.mint;
            const owner = postT?.owner ?? preT?.owner;
            const preAmount = preT?.amount ?? 0n;
            const postAmount = postT?.amount ?? 0n;
            const delta = postAmount - preAmount;
            if (mint && owner && delta !== 0n) {
                balanceChanges.push({
                    kind: 'spl-token',
                    address: acc.address,
                    owner,
                    mint,
                    amount: delta,
                });
            }
        }
    }

    if (includeSnapshots) {
        const negativeCount = balanceChanges.filter(b => b.amount < 0n).length;
        if (negativeCount >= 3) {
            warnings.push({
                severity: 'warning',
                shortMessage: '3+ Negative',
                message:
                    'Three or more accounts show negative balance change in simulation. Make sure this is expected.',
            });
        }
    }

    if (!instructions.length) {
        warnings.push({
            severity: 'warning',
            shortMessage: 'Limited Decode',
            message: 'Lookup table decompile failed; instruction/account decoding may be incomplete.',
        });
    }

    const finishedAt = Date.now();
    return {
        balanceChanges,
        cluster: clusterId,
        commitment,
        error: simErr,
        explorerInspectorUrl,
        finishedAt,
        includeSnapshots,
        instructions: decodedInstructions.map(ix => {
            // If we couldn’t decompile instruction data, ensure we have a minimal raw payload.
            const rawHex = ix.raw.dataHex
                ? ix.raw.dataHex
                : decoded.compiledMessage?.instructions?.[ix.index]?.data
                  ? bytesToHexPreview(decoded.compiledMessage.instructions[ix.index].data as Uint8Array, 256)
                  : '';
            return { ...ix, raw: { ...ix.raw, dataHex: rawHex } };
        }),
        key: params.key,
        logs,
        messageBase64,
        rawSimulation: simValue,
        signature,
        startedAt,
        truncatedWritableAccounts,
        unitsConsumed,
        warnings,
        wireTransactionBase64: wireBase64,
        writableAccounts,
    };
}
