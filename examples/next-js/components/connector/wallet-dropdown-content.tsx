'use client';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import {
    BalanceBlock,
    ClusterBlock,
    TokenListBlock,
    TransactionHistoryBlock,
    DisconnectBlock,
} from '@solana/connector/react';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
    Wallet,
    Copy,
    Globe,
    Check,
    RefreshCw,
    Coins,
    History,
    ExternalLink,
    ArrowUpRight,
    ArrowDownLeft,
    LogOut,
} from 'lucide-react';
import { useState } from 'react';

interface WalletDropdownContentProps {
    selectedAccount: string;
    walletIcon?: string;
    walletName: string;
}

const clusterColors: Record<string, string> = {
    'solana:mainnet': 'bg-green-500',
    'solana:devnet': 'bg-blue-500',
    'solana:testnet': 'bg-yellow-500',
    'solana:localnet': 'bg-red-500',
};

export function WalletDropdownContent({ selectedAccount, walletIcon, walletName }: WalletDropdownContentProps) {
    const [copied, setCopied] = useState(false);

    const shortAddress = `${selectedAccount.slice(0, 4)}...${selectedAccount.slice(-4)}`;

    function handleCopy() {
        navigator.clipboard.writeText(selectedAccount);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    }

    return (
        <div className="w-[360px] p-4 space-y-4">
            {/* Header with Avatar and Address */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <Avatar className="h-12 w-12">
                        {walletIcon && <AvatarImage src={walletIcon} alt={walletName} />}
                        <AvatarFallback>
                            <Wallet className="h-6 w-6" />
                        </AvatarFallback>
                    </Avatar>
                    <div>
                        <div className="font-semibold text-lg">{shortAddress}</div>
                        <div className="text-xs text-muted-foreground">{walletName}</div>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <Button
                        type="button"
                        onClick={handleCopy}
                        variant="outline"
                        size="icon"
                        className="rounded-full"
                        title={copied ? 'Copied!' : 'Copy address'}
                    >
                        {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                    </Button>

                    {/* Network Selector Globe Button */}
                    <ClusterBlock
                        render={({ cluster, clusters, setCluster }) => (
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="icon"
                                        className="rounded-full relative"
                                        title={`Network: ${cluster?.label || 'Unknown'}`}
                                    >
                                        <Globe className="h-4 w-4" />
                                        <span
                                            className={`absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full border-2 border-background ${clusterColors[cluster?.id || ''] || 'bg-emerald-500'}`}
                                        />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-auto rounded-[16px]">
                                    {clusters.map(c => (
                                        <DropdownMenuItem
                                            key={c.id}
                                            onClick={() => setCluster(c.id)}
                                            className="flex items-center gap-2 cursor-pointer rounded-[13px]"
                                        >
                                            <span
                                                className={`h-2 w-2 rounded-full ${clusterColors[c.id] || 'bg-purple-500'}`}
                                            />
                                            <span className="flex-1">{c.label}</span>
                                            {cluster?.id === c.id && <Check className="h-4 w-4" />}
                                        </DropdownMenuItem>
                                    ))}
                                </DropdownMenuContent>
                            </DropdownMenu>
                        )}
                    />
                </div>
            </div>

            {/* Full Width Balance */}
            <BalanceBlock
                render={({ solBalance, isLoading, refetch }) => (
                    <div className="rounded-[12px] border bg-muted/50 p-4">
                        <div className="flex items-center justify-between mb-1">
                            <span className="text-sm text-muted-foreground">Balance</span>
                            <button
                                onClick={refetch}
                                disabled={isLoading}
                                className="p-1 hover:bg-accent rounded transition-colors disabled:opacity-50"
                            >
                                <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`} />
                            </button>
                        </div>
                        <div className="text-2xl font-bold">
                            {isLoading ? (
                                <div className="h-8 w-32 bg-muted animate-pulse rounded" />
                            ) : solBalance !== null ? (
                                `${solBalance.toFixed(4)} SOL`
                            ) : (
                                '-- SOL'
                            )}
                        </div>
                    </div>
                )}
            />

            <Separator className="scale-x-110" />

            {/* Tokens & Transactions Accordion */}
            <Accordion type="multiple" className="w-full space-y-2">
                {/* Tokens */}
                <AccordionItem value="tokens" className="border rounded-[12px] px-3">
                    <AccordionTrigger className="py-3 hover:no-underline hover:cursor-pointer">
                        <div className="flex items-center gap-2">
                            <Coins className="h-4 w-4" />
                            <span className="font-medium">Tokens</span>
                        </div>
                    </AccordionTrigger>
                    <AccordionContent>
                        <TokenListBlock
                            limit={5}
                            render={({ tokens, isLoading }) => (
                                <div className="space-y-2 pb-2">
                                    {isLoading ? (
                                        <div className="space-y-2">
                                            {[1, 2, 3].map(i => (
                                                <div key={i} className="flex items-center gap-3">
                                                    <div className="h-8 w-8 rounded-full bg-muted animate-pulse" />
                                                    <div className="flex-1">
                                                        <div className="h-4 w-16 bg-muted animate-pulse rounded mb-1" />
                                                        <div className="h-3 w-24 bg-muted animate-pulse rounded" />
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    ) : tokens.length > 0 ? (
                                        tokens.map(token => (
                                            <div key={token.mint} className="flex items-center gap-3 py-1">
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
                                        ))
                                    ) : (
                                        <p className="text-sm text-muted-foreground text-center py-2">
                                            No tokens found
                                        </p>
                                    )}
                                </div>
                            )}
                        />
                    </AccordionContent>
                </AccordionItem>

                {/* Transactions */}
                <AccordionItem value="transactions" className="border rounded-[12px] px-3">
                    <AccordionTrigger className="py-3 hover:no-underline hover:cursor-pointer">
                        <div className="flex items-center gap-2">
                            <History className="h-4 w-4" />
                            <span className="font-medium">Recent Activity</span>
                        </div>
                    </AccordionTrigger>
                    <AccordionContent>
                        <TransactionHistoryBlock
                            limit={5}
                            render={({ transactions, isLoading }) => (
                                <div className="space-y-2 pb-2">
                                    {isLoading ? (
                                        <div className="space-y-2">
                                            {[1, 2, 3].map(i => (
                                                <div key={i} className="flex items-center gap-3">
                                                    <div className="h-8 w-8 rounded-full bg-muted animate-pulse" />
                                                    <div className="flex-1">
                                                        <div className="h-4 w-20 bg-muted animate-pulse rounded mb-1" />
                                                        <div className="h-3 w-16 bg-muted animate-pulse rounded" />
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    ) : transactions.length > 0 ? (
                                        transactions.map(tx => (
                                            <a
                                                key={tx.signature}
                                                href={tx.explorerUrl}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="flex items-center gap-3 py-1 hover:bg-muted/50 rounded-lg px-1 -mx-1 transition-colors"
                                            >
                                                <div className="relative">
                                                    {tx.tokenIcon ? (
                                                        <img
                                                            src={tx.tokenIcon}
                                                            className="h-8 w-8 rounded-full"
                                                            alt=""
                                                        />
                                                    ) : (
                                                        <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center">
                                                            <History className="h-4 w-4" />
                                                        </div>
                                                    )}
                                                    {/* Direction indicator */}
                                                    <div
                                                        className={`absolute -bottom-0.5 -right-0.5 h-4 w-4 rounded-full flex items-center justify-center border-2 border-background ${
                                                            tx.direction === 'in'
                                                                ? 'bg-green-500 text-white'
                                                                : 'bg-orange-500 text-white'
                                                        }`}
                                                    >
                                                        {tx.direction === 'in' ? (
                                                            <ArrowDownLeft className="h-2 w-2" />
                                                        ) : (
                                                            <ArrowUpRight className="h-2 w-2" />
                                                        )}
                                                    </div>
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="font-medium text-sm">{tx.type}</p>
                                                    <p className="text-xs text-muted-foreground">{tx.formattedTime}</p>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    {tx.formattedAmount && (
                                                        <span
                                                            className={`text-sm font-medium ${
                                                                tx.direction === 'in'
                                                                    ? 'text-green-600'
                                                                    : 'text-orange-600'
                                                            }`}
                                                        >
                                                            {tx.formattedAmount}
                                                        </span>
                                                    )}
                                                    <ExternalLink className="h-3 w-3 text-muted-foreground" />
                                                </div>
                                            </a>
                                        ))
                                    ) : (
                                        <p className="text-sm text-muted-foreground text-center py-2">
                                            No transactions yet
                                        </p>
                                    )}
                                </div>
                            )}
                        />
                    </AccordionContent>
                </AccordionItem>
            </Accordion>

            {/* Disconnect Button */}
            <DisconnectBlock
                render={({ disconnect, disconnecting }) => (
                    <Button
                        variant="destructive"
                        className="w-full h-11 text-base rounded-[12px]"
                        onClick={disconnect}
                        disabled={disconnecting}
                    >
                        <LogOut className="h-4 w-4 mr-2" />
                        {disconnecting ? 'Disconnecting...' : 'Disconnect'}
                    </Button>
                )}
            />
        </div>
    );
}
