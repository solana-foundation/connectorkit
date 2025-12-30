'use client';

import { useConnector, type WalletConnectorId, type WalletConnectorMetadata } from '@solana/connector/react';
import { Dialog, DialogContent, DialogTitle, DialogClose } from '@/components/ui-base/dialog';
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from '@/components/ui-base/collapsible';
import { Button } from '@/components/ui-base/button';
import { Wallet, ExternalLink, ChevronDown, X, Copy, Check, ChevronLeft } from 'lucide-react';
import { useState, useEffect } from 'react';
import { CustomQRCode } from '@/components/ui/custom-qr-code';

interface WalletModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    /** WalletConnect URI for QR code display */
    walletConnectUri?: string | null;
    /** Callback to clear the WalletConnect URI */
    onClearWalletConnectUri?: () => void;
}

// Custom Avatar component
function Avatar({
    src,
    alt,
    fallback,
    className,
}: {
    src?: string;
    alt?: string;
    fallback?: React.ReactNode;
    className?: string;
}) {
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
                <div className="flex h-full w-full items-center justify-center bg-muted">{fallback}</div>
            )}
        </div>
    );
}

// Badge component
function Badge({ children, className }: { children: React.ReactNode; className?: string }) {
    return (
        <span
            className={`inline-flex items-center rounded-md border border-primary/10 px-2.5 py-0.5 text-xs font-semibold transition-colors bg-secondary text-secondary-foreground hover:bg-secondary/80 ${className || ''}`}
        >
            {children}
        </span>
    );
}

// Spinner component
function Spinner({ className }: { className?: string }) {
    return (
        <div
            className={`animate-spin rounded-full border-2 border-current border-t-transparent ${className || 'h-4 w-4'}`}
        />
    );
}

// Separator component
function Separator({ className }: { className?: string }) {
    return <div className={`shrink-0 bg-border h-[1px] w-full ${className || ''}`} />;
}

// Error Alert component
function ErrorAlert({ message, onDismiss }: { message: string; onDismiss: () => void }) {
    return (
        <div className="flex items-start gap-3 rounded-[12px] border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
            <div className="flex-1">
                <p className="font-medium">Connection failed</p>
                <p className="text-xs opacity-90 mt-0.5">{message}</p>
            </div>
            <button
                onClick={onDismiss}
                className="shrink-0 rounded-md p-1 hover:bg-destructive/20 transition-colors"
                aria-label="Dismiss error"
            >
                <X className="h-3 w-3" />
            </button>
        </div>
    );
}

