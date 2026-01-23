import { escapeHtml } from '../../utils/dom';

export function unwrapRpcValue<T>(resp: unknown): T | null {
    if (!resp) return null;
    if (typeof resp === 'object' && resp !== null && 'value' in resp) return (resp as any).value as T;
    return resp as T;
}

export function safeJsonStringify(value: unknown, space = 2): string {
    try {
        return JSON.stringify(value, (_key, v) => (typeof v === 'bigint' ? v.toString() : v), space);
    } catch (err) {
        return err instanceof Error ? err.message : String(err);
    }
}

export function toBigIntOrNull(value: unknown): bigint | null {
    if (value === null || value === undefined) return null;
    if (typeof value === 'bigint') return value;
    if (typeof value === 'number') {
        if (!Number.isFinite(value)) return null;
        return BigInt(Math.trunc(value));
    }
    if (typeof value === 'string') {
        if (value.trim() === '') return null;
        try {
            return BigInt(value);
        } catch {
            return null;
        }
    }
    return null;
}

export function formatIntegerLike(value: unknown): string {
    const big = toBigIntOrNull(value);
    if (big !== null) return big.toString();
    if (typeof value === 'string') return value;
    if (typeof value === 'number') return Number.isFinite(value) ? String(value) : 'N/A';
    if (value === null) return 'null';
    if (value === undefined) return 'N/A';
    return safeJsonStringify(value, 0);
}

const LAMPORTS_PER_SOL = 1_000_000_000n;

export function formatSolFromLamports(lamports: bigint): string {
    const sign = lamports < 0n ? '-' : '';
    const abs = lamports < 0n ? -lamports : lamports;
    const whole = abs / LAMPORTS_PER_SOL;
    const frac = abs % LAMPORTS_PER_SOL;

    const fracStr = frac.toString().padStart(9, '0').replace(/0+$/, '');
    return fracStr ? `${sign}${whole.toString()}.${fracStr}` : `${sign}${whole.toString()}`;
}

export function formatBlockTime(blockTime: unknown): string {
    const seconds = toBigIntOrNull(blockTime);
    if (seconds === null) return 'N/A';
    const ms = Number(seconds) * 1000;
    if (!Number.isFinite(ms)) return seconds.toString();
    return new Date(ms).toLocaleString('en-US', { hour12: false });
}

export function getAccountPubkey(accountKey: unknown): string {
    if (!accountKey) return '';
    if (typeof accountKey === 'string') return accountKey;
    if (typeof accountKey === 'object' && accountKey !== null && 'pubkey' in accountKey)
        return String((accountKey as any).pubkey);
    return safeJsonStringify(accountKey, 0);
}

export function renderKeyValueRows(rows: Array<{ key: string; value: string }>, className = 'cdt-kv'): string {
    return `
        <div class="${className}">
            ${rows
                .map(
                    row => `
                        <div class="cdt-k">${escapeHtml(row.key)}</div>
                        <div class="cdt-v">${escapeHtml(row.value)}</div>
                    `,
                )
                .join('')}
        </div>
    `;
}

export function formatRelativeTime(timestamp: string): string {
    const now = Date.now();
    const then = new Date(timestamp).getTime();
    const diff = now - then;

    if (diff < 1000) return 'just now';
    if (diff < 60000) return `${Math.floor(diff / 1000)}s ago`;
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    return new Date(timestamp).toLocaleTimeString('en-US', {
        hour12: false,
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
    });
}
