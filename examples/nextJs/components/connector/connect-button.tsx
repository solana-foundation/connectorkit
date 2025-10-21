'use client';

import { useConnector, useAccount } from '@solana/connector';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useState } from 'react';
import { WalletModal } from './wallet-modal';
import { Wallet, Copy, LogOut, ChevronDown, Check } from 'lucide-react';

interface ConnectButtonProps {
    className?: string;
}

export function ConnectButton({ className }: ConnectButtonProps) {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const { connected, connecting, selectedWallet, selectedAccount, disconnect, wallets } = useConnector();
    const { copied, copy } = useAccount();

    if (connecting) {
        return (
            <Button disabled className={className}>
                <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                Connecting...
            </Button>
        );
    }

    if (connected && selectedAccount && selectedWallet) {
        const shortAddress = `${selectedAccount.slice(0, 4)}...${selectedAccount.slice(-4)}`;

        // Get wallet icon from wallets list (has proper icons) or fallback to selectedWallet
        const walletWithIcon = wallets.find(w => w.wallet.name === selectedWallet.name);
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
                <DropdownMenuContent align="end" className="w-56">
                    <DropdownMenuLabel>
                        <div className="flex flex-col space-y-1">
                            <p className="text-sm font-medium leading-none">{selectedWallet.name}</p>
                            <p className="text-xs font-mono text-muted-foreground">{shortAddress}</p>
                        </div>
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={copy}>
                        {copied ? (
                            <>
                                <Check className="mr-2 h-4 w-4" />
                                Copied!
                            </>
                        ) : (
                            <>
                                <Copy className="mr-2 h-4 w-4" />
                                Copy Address
                            </>
                        )}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => disconnect()} className="text-red-600">
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
            <WalletModal open={isModalOpen} onOpenChange={setIsModalOpen} />
        </>
    );
}
