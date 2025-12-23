'use client';

import { useConnector, useBalance, useCluster, useTokens, useTransactions } from '@solana/connector';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Wallet, Copy, Check, RefreshCw, Coins, ExternalLink, LogOut } from 'lucide-react';
import { ExampleCard, type ExampleConfig } from './example-card';
import { useState } from 'react';

// Helper component for displaying hook return values as mini badge
function HookReturnValue({ name, value }: { name: string; value: string }) {
    return (
        <div className="flex items-center justify-between py-1.5 gap-2">
            <span className="px-2 py-0.5 text-[11px] font-mono text-sand-700 bg-white border border-sand-300 rounded-md">
                {name}
            </span>
            <span className="text-xs font-mono text-sand-600 truncate max-w-[120px]">{value}</span>
        </div>
    );
}

// Hook example components
function UseConnectorExample() {
    const { connected, connecting, selectedWallet, selectedAccount, wallets, select, disconnect } = useConnector();
    const [copied, setCopied] = useState(false);

    const handleCopy = () => {
        if (selectedAccount) {
            navigator.clipboard.writeText(selectedAccount);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    const shortAddress = selectedAccount ? `${selectedAccount.slice(0, 4)}...${selectedAccount.slice(-4)}` : '—';

    // Combined component render
    const renderCombined = () => {
        if (connecting) {
            return (
                <div className="p-4 rounded-lg border bg-card">
                    <div className="flex items-center gap-2">
                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                        <span className="text-sm">Connecting...</span>
                    </div>
                </div>
            );
        }

        if (connected && selectedAccount && selectedWallet) {
            return (
                <div className="p-4 rounded-lg border bg-card space-y-3">
                    <div className="flex items-center gap-3">
                        <Avatar className="h-10 w-10">
                            {selectedWallet.icon && <AvatarImage src={selectedWallet.icon} />}
                            <AvatarFallback>
                                <Wallet className="h-5 w-5" />
                            </AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                            <p className="font-medium text-sm">{selectedWallet.name}</p>
                            <p className="text-xs text-muted-foreground font-mono">{shortAddress}</p>
                        </div>
                        <button onClick={handleCopy} className="p-2 hover:bg-muted rounded-md">
                            {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                        </button>
                    </div>
                    <Button variant="destructive" size="sm" className="w-full" onClick={() => disconnect()}>
                        <LogOut className="h-4 w-4 mr-2" />
                        Disconnect
                    </Button>
                </div>
            );
        }

        return (
            <div className="p-4 rounded-lg border bg-card space-y-2">
                <p className="text-sm text-muted-foreground mb-2">Select a wallet:</p>
                {wallets
                    .filter(w => w.installed)
                    .slice(0, 3)
                    .map(w => (
                        <Button
                            key={w.wallet.name}
                            variant="outline"
                            size="sm"
                            className="w-full justify-start"
                            onClick={() => select(w.wallet.name)}
                        >
                            <Avatar className="h-5 w-5 mr-2">
                                {w.wallet.icon && <AvatarImage src={w.wallet.icon} />}
                                <AvatarFallback>
                                    <Wallet className="h-3 w-3" />
                                </AvatarFallback>
                            </Avatar>
                            {w.wallet.name}
                        </Button>
                    ))}
            </div>
        );
    };

    return (
        <div className="flex flex-col lg:flex-row gap-6 w-full items-stretch">
            {/* Left: Hook Container with Return Values */}
            <div className="flex-1 relative bg-sand-100 border border-dashed border-sand-500 rounded-2xl p-3">
                <span className="absolute -top-2.5 left-3 bg-sand-100 px-2 text-xs font-mono font-medium text-sand-700">
                    useConnector()
                </span>
                <div className="space-y-0.5 pt-1">
                    <HookReturnValue name="connected" value={String(connected)} />
                    <HookReturnValue name="connecting" value={String(connecting)} />
                    <HookReturnValue name="selectedWallet" value={selectedWallet?.name ?? 'null'} />
                    <HookReturnValue name="selectedAccount" value={shortAddress} />
                    <HookReturnValue name="wallets" value={`[${wallets.length} items]`} />
                    <HookReturnValue name="select" value="fn()" />
                    <HookReturnValue name="disconnect" value="fn()" />
                </div>
            </div>

            {/* Divider */}
            <div className="hidden lg:flex flex-col items-center justify-center gap-1">
                <div className="flex-1 border-l border-dashed border-sand-300" />
                <span className="text-[10px] text-muted-foreground -rotate-90 whitespace-nowrap p-2 bg-sand-100">
                    combined
                </span>
                <div className="flex-1 border-l border-dashed border-sand-300" />
            </div>
            <div className="lg:hidden flex items-center gap-2">
                <div className="flex-1 border-t border-dashed border-sand-300" />
                <span className="text-[10px] text-muted-foreground">combined</span>
                <div className="flex-1 border-t border-dashed border-sand-300" />
            </div>

            {/* Right: Combined Component */}
            <div className="flex-1 flex flex-col justify-center">{renderCombined()}</div>
        </div>
    );
}

function UseBalanceExample() {
    const { solBalance, isLoading, refetch } = useBalance();

    return (
        <div className="flex flex-col lg:flex-row gap-6 w-full items-stretch">
            {/* Left: Hook Container with Return Values */}
            <div className="flex-1 relative bg-sand-100 border border-dashed border-sand-500 rounded-2xl p-3">
                <span className="absolute -top-2.5 left-3 bg-sand-100 px-2 text-xs font-mono font-medium text-sand-700">
                    useBalance()
                </span>
                <div className="space-y-0.5 pt-1">
                    <HookReturnValue name="solBalance" value={solBalance?.toFixed(4) ?? 'null'} />
                    <HookReturnValue name="isLoading" value={String(isLoading)} />
                    <HookReturnValue name="refetch" value="fn()" />
                </div>
            </div>

            {/* Divider */}
            <div className="hidden lg:flex flex-col items-center justify-center gap-1">
                <div className="flex-1 border-l border-dashed border-sand-300" />
                <span className="text-[10px] text-muted-foreground -rotate-90 whitespace-nowrap p-2 bg-sand-100">
                    combined
                </span>
                <div className="flex-1 border-l border-dashed border-sand-300" />
            </div>
            <div className="lg:hidden flex items-center gap-2">
                <div className="flex-1 border-t border-dashed border-sand-300" />
                <span className="text-[10px] text-muted-foreground">combined</span>
                <div className="flex-1 border-t border-dashed border-sand-300" />
            </div>

            {/* Right: Combined Component */}
            <div className="flex-1 flex flex-col justify-center">
                <div className="p-4 rounded-lg border bg-card">
                    <div className="flex items-center justify-between mb-1">
                        <span className="text-xs text-muted-foreground">SOL Balance</span>
                        <button onClick={refetch} disabled={isLoading} className="p-1 hover:bg-muted rounded">
                            <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`} />
                        </button>
                    </div>
                    <p className="text-2xl font-bold">
                        {isLoading ? (
                            <span className="inline-block h-8 w-24 bg-muted animate-pulse rounded" />
                        ) : (
                            `${solBalance?.toFixed(4) ?? '--'} SOL`
                        )}
                    </p>
                </div>
            </div>
        </div>
    );
}

function UseClusterExample() {
    const { cluster, clusters, setCluster, isMainnet, isDevnet } = useCluster();

    const clusterColors: Record<string, string> = {
        'solana:mainnet': 'bg-green-500',
        'solana:devnet': 'bg-blue-500',
        'solana:testnet': 'bg-yellow-500',
        'solana:localnet': 'bg-red-500',
    };

    return (
        <div className="flex flex-col lg:flex-row gap-6 w-full items-stretch">
            {/* Left: Hook Container with Return Values */}
            <div className="flex-1 relative bg-sand-100 border border-dashed border-sand-500 rounded-2xl p-3">
                <span className="absolute -top-2.5 left-3 bg-sand-100 px-2 text-xs font-mono font-medium text-sand-700">
                    useCluster()
                </span>
                <div className="space-y-0.5 pt-1">
                    <HookReturnValue name="cluster" value={cluster?.label ?? 'null'} />
                    <HookReturnValue name="clusters" value={`[${clusters.length} items]`} />
                    <HookReturnValue name="setCluster" value="fn()" />
                    <HookReturnValue name="isMainnet" value={String(isMainnet)} />
                    <HookReturnValue name="isDevnet" value={String(isDevnet)} />
                </div>
            </div>

            {/* Divider */}
            <div className="hidden lg:flex flex-col items-center justify-center gap-1">
                <div className="flex-1 border-l border-dashed border-sand-300" />
                <span className="text-[10px] text-muted-foreground -rotate-90 whitespace-nowrap p-2 bg-sand-100">
                    combined
                </span>
                <div className="flex-1 border-l border-dashed border-sand-300" />
            </div>
            <div className="lg:hidden flex items-center gap-2">
                <div className="flex-1 border-t border-dashed border-sand-300" />
                <span className="text-[10px] text-muted-foreground">combined</span>
                <div className="flex-1 border-t border-dashed border-sand-300" />
            </div>

            {/* Right: Combined Component */}
            <div className="flex-1 flex flex-col justify-center">
                <div className="p-4 rounded-lg border bg-card space-y-3">
                    <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">Current Network</span>
                        <Badge variant={isMainnet ? 'default' : 'secondary'}>
                            <span
                                className={`h-2 w-2 rounded-full mr-1.5 ${clusterColors[cluster?.id || ''] || 'bg-purple-500'}`}
                            />
                            {cluster?.label}
                        </Badge>
                    </div>
                    <div className="flex flex-wrap gap-1">
                        {clusters.map(c => (
                            <Button
                                key={c.id}
                                size="sm"
                                variant={cluster?.id === c.id ? 'default' : 'outline'}
                                onClick={() => setCluster(c.id)}
                                className="text-xs"
                            >
                                <span
                                    className={`h-1.5 w-1.5 rounded-full mr-1.5 ${clusterColors[c.id] || 'bg-purple-500'}`}
                                />
                                {c.label}
                            </Button>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}

function UseTokensExample() {
    const { tokens, isLoading, refetch } = useTokens();
    const displayTokens = tokens.slice(0, 3);
    const sampleToken = tokens[0];

    return (
        <div className="flex flex-col lg:flex-row gap-6 w-full items-stretch">
            {/* Left: Hook Container with Return Values */}
            <div className="flex-1 relative bg-sand-100 border border-dashed border-sand-500 rounded-2xl p-3">
                <span className="absolute -top-2.5 left-3 bg-sand-100 px-2 text-xs font-mono font-medium text-sand-700">
                    useTokens()
                </span>
                <div className="space-y-3 pt-1">
                    {/* Top-level returns */}
                    <div className="space-y-0.5">
                        <HookReturnValue name="tokens" value={`[${tokens.length} items]`} />
                        <HookReturnValue name="isLoading" value={String(isLoading)} />
                        <HookReturnValue name="refetch" value="fn()" />
                        <HookReturnValue name="hasMore" value="boolean" />
                        <HookReturnValue name="loadMore" value="fn()" />
                    </div>

                    {/* Sample token item breakdown */}
                    {sampleToken && (
                        <div className="border border-sand-300 rounded-xl p-2 bg-sand-50">
                            <span className="text-[10px] font-mono text-sand-700 mb-2 block">
                                tokens properties:
                            </span>
                            <div className="grid grid-cols-2 gap-1.5">
                                <div className="flex flex-col gap-1 p-2 rounded-lg border bg-card">
                                    <span className="text-[9px] font-mono text-muted-foreground uppercase">logo</span>
                                    {sampleToken.logo ? (
                                        <img src={sampleToken.logo} className="h-6 w-6 rounded-full" alt="" />
                                    ) : (
                                        <div className="h-6 w-6 rounded-full bg-muted flex items-center justify-center">
                                            <Coins className="h-3 w-3" />
                                        </div>
                                    )}
                                </div>
                                <div className="flex flex-col gap-1 p-2 rounded-lg border bg-card">
                                    <span className="text-[9px] font-mono text-muted-foreground uppercase">symbol</span>
                                    <span className="text-xs font-medium truncate">{sampleToken.symbol}</span>
                                </div>
                                <div className="flex flex-col gap-1 p-2 rounded-lg border bg-card">
                                    <span className="text-[9px] font-mono text-muted-foreground uppercase">name</span>
                                    <span className="text-xs text-muted-foreground truncate">{sampleToken.name}</span>
                                </div>
                                <div className="flex flex-col gap-1 p-2 rounded-lg border bg-card">
                                    <span className="text-[9px] font-mono text-muted-foreground uppercase">
                                        formatted
                                    </span>
                                    <span className="text-xs font-mono">{sampleToken.formatted}</span>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Divider */}
            <div className="hidden lg:flex flex-col items-center justify-center gap-1">
                <div className="flex-1 border-l border-dashed border-sand-300" />
                <span className="text-[10px] text-muted-foreground -rotate-90 whitespace-nowrap p-2 bg-sand-100">
                    combined
                </span>
                <div className="flex-1 border-l border-dashed border-sand-300" />
            </div>
            <div className="lg:hidden flex items-center gap-2">
                <div className="flex-1 border-t border-dashed border-sand-300" />
                <span className="text-[10px] text-muted-foreground">combined</span>
                <div className="flex-1 border-t border-dashed border-sand-300" />
            </div>

            {/* Right: Combined Component */}
            <div className="flex-1 flex flex-col justify-center">
                <div className="rounded-lg border bg-card">
                    <div className="flex items-center justify-between p-3 border-b">
                        <span className="text-sm font-medium">Tokens</span>
                        <button onClick={refetch} disabled={isLoading} className="p-1 hover:bg-muted rounded">
                            <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`} />
                        </button>
                    </div>
                    <div className="divide-y max-h-[180px] overflow-y-auto">
                        {isLoading ? (
                            [1, 2, 3].map(i => (
                                <div key={i} className="flex items-center gap-3 p-3">
                                    <div className="h-8 w-8 rounded-full bg-muted animate-pulse" />
                                    <div className="flex-1">
                                        <div className="h-4 w-16 bg-muted animate-pulse rounded mb-1" />
                                        <div className="h-3 w-24 bg-muted animate-pulse rounded" />
                                    </div>
                                </div>
                            ))
                        ) : displayTokens.length > 0 ? (
                            displayTokens.map(token => (
                                <div key={token.mint} className="flex items-center gap-3 p-3">
                                    {token.logo ? (
                                        <img src={token.logo} className="h-8 w-8 rounded-full" alt={token.symbol} />
                                    ) : (
                                        <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center">
                                            <Coins className="h-4 w-4" />
                                        </div>
                                    )}
                                    <div className="flex-1 min-w-0">
                                        <p className="font-medium text-sm truncate">{token.symbol}</p>
                                        <p className="text-xs text-muted-foreground truncate">{token.name}</p>
                                    </div>
                                    <p className="font-mono text-sm">{token.formatted}</p>
                                </div>
                            ))
                        ) : (
                            <p className="p-4 text-center text-muted-foreground text-sm">No tokens found</p>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

function UseTransactionsExample() {
    const { transactions, isLoading, hasMore, loadMore } = useTransactions({ limit: 3 });
    const sampleTx = transactions[0];

    return (
        <div className="flex flex-col lg:flex-row gap-6 w-full items-stretch">
            {/* Left: Hook Container with Return Values */}
            <div className="flex-1 relative bg-sand-100 border border-dashed border-sand-500 rounded-2xl p-3">
                <span className="absolute -top-2.5 left-3 bg-sand-100 px-2 text-xs font-mono font-medium text-sand-700">
                    useTransactions()
                </span>
                <div className="space-y-3 pt-1">
                    {/* Top-level returns */}
                    <div className="space-y-0.5">
                        <HookReturnValue name="transactions" value={`[${transactions.length} items]`} />
                        <HookReturnValue name="isLoading" value={String(isLoading)} />
                        <HookReturnValue name="hasMore" value={String(hasMore)} />
                        <HookReturnValue name="loadMore" value="fn()" />
                    </div>

                    {/* Sample transaction item breakdown */}
                    {sampleTx && (
                        <div className="border border-sand-300 rounded-xl p-2 bg-sand-50">
                            <span className="text-[10px] font-mono text-sand-700 mb-2 block">
                                transactions properties:
                            </span>
                            <div className="grid grid-cols-2 gap-1.5">
                                <div className="flex flex-col gap-1 p-2 rounded-lg border bg-card">
                                    <span className="text-[9px] font-mono text-muted-foreground uppercase">type</span>
                                    <span className="text-xs font-medium">{sampleTx.type}</span>
                                </div>
                                <div className="flex flex-col gap-1 p-2 rounded-lg border bg-card">
                                    <span className="text-[9px] font-mono text-muted-foreground uppercase">
                                        direction
                                    </span>
                                    <span
                                        className={`text-xs font-medium ${sampleTx.direction === 'in' ? 'text-green-600' : 'text-orange-600'}`}
                                    >
                                        {sampleTx.direction}
                                    </span>
                                </div>
                                <div className="flex flex-col gap-1 p-2 rounded-lg border bg-card">
                                    <span className="text-[9px] font-mono text-muted-foreground uppercase">
                                        formattedAmount
                                    </span>
                                    <span className="text-xs font-mono">{sampleTx.formattedAmount || '—'}</span>
                                </div>
                                <div className="flex flex-col gap-1 p-2 rounded-lg border bg-card">
                                    <span className="text-[9px] font-mono text-muted-foreground uppercase">
                                        formattedTime
                                    </span>
                                    <span className="text-xs text-muted-foreground truncate">
                                        {sampleTx.formattedTime}
                                    </span>
                                </div>
                                <div className="flex flex-col gap-1 p-2 rounded-lg border bg-card col-span-2">
                                    <span className="text-[9px] font-mono text-muted-foreground uppercase">
                                        explorerUrl
                                    </span>
                                    <a
                                        href={sampleTx.explorerUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-xs text-blue-600 hover:underline truncate flex items-center gap-1"
                                    >
                                        <ExternalLink className="h-3 w-3 flex-shrink-0" />
                                        <span className="truncate">View on explorer</span>
                                    </a>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Divider */}
            <div className="hidden lg:flex flex-col items-center justify-center gap-1">
                <div className="flex-1 border-l border-dashed border-sand-300" />
                <span className="text-[10px] text-muted-foreground -rotate-90 whitespace-nowrap p-2 bg-sand-100">
                    combined
                </span>
                <div className="flex-1 border-l border-dashed border-sand-300" />
            </div>
            <div className="lg:hidden flex items-center gap-2">
                <div className="flex-1 border-t border-dashed border-sand-300" />
                <span className="text-[10px] text-muted-foreground">combined</span>
                <div className="flex-1 border-t border-dashed border-sand-300" />
            </div>

            {/* Right: Combined Component */}
            <div className="flex-1 flex flex-col justify-center">
                <div className="rounded-lg border bg-card">
                    <div className="p-3 border-b">
                        <span className="text-sm font-medium">Transactions</span>
                    </div>
                    <div className="divide-y max-h-[180px] overflow-y-auto">
                        {isLoading ? (
                            [1, 2, 3].map(i => (
                                <div key={i} className="flex items-center gap-3 p-3">
                                    <div className="h-8 w-8 rounded-full bg-muted animate-pulse" />
                                    <div className="flex-1">
                                        <div className="h-4 w-20 bg-muted animate-pulse rounded mb-1" />
                                        <div className="h-3 w-16 bg-muted animate-pulse rounded" />
                                    </div>
                                </div>
                            ))
                        ) : transactions.length > 0 ? (
                            transactions.map(tx => (
                                <a
                                    key={tx.signature}
                                    href={tx.explorerUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-3 p-3 hover:bg-muted/50 transition-colors"
                                >
                                    {tx.tokenIcon ? (
                                        <img src={tx.tokenIcon} className="h-8 w-8 rounded-full" alt="" />
                                    ) : (
                                        <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center">
                                            <Coins className="h-4 w-4" />
                                        </div>
                                    )}
                                    <div className="flex-1 min-w-0">
                                        <p className="font-medium text-sm">{tx.type}</p>
                                        <p className="text-xs text-muted-foreground">{tx.formattedTime}</p>
                                    </div>
                                    {tx.formattedAmount && (
                                        <span
                                            className={`text-sm font-medium ${tx.direction === 'in' ? 'text-green-600' : 'text-orange-600'}`}
                                        >
                                            {tx.formattedAmount}
                                        </span>
                                    )}
                                    <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" />
                                </a>
                            ))
                        ) : (
                            <p className="p-4 text-center text-muted-foreground text-sm">No transactions yet</p>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

const hookExamples: ExampleConfig[] = [
    {
        id: 'use-connector',
        name: 'useConnector',
        description:
            'Core hook for wallet connection state. Access connected status, wallets, select/disconnect functions.',
        code: `import { useConnector } from '@solana/connector';

function WalletStatus() {
    const { 
        connected,
        connecting,
        selectedWallet,
        selectedAccount,
        wallets,
        select,
        disconnect 
    } = useConnector();

    if (connecting) return <div>Connecting...</div>;

    if (connected && selectedAccount) {
        return (
            <div>
                <p>Connected: {selectedWallet?.name}</p>
                <p>Address: {selectedAccount}</p>
                <button onClick={() => disconnect()}>Disconnect</button>
            </div>
        );
    }

    return (
        <div>
            {wallets.filter(w => w.installed).map(w => (
                <button key={w.wallet.name} onClick={() => select(w.wallet.name)}>
                    {w.wallet.name}
                </button>
            ))}
        </div>
    );
}`,
        render: () => <UseConnectorExample />,
        fullWidth: true,
    },
    {
        id: 'use-balance',
        name: 'useBalance',
        description: 'Fetch SOL balance for connected wallet. Includes loading state and refetch function.',
        code: `import { useBalance } from '@solana/connector';

function BalanceDisplay() {
    const { solBalance, isLoading, refetch } = useBalance();

    return (
        <div>
            <span>Balance: {solBalance?.toFixed(4) ?? '--'} SOL</span>
            <button onClick={refetch} disabled={isLoading}>
                {isLoading ? 'Loading...' : 'Refresh'}
            </button>
        </div>
    );
}`,
        render: () => <UseBalanceExample />,
        fullWidth: true,
    },
    {
        id: 'use-cluster',
        name: 'useCluster',
        description: 'Manage network/cluster state. Switch between mainnet, devnet, testnet, or custom clusters.',
        code: `import { useCluster } from '@solana/connector';

function NetworkSelector() {
    const { 
        cluster, 
        clusters, 
        setCluster, 
        isMainnet, 
        isDevnet 
    } = useCluster();

    return (
        <div>
            <p>Current: {cluster?.label}</p>
            <p>Is Mainnet: {isMainnet ? 'Yes' : 'No'}</p>
            {clusters.map(c => (
                <button 
                    key={c.id} 
                    onClick={() => setCluster(c.id)}
                    style={{ fontWeight: cluster?.id === c.id ? 'bold' : 'normal' }}
                >
                    {c.label}
                </button>
            ))}
        </div>
    );
}`,
        render: () => <UseClusterExample />,
        fullWidth: true,
    },
    {
        id: 'use-tokens',
        name: 'useTokens',
        description: 'Fetch token holdings with metadata from Jupiter API. Supports pagination and refresh.',
        code: `import { useTokens } from '@solana/connector';

function TokenList() {
    const { tokens, isLoading, refetch, hasMore, loadMore } = useTokens({ 
        limit: 10 
    });

    if (isLoading) return <div>Loading tokens...</div>;

    return (
        <div>
            {tokens.map(token => (
                <div key={token.mint}>
                    <img src={token.logo} alt={token.symbol} />
                    <span>{token.symbol}: {token.formatted}</span>
                </div>
            ))}
            {hasMore && <button onClick={loadMore}>Load More</button>}
        </div>
    );
}`,
        render: () => <UseTokensExample />,
        fullWidth: true,
    },
    {
        id: 'use-transactions',
        name: 'useTransactions',
        description: 'Fetch transaction history with parsed metadata. Includes type detection and explorer URLs.',
        code: `import { useTransactions } from '@solana/connector';

function TransactionHistory() {
    const { 
        transactions, 
        isLoading, 
        hasMore, 
        loadMore 
    } = useTransactions({ limit: 10 });

    if (isLoading) return <div>Loading...</div>;

    return (
        <div>
            {transactions.map(tx => (
                <a key={tx.signature} href={tx.explorerUrl} target="_blank">
                    <span>{tx.type}</span>
                    <span>{tx.formattedAmount}</span>
                    <span>{tx.formattedTime}</span>
                </a>
            ))}
            {hasMore && <button onClick={loadMore}>Load More</button>}
        </div>
    );
}`,
        render: () => <UseTransactionsExample />,
        fullWidth: true,
    },
];

export function HooksExamplesSection() {
    return (
        <section>
            <div
                className="px-4 lg:px-6 py-8 border-b border-sand-200"
                style={{
                    backgroundImage: `repeating-linear-gradient(
                        45deg,
                        transparent,
                        transparent 10px,
                        rgba(233, 231, 222, 0.5) 10px,
                        rgba(233, 231, 222, 0.5) 11px
                    )`,
                }}
            >
                <div className="inline-flex items-center gap-2 mb-3">
                    <span className="px-2 py-0.5 bg-emerald-200 text-emerald-900 text-xs font-inter-medium rounded">
                        Granular Composability
                    </span>
                </div>
                <h2 className="text-h3 font-diatype-medium text-sand-1500 mb-2">React Hooks Usage Examples</h2>
                <p className="text-body-lg font-inter text-sand-700 max-w-xl">
                    Use hooks directly for complete control. Same data and state management as elements, but you handle
                    all the rendering and styling.
                </p>
            </div>

            {hookExamples.map(example => (
                <ExampleCard key={example.id} example={example} />
            ))}
        </section>
    );
}
