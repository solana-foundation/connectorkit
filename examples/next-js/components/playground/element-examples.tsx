'use client';

import {
    AccountElement,
    BalanceElement,
    ClusterElement,
    DisconnectElement,
    TransactionHistoryElement,
    TokenListElement,
} from '@solana/connector/react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Wallet, Copy, Check, RefreshCw, LogOut, Coins, ExternalLink } from 'lucide-react';
import { ExampleCard, type ExampleConfig } from './example-card';

// Helper component for displaying individual render props
function PropCard({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <div className="flex flex-col gap-1.5 p-3 rounded-xl border bg-card">
            <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-wide">{label}</span>
            <div className="min-h-[32px] flex items-center">{children}</div>
        </div>
    );
}

const elementExamples: ExampleConfig[] = [
    {
        id: 'account-element',
        name: 'AccountElement',
        description:
            'Display connected wallet address with copy functionality. Use render props for full control over the UI.',
        code: `import { AccountElement } from '@solana/connector/react';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Wallet, Copy, Check } from 'lucide-react';

<AccountElement
    render={({ formatted, walletName, walletIcon, copy, copied }) => (
        <div className="flex items-center gap-3 p-3 rounded-lg border bg-card">
            <Avatar className="h-10 w-10">
                {walletIcon && <AvatarImage src={walletIcon} />}
                <AvatarFallback className="bg-muted">
                    <Wallet className="h-5 w-5" />
                </AvatarFallback>
            </Avatar>
            <div className="flex-1">
                <p className="font-medium text-sm">{walletName}</p>
                <p className="text-xs text-muted-foreground font-mono">{formatted}</p>
            </div>
            <button onClick={copy} className="p-2 hover:bg-muted rounded-md">
                {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
            </button>
        </div>
    )}
/>`,
        render: () => (
            <AccountElement
                render={({ formatted, walletName, walletIcon, copy, copied }) => (
                    <div className="flex flex-col lg:flex-row gap-6 w-full items-stretch">
                        {/* Left: Element Container with Render Props */}
                        <div className="flex-1 relative bg-sand-100 border border-dashed border-sand-500 rounded-2xl p-3">
                            {/* Element name label */}
                            <span className="absolute -top-2.5 left-3 bg-sand-100 px-2 text-xs font-mono font-medium text-sand-700">
                                {'<AccountElement />'}
                            </span>
                            <div className="grid grid-cols-2 gap-2">
                                <PropCard label="walletIcon">
                                    <Avatar className="h-8 w-8">
                                        {walletIcon && <AvatarImage src={walletIcon} />}
                                        <AvatarFallback className="bg-muted">
                                            <Wallet className="h-4 w-4" />
                                        </AvatarFallback>
                                    </Avatar>
                                </PropCard>
                                <PropCard label="walletName">
                                    <span className="text-sm font-medium truncate">{walletName || '—'}</span>
                                </PropCard>
                                <PropCard label="formatted">
                                    <span className="text-xs font-mono text-muted-foreground truncate">
                                        {formatted || '—'}
                                    </span>
                                </PropCard>
                                <PropCard label="copy / copied">
                                    <button
                                        onClick={copy}
                                        className="p-1.5 hover:bg-muted rounded-md transition-colors"
                                    >
                                        {copied ? (
                                            <Check className="h-4 w-4 text-green-500" />
                                        ) : (
                                            <Copy className="h-4 w-4 text-muted-foreground" />
                                        )}
                                    </button>
                                </PropCard>
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
                            <div className="flex items-center gap-3 p-3 rounded-lg border bg-card">
                                <Avatar className="h-10 w-10">
                                    {walletIcon && <AvatarImage src={walletIcon} />}
                                    <AvatarFallback className="bg-muted">
                                        <Wallet className="h-5 w-5" />
                                    </AvatarFallback>
                                </Avatar>
                                <div className="flex-1 min-w-0">
                                    <p className="font-medium text-sm">{walletName}</p>
                                    <p className="text-xs text-muted-foreground font-mono truncate">{formatted}</p>
                                </div>
                                <button onClick={copy} className="p-2 hover:bg-muted rounded-md transition-colors">
                                    {copied ? (
                                        <Check className="h-4 w-4 text-green-500" />
                                    ) : (
                                        <Copy className="h-4 w-4 text-muted-foreground" />
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            />
        ),
        fullWidth: true,
    },
    {
        id: 'balance-element',
        name: 'BalanceElement',
        description:
            'Show SOL balance with optional refresh. Access loading state and refetch function via render props.',
        code: `import { BalanceElement } from '@solana/connector/react';
import { RefreshCw } from 'lucide-react';

<BalanceElement
    render={({ solBalance, isLoading, refetch }) => (
        <div className="flex items-center gap-3 p-3 rounded-lg border bg-card">
            <div className="flex-1">
                <p className="text-xs text-muted-foreground font-medium">SOL Balance</p>
                <p className="text-2xl font-bold">{solBalance?.toFixed(4) ?? '--'} SOL</p>
            </div>
            <button onClick={refetch} disabled={isLoading} className="p-2 hover:bg-muted rounded-md">
                <RefreshCw className={\`h-4 w-4 \${isLoading ? 'animate-spin' : ''}\`} />
            </button>
        </div>
    )}
/>`,
        render: () => (
            <BalanceElement
                render={({ solBalance, isLoading, refetch }) => (
                    <div className="flex flex-col lg:flex-row gap-6 w-full items-stretch">
                        {/* Left: Element Container with Render Props */}
                        <div className="flex-1 relative bg-sand-100 border border-dashed border-sand-500 rounded-2xl p-3">
                            {/* Element name label */}
                            <span className="absolute -top-2.5 left-3 bg-sand-100 px-2 text-xs font-mono font-medium text-sand-700">
                                {'<BalanceElement />'}
                            </span>
                            <div className="grid grid-cols-3 gap-2">
                                <PropCard label="solBalance">
                                    <span className="text-sm font-bold">{solBalance?.toFixed(4) ?? '—'}</span>
                                </PropCard>
                                <PropCard label="isLoading">
                                    <span className="text-xs font-mono text-muted-foreground">
                                        {isLoading ? 'true' : 'false'}
                                    </span>
                                </PropCard>
                                <PropCard label="refetch">
                                    <button
                                        onClick={refetch}
                                        disabled={isLoading}
                                        className="p-1.5 hover:bg-muted rounded-md transition-colors disabled:opacity-50"
                                    >
                                        <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
                                    </button>
                                </PropCard>
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
                            <div className="flex items-center gap-3 p-3 rounded-lg border bg-card">
                                <div className="flex-1">
                                    <p className="text-xs text-muted-foreground font-medium">SOL Balance</p>
                                    <p className="text-2xl font-bold">{solBalance?.toFixed(4) ?? '--'} SOL</p>
                                </div>
                                <button
                                    onClick={refetch}
                                    disabled={isLoading}
                                    className="p-2 hover:bg-muted rounded-md transition-colors disabled:opacity-50"
                                >
                                    <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            />
        ),
        fullWidth: true,
    },
    {
        id: 'cluster-element',
        name: 'ClusterElement',
        description: 'Network selector with all available clusters. Use setCluster to change networks dynamically.',
        code: `import { ClusterElement } from '@solana/connector/react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const clusterColors: Record<string, string> = {
    'solana:mainnet': 'bg-green-500',
    'solana:devnet': 'bg-blue-500',
    'solana:testnet': 'bg-yellow-500',
    'solana:localnet': 'bg-red-500',
};

<ClusterElement
    render={({ cluster, clusters, setCluster }) => (
        <Select value={cluster?.id} onValueChange={setCluster}>
            <SelectTrigger className="w-[200px]">
                <SelectValue>
                    <div className="flex items-center gap-2">
                        <span className={\`h-2 w-2 rounded-full \${clusterColors[cluster?.id || '']}\`} />
                        {cluster?.label || 'Select network'}
                    </div>
                </SelectValue>
            </SelectTrigger>
            <SelectContent>
                {clusters.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                        <div className="flex items-center gap-2">
                            <span className={\`h-2 w-2 rounded-full \${clusterColors[c.id]}\`} />
                            {c.label}
                        </div>
                    </SelectItem>
                ))}
            </SelectContent>
        </Select>
    )}
/>`,
        render: () => {
            const clusterColors: Record<string, string> = {
                'solana:mainnet': 'bg-green-500',
                'solana:devnet': 'bg-blue-500',
                'solana:testnet': 'bg-yellow-500',
                'solana:localnet': 'bg-red-500',
            };
            return (
                <ClusterElement
                    render={({ cluster, clusters, setCluster }) => (
                        <div className="flex flex-col lg:flex-row gap-6 w-full items-stretch">
                            {/* Left: Element Container with Render Props */}
                            <div className="flex-1 relative bg-sand-100 border border-dashed border-sand-500 rounded-2xl p-3">
                                {/* Element name label */}
                                <span className="absolute -top-2.5 left-3 bg-sand-100 px-2 text-xs font-mono font-medium text-sand-700">
                                    {'<ClusterElement />'}
                                </span>
                                <div className="grid grid-cols-3 gap-2">
                                    <PropCard label="cluster">
                                        <div className="flex items-center gap-1.5">
                                            <span
                                                className={`h-2 w-2 rounded-full ${clusterColors[cluster?.id || ''] || 'bg-purple-500'}`}
                                            />
                                            <span className="text-xs font-medium truncate">
                                                {cluster?.label || '—'}
                                            </span>
                                        </div>
                                    </PropCard>
                                    <PropCard label="clusters">
                                        <span className="text-xs font-mono text-muted-foreground">
                                            [{clusters.length}]
                                        </span>
                                    </PropCard>
                                    <PropCard label="setCluster">
                                        <span className="text-xs font-mono text-muted-foreground">fn()</span>
                                    </PropCard>
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
                                <Select value={cluster?.id} onValueChange={setCluster}>
                                    <SelectTrigger className="p-3 rounded-lg border bg-card cursor-pointer">
                                        <SelectValue>
                                            <div className="flex items-center gap-2">
                                                <span
                                                    className={`h-2 w-2 rounded-full ${clusterColors[cluster?.id || ''] || 'bg-purple-500'}`}
                                                />
                                                {cluster?.label || 'Select network'}
                                            </div>
                                        </SelectValue>
                                    </SelectTrigger>
                                    <SelectContent>
                                        {clusters.map(c => (
                                            <SelectItem key={c.id} value={c.id}>
                                                <div className="flex items-center gap-2">
                                                    <span
                                                        className={`h-2 w-2 rounded-full ${clusterColors[c.id] || 'bg-purple-500'}`}
                                                    />
                                                    {c.label}
                                                </div>
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    )}
                />
            );
        },
        fullWidth: true,
    },
    {
        id: 'disconnect-element',
        name: 'DisconnectElement',
        description: 'Disconnect button with loading state. Style it as a button, link, or menu item.',
        code: `import { DisconnectElement } from '@solana/connector/react';
import { Button } from '@/components/ui/button';
import { LogOut } from 'lucide-react';

<DisconnectElement
    render={({ disconnect, disconnecting }) => (
        <Button 
            variant="destructive" 
            onClick={disconnect}
            disabled={disconnecting}
        >
            <LogOut className="mr-2 h-4 w-4" />
            {disconnecting ? 'Disconnecting...' : 'Disconnect Wallet'}
        </Button>
    )}
/>`,
        render: () => (
            <DisconnectElement
                render={({ disconnect, disconnecting }) => (
                    <div className="flex flex-col lg:flex-row gap-6 w-full items-stretch">
                        {/* Left: Element Container with Render Props */}
                        <div className="flex-1 relative bg-sand-100 border border-dashed border-sand-500 rounded-2xl p-3">
                            {/* Element name label */}
                            <span className="absolute -top-2.5 left-3 bg-sand-100 px-2 text-xs font-mono font-medium text-sand-700">
                                {'<DisconnectElement />'}
                            </span>
                            <div className="grid grid-cols-2 gap-2">
                                <PropCard label="disconnect">
                                    <button
                                        onClick={disconnect}
                                        className="p-1.5 hover:bg-muted rounded-md transition-colors"
                                    >
                                        <LogOut className="h-4 w-4 text-muted-foreground" />
                                    </button>
                                </PropCard>
                                <PropCard label="disconnecting">
                                    <span className="text-xs font-mono text-muted-foreground">
                                        {disconnecting ? 'true' : 'false'}
                                    </span>
                                </PropCard>
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
                            <Button
                                variant="destructive"
                                onClick={disconnect}
                                disabled={disconnecting}
                                className="w-full"
                            >
                                <LogOut className="mr-2 h-4 w-4" />
                                {disconnecting ? 'Disconnecting...' : 'Disconnect Wallet'}
                            </Button>
                        </div>
                    </div>
                )}
            />
        ),
        fullWidth: true,
    },
    {
        id: 'token-list-element',
        name: 'TokenListElement',
        description: 'Display token holdings with metadata from Jupiter. Includes loading states and refetch.',
        code: `import { TokenListElement } from '@solana/connector/react';
import { Coins, RefreshCw } from 'lucide-react';

<TokenListElement
    limit={5}
    render={({ tokens, isLoading, refetch }) => (
        <div className="rounded-lg border bg-card w-[350px]">
            <div className="flex items-center justify-between p-3 border-b">
                <span className="font-medium text-sm">Tokens ({tokens.length})</span>
                <button onClick={refetch} disabled={isLoading}>
                    <RefreshCw className={\`h-3.5 w-3.5 \${isLoading ? 'animate-spin' : ''}\`} />
                </button>
            </div>
            <div className="divide-y">
                {tokens.map(token => (
                    <div key={token.mint} className="flex items-center gap-3 p-3">
                        {token.logo ? (
                            <img src={token.logo} className="h-8 w-8 rounded-full" />
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
                ))}
            </div>
        </div>
    )}
/>`,
        render: () => (
            <TokenListElement
                limit={5}
                render={({ tokens, isLoading, refetch }) => {
                    const sampleToken = tokens[0];
                    return (
                        <div className="flex flex-col lg:flex-row gap-6 w-full items-stretch">
                            {/* Left: Element Container with Render Props */}
                            <div className="flex-1 relative bg-sand-100 border border-dashed border-sand-500 rounded-2xl p-3">
                                {/* Element name label */}
                                <span className="absolute -top-2.5 left-3 bg-sand-100 px-2 text-xs font-mono font-medium text-sand-700">
                                    {'<TokenListElement />'}
                                </span>
                                <div className="space-y-3">
                                    {/* Top-level props */}
                                    <div className="grid grid-cols-3 gap-2">
                                        <PropCard label="tokens">
                                            <span className="text-xs font-mono text-muted-foreground">
                                                [{tokens.length} items]
                                            </span>
                                        </PropCard>
                                        <PropCard label="isLoading">
                                            <span className="text-xs font-mono text-muted-foreground">
                                                {isLoading ? 'true' : 'false'}
                                            </span>
                                        </PropCard>
                                        <PropCard label="refetch">
                                            <button
                                                onClick={refetch}
                                                disabled={isLoading}
                                                className="p-1.5 hover:bg-muted rounded-md transition-colors disabled:opacity-50"
                                            >
                                                <RefreshCw
                                                    className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`}
                                                />
                                            </button>
                                        </PropCard>
                                    </div>

                                    {/* Sample token item breakdown */}
                                    {sampleToken && (
                                        <div className="border border border-sand-300 rounded-xl p-2 bg-sand-50">
                                            <span className="text-[10px] font-mono text-sand-700 mb-2 block">
                                                tokens[0] properties:
                                            </span>
                                            <div className="grid grid-cols-2 gap-1.5">
                                                <div className="flex flex-col gap-1 p-2 rounded-lg border bg-card">
                                                    <span className="text-[9px] font-mono text-muted-foreground uppercase">
                                                        logo
                                                    </span>
                                                    {sampleToken.logo ? (
                                                        <img
                                                            src={sampleToken.logo}
                                                            className="h-6 w-6 rounded-full"
                                                            alt=""
                                                        />
                                                    ) : (
                                                        <div className="h-6 w-6 rounded-full bg-muted flex items-center justify-center">
                                                            <Coins className="h-3 w-3" />
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="flex flex-col gap-1 p-2 rounded-lg border bg-card">
                                                    <span className="text-[9px] font-mono text-muted-foreground uppercase">
                                                        symbol
                                                    </span>
                                                    <span className="text-xs font-medium truncate">
                                                        {sampleToken.symbol}
                                                    </span>
                                                </div>
                                                <div className="flex flex-col gap-1 p-2 rounded-lg border bg-card">
                                                    <span className="text-[9px] font-mono text-muted-foreground uppercase">
                                                        name
                                                    </span>
                                                    <span className="text-xs text-muted-foreground truncate">
                                                        {sampleToken.name}
                                                    </span>
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
                                        <span className="font-medium text-sm">Tokens ({tokens.length})</span>
                                        <button
                                            onClick={refetch}
                                            disabled={isLoading}
                                            className="p-1 hover:bg-muted rounded"
                                        >
                                            <RefreshCw
                                                className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`}
                                            />
                                        </button>
                                    </div>
                                    <div className="divide-y max-h-[200px] overflow-y-auto">
                                        {tokens.map(token => (
                                            <div key={token.mint} className="flex items-center gap-3 p-3">
                                                {token.logo ? (
                                                    <img
                                                        src={token.logo}
                                                        className="h-8 w-8 rounded-full"
                                                        alt={token.symbol}
                                                    />
                                                ) : (
                                                    <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center">
                                                        <Coins className="h-4 w-4" />
                                                    </div>
                                                )}
                                                <div className="flex-1 min-w-0">
                                                    <p className="font-medium text-sm truncate">{token.symbol}</p>
                                                    <p className="text-xs text-muted-foreground truncate">
                                                        {token.name}
                                                    </p>
                                                </div>
                                                <p className="font-mono text-sm">{token.formatted}</p>
                                            </div>
                                        ))}
                                        {tokens.length === 0 && !isLoading && (
                                            <p className="p-4 text-center text-muted-foreground text-sm">
                                                No tokens found
                                            </p>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    );
                }}
            />
        ),
        fullWidth: true,
    },
    {
        id: 'transaction-history-element',
        name: 'TransactionHistoryElement',
        description: 'Show recent transactions with status, time, and explorer links. Supports pagination.',
        code: `import { TransactionHistoryElement } from '@solana/connector/react';
import { ExternalLink, Coins } from 'lucide-react';

<TransactionHistoryElement
    limit={5}
    render={({ transactions, isLoading, hasMore, loadMore }) => (
        <div className="rounded-lg border bg-card w-[400px]">
            <div className="p-3 border-b">
                <span className="font-medium text-sm">Recent Transactions</span>
            </div>
            <div className="divide-y">
                {transactions.map(tx => (
                    <a
                        key={tx.signature}
                        href={tx.explorerUrl}
                        target="_blank"
                        className="flex items-center gap-3 p-3 hover:bg-muted/50"
                    >
                        {tx.tokenIcon ? (
                            <img src={tx.tokenIcon} className="h-8 w-8 rounded-full" />
                        ) : (
                            <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center">
                                <Coins className="h-4 w-4" />
                            </div>
                        )}
                        <div className="flex-1">
                            <p className="font-medium text-sm">{tx.type}</p>
                            <p className="text-xs text-muted-foreground">{tx.formattedTime}</p>
                        </div>
                        {tx.formattedAmount && (
                            <span className={\`text-sm font-medium \${tx.direction === 'in' ? 'text-green-600' : 'text-orange-600'}\`}>
                                {tx.formattedAmount}
                            </span>
                        )}
                        <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" />
                    </a>
                ))}
                {hasMore && (
                    <button onClick={loadMore} className="w-full p-2 text-sm hover:bg-muted">
                        Load more...
                    </button>
                )}
            </div>
        </div>
    )}
/>`,
        render: () => (
            <TransactionHistoryElement
                limit={5}
                render={({ transactions, isLoading, hasMore, loadMore }) => {
                    const sampleTx = transactions[0];
                    return (
                        <div className="flex flex-col lg:flex-row gap-6 w-full items-stretch">
                            {/* Left: Element Container with Render Props */}
                            <div className="flex-1 relative bg-sand-100 border border-dashed border-sand-500 rounded-2xl p-3">
                                {/* Element name label */}
                                <span className="absolute -top-2.5 left-3 bg-sand-100 px-2 text-xs font-mono font-medium text-sand-700">
                                    {'<TransactionHistoryElement />'}
                                </span>
                                <div className="space-y-3">
                                    {/* Top-level props */}
                                    <div className="grid grid-cols-2 gap-2">
                                        <PropCard label="transactions">
                                            <span className="text-xs font-mono text-muted-foreground">
                                                [{transactions.length} items]
                                            </span>
                                        </PropCard>
                                        <PropCard label="isLoading">
                                            <span className="text-xs font-mono text-muted-foreground">
                                                {isLoading ? 'true' : 'false'}
                                            </span>
                                        </PropCard>
                                        <PropCard label="hasMore">
                                            <span className="text-xs font-mono text-muted-foreground">
                                                {hasMore ? 'true' : 'false'}
                                            </span>
                                        </PropCard>
                                        <PropCard label="loadMore">
                                            <button
                                                onClick={loadMore}
                                                disabled={!hasMore || isLoading}
                                                className="text-xs font-mono text-muted-foreground hover:text-foreground disabled:opacity-50"
                                            >
                                                fn()
                                            </button>
                                        </PropCard>
                                    </div>

                                    {/* Sample transaction item breakdown */}
                                    {sampleTx && (
                                        <div className="border border border-sand-300 rounded-xl p-2 bg-sand-50">
                                            <span className="text-[10px] font-mono text-sand-700 mb-2 block">
                                                transactions[0] properties:
                                            </span>
                                            <div className="grid grid-cols-2 gap-1.5">
                                                <div className="flex flex-col gap-1 p-2 rounded-lg border bg-card">
                                                    <span className="text-[9px] font-mono text-muted-foreground uppercase">
                                                        type
                                                    </span>
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
                                                    <span className="text-xs font-mono">
                                                        {sampleTx.formattedAmount || '—'}
                                                    </span>
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
                                        <span className="font-medium text-sm">Recent Transactions</span>
                                    </div>
                                    <div className="divide-y max-h-[200px] overflow-y-auto">
                                        {transactions.map(tx => (
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
                                        ))}
                                        {transactions.length === 0 && !isLoading && (
                                            <p className="p-4 text-center text-muted-foreground text-sm">
                                                No transactions yet
                                            </p>
                                        )}
                                        {hasMore && (
                                            <button
                                                onClick={loadMore}
                                                className="w-full p-2 text-sm text-muted-foreground hover:bg-muted"
                                            >
                                                Load more...
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    );
                }}
            />
        ),
        fullWidth: true,
    },
];

export function ElementExamplesSection() {
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
                    <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs font-inter-medium rounded">
                        Individual Elements
                    </span>
                </div>
                <h2 className="text-h3 font-diatype-medium text-sand-1500 mb-2">Element Components</h2>
                <p className="text-body-lg font-inter text-sand-700 max-w-2xl">
                    Headless element components with render props. Each element manages its own state and data
                    fetching—you just provide the UI. Copy any example and customize the styling.
                </p>
            </div>

            {elementExamples.map(example => (
                <ExampleCard key={example.id} example={example} />
            ))}
        </section>
    );
}
