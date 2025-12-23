'use client';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import {
    BalanceElement,
    ClusterElement,
    TokenListElement,
    TransactionHistoryElement,
    DisconnectElement,
} from '@solana/connector/react';
import {
    Wallet,
    Copy,
    Globe,
    ChevronLeft,
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
import { motion } from 'motion/react';

interface WalletDropdownContentProps {
    selectedAccount: string;
    walletIcon?: string;
    walletName: string;
}

type DropdownView = 'wallet' | 'network';

const clusterColors: Record<string, string> = {
    'solana:mainnet': 'bg-green-500',
    'solana:devnet': 'bg-blue-500',
    'solana:testnet': 'bg-yellow-500',
    'solana:localnet': 'bg-red-500',
};

export function WalletDropdownContent({ selectedAccount, walletIcon, walletName }: WalletDropdownContentProps) {
    const [view, setView] = useState<DropdownView>('wallet');
    const [copied, setCopied] = useState(false);

    const shortAddress = `${selectedAccount.slice(0, 4)}...${selectedAccount.slice(-4)}`;

    function handleCopy() {
        navigator.clipboard.writeText(selectedAccount);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    }

    // Wallet View
    if (view === 'wallet') {
        return (
            <motion.div
                key="wallet"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
                className="w-[360px] p-4 space-y-4"
            >
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
                        <ClusterElement
                            render={({ cluster }) => (
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="icon"
                                    className="rounded-full relative"
                                    onClick={() => setView('network')}
                                    title={`Network: ${cluster?.label || 'Unknown'}`}
                                >
                                    <Globe className="h-4 w-4" />
                                    <span
                                        className={`absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full border-2 border-background ${clusterColors[cluster?.id || ''] || 'bg-emerald-500'}`}
                                    />
                                </Button>
                            )}
                        />
                    </div>
                </div>

            {/* Full Width Balance */}
            <BalanceElement
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
                        <TokenListElement
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
                        <TransactionHistoryElement
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
                <DisconnectElement
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
            </motion.div>
        );
    }

    // Network Settings View
    return (
        <motion.div
            key="network"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="w-[360px] p-4 space-y-4"
        >
            {/* Header */}
            <div className="flex items-center gap-3">
                <button
                    type="button"
                    onClick={() => setView('wallet')}
                    className="rounded-full border border-border p-2 hover:bg-accent transition-colors"
                >
                    <ChevronLeft className="h-4 w-4" />
                </button>
                <span className="font-semibold text-lg">Network Settings</span>
            </div>

            {/* Network Options */}
            <ClusterElement
                render={({ cluster, clusters, setCluster }) => {
                    const currentClusterId = (cluster as { id?: string })?.id || 'solana:mainnet';
                    return (
                        <div className="rounded-[12px] border bg-muted/50 overflow-hidden">
                            {clusters.map((network, index) => {
                                const isSelected = currentClusterId === network.id;
                                return (
                                    <div
                                        key={network.id}
                                        role="button"
                                        tabIndex={0}
                                        onClick={() => setCluster(network.id)}
                                        onKeyDown={e => {
                                            if (e.key === 'Enter' || e.key === ' ') {
                                                e.preventDefault();
                                                setCluster(network.id);
                                            }
                                        }}
                                        className={`w-full flex items-center justify-between p-4 hover:bg-accent/50 transition-colors cursor-pointer ${
                                            index !== clusters.length - 1 ? 'border-b border-border' : ''
                                        }`}
                                    >
                                        <div className="flex items-center gap-2">
                                            <span
                                                className={`h-2 w-2 rounded-full ${clusterColors[network.id] || 'bg-purple-500'}`}
                                            />
                                            <span className="font-medium">{network.label}</span>
                                        </div>
                                        <div
                                            className={`h-5 w-5 rounded-full border-2 flex items-center justify-center transition-colors ${
                                                isSelected ? 'bg-primary border-primary' : 'border-muted-foreground/30'
                                            }`}
                                        >
                                            {isSelected && <Check className="h-3 w-3 text-primary-foreground" />}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    );
                }}
            />
        </motion.div>
    );
}
