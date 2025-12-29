'use client';

import { useConnector } from '@solana/connector';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Wallet, ExternalLink, Copy, Check, ChevronLeft } from 'lucide-react';
import {
    //IconQuestionmark,
    IconXmark,
} from 'symbols-react';
import { useState, useEffect } from 'react';
import { Spinner } from '@/components/ui/spinner';
import { QRCodeSVG } from 'qrcode.react';

interface WalletModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    /** WalletConnect URI for QR code display */
    walletConnectUri?: string | null;
    /** Callback to clear the WalletConnect URI */
    onClearWalletConnectUri?: () => void;
}

export function WalletModal({ open, onOpenChange, walletConnectUri, onClearWalletConnectUri }: WalletModalProps) {
    const { wallets, select, connecting, selectedWallet, disconnect } = useConnector();
    const [connectingWallet, setConnectingWallet] = useState<string | null>(null);
    const [isClient, setIsClient] = useState(false);
    const [recentlyConnected, setRecentlyConnected] = useState<string | null>(null);
    const [copied, setCopied] = useState(false);

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

    const isWalletConnectFlow = connectingWallet === 'WalletConnect' || !!walletConnectUri;

    function cancelConnection() {
        onClearWalletConnectUri?.();
        setConnectingWallet(null);
        // Important: reset connector state even if connect() is still in-flight
        // (disconnect() also cancels pending connection attempts in the connector)
        disconnect().catch(() => {});
    }

    function handleOpenChange(nextOpen: boolean) {
        if (!nextOpen && (connecting || connectingWallet || walletConnectUri)) {
            cancelConnection();
        }
        onOpenChange(nextOpen);
    }

    const handleSelectWallet = async (walletName: string) => {
        setConnectingWallet(walletName);
        try {
            if (walletName === 'WalletConnect') {
                // Ensure stale URIs don't flash
                onClearWalletConnectUri?.();
            }
            await select(walletName);
            localStorage.setItem('recentlyConnectedWallet', walletName);
            setRecentlyConnected(walletName);
            // Don't close modal for WalletConnect - wait for connection
            if (walletName !== 'WalletConnect') {
                onOpenChange(false);
            }
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            if (message.includes('Connection cancelled')) {
                return;
            }
            console.error('Failed to connect wallet:', error);
        } finally {
            setConnectingWallet(null);
        }
    };

    const handleCopyUri = async () => {
        if (!walletConnectUri) return;
        try {
            await navigator.clipboard.writeText(walletConnectUri);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (err) {
            console.error('Failed to copy URI:', err);
        }
    };

    const handleBackFromWalletConnect = () => {
        cancelConnection();
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
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogContent className="sm:max-w-md [&>button]:hidden rounded-[24px]">
                <DialogHeader className="flex flex-row items-center justify-between">
                    {isWalletConnectFlow ? (
                        <Button
                            type="button"
                            variant="outline"
                            className="rounded-[16px] size-8 shrink-0 p-2 cursor-pointer"
                            onClick={handleBackFromWalletConnect}
                        >
                            <ChevronLeft className="size-4" />
                        </Button>
                    ) : null}
                    <DialogTitle>{isWalletConnectFlow ? 'WalletConnect' : 'Connect your wallet'}</DialogTitle>
                    <DialogPrimitive.Close asChild>
                        <Button
                            variant="outline"
                            className="rounded-[16px] size-8 p-2 shrink-0 cursor-pointer"
                        >
                            <IconXmark className="size-3" />
                        </Button>
                    </DialogPrimitive.Close>
                </DialogHeader>

                {/* WalletConnect QR Code Display */}
                {isWalletConnectFlow ? (
                    <div className="space-y-4 py-2">
                        <p className="text-center text-sm text-muted-foreground">
                            Scan with your mobile wallet
                        </p>

                        {/* QR Code */}
                        <div className="flex justify-center">
                            <div className="p-4 bg-white rounded-2xl shadow-sm">
                                {walletConnectUri ? (
                                    <QRCodeSVG value={walletConnectUri} size={200} level="M" includeMargin={false} />
                                ) : (
                                    <div className="flex flex-col items-center justify-center w-[200px] h-[200px]">
                                        <Spinner className="h-6 w-6 animate-spin" />
                                        <p className="mt-3 text-xs text-muted-foreground">Generating QR code…</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Copy URI button */}
                        <Button
                            variant="outline"
                            onClick={handleCopyUri}
                            disabled={!walletConnectUri}
                            className="w-full rounded-[16px]"
                        >
                            {copied ? (
                                <>
                                    <Check className="w-4 h-4 mr-2" />
                                    Copied!
                                </>
                            ) : (
                                <>
                                    <Copy className="w-4 h-4 mr-2" />
                                    Copy link instead
                                </>
                            )}
                        </Button>

                        <p className="text-xs text-center text-muted-foreground">
                            Works with Phantom, Trust Wallet, Exodus, and other WalletConnect-compatible wallets
                        </p>
                    </div>
                ) : (
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
                                                    disabled={isConnecting}
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
                                                        const isConnecting =
                                                            connectingWallet === walletInfo.wallet.name;
                                                        const isRecent = recentlyConnected === walletInfo.wallet.name;
                                                        return (
                                                            <Button
                                                                key={walletInfo.wallet.name}
                                                                variant="outline"
                                                                className="h-auto justify-between p-4 rounded-[16px]"
                                                                onClick={() =>
                                                                    handleSelectWallet(walletInfo.wallet.name)
                                                                }
                                                                disabled={isConnecting}
                                                            >
                                                                <div className="flex items-center gap-3 flex-1">
                                                                    <div className="flex-1 text-left">
                                                                        <div className="flex items-center gap-2">
                                                                            <span className="font-semibold text-sm">
                                                                                {walletInfo.wallet.name}
                                                                            </span>
                                                                            {isRecent && (
                                                                                <Badge
                                                                                    variant="secondary"
                                                                                    className="text-xs"
                                                                                >
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
                                                                                    e.currentTarget.style.display =
                                                                                        'none';
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
                )}
            </DialogContent>
        </Dialog>
    );
}
