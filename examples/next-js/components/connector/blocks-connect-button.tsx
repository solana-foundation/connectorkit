'use client';

/**
 * Example implementation of ConnectButton using the block system.
 * This shows how to integrate the headless blocks with shadcn UI components.
 * 
 * Note: This example uses the blocks with custom render props for full integration
 * with shadcn UI. After rebuilding @solana/connector, all type errors will resolve.
 */

import React, { useState } from 'react';
import { useConnector } from '@solana/connector';
import { useBalance, useCluster } from '@solana/connector/react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Wallet, ChevronDown, Copy, Check, LogOut, RefreshCw, Loader2 } from 'lucide-react';

interface BlocksConnectButtonProps {
    className?: string;
}

/**
 * Full-featured ConnectButton using hooks directly with shadcn UI.
 * This demonstrates how to build a custom connect button using the connector hooks.
 */
export function BlocksConnectButton({ className }: BlocksConnectButtonProps) {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [copied, setCopied] = useState(false);
    const { connected, connecting, selectedWallet, selectedAccount, disconnect, wallets, select } = useConnector();
    const { solBalance, formattedSol, isLoading: balanceLoading, refetch } = useBalance();
    const { cluster, isMainnet, isDevnet } = useCluster();
    
    const handleCopy = async () => {
        if (selectedAccount) {
            await navigator.clipboard.writeText(selectedAccount);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };
    
    if (connecting) {
        return (
            <Button disabled className={className}>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Connecting...
            </Button>
        );
    }
    
    if (connected && selectedAccount && selectedWallet) {
        const shortAddress = `${selectedAccount.slice(0, 4)}...${selectedAccount.slice(-4)}`;
        const walletWithIcon = wallets.find((w: { wallet: { name: string } }) => w.wallet.name === selectedWallet.name);
        const walletIcon = walletWithIcon?.wallet.icon || selectedWallet.icon;
        
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
                <DropdownMenuContent align="end" className="w-64">
                    {/* Account Info */}
                    <DropdownMenuLabel>
                        <div className="flex items-center gap-3">
                            {walletIcon && (
                                <Avatar className="h-8 w-8">
                                    <AvatarImage src={walletIcon} alt={selectedWallet.name} />
                                    <AvatarFallback>
                                        <Wallet className="h-4 w-4" />
                                    </AvatarFallback>
                                </Avatar>
                            )}
                            <div className="flex-1">
                                <p className="text-sm font-medium">{selectedWallet.name}</p>
                                <p className="text-xs font-mono text-muted-foreground">{shortAddress}</p>
                            </div>
                            <button 
                                onClick={(e) => { e.stopPropagation(); handleCopy(); }}
                                className="p-1 hover:bg-accent rounded"
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
                    
                    {/* Balance */}
                    <div className="px-2 py-1.5">
                        <div className="flex items-center justify-between">
                            <span className="text-sm text-muted-foreground">Balance</span>
                            <div className="flex items-center gap-2">
                                <span className="text-sm font-medium">{formattedSol}</span>
                                <button 
                                    onClick={(e) => { e.stopPropagation(); refetch(); }}
                                    className="p-1 hover:bg-accent rounded"
                                    disabled={balanceLoading}
                                >
                                    <RefreshCw className={`h-3 w-3 text-muted-foreground ${balanceLoading ? 'animate-spin' : ''}`} />
                                </button>
                            </div>
                        </div>
                    </div>
                    
                    <DropdownMenuSeparator />
                    
                    {/* Network */}
                    <div className="px-2 py-1.5">
                        <div className="flex items-center justify-between">
                            <span className="text-sm text-muted-foreground">Network</span>
                            <Badge 
                                variant={isMainnet ? 'default' : isDevnet ? 'secondary' : 'outline'}
                                className="text-xs"
                            >
                                {cluster?.label || 'Unknown'}
                            </Badge>
                        </div>
                    </div>
                    
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
                        <DialogDescription>Choose a wallet to connect to this application</DialogDescription>
                    </DialogHeader>
                    
                    <div className="grid gap-2">
                        {wallets.filter((w: { installed: boolean }) => w.installed).map((walletInfo: { wallet: { name: string; icon?: string }; installed: boolean }) => (
                            <Button
                                key={walletInfo.wallet.name}
                                variant="outline"
                                className="h-auto justify-start p-4 hover:bg-accent w-full"
                                onClick={async () => {
                                    await select(walletInfo.wallet.name);
                                    setIsModalOpen(false);
                                }}
                            >
                                <Avatar className="mr-3 h-10 w-10">
                                    {walletInfo.wallet.icon && (
                                        <AvatarImage src={walletInfo.wallet.icon} alt={walletInfo.wallet.name} />
                                    )}
                                    <AvatarFallback>
                                        <Wallet className="h-5 w-5" />
                                    </AvatarFallback>
                                </Avatar>
                                <div className="flex-1 text-left">
                                    <div className="font-semibold text-sm">{walletInfo.wallet.name}</div>
                                    <div className="text-xs text-muted-foreground">Ready to connect</div>
                                </div>
                            </Button>
                        ))}
                    </div>
                </DialogContent>
            </Dialog>
        </>
    );
}

BlocksConnectButton.displayName = 'BlocksConnectButton';
