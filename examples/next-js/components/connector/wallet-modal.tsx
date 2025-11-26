'use client';

import { useConnector } from '@solana/connector';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Wallet, ExternalLink} from 'lucide-react';
import { 
    //IconQuestionmark, 
    IconXmark 
} from 'symbols-react';
import { useState, useEffect } from 'react';
import { Spinner } from '../ui/spinner';

interface WalletModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function WalletModal({ open, onOpenChange }: WalletModalProps) {
    const { wallets, select, connecting, selectedWallet } = useConnector();
    const [connectingWallet, setConnectingWallet] = useState<string | null>(null);
    const [isClient, setIsClient] = useState(false);
    const [recentlyConnected, setRecentlyConnected] = useState<string | null>(null);

    useEffect(() => {
        setIsClient(true);
    }, []);

    useEffect(() => {
        const recent = localStorage.getItem('recentlyConnectedWallet');
        if (recent) {
            setRecentlyConnected(recent);
        }
    }, []);

    useEffect(() => {
        if (selectedWallet?.name) {
            localStorage.setItem('recentlyConnectedWallet', selectedWallet.name);
            setRecentlyConnected(selectedWallet.name);
        }
    }, [selectedWallet]);

    const handleSelectWallet = async (walletName: string) => {
        setConnectingWallet(walletName);
        try {
            await select(walletName);
            localStorage.setItem('recentlyConnectedWallet', walletName);
            setRecentlyConnected(walletName);
            onOpenChange(false);
        } catch (error) {
            console.error('Failed to connect wallet:', error);
        } finally {
            setConnectingWallet(null);
        }
    };

    const installedWallets = wallets.filter(w => w.installed);
    const notInstalledWallets = wallets.filter(w => !w.installed);

    const sortedInstalledWallets = [...installedWallets].sort((a, b) => {
        const aIsRecent = recentlyConnected === a.wallet.name;
        const bIsRecent = recentlyConnected === b.wallet.name;
        if (aIsRecent && !bIsRecent) return -1;
        if (!aIsRecent && bIsRecent) return 1;
        return 0;
    });

    const primaryWallets = sortedInstalledWallets.slice(0, 3);
    const otherWallets = sortedInstalledWallets.slice(3);

