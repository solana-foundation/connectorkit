import type { PluginContext } from '../types';

export function escapeHtml(text: string): string {
    return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

export function escapeAttr(text: string): string {
    // Conservative: treat same as HTML escaping (prevents breaking out of attribute values)
    return escapeHtml(text);
}

export function getRpcUrl(ctx: PluginContext): string | null {
    const cfg = ctx.getConfig();
    return cfg.rpcUrl ?? ctx.client.getRpcUrl() ?? null;
}

export function getExplorerUrl(signature: string, cluster?: string): string {
    const baseUrl = 'https://explorer.solana.com';
    let clusterParam = '';
    if (cluster?.includes('devnet')) clusterParam = '?cluster=devnet';
    else if (cluster?.includes('testnet')) clusterParam = '?cluster=testnet';
    else if (cluster?.includes('custom')) clusterParam = '?cluster=custom';
    return `${baseUrl}/tx/${signature}${clusterParam}`;
}

export async function copyToClipboard(text: string): Promise<void> {
    if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
        try {
            await navigator.clipboard.writeText(text);
            return;
        } catch {
            // Fall through to legacy copy method.
        }
    }

    if (typeof document === 'undefined') return;

    const textarea = document.createElement('textarea');
    textarea.value = text;
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand('copy');
    document.body.removeChild(textarea);
}

export function truncateMiddle(value: string, head = 8, tail = 8): string {
    if (value.length <= head + tail + 3) return value;
    return `${value.slice(0, head)}...${value.slice(-tail)}`;
}