export function WalletModal({ open, onOpenChange, walletConnectUri, onClearWalletConnectUri }: WalletModalProps) {
    const { walletStatus, isConnecting, connectorId, connectors, connectWallet, disconnectWallet } = useConnector();
    const status = walletStatus.status;

    const [connectingConnectorId, setConnectingConnectorId] = useState<WalletConnectorId | null>(null);
    const [isClient, setIsClient] = useState(false);
    const [recentlyConnectedConnectorId, setRecentlyConnectedConnectorId] = useState<WalletConnectorId | null>(null);
    const [isOtherWalletsOpen, setIsOtherWalletsOpen] = useState(false);
    const [errorConnectorId, setErrorConnectorId] = useState<WalletConnectorId | null>(null);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        setIsClient(true);
    }, []);

    useEffect(() => {
        const recent = localStorage.getItem('recentlyConnectedConnectorId');
        if (recent) {
            setRecentlyConnectedConnectorId(recent as WalletConnectorId);
        }
    }, []);

    useEffect(() => {
        if (status !== 'connected') return;
        if (!connectorId) return;
        localStorage.setItem('recentlyConnectedConnectorId', connectorId);
        setRecentlyConnectedConnectorId(connectorId);
    }, [status, connectorId]);

    const walletConnectConnector = connectors.find(c => c.name === 'WalletConnect') ?? null;
    const isWalletConnectFlow =
        (!!walletConnectConnector &&
            (connectingConnectorId === walletConnectConnector.id ||
                (status === 'connecting' && connectorId === walletConnectConnector.id))) ||
        !!walletConnectUri;

    function cancelConnection() {
        onClearWalletConnectUri?.();
        setConnectingConnectorId(null);
        disconnectWallet().catch(() => {});
    }

    // Clear error state when modal closes or user tries another wallet
    const clearError = () => {
        setErrorConnectorId(null);
        setErrorMessage(null);
    };

    const handleSelectWallet = async (connector: WalletConnectorMetadata) => {
        clearError();
        setConnectingConnectorId(connector.id);
        try {
            if (connector.name === 'WalletConnect') {
                onClearWalletConnectUri?.();
            }
            await connectWallet(connector.id);
            localStorage.setItem('recentlyConnectedConnectorId', connector.id);
            setRecentlyConnectedConnectorId(connector.id);
            // Don't close modal for WalletConnect - wait for connection
            if (connector.name !== 'WalletConnect') {
                onOpenChange(false);
            }
        } catch (error) {
            // Extract user-friendly error message
            const message = error instanceof Error ? error.message : 'An unexpected error occurred';
            if (message.includes('Connection cancelled')) return;

            // Set error state for UI feedback
            setErrorConnectorId(connector.id);
            setErrorMessage(message);

            // Log for telemetry/debugging (includes full error details)
            console.error('Failed to connect wallet:', {
                wallet: connector.name,
                connectorId: connector.id,
                error,
                message,
                timestamp: new Date().toISOString(),
            });
        } finally {
            setConnectingConnectorId(null);
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

    const readyConnectors = connectors.filter(c => c.ready);
    const notReadyConnectors = connectors.filter(c => !c.ready);

    const sortedReadyConnectors = [...readyConnectors].sort((a, b) => {
        const aIsRecent = recentlyConnectedConnectorId === a.id;
        const bIsRecent = recentlyConnectedConnectorId === b.id;
        if (aIsRecent && !bIsRecent) return -1;
        if (!aIsRecent && bIsRecent) return 1;
        return 0;
    });

    const primaryWallets = sortedReadyConnectors.slice(0, 3);
    const otherWallets = sortedReadyConnectors.slice(3);

    const getInstallUrl = (walletName: string, walletUrl?: string): string | undefined => {
        // Prefer wallet metadata URL if available
        if (walletUrl) return walletUrl;

        // Known wallet install URLs
        const name = walletName.toLowerCase();
        if (name.includes('phantom')) return 'https://phantom.app';
        if (name.includes('solflare')) return 'https://solflare.com';
        if (name.includes('backpack')) return 'https://backpack.app';
        if (name.includes('glow')) return 'https://glow.app';
        if (name.includes('coinbase')) return 'https://www.coinbase.com/wallet';
        if (name.includes('ledger')) return 'https://www.ledger.com';
        if (name.includes('trust')) return 'https://trustwallet.com';
        if (name.includes('exodus')) return 'https://www.exodus.com';

        // Return undefined for unknown wallets to avoid misleading users
        return undefined;
    };

    const handleOpenChange = (isOpen: boolean) => {
        if (!isOpen) {
            clearError();
            if (isConnecting || connectingConnectorId || walletConnectUri) {
                cancelConnection();
            }
        }
        onOpenChange(isOpen);
    };

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogContent showCloseButton={false} className="max-w-md rounded-[24px] p-6">
                {/* Header */}
                <div className="flex items-center justify-between mb-4">
                    {isWalletConnectFlow ? (
                        <button
                            onClick={handleBackFromWalletConnect}
                            className="rounded-[16px] h-8 w-8 p-2 border border-input bg-background shadow-xs hover:bg-accent hover:text-accent-foreground inline-flex items-center justify-center cursor-pointer"
                        >
                            <ChevronLeft className="h-4 w-4" />
                        </button>
                    ) : null}
                    <DialogTitle className="text-lg font-semibold">
                        {isWalletConnectFlow ? 'WalletConnect' : 'Connect your wallet'}
                    </DialogTitle>
                    <DialogClose className="rounded-[16px] h-8 w-8 p-2 border border-input bg-background shadow-xs hover:bg-accent hover:text-accent-foreground inline-flex items-center justify-center cursor-pointer">
                        <X className="h-3 w-3" />
                    </DialogClose>
                </div>

                {/* WalletConnect QR Code Display */}
                {isWalletConnectFlow ? (
                    <div className="space-y-4 py-2 flex flex-col items-center">
                        {/* Tooltip-style hint */}
                        <div className="relative inline-flex flex-col items-center">
                            <div className="bg-zinc-800 text-zinc-100 text-xs px-3 py-1.5 rounded-lg shadow-lg flex items-center gap-1.5">
                                Use a WalletConnect
                                <div className="">
                                    <svg
                                        className="w-6 h-6 inline-block"
                                        viewBox="0 0 480 480"
                                        fill="none"
                                        xmlns="http://www.w3.org/2000/svg"
                                    >
                                        <path
                                            d="M126.613 168.813C193.707 101.719 302.293 101.719 369.387 168.813L377.507 176.933C380.853 180.28 380.853 185.707 377.507 189.053L350.453 216.107C348.787 217.773 346.067 217.773 344.4 216.107L333.387 205.093C287.2 158.907 213.293 158.907 167.107 205.093L155.2 216.987C153.533 218.653 150.813 218.653 149.147 216.987L122.093 189.933C118.747 186.587 118.747 181.16 122.093 177.813L126.613 168.813ZM426.667 225.88L450.827 250.04C454.173 253.387 454.173 258.813 450.827 262.16L343.44 369.547C340.093 372.893 334.667 372.893 331.32 369.547L255.427 293.653C254.587 292.813 253.227 292.813 252.387 293.653L176.493 369.547C173.147 372.893 167.72 372.893 164.373 369.547L56.9867 262.16C53.64 258.813 53.64 253.387 56.9867 250.04L81.1467 225.88C84.4933 222.533 89.92 222.533 93.2667 225.88L169.16 301.773C170 302.613 171.36 302.613 172.2 301.773L248.093 225.88C251.44 222.533 256.867 222.533 260.213 225.88L336.107 301.773C336.947 302.613 338.307 302.613 339.147 301.773L415.04 225.88C418.387 222.533 423.813 222.533 426.667 225.88Z"
                                            fill="#3B99FC"
                                        />
                                    </svg>
                                </div>
                                supported wallet to scan
                            </div>
                            {/* Caret */}
                            <div className="w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[6px] border-t-zinc-900" />
                        </div>

                        {/* QR Code */}
                        <div className="flex justify-center">
                            <CustomQRCode
                                value={walletConnectUri ?? ''}
                                size={280}
                                ecl="M"
                                loading={!walletConnectUri}
                                scanning={!!walletConnectUri}
                            />
                        </div>
                        {/* Copy URI button */}
                        <Button
                            variant="outline"
                            onClick={handleCopyUri}
                            disabled={!walletConnectUri}
                            className="w-auto rounded-[12px] active:scale-[0.98] transition-all duration-200"
                        >
                            {copied ? (
                                <>
                                    <Check className="w-4 h-4 mr-2 text-green-500" />
                                    Copy to Clipboard
                                </>
                            ) : (
                                <>
                                    <Copy className="w-4 h-4 mr-2" />
                                    Copy to Clipboard
                                </>
                            )}
                        </Button>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {/* Error Alert */}
                        {errorMessage && <ErrorAlert message={errorMessage} onDismiss={clearError} />}

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
                                            {primaryWallets.map(connector => {
                                                const isThisConnecting =
                                                    connectingConnectorId === connector.id ||
                                                    (isConnecting && connectorId === connector.id);
                                                const isRecent = recentlyConnectedConnectorId === connector.id;
                                                const hasError = errorConnectorId === connector.id;
                                                return (
                                                    <Button
                                                        key={connector.id}
                                                        variant="outline"
                                                        className={`h-auto justify-between p-4 rounded-[16px] w-full ${
                                                            hasError
                                                                ? 'border-destructive/50 bg-destructive/5 hover:bg-destructive/10'
                                                                : ''
                                                        }`}
                                                        onClick={() => handleSelectWallet(connector)}
                                                        disabled={isThisConnecting}
                                                    >
                                                        <div className="flex items-center gap-3 flex-1">
                                                            <div className="flex-1 text-left">
                                                                <div className="flex items-center gap-2">
                                                                    <span className="font-semibold text-md">
                                                                        {connector.name}
                                                                    </span>
                                                                    {isRecent && (
                                                                        <Badge className="text-xs">Recent</Badge>
                                                                    )}
                                                                </div>
                                                                {isThisConnecting && (
                                                                    <div className="text-xs text-muted-foreground">
                                                                        Connecting...
                                                                    </div>
                                                                )}
                                                                {hasError && !isConnecting && (
                                                                    <div className="text-xs text-destructive">
                                                                        Click to retry
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                        <div className="flex items-center gap-2">
                                                            {isThisConnecting && <Spinner className="h-4 w-4" />}
                                                            <Avatar
                                                                src={connector.icon}
                                                                alt={connector.name}
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
                                                <ChevronDown
                                                    className={`h-4 w-4 shrink-0 transition-transform duration-200 ${isOtherWalletsOpen ? 'rotate-180' : ''}`}
                                                />
                                            </CollapsibleTrigger>
                                            <CollapsibleContent>
                                                <div className="grid gap-2 pt-2">
                                                    {otherWallets.map(connector => {
                                                        const isThisConnecting =
                                                            connectingConnectorId === connector.id ||
                                                            (isConnecting && connectorId === connector.id);
                                                        const isRecent = recentlyConnectedConnectorId === connector.id;
                                                        const hasError = errorConnectorId === connector.id;
                                                        return (
                                                            <Button
                                                                key={connector.id}
                                                                variant="outline"
                                                                className={`h-auto justify-between p-4 rounded-[16px] w-full ${
                                                                    hasError
                                                                        ? 'border-destructive/50 bg-destructive/5 hover:bg-destructive/10'
                                                                        : ''
                                                                }`}
                                                                onClick={() => handleSelectWallet(connector)}
                                                                disabled={isThisConnecting}
                                                            >
                                                                <div className="flex items-center gap-3 flex-1">
                                                                    <div className="flex-1 text-left">
                                                                        <div className="flex items-center gap-2">
                                                                            <span className="font-semibold text-sm">
                                                                                {connector.name}
                                                                            </span>
                                                                            {isRecent && (
                                                                                <Badge className="text-xs">
                                                                                    Recent
                                                                                </Badge>
                                                                            )}
                                                                        </div>
                                                                        {isThisConnecting && (
                                                                            <div className="text-xs text-muted-foreground">
                                                                                Connecting...
                                                                            </div>
                                                                        )}
                                                                        {hasError && !isConnecting && (
                                                                            <div className="text-xs text-destructive">
                                                                                Click to retry
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                                <div className="flex items-center gap-2">
                                                                    {isThisConnecting && (
                                                                        <Spinner className="h-4 w-4" />
                                                                    )}
                                                                    <Avatar
                                                                        src={connector.icon}
                                                                        alt={connector.name}
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

                                {notReadyConnectors.length > 0 && (
                                    <>
                                        {(primaryWallets.length > 0 || otherWallets.length > 0) && <Separator />}
                                        <div className="space-y-2">
                                            <h3 className="text-sm font-medium text-muted-foreground px-1">
                                                {readyConnectors.length > 0 ? 'Unavailable Wallets' : 'Wallets'}
                                            </h3>
                                            <div className="grid gap-2">
                                                {notReadyConnectors.slice(0, 3).map(connector => {
                                                    const installUrl = getInstallUrl(connector.name);

                                                    return (
                                                        <div
                                                            key={connector.id}
                                                            className="flex items-center justify-between p-4 rounded-[16px] w-full border bg-background shadow-xs"
                                                        >
                                                            <div className="flex items-center gap-3">
                                                                <Avatar
                                                                    src={connector.icon}
                                                                    alt={connector.name}
                                                                    fallback={<Wallet className="h-4 w-4" />}
                                                                    className="h-8 w-8"
                                                                />
                                                                <div className="text-left">
                                                                    <div className="font-medium text-sm">
                                                                        {connector.name}
                                                                    </div>
                                                                    <div className="text-xs text-muted-foreground">
                                                                        Not available
                                                                    </div>
                                                                </div>
                                                            </div>
                                                            {installUrl && (
                                                                <Button
                                                                    variant="ghost"
                                                                    size="sm"
                                                                    className="h-8 px-2 cursor-pointer"
                                                                    onClick={() => window.open(installUrl, '_blank')}
                                                                >
                                                                    <ExternalLink className="h-4 w-4 text-muted-foreground" />
                                                                </Button>
                                                            )}
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    </>
                                )}

                                {connectors.length === 0 && (
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
