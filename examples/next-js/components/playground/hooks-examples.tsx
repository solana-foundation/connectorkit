'use client';

import { useBalance, useCluster, useConnector, useTokens, useTransactions } from '@solana/connector/react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
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

// Component for displaying overlapping swap token icons
function SwapTokenIcon({ fromIcon, toIcon, size = 32 }: { fromIcon?: string; toIcon?: string; size?: number }) {
    const offset = size * 0.6; // 60% offset for overlap
    return (
        <div className="relative flex-shrink-0" style={{ width: size + offset, height: size }}>
            {/* From token (back) */}
            <div
                className="absolute left-0 top-0 rounded-full bg-muted flex items-center justify-center border-2 border-background"
                style={{ width: size, height: size }}
            >
                {fromIcon ? (
                    <img src={fromIcon} className="rounded-full" style={{ width: size - 4, height: size - 4 }} alt="" />
                ) : (
                    <Coins className="h-4 w-4 text-muted-foreground" />
                )}
            </div>
            {/* To token (front, overlapping) */}
            <div
                className="absolute top-0 rounded-full bg-muted flex items-center justify-center border-2 border-background"
                style={{ left: offset, width: size, height: size }}
            >
                {toIcon ? (
                    <img src={toIcon} className="rounded-full" style={{ width: size - 4, height: size - 4 }} alt="" />
                ) : (
                    <Coins className="h-4 w-4 text-muted-foreground" />
                )}
            </div>
        </div>
    );
}

function shortId(id: string) {
    return `${id.slice(0, 4)}...${id.slice(-4)}`;
}

function getTransactionTitle(tx: { type: string; programName?: string; programId?: string }) {
    if (tx.type === 'tokenAccountClosed') return 'Token Account Closed';
    if (tx.type === 'program') {
        const program = tx.programName ?? (tx.programId ? shortId(tx.programId) : 'Unknown');
        return `Program: ${program}`;
    }
    return tx.type;
}

function getTransactionSubtitle(tx: { type: string; formattedTime: string; instructionTypes?: string[] }) {
    if (tx.type === 'program' && tx.instructionTypes?.length) {
        const summary = tx.instructionTypes.slice(0, 2).join(' · ');
        return `${tx.formattedTime} · ${summary}`;
    }
    return tx.formattedTime;
}

