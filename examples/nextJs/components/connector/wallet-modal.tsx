'use client';

import { useConnector } from '@solana/connector/react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Wallet, ExternalLink, Loader2 } from 'lucide-react';
import { useState, useEffect } from 'react';

interface WalletModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function WalletModal({ open, onOpenChange }: WalletModalProps) {
    const { wallets, select, connecting } = useConnector();
    const [connectingWallet, setConnectingWallet] = useState<string | null>(null);
    const [isClient, setIsClient] = useState(false);

    // Ensure we're on client before rendering wallet list
    useEffect(() => {
        setIsClient(true);
        console.log('🔍 WalletModal mounted on client');
    }, []);

    // Debug wallet detection
    useEffect(() => {
        if (isClient && open) {
            console.log('🔍 WalletModal Debug:', {
                walletsCount: wallets.length,
                wallets: wallets.map(w => ({
                    name: w.wallet.name,
                    installed: w.installed,
                })),
                isClient,
                open,
            });
        }
    }, [wallets, isClient, open]);

    const handleSelectWallet = async (walletName: string) => {
        setConnectingWallet(walletName);
        try {
            await select(walletName);
            onOpenChange(false);
        } catch (error) {
            console.error('Failed to connect wallet:', error);
        } finally {
            setConnectingWallet(null);
        }
    };

    // Split wallets into installed and not installed using the installed property
    const installedWallets = wallets.filter(w => w.installed);
    const notInstalledWallets = wallets.filter(w => !w.installed);

    const getInstallUrl = (walletName: string) => {
        const name = walletName.toLowerCase();
        if (name.includes('phantom')) return 'https://phantom.app';
        if (name.includes('solflare')) return 'https://solflare.com';
        if (name.includes('backpack')) return 'https://backpack.app';
        if (name.includes('glow')) return 'https://glow.app';
        return 'https://phantom.app'; // Default
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Connect Wallet</DialogTitle>
                    <DialogDescription>Choose a wallet to connect to this application</DialogDescription>
                </DialogHeader>

                <div className="space-y-4">
                    {/* Wait for client-side before showing wallets */}
                    {!isClient ? (
                        <div className="text-center py-8">
                            <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
                            <p className="text-sm text-muted-foreground">Detecting wallets...</p>
                        </div>
                    ) : (
                        <>
                            {/* Installed Wallets */}
                            {installedWallets.length > 0 && (
                                <div className="space-y-2">
                                    <div className="flex items-center justify-between px-1">
                                        <h3 className="text-sm font-medium text-muted-foreground">Available Wallets</h3>
                                        <Badge variant="secondary" className="text-xs">
                                            {installedWallets.length} installed
                                        </Badge>
                                    </div>
                                    <div className="grid gap-2">
                                        {installedWallets.map(walletInfo => {
                                            const isConnecting = connectingWallet === walletInfo.wallet.name;

                                            return (
                                                <Button
                                                    key={walletInfo.wallet.name}
                                                    variant="outline"
                                                    className="h-auto justify-start p-4 hover:bg-accent"
                                                    onClick={() => handleSelectWallet(walletInfo.wallet.name)}
                                                    disabled={connecting || isConnecting}
                                                >
                                                    <Avatar className="mr-3 h-10 w-10">
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
                                                    <div className="flex-1 text-left">
                                                        <div className="font-semibold text-sm">
                                                            {walletInfo.wallet.name}
                                                        </div>
                                                        <div className="text-xs text-muted-foreground">
                                                            {isConnecting ? 'Connecting...' : 'Ready to connect'}
                                                        </div>
                                                    </div>
                                                    {isConnecting && <Loader2 className="ml-2 h-4 w-4 animate-spin" />}
                                                </Button>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}

                            {/* Not Installed Wallets */}
                            {notInstalledWallets.length > 0 && (
                                <>
                                    {installedWallets.length > 0 && <Separator />}
                                    <div className="space-y-2">
                                        <h3 className="text-sm font-medium text-muted-foreground px-1">
                                            {installedWallets.length > 0 ? 'Other Wallets' : 'Popular Wallets'}
                                        </h3>
                                        <div className="grid gap-2">
                                            {notInstalledWallets.slice(0, 3).map(walletInfo => (
                                                <Button
                                                    key={walletInfo.wallet.name}
                                                    variant="outline"
                                                    className="h-auto justify-between p-4"
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

                            {/* No Wallets at All */}
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

                <div className="text-xs text-center text-muted-foreground pt-2">
                    By connecting, you agree to the Terms of Service
                </div>
            </DialogContent>
        </Dialog>
    );
}
