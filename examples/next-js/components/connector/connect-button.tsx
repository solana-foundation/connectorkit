'use client';

/**
 * ConnectButton - A complete wallet connection button for Solana
 * 
 * This is a copy-paste starting point. You own this code - customize it however you like!
 * 
 * Uses:
 * - @solana/connector hooks for state management
 * - WalletListBlock, TokenListBlock, TransactionHistoryBlock for data display
 * - shadcn/ui components for the UI
 */

import { useState } from 'react';
import { useConnector } from '@solana/connector';
import { 
    useBalance, 
    useCluster, 
    WalletListBlock,
    TokenListBlock,
    TransactionHistoryBlock,
} from '@solana/connector/react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
    DropdownMenuSub,
    DropdownMenuSubTrigger,
    DropdownMenuSubContent,
    DropdownMenuPortal,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Wallet, ChevronDown, Copy, Check, LogOut, RefreshCw, Loader2, Coins, History, ExternalLink } from 'lucide-react';

interface ConnectButtonProps {
    className?: string;
}

export function ConnectButton({ className }: ConnectButtonProps) {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [copied, setCopied] = useState(false);
    
    // Core connector state
    const { 
        connected, 
        connecting, 
        selectedWallet, 
        selectedAccount, 
        disconnect, 
        wallets 
    } = useConnector();
    
    // Optional: balance and cluster info
    const { formattedSol, isLoading: balanceLoading, refetch } = useBalance();
    const { cluster, isMainnet, isDevnet } = useCluster();

    // Copy address to clipboard
    const handleCopy = async () => {
        if (selectedAccount) {
            await navigator.clipboard.writeText(selectedAccount);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    // Connecting state
    if (connecting) {
        return (
            <Button disabled className={className}>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Connecting...
            </Button>
        );
    }

    // Connected state
    if (connected && selectedAccount && selectedWallet) {
        const shortAddress = `${selectedAccount.slice(0, 4)}...${selectedAccount.slice(-4)}`;
        const walletIcon = wallets.find(
            (w: { wallet: { name: string } }) => w.wallet.name === selectedWallet.name
        )?.wallet.icon || selectedWallet.icon;

        return (
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="outline" className={className}>
                        <Avatar className="mr-2 h-5 w-5">
                            {walletIcon && <AvatarImage src={walletIcon} alt={selectedWallet.name} />}
                            <AvatarFallback>
                                <Wallet className="h-3 w-3" />
                            </AvatarFallback>
                        </Avatar>
                        <span className="font-mono text-sm">{shortAddress}</span>
                        <ChevronDown className="ml-2 h-4 w-4 opacity-50" />
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-80">
                    {/* Account Info */}
                    <DropdownMenuLabel>
                        <div className="flex items-center gap-3">
                            <Avatar className="h-10 w-10">
                                {walletIcon && <AvatarImage src={walletIcon} alt={selectedWallet.name} />}
                                <AvatarFallback>
                                    <Wallet className="h-5 w-5" />
                                </AvatarFallback>
                            </Avatar>
                            <div className="flex-1">
                                <p className="text-sm font-medium">{selectedWallet.name}</p>
                            <p className="text-xs font-mono text-muted-foreground">{shortAddress}</p>
                            </div>
                            <button 
                                onClick={(e) => { e.stopPropagation(); handleCopy(); }}
                                className="p-1.5 hover:bg-accent rounded-md transition-colors"
                            >
                                {copied ? (
                                    <Check className="h-4 w-4 text-green-500" />
                                ) : (
                                    <Copy className="h-4 w-4 text-muted-foreground" />
                                )}
                            </button>
                        </div>
                    </DropdownMenuLabel>

                    <DropdownMenuSeparator />

                    {/* Balance & Network Row */}
                    <div className="px-2 py-2 grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                            <span className="text-xs text-muted-foreground">Balance</span>
                            <div className="flex items-center gap-1.5">
                                <span className="text-sm font-semibold">{formattedSol}</span>
                                <button 
                                    onClick={(e) => { e.stopPropagation(); refetch(); }}
                                    className="p-0.5 hover:bg-accent rounded transition-colors"
                                    disabled={balanceLoading}
                                >
                                    <RefreshCw className={`h-3 w-3 text-muted-foreground ${balanceLoading ? 'animate-spin' : ''}`} />
                                </button>
                            </div>
                        </div>
                        <div className="space-y-1">
                            <span className="text-xs text-muted-foreground">Network</span>
                            <Badge 
                                variant={isMainnet ? 'default' : isDevnet ? 'secondary' : 'outline'}
                                className="text-xs"
                            >
                                {cluster?.label || 'Unknown'}
                            </Badge>
                        </div>
                    </div>

                    <DropdownMenuSeparator />

                    {/* Tokens Submenu */}
                    <DropdownMenuSub>
                        <DropdownMenuSubTrigger>
                            <Coins className="mr-2 h-4 w-4" />
                            Tokens
                        </DropdownMenuSubTrigger>
                        <DropdownMenuPortal>
                            <DropdownMenuSubContent className="w-72 p-0">
                                <div className="max-h-64 overflow-y-auto">
                                    <div className="p-2">
                                        <TokenListBlock 
                                            limit={10}
                                            variant="compact"
                                            showRefresh
                                            render={({ tokens, isLoading, error, refetch: refetchTokens }) => {
                                                if (isLoading && tokens.length === 0) {
                                                    return (
                                                        <div className="flex items-center justify-center py-8 text-muted-foreground">
                                                            <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                                            Loading tokens...
                                                        </div>
                                                    );
                                                }
                                                if (error) {
                                                    return (
                                                        <div className="text-center py-8 text-muted-foreground text-sm">
                                                            Failed to load tokens
                                                        </div>
                                                    );
                                                }
                                                if (tokens.length === 0) {
                                                    return (
                                                        <div className="text-center py-8 text-muted-foreground text-sm">
                                                            No tokens found
                                                        </div>
                                                    );
                                                }
                                                return (
                                                    <div className="space-y-1">
                                                        <div className="flex items-center justify-between px-2 py-1">
                                                            <span className="text-xs text-muted-foreground font-medium">
                                                                {tokens.length} Token{tokens.length !== 1 ? 's' : ''}
                                                            </span>
                                                            <button
                                                                onClick={(e) => { e.stopPropagation(); refetchTokens(); }}
                                                                className="p-1 hover:bg-accent rounded transition-colors"
                                                            >
                                                                <RefreshCw className={`h-3 w-3 text-muted-foreground ${isLoading ? 'animate-spin' : ''}`} />
                                                            </button>
                                                        </div>
                                                        {tokens.map((token) => (
                                                            <div 
                                                                key={token.mint}
                                                                className="flex items-center gap-3 px-2 py-2 rounded-md hover:bg-accent/50 transition-colors"
                                                            >
                                                                {token.logo ? (
                                                                    <img 
                                                                        src={token.logo} 
                                                                        alt={token.symbol || 'Token'} 
                                                                        className="h-8 w-8 rounded-full"
                                                                    />
                                                                ) : (
                                                                    <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center">
                                                                        <Coins className="h-4 w-4 text-muted-foreground" />
                                                                    </div>
                                                                )}
                                                                <div className="flex-1 min-w-0">
                                                                    <p className="text-sm font-medium truncate">
                                                                        {token.symbol || token.mint.slice(0, 4) + '...' + token.mint.slice(-4)}
                                                                    </p>
                                                                    <p className="text-xs text-muted-foreground">
                                                                        {token.name || 'Unknown Token'}
                                                                    </p>
                                                                </div>
                                                                <div className="text-right">
                                                                    <p className="text-sm font-medium">{token.formatted}</p>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                );
                                            }}
                                        />
                                    </div>
                                </div>
                            </DropdownMenuSubContent>
                        </DropdownMenuPortal>
                    </DropdownMenuSub>

                    {/* Transactions Submenu */}
                    <DropdownMenuSub>
                        <DropdownMenuSubTrigger>
                            <History className="mr-2 h-4 w-4" />
                            Recent Activity
                        </DropdownMenuSubTrigger>
                        <DropdownMenuPortal>
                            <DropdownMenuSubContent className="w-80 p-0">
                                <div className="max-h-72 overflow-y-auto">
                                    <div className="p-2">
                                        <TransactionHistoryBlock 
                                            limit={10}
                                            variant="compact"
                                            showStatus
                                            showTime
                                            render={({ transactions, isLoading, error, hasMore, loadMore }) => {
                                                if (isLoading && transactions.length === 0) {
                                                    return (
                                                        <div className="flex items-center justify-center py-8 text-muted-foreground">
                                                            <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                                            Loading transactions...
                                                        </div>
                                                    );
                                                }
                                                if (error) {
                                                    return (
                                                        <div className="text-center py-8 text-muted-foreground text-sm">
                                                            Failed to load transactions
                                                        </div>
                                                    );
                                                }
                                                if (transactions.length === 0) {
                                                    return (
                                                        <div className="text-center py-8 text-muted-foreground text-sm">
                                                            No transactions yet
                                                        </div>
                                                    );
                                                }
                                                return (
                                                    <div className="space-y-1">
                                                        <div className="px-2 py-1">
                                                            <span className="text-xs text-muted-foreground font-medium">
                                                                Recent Transactions
                                                            </span>
                                                        </div>
                                                        {transactions.map((tx) => (
                                                            <a
                                                                key={tx.signature}
                                                                href={tx.explorerUrl}
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                                className="flex items-center gap-3 px-2 py-2 rounded-md hover:bg-accent/50 transition-colors group"
                                                                onClick={(e) => e.stopPropagation()}
                                                            >
                                                                <div className={`h-2 w-2 rounded-full ${
                                                                    tx.status === 'success' ? 'bg-green-500' :
                                                                    tx.status === 'failed' ? 'bg-red-500' : 'bg-yellow-500'
                                                                }`} />
                                                                <div className="flex-1 min-w-0">
                                                                    <p className="text-sm font-medium truncate">
                                                                        {tx.type || 'Transaction'}
                                                                    </p>
                                                                    <p className="text-xs text-muted-foreground">
                                                                        {tx.signature.slice(0, 8)}...{tx.signature.slice(-8)}
                                                                    </p>
                                                                </div>
                                                                <div className="text-right flex items-center gap-2">
                                                                    <span className="text-xs text-muted-foreground">
                                                                        {tx.blockTime ? new Date(tx.blockTime * 1000).toLocaleDateString() : ''}
                                                                    </span>
                                                                    <ExternalLink className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                                                                </div>
                                                            </a>
                                                        ))}
                                                        {hasMore && (
                                                            <button
                                                                onClick={(e) => { e.stopPropagation(); loadMore(); }}
                                                                className="w-full py-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
                                                            >
                                                                Load more...
                                                            </button>
                                                        )}
                                                    </div>
                                                );
                                            }}
                                        />
                                    </div>
                                </div>
                            </DropdownMenuSubContent>
                        </DropdownMenuPortal>
                    </DropdownMenuSub>

                    <DropdownMenuSeparator />

                    {/* Disconnect */}
                    <DropdownMenuItem 
                        onClick={() => disconnect()} 
                        className="text-red-600 cursor-pointer"
                    >
                        <LogOut className="mr-2 h-4 w-4" />
                        Disconnect
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>
        );
    }

    // Disconnected state
    return (
        <>
            <Button onClick={() => setIsModalOpen(true)} className={className}>
                <Wallet className="mr-2 h-4 w-4" />
                Connect Wallet
            </Button>

            {/* Wallet Selection Modal */}
            <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Connect Wallet</DialogTitle>
                        <DialogDescription>
                            Choose a wallet to connect to this application
                        </DialogDescription>
                    </DialogHeader>

                    {/* Using WalletListBlock with custom rendering */}
                    <WalletListBlock 
                        installedOnly 
                        variant="list"
                        onSelect={() => setIsModalOpen(false)}
                        renderWallet={({ wallet, select, connecting: isConnecting }: { wallet: { name: string; icon?: string; installed: boolean }; select: () => Promise<void>; connecting: boolean }) => (
                            <Button
                                key={wallet.name}
                                variant="outline"
                                className="h-auto justify-start p-4 hover:bg-accent w-full"
                                onClick={select}
                                disabled={isConnecting}
                            >
                                <Avatar className="mr-3 h-10 w-10">
                                    {wallet.icon && <AvatarImage src={wallet.icon} alt={wallet.name} />}
                                    <AvatarFallback>
                                        <Wallet className="h-5 w-5" />
                                    </AvatarFallback>
                                </Avatar>
                                <div className="flex-1 text-left">
                                    <div className="font-semibold text-sm">{wallet.name}</div>
                                    <div className="text-xs text-muted-foreground">
                                        {wallet.installed ? 'Ready to connect' : 'Not installed'}
                                    </div>
                                </div>
                            </Button>
                        )}
                    />
                </DialogContent>
            </Dialog>
        </>
    );
}

ConnectButton.displayName = 'ConnectButton';