// Hook example components
function UseConnectorExample() {
    const { walletStatus, isConnected, isConnecting, account, connector, connectors, connectWallet, disconnectWallet } =
        useConnector();
    const status = walletStatus.status;
    const [copied, setCopied] = useState(false);

    const handleCopy = () => {
        const selectedAccount = account ? String(account) : null;
        if (selectedAccount) {
            navigator.clipboard.writeText(selectedAccount);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    const selectedAccount = account ? String(account) : null;
    const shortAddress = selectedAccount ? `${selectedAccount.slice(0, 4)}...${selectedAccount.slice(-4)}` : '—';

    // Combined component render
    const renderCombined = () => {
        if (isConnecting) {
            return (
                <div className="p-4 rounded-lg border bg-card">
                    <div className="flex items-center gap-2">
                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                        <span className="text-sm">Connecting...</span>
                    </div>
                </div>
            );
        }

        if (isConnected && selectedAccount && connector) {
            return (
                <div className="p-4 rounded-lg border bg-card space-y-3">
                    <div className="flex items-center gap-3">
                        <Avatar className="h-10 w-10">
                            {connector.icon && <AvatarImage src={connector.icon} />}
                            <AvatarFallback>
                                <Wallet className="h-5 w-5" />
                            </AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                            <p className="font-medium text-sm">{connector.name}</p>
                            <p className="text-xs text-muted-foreground font-mono">{shortAddress}</p>
                        </div>
                        <button onClick={handleCopy} className="p-2 hover:bg-muted rounded-md">
                            {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                        </button>
                    </div>
                    <Button variant="destructive" size="sm" className="w-full" onClick={() => void disconnectWallet()}>
                        <LogOut className="h-4 w-4 mr-2" />
                        Disconnect
                    </Button>
                </div>
            );
        }

        return (
            <div className="p-4 rounded-lg border bg-card space-y-2">
                <p className="text-sm text-muted-foreground mb-2">Select a wallet:</p>
                {connectors
                    .filter(c => c.ready)
                    .slice(0, 3)
                    .map(c => (
                        <Button
                            key={c.id}
                            variant="outline"
                            size="sm"
                            className="w-full justify-start"
                            onClick={() => void connectWallet(c.id)}
                        >
                            <Avatar className="h-5 w-5 mr-2">
                                {c.icon && <AvatarImage src={c.icon} />}
                                <AvatarFallback>
                                    <Wallet className="h-3 w-3" />
                                </AvatarFallback>
                            </Avatar>
                            {c.name}
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
                    <HookReturnValue name="status" value={status} />
                    <HookReturnValue name="isConnected" value={String(isConnected)} />
                    <HookReturnValue name="isConnecting" value={String(isConnecting)} />
                    <HookReturnValue name="connector" value={connector?.name ?? 'null'} />
                    <HookReturnValue name="account" value={shortAddress} />
                    <HookReturnValue name="connectors" value={`[${connectors.length} items]`} />
                    <HookReturnValue name="connectWallet" value="fn()" />
                    <HookReturnValue name="disconnectWallet" value="fn()" />
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
                        <button
                            onClick={() => void refetch()}
                            disabled={isLoading}
                            className="p-1 hover:bg-muted rounded"
                        >
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
                <div className="p-4 rounded-xl border bg-card space-y-3">
                    {/* Current cluster indicator */}
                    <div className="flex items-center gap-2 pb-2 border-b">
                        <span className="relative flex h-2.5 w-2.5">
                            <span
                                className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${clusterColors[cluster?.id || ''] || 'bg-purple-500'}`}
                            />
                            <span
                                className={`relative inline-flex rounded-full h-2.5 w-2.5 ${clusterColors[cluster?.id || ''] || 'bg-purple-500'}`}
                            />
                        </span>
                        <span className="text-sm font-medium">{cluster?.label}</span>
                    </div>

                    {/* Cluster buttons */}
                    <div className="flex flex-col gap-1.5">
                        {clusters.map(c => (
                            <button
                                key={c.id}
                                onClick={() => void setCluster(c.id)}
                                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
                                    cluster?.id === c.id
                                        ? 'bg-sand-100 text-primary-foreground text-sand-1500'
                                        : 'hover:bg-sand-200 text-sand-700'
                                }`}
                            >
                                <span className={`h-2 w-2 rounded-full ${clusterColors[c.id] || 'bg-purple-500'}`} />
                                {c.label}
                            </button>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}

function UseTokensExample() {
    const { tokens, isLoading, error, refetch, abort, lastUpdated, totalAccounts } = useTokens();
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
                        <HookReturnValue name="error" value={error?.message ?? 'null'} />
                        <HookReturnValue name="refetch" value="fn()" />
                        <HookReturnValue name="abort" value="fn()" />
                        <HookReturnValue
                            name="lastUpdated"
                            value={lastUpdated ? lastUpdated.toLocaleTimeString() : 'null'}
                        />
                        <HookReturnValue name="totalAccounts" value={String(totalAccounts)} />
                    </div>

                    {/* Sample token item breakdown */}
                    {sampleToken && (
                        <div className="border border-sand-300 rounded-xl p-2 bg-sand-50">
                            <span className="text-[10px] font-mono text-sand-700 mb-2 block">tokens properties:</span>
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
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => void refetch()}
                                disabled={isLoading}
                                className="p-1 hover:bg-muted rounded"
                            >
                                <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`} />
                            </button>
                            <button
                                type="button"
                                onClick={abort}
                                disabled={!isLoading}
                                className="px-2 py-1 text-xs font-medium text-muted-foreground hover:bg-muted rounded disabled:opacity-50"
                            >
                                Abort
                            </button>
                        </div>
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
    const { transactions, isLoading, error, hasMore, loadMore, refetch, abort, lastUpdated } = useTransactions({
        limit: 10,
        // Public RPCs can throttle aggressively; lower this if you see rate limiting.
        detailsConcurrency: 4,
    });
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
                        <HookReturnValue name="error" value={error?.message ?? 'null'} />
                        <HookReturnValue name="hasMore" value={String(hasMore)} />
                        <HookReturnValue name="loadMore" value="fn()" />
                        <HookReturnValue name="refetch" value="fn()" />
                        <HookReturnValue name="abort" value="fn()" />
                        <HookReturnValue
                            name="lastUpdated"
                            value={lastUpdated ? lastUpdated.toLocaleTimeString() : 'null'}
                        />
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
                    <div className="flex items-center justify-between p-3 border-b">
                        <span className="text-sm font-medium">Transactions</span>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => void refetch()}
                                disabled={isLoading}
                                className="p-1 hover:bg-muted rounded"
                            >
                                <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`} />
                            </button>
                            <button
                                type="button"
                                onClick={abort}
                                disabled={!isLoading}
                                className="px-2 py-1 text-xs font-medium text-muted-foreground hover:bg-muted rounded disabled:opacity-50"
                            >
                                Abort
                            </button>
                        </div>
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
                                    {tx.type === 'swap' && (tx.swapFromToken || tx.swapToToken) ? (
                                        <SwapTokenIcon
                                            fromIcon={tx.swapFromToken?.icon}
                                            toIcon={tx.swapToToken?.icon}
                                            size={32}
                                        />
                                    ) : tx.tokenIcon ? (
                                        <img src={tx.tokenIcon} className="h-8 w-8 rounded-full" alt="" />
                                    ) : (
                                        <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center">
                                            <Coins className="h-4 w-4" />
                                        </div>
                                    )}
                                    <div className="flex-1 min-w-0">
                                        <p className="font-medium text-sm">{getTransactionTitle(tx)}</p>
                                        <p className="text-xs text-muted-foreground">{getTransactionSubtitle(tx)}</p>
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
                    {hasMore && (
                        <button
                            type="button"
                            onClick={() => void loadMore()}
                            disabled={isLoading}
                            className="w-full p-2 text-sm text-muted-foreground hover:bg-muted disabled:opacity-50 border-t"
                        >
                            {isLoading ? 'Loading...' : 'Load more...'}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}

const hookExamples: ExampleConfig[] = [
    {
        id: 'use-connector',
        name: 'useConnector',
        description: 'Unified hook for wallet state, connectors, and actions. Single import, everything you need.',
        code: `import { useConnector } from '@solana/connector/react';

function WalletStatus() {
    const {
        walletStatus,
        isConnected,
        isConnecting,
        account,
        connector,
        connectors,
        connectWallet,
        disconnectWallet,
    } = useConnector();

    if (isConnecting) return <div>Connecting...</div>;

    if (isConnected && account && connector) {
        return (
            <div>
                <p>Connected: {connector.name}</p>
                <p>Address: {account}</p>
                <button onClick={() => void disconnectWallet()}>Disconnect</button>
            </div>
        );
    }

    return (
        <div>
            {connectors.filter(c => c.ready).map(c => (
                <button key={c.id} onClick={() => void connectWallet(c.id)}>
                    {c.name}
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
        code: `import { useBalance } from '@solana/connector/react';

function BalanceDisplay() {
    const { solBalance, isLoading, refetch } = useBalance();

    return (
        <div>
            <span>Balance: {solBalance?.toFixed(4) ?? '--'} SOL</span>
            <button onClick={() => void refetch()} disabled={isLoading}>
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
        code: `import { useCluster } from '@solana/connector/react';

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
                    onClick={() => void setCluster(c.id)}
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
        description:
            'Fetch token holdings with Solana Token List metadata and optional CoinGecko pricing. Includes caching + refresh.',
        code: `import { useTokens } from '@solana/connector/react';

function TokenList() {
    const { tokens, isLoading, error, refetch, totalAccounts } = useTokens({
        includeNativeSol: true,
        fetchMetadata: true,
    });

    if (isLoading) return <div>Loading tokens...</div>;
    if (error) return <div>Failed to load tokens</div>;

    return (
        <div>
            {tokens.map(token => (
                <div key={token.mint}>
                    {token.logo && <img src={token.logo} alt={token.symbol ?? 'Token'} />}
                    <span>{token.symbol ?? token.mint}: {token.formatted}</span>
                </div>
            ))}
            <button onClick={() => void refetch()}>Refresh</button>
            <div>Total token accounts: {totalAccounts}</div>
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
        code: `import { useTransactions } from '@solana/connector/react';

function TransactionHistory() {
    const { 
        transactions, 
        isLoading, 
        hasMore, 
        loadMore,
        refetch
    } = useTransactions({ 
        limit: 10,
        // Public RPCs can throttle aggressively; lower this if you see rate limiting.
        detailsConcurrency: 4,
        fetchDetails: true,
    });

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
            {hasMore && <button onClick={() => void loadMore()}>Load More</button>}
            <button onClick={() => void refetch()}>Refresh</button>
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
