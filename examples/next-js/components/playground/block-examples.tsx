'use client';

import {
    AccountBlock,
    BalanceBlock,
    ClusterBlock,
    DisconnectBlock,
    TransactionHistoryBlock,
    TokenListBlock,
} from '@solana/connector/react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Wallet, Copy, Check, RefreshCw, LogOut, Coins, ExternalLink } from 'lucide-react';
import { ExampleCard, type ExampleConfig } from './example-card';

const blockExamples: ExampleConfig[] = [
    {
        id: 'account-block',
        name: 'AccountBlock',
        description:
            'Display connected wallet address with copy functionality. Use render props for full control over the UI.',
        code: `import { AccountBlock } from '@solana/connector/react';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Wallet, Copy, Check } from 'lucide-react';

<AccountBlock
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
            <AccountBlock
                render={({ formatted, walletName, walletIcon, copy, copied }) => (
                    <div className="flex items-center gap-3 p-3 rounded-lg border bg-card min-w-[250px]">
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
                        <button onClick={copy} className="p-2 hover:bg-muted rounded-md transition-colors">
                            {copied ? (
                                <Check className="h-4 w-4 text-green-500" />
                            ) : (
                                <Copy className="h-4 w-4 text-muted-foreground" />
                            )}
                        </button>
                    </div>
                )}
            />
        ),
    },
    {
        id: 'balance-block',
        name: 'BalanceBlock',
        description:
            'Show SOL balance with optional refresh. Access loading state and refetch function via render props.',
        code: `import { BalanceBlock } from '@solana/connector/react';
import { RefreshCw } from 'lucide-react';

<BalanceBlock
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
            <BalanceBlock
                render={({ solBalance, isLoading, refetch }) => (
                    <div className="flex items-center gap-3 p-3 rounded-lg border bg-card min-w-[250px]">
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
                )}
            />
        ),
    },
    {
        id: 'cluster-block',
        name: 'ClusterBlock',
        description: 'Network selector with all available clusters. Use setCluster to change networks dynamically.',
        code: `import { ClusterBlock } from '@solana/connector/react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const clusterColors: Record<string, string> = {
    'solana:mainnet': 'bg-green-500',
    'solana:devnet': 'bg-blue-500',
    'solana:testnet': 'bg-yellow-500',
    'solana:localnet': 'bg-red-500',
};

<ClusterBlock
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
                <ClusterBlock
                    render={({ cluster, clusters, setCluster }) => (
                        <Select value={cluster?.id} onValueChange={setCluster}>
                            <SelectTrigger className="p-3 rounded-lg border bg-card w-[220px] cursor-pointer">
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
                    )}
                />
            );
        },
    },
    {
        id: 'disconnect-block',
        name: 'DisconnectBlock',
        description: 'Disconnect button with loading state. Style it as a button, link, or menu item.',
        code: `import { DisconnectBlock } from '@solana/connector/react';
import { Button } from '@/components/ui/button';
import { LogOut } from 'lucide-react';

<DisconnectBlock
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
            <DisconnectBlock
                render={({ disconnect, disconnecting }) => (
                    <Button
                        variant="destructive"
                        onClick={disconnect}
                        disabled={disconnecting}
                        className="min-w-[200px]"
                    >
                        <LogOut className="mr-2 h-4 w-4" />
                        {disconnecting ? 'Disconnecting...' : 'Disconnect Wallet'}
                    </Button>
                )}
            />
        ),
    },
    {
        id: 'token-list-block',
        name: 'TokenListBlock',
        description: 'Display token holdings with metadata from Jupiter. Includes loading states and refetch.',
        code: `import { TokenListBlock } from '@solana/connector/react';
import { Coins, RefreshCw } from 'lucide-react';

<TokenListBlock
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
            <TokenListBlock
                limit={5}
                render={({ tokens, isLoading, refetch }) => (
                    <div className="rounded-lg border bg-card min-w-[350px]">
                        <div className="flex items-center justify-between p-3 border-b">
                            <span className="font-medium text-sm">Tokens ({tokens.length})</span>
                            <button onClick={refetch} disabled={isLoading} className="p-1 hover:bg-muted rounded">
                                <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`} />
                            </button>
                        </div>
                        <div className="divide-y">
                            {tokens.map(token => (
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
                            ))}
                            {tokens.length === 0 && !isLoading && (
                                <p className="p-4 text-center text-muted-foreground text-sm">No tokens found</p>
                            )}
                        </div>
                    </div>
                )}
            />
        ),
        fullWidth: true,
    },
    {
        id: 'transaction-history-block',
        name: 'TransactionHistoryBlock',
        description: 'Show recent transactions with status, time, and explorer links. Supports pagination.',
        code: `import { TransactionHistoryBlock } from '@solana/connector/react';
import { ExternalLink, Coins } from 'lucide-react';

<TransactionHistoryBlock
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
            <TransactionHistoryBlock
                limit={5}
                render={({ transactions, isLoading, hasMore, loadMore }) => (
                    <div className="rounded-lg border bg-card min-w-[380px]">
                        <div className="p-3 border-b">
                            <span className="font-medium text-sm">Recent Transactions</span>
                        </div>
                        <div className="divide-y">
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
                                <p className="p-4 text-center text-muted-foreground text-sm">No transactions yet</p>
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
                )}
            />
        ),
        fullWidth: true,
    },
];

export function BlockExamplesSection() {
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
                        Individual Blocks
                    </span>
                </div>
                <h2 className="text-h3 font-diatype-medium text-sand-1500 mb-2">Block Components</h2>
                <p className="text-body-lg font-inter text-sand-700 max-w-2xl">
                    Headless block components with render props. Each block manages its own state and data fetching—you
                    just provide the UI. Copy any example and customize the styling.
                </p>
            </div>

            {blockExamples.map(example => (
                <ExampleCard key={example.id} example={example} />
            ))}
        </section>
    );
}
