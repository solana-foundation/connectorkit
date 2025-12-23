'use client';

import { useConnector } from '@solana/connector';
import {
    Dialog,
    DialogContent,
    DialogTitle,
    DialogClose,
} from '@/components/ui-base/dialog';
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from '@/components/ui-base/collapsible';
import { Button } from '@/components/ui-base/button';
import { Wallet, ExternalLink, ChevronDown, X } from 'lucide-react';
import { useState, useEffect } from 'react';

interface WalletModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

// Custom Avatar component
function Avatar({ src, alt, fallback, className }: { src?: string; alt?: string; fallback?: React.ReactNode; className?: string }) {
    const [hasError, setHasError] = useState(false);

    return (
        <div className={`relative flex shrink-0 overflow-hidden rounded-full ${className}`}>
            {src && !hasError ? (
                <img
                    src={src}
                    alt={alt}
                    className="aspect-square h-full w-full object-cover"
                    onError={() => setHasError(true)}
                />
            ) : (
                <div className="flex h-full w-full items-center justify-center bg-muted">
                    {fallback}
                </div>
            )}
        </div>
    );
}

// Badge component
function Badge({ children, className }: { children: React.ReactNode; className?: string }) {
    return (
        <span className={`inline-flex items-center rounded-md border border-primary/10 px-2.5 py-0.5 text-xs font-semibold transition-colors bg-secondary text-secondary-foreground hover:bg-secondary/80 ${className || ''}`}>
            {children}
        </span>
    );
}

// Spinner component
function Spinner({ className }: { className?: string }) {
    return (
        <div className={`animate-spin rounded-full border-2 border-current border-t-transparent ${className || 'h-4 w-4'}`} />
    );
}

// Separator component
function Separator({ className }: { className?: string }) {
    return <div className={`shrink-0 bg-border h-[1px] w-full ${className || ''}`} />;
}

export function WalletModal({ open, onOpenChange }: WalletModalProps) {
    const { wallets, select, connecting } = useConnector();
    const [connectingWallet, setConnectingWallet] = useState<string | null>(null);
    const [isClient, setIsClient] = useState(false);
    const [recentlyConnected, setRecentlyConnected] = useState<string | null>(null);
    const [isOtherWalletsOpen, setIsOtherWalletsOpen] = useState(false);

    useEffect(() => {
        setIsClient(true);
    }, []);

    useEffect(() => {
        const recent = localStorage.getItem('recentlyConnectedWallet');
        if (recent) {
            setRecentlyConnected(recent);
        }
    }, []);

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
            <DialogContent
                showCloseButton={false}
                className="max-w-md rounded-[24px] p-6"
            >
                {/* Header */}
                <div className="flex items-center justify-between mb-4">
                    <DialogTitle className="text-lg font-semibold">
                        Connect your wallet
                    </DialogTitle>
                    <DialogClose className="rounded-[16px] h-8 w-8 p-2 border border-input bg-background shadow-xs hover:bg-accent hover:text-accent-foreground inline-flex items-center justify-center cursor-pointer">
                        <X className="h-3 w-3" />
                    </DialogClose>
                </div>

                <div className="space-y-4">
                    {!isClient ? (
                        <div className="text-center py-8">
                            <Spinner className="h-6 w-6 mx-auto mb-2" />
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
                                                    className="h-auto justify-between p-4 rounded-[16px] w-full"
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
                                                                    <Badge className="text-xs">
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
                                                        <Avatar
                                                            src={walletInfo.wallet.icon}
                                                            alt={walletInfo.wallet.name}
                                                            fallback={<Wallet className="h-5 w-5" />}
                                                            className="h-10 w-10"
                                                        />
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
                                    <Collapsible open={isOtherWalletsOpen} onOpenChange={setIsOtherWalletsOpen}>
                                        <CollapsibleTrigger className="w-full flex items-center justify-between border bg-background shadow-xs hover:bg-accent hover:text-accent-foreground hover:no-underline dark:bg-input/30 dark:border-input dark:hover:bg-input/50 rounded-[16px] px-4 py-2 cursor-pointer">
                                            <span>Other Wallets</span>
                                            <ChevronDown className={`h-4 w-4 shrink-0 transition-transform duration-200 ${isOtherWalletsOpen ? 'rotate-180' : ''}`} />
                                        </CollapsibleTrigger>
                                        <CollapsibleContent>
                                            <div className="grid gap-2 pt-2">
                                                {otherWallets.map(walletInfo => {
                                                    const isConnecting = connectingWallet === walletInfo.wallet.name;
                                                    const isRecent = recentlyConnected === walletInfo.wallet.name;
                                                    return (
                                                        <Button
                                                            key={walletInfo.wallet.name}
                                                            variant="outline"
                                                            className="h-auto justify-between p-4 rounded-[16px] w-full"
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
                                                                            <Badge className="text-xs">
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
                                                                <Avatar
                                                                    src={walletInfo.wallet.icon}
                                                                    alt={walletInfo.wallet.name}
                                                                    fallback={<Wallet className="h-5 w-5" />}
                                                                    className="h-10 w-10"
                                                                />
                                                            </div>
                                                        </Button>
                                                    );
                                                })}
                                            </div>
                                        </CollapsibleContent>
                                    </Collapsible>
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
                                                    className="h-auto justify-between p-4 rounded-[16px] w-full cursor-pointer"
                                                    onClick={() =>
                                                        window.open(getInstallUrl(walletInfo.wallet.name), '_blank')
                                                    }
                                                >
                                                    <div className="flex items-center gap-3">
                                                        <Avatar
                                                            src={walletInfo.wallet.icon}
                                                            alt={walletInfo.wallet.name}
                                                            fallback={<Wallet className="h-4 w-4" />}
                                                            className="h-8 w-8"
                                                        />
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