    const getInstallUrl = (walletName: string) => {
        const name = walletName.toLowerCase();
        if (name.includes('phantom')) return 'https://phantom.app';
        if (name.includes('solflare')) return 'https://solflare.com';
        if (name.includes('backpack')) return 'https://backpack.app';
        if (name.includes('glow')) return 'https://glow.app';
        return 'https://phantom.app';
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md [&>button]:hidden rounded-[24px]">
                <DialogHeader className="flex flex-row items-center justify-between">
                    {/* <Button
                        type="button"
                        variant="outline"
                        className="rounded-[16px] size-8 shrink-0 p-2 cursor-pointer"
                        onClick={() => window.open('https://docs.solana.com/wallet-guide', '_blank')}
                    >
                        <IconQuestionmark className="size-3" />
                    </Button> */}
                    <DialogTitle>Connect your wallet</DialogTitle>
                    <DialogPrimitive.Close asChild>
                        <Button
                            variant="outline"
                            className="rounded-[16px] size-8 p-2 shrink-0 cursor-pointer"
                            onClick={() => onOpenChange(false)}
                        >
                            <IconXmark className="size-3" />
                        </Button>
                    </DialogPrimitive.Close>
                </DialogHeader>

                <div className="space-y-4">
                    {!isClient ? (
                        <div className="text-center py-8">
                            <Spinner className="h-6 w-6 animate-spin mx-auto mb-2" />
                            <p className="text-sm text-muted-foreground">Detecting wallets...</p>
                        </div>
                    ) : (
                        <>
                            {primaryWallets.length > 0 && (
                                <div className="space-y-2">
                                    <div className="grid gap-2">
                                        {primaryWallets.map(walletInfo => {
                                            const isConnecting = connectingWallet === walletInfo.wallet.name;
                                            const isRecent = recentlyConnected === walletInfo.wallet.name;
                                            return (
                                                <Button
                                                    key={walletInfo.wallet.name}
                                                    variant="outline"
                                                    className="h-auto justify-between p-4 rounded-[16px]"
                                                    onClick={() => handleSelectWallet(walletInfo.wallet.name)}
                                                    disabled={connecting || isConnecting}
                                                >
                                                    <div className="flex items-center gap-3 flex-1">
                                                        <div className="flex-1 text-left">
                                                            <div className="flex items-center gap-2">
                                                                <span className="font-semibold text-md">
                                                                    {walletInfo.wallet.name}
                                                                </span>
                                                                {isRecent && (
                                                                    <Badge variant="secondary" className="text-xs">
                                                                        Recent
                                                                    </Badge>
                                                                )}
                                                            </div>
                                                            {isConnecting && (
                                                                <div className="text-xs text-muted-foreground">
                                                                    Connecting...
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        {isConnecting && <Spinner className="h-4 w-4" />}
                                                        <Avatar className="h-10 w-10">
                                                            {walletInfo.wallet.icon && (
                                                                <AvatarImage
                                                                    src={walletInfo.wallet.icon}
                                                                    alt={walletInfo.wallet.name}
                                                                    onError={e => {
                                                                        e.currentTarget.style.display = 'none';
                                                                    }}
                                                                />
                                                            )}
                                                            <AvatarFallback>
                                                                <Wallet className="h-5 w-5" />
                                                            </AvatarFallback>
                                                        </Avatar>
                                                    </div>
                                                </Button>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}

                            {otherWallets.length > 0 && (
                                <>
                                    {primaryWallets.length > 0 && <Separator />}
                                    <Accordion type="single" collapsible className="w-full">
                                        <AccordionItem value="other-wallets" className="border-none">
                                            <AccordionTrigger className="border bg-background shadow-xs hover:bg-accent hover:text-accent-foreground dark:bg-input/30 dark:border-input dark:hover:bg-input/50 rounded-[16px] px-4 py-2 hover:no-underline">
                                                <span>Other Wallets</span>
                                            </AccordionTrigger>
                                            <AccordionContent>
                                                <div className="grid gap-2 pt-2">
                                                    {otherWallets.map(walletInfo => {
                                                        const isConnecting = connectingWallet === walletInfo.wallet.name;
                                                        const isRecent = recentlyConnected === walletInfo.wallet.name;
                                                        return (
                                                            <Button
                                                                key={walletInfo.wallet.name}
                                                                variant="outline"
                                                                className="h-auto justify-between p-4 rounded-[16px]"
                                                                onClick={() => handleSelectWallet(walletInfo.wallet.name)}
                                                                disabled={connecting || isConnecting}
                                                            >
                                                                <div className="flex items-center gap-3 flex-1">
                                                                    <div className="flex-1 text-left">
                                                                        <div className="flex items-center gap-2">
                                                                            <span className="font-semibold text-sm">
                                                                                {walletInfo.wallet.name}
                                                                            </span>
                                                                            {isRecent && (
                                                                                <Badge variant="secondary" className="text-xs">
                                                                                    Recent
                                                                                </Badge>
                                                                            )}
                                                                        </div>
                                                                        {isConnecting && (
                                                                            <div className="text-xs text-muted-foreground">
                                                                                Connecting...
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                                <div className="flex items-center gap-2">
                                                                    {isConnecting && <Spinner className="h-4 w-4" />}
                                                                    <Avatar className="h-10 w-10">
                                                                        {walletInfo.wallet.icon && (
                                                                            <AvatarImage
                                                                                src={walletInfo.wallet.icon}
                                                                                alt={walletInfo.wallet.name}
                                                                                onError={e => {
                                                                                    e.currentTarget.style.display = 'none';
                                                                                }}
                                                                            />
                                                                        )}
                                                                        <AvatarFallback>
                                                                            <Wallet className="h-5 w-5" />
                                                                        </AvatarFallback>
                                                                    </Avatar>
                                                                </div>
                                                            </Button>
                                                        );
                                                    })}
                                                </div>
                                            </AccordionContent>
                                        </AccordionItem>
                                    </Accordion>
                                </>
                            )}

                            {notInstalledWallets.length > 0 && (
                                <>
                                    {(primaryWallets.length > 0 || otherWallets.length > 0) && <Separator />}
                                    <div className="space-y-2">
                                        <h3 className="text-sm font-medium text-muted-foreground px-1">
                                            {installedWallets.length > 0 ? 'Other Wallets' : 'Popular Wallets'}
                                        </h3>
                                        <div className="grid gap-2">
                                            {notInstalledWallets.slice(0, 3).map(walletInfo => (
                                                <Button
                                                    key={walletInfo.wallet.name}
                                                    variant="outline"
                                                    className="h-auto justify-between p-4 rounded-[16px] hover:cursor-pointer"
                                                    onClick={() =>
                                                        window.open(getInstallUrl(walletInfo.wallet.name), '_blank')
                                                    }
                                                >
                                                    <div className="flex items-center gap-3">
                                                        <Avatar className="h-8 w-8">
                                                            {walletInfo.wallet.icon && (
                                                                <AvatarImage
                                                                    src={walletInfo.wallet.icon}
                                                                    alt={walletInfo.wallet.name}
                                                                    onError={e => {
                                                                        e.currentTarget.style.display = 'none';
                                                                    }}
                                                                />
                                                            )}
                                                            <AvatarFallback>
                                                                <Wallet className="h-4 w-4" />
                                                            </AvatarFallback>
                                                        </Avatar>
                                                        <div className="text-left">
                                                            <div className="font-medium text-sm">
                                                                {walletInfo.wallet.name}
                                                            </div>
                                                            <div className="text-xs text-muted-foreground">
                                                                Not installed
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <ExternalLink className="h-4 w-4 text-muted-foreground" />
                                                </Button>
                                            ))}
                                        </div>
                                    </div>
                                </>
                            )}

                            {wallets.length === 0 && (
                                <div className="rounded-lg border border-dashed p-8 text-center">
                                    <Wallet className="mx-auto h-12 w-12 text-muted-foreground mb-3" />
                                    <h3 className="font-semibold mb-2">No Wallets Detected</h3>
                                    <p className="text-sm text-muted-foreground mb-6">
                                        Install a Solana wallet extension to get started
                                    </p>
                                    <div className="flex gap-2 justify-center">
                                        <Button
                                            onClick={() => window.open('https://phantom.app', '_blank')}
                                            className="bg-purple-600 hover:bg-purple-700"
                                        >
                                            Get Phantom
                                        </Button>
                                        <Button
                                            variant="outline"
                                            onClick={() => window.open('https://backpack.app', '_blank')}
                                        >
                                            Get Backpack
                                        </Button>
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}
