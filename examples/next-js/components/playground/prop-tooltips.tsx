import { cn } from '@/lib/utils';

interface PropTooltipData {
    description: string;
    usage?: string;
}

const PROP_TOOLTIPS: Record<string, PropTooltipData> = {
    // Wallet identity / session
    status: {
        description: "Wallet connection state machine status ('disconnected' | 'connecting' | 'connected' | 'error').",
        usage: "if (status === 'connected') { /* ... */ }",
    },
    isConnected: {
        description: 'Convenience boolean derived from wallet status.',
        usage: 'if (isConnected) { /* show account UI */ }',
    },
    isConnecting: {
        description: 'True while a wallet connection attempt is in progress.',
        usage: 'if (isConnecting) return <Spinner />;',
    },
    connector: {
        description: 'Metadata for the connected wallet connector (name/icon/id).',
        usage: 'connector?.name',
    },
    account: {
        description: 'Currently selected account address (string) or null if disconnected.',
        usage: 'const address = account ? String(account) : null;',
    },
    connectors: {
        description: 'All available wallet connectors detected in the environment.',
        usage: 'connectors.filter(c => c.ready)',
    },
    connectWallet: {
        description: 'Connect to a wallet by connector id (vNext).',
        usage: "await connectWallet('wallet-standard:phantom')",
    },
    disconnectWallet: {
        description: 'Disconnect the current wallet session (vNext).',
        usage: 'await disconnectWallet()',
    },

    // Element render-props (wallet/account)
    walletName: {
        description: "Human-readable wallet name (e.g. 'Phantom', 'Solflare').",
        usage: '<span>{walletName}</span>',
    },
    walletIcon: {
        description: 'Wallet icon URL/data-URI. Useful for avatar images.',
        usage: '<img src={walletIcon} alt={walletName ?? "Wallet"} />',
    },
    formatted: {
        description: 'Shortened address formatted for display.',
        usage: '<code className="font-mono">{formatted}</code>',
    },
    copy: {
        description: 'Async helper that copies the address to clipboard and returns a result.',
        usage: 'await copy()',
    },
    copied: {
        description: 'True for a short time after a successful copy.',
        usage: "{copied ? 'Copied!' : 'Copy'}",
    },

    // Data hooks/elements
    solBalance: {
        description: 'SOL balance as a number in SOL (not lamports).',
        usage: 'solBalance?.toFixed(4)',
    },
    isLoading: {
        description: 'True while the hook/element is fetching or refetching data.',
        usage: 'if (isLoading) return <Skeleton />;',
    },
    error: {
        description: 'Error from the most recent fetch attempt (null if none).',
        usage: 'if (error) return <ErrorState />;',
    },
    refetch: {
        description: 'Async function to refresh the current query.',
        usage: 'await refetch()',
    },
    abort: {
        description: 'Abort any in-flight request (helpful for slow/throttled RPCs).',
        usage: 'abort()',
    },
    lastUpdated: {
        description: 'Date of the last successful fetch (null if never fetched).',
        usage: 'lastUpdated?.toLocaleTimeString()',
    },
    totalAccounts: {
        description: 'Total number of token accounts considered (may include native SOL when enabled).',
        usage: 'totalAccounts',
    },
    tokens: {
        description: 'Array of token holdings (mint/symbol/name/logo/formatted...).',
        usage: 'tokens.map(t => t.mint)',
    },
    transactions: {
        description: 'Array of parsed transactions (signature/type/explorerUrl/etc).',
        usage: 'transactions.map(tx => tx.signature)',
    },
    hasMore: {
        description: 'Whether there are more results available for pagination.',
        usage: 'if (hasMore) await loadMore()',
    },
    loadMore: {
        description: 'Fetch the next page of results (pagination).',
        usage: 'await loadMore()',
    },

    // Cluster
    cluster: {
        description: 'Current cluster/network object (id/label/rpcUrl...).',
        usage: 'cluster?.id',
    },
    clusters: {
        description: 'All configured clusters available to switch to.',
        usage: 'clusters.map(c => c.id)',
    },
    setCluster: {
        description: 'Async setter to change cluster/network.',
        usage: "await setCluster('solana:devnet')",
    },
    isMainnet: {
        description: "Convenience boolean for whether the current cluster is mainnet ('solana:mainnet').",
        usage: 'if (isMainnet) { /* mainnet-only UI */ }',
    },
    isDevnet: {
        description: "Convenience boolean for whether the current cluster is devnet ('solana:devnet').",
        usage: 'if (isDevnet) { /* show faucets */ }',
    },

    // Disconnect element
    disconnect: {
        description: 'Async function that disconnects the current wallet session.',
        usage: 'await disconnect()',
    },
    disconnecting: {
        description: 'True while disconnect is in progress.',
        usage: 'disabled={disconnecting}',
    },
};

function getPropTooltip(name: string): PropTooltipData {
    return (
        PROP_TOOLTIPS[name] ?? {
            description: 'Value provided by the hook/render props. Hover to see its shape/usage.',
        }
    );
}

export function PropNameWithTooltip({ name, className }: { name: string; className?: string }) {
    const tooltip = getPropTooltip(name);

    return (
        <span className="relative inline-flex group">
            <button
                type="button"
                className={cn(
                    'px-2 py-0.5 text-[11px] font-mono text-sand-700 bg-white border border-sand-300 rounded-md cursor-help',
                    'focus:outline-none focus-visible:ring-2 focus-visible:ring-sand-400 focus-visible:ring-offset-2 focus-visible:ring-offset-sand-100',
                    className,
                )}
                aria-label={`${name}: ${tooltip.description}`}
            >
                {name}
            </button>
            <div className="pointer-events-none absolute left-0 top-full z-50 mt-2 hidden w-72 group-hover:block group-focus-within:block">
                <div className="rounded-lg border border-sand-300 bg-white p-3 shadow-xl">
                    <div className="flex items-center justify-between gap-2">
                        <span className="text-[11px] font-mono text-sand-900">{name}</span>
                        <span className="text-[10px] font-mono text-sand-500">prop</span>
                    </div>
                    <p className="mt-1 text-xs text-sand-700 leading-snug">{tooltip.description}</p>
                    {tooltip.usage && (
                        <div className="mt-2 rounded-md border border-sand-200 bg-sand-100 px-2 py-1 text-[11px] font-mono text-sand-800">
                            {tooltip.usage}
                        </div>
                    )}
                </div>
            </div>
        </span>
    );
}
