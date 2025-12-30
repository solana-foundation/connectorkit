'use client';

import { oneLight } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { CopyButton } from '@/components/ui/copy-button';
import { CodeBlock } from '@/components/ui/code-block';
import { ConnectButton } from '@/components/connector/radix-ui/connect-button';
import { WalletDropdownContent } from '@/components/connector/radix-ui/wallet-dropdown-content';
import { ConnectButton as ConnectButtonBaseUI } from '@/components/connector/base-ui/connect-button';
import { WalletDropdownContent as WalletDropdownContentBaseUI } from '@/components/connector/base-ui/wallet-dropdown-content';
import { useConnector, type WalletConnectorId, type WalletConnectorMetadata } from '@solana/connector/react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Wallet, ExternalLink, Plug } from 'lucide-react';
import { BaseUILogo } from '@/components/icons/base-ui-logo';
import { RadixUILogo } from '@/components/icons/radix-ui-logo';
import { useState, useEffect } from 'react';
import { Spinner } from '@/components/ui/spinner';
import { IconTypescriptLogo } from 'symbols-react';

// Code snippets for each component
const connectButtonCode = `'use client';

import { useConnector } from '@solana/connector/react';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useState } from 'react';
import { motion } from 'motion/react';
import { WalletModal } from './wallet-modal';
import { WalletDropdownContent } from './wallet-dropdown-content';
import { Wallet, ChevronDown } from 'lucide-react';
import { Spinner } from '@/components/ui/spinner';

export function ConnectButton({ className }: { className?: string }) {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const { isConnected, isConnecting, account, connector, walletConnectUri, clearWalletConnectUri } = useConnector();

    if (isConnected && account && connector) {
        const shortAddress = \`\${account.slice(0, 4)}...\${account.slice(-4)}\`;
        const walletIcon = connector.icon || undefined;

        return (
            <DropdownMenu open={isDropdownOpen} onOpenChange={setIsDropdownOpen}>
                <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" className={className}>
                        <Avatar className="h-5 w-5">
                            {walletIcon && <AvatarImage src={walletIcon} alt={connector.name} />}
                            <AvatarFallback>
                                <Wallet className="h-3 w-3" />
                            </AvatarFallback>
                        </Avatar>
                        <span className="text-xs">{shortAddress}</span>
                        <motion.div animate={{ rotate: isDropdownOpen ? -180 : 0 }}>
                            <ChevronDown className="h-4 w-4 opacity-50" />
                        </motion.div>
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="p-0 rounded-[20px]">
                    <WalletDropdownContent
                        selectedAccount={String(account)}
                        walletIcon={walletIcon}
                        walletName={connector.name}
                    />
                </DropdownMenuContent>
            </DropdownMenu>
        );
    }

    return (
        <>
            <Button size="sm" onClick={() => setIsModalOpen(true)} className={className}>
                {isConnecting ? (
                    <>
                        <Spinner className="h-4 w-4" />
                        <span className="text-xs">Connecting...</span>
                    </>
                ) : (
                    'Connect Wallet'
                )}
            </Button>
            <WalletModal
                open={isModalOpen}
                onOpenChange={open => {
                    setIsModalOpen(open);
                    if (!open) clearWalletConnectUri();
                }}
                walletConnectUri={walletConnectUri}
                onClearWalletConnectUri={clearWalletConnectUri}
            />
        </>
    );
}`;

const walletModalCode = `'use client';

import { useConnector, type WalletConnectorId, type WalletConnectorMetadata } from '@solana/connector/react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Wallet, ExternalLink } from 'lucide-react';
import { useState, useEffect } from 'react';

export function WalletModal({ open, onOpenChange, walletConnectUri, onClearWalletConnectUri }) {
    const { walletStatus, isConnecting, connectorId, connectors, connectWallet, disconnectWallet } = useConnector();
    const status = walletStatus.status;
    const [connectingConnectorId, setConnectingConnectorId] = useState<WalletConnectorId | null>(null);
    const [recentlyConnectedConnectorId, setRecentlyConnectedConnectorId] = useState<WalletConnectorId | null>(null);

    useEffect(() => {
        const recent = localStorage.getItem('recentlyConnectedConnectorId');
        if (recent) setRecentlyConnectedConnectorId(recent as WalletConnectorId);
    }, []);

    useEffect(() => {
        if (status !== 'connected') return;
        if (!connectorId) return;
        localStorage.setItem('recentlyConnectedConnectorId', connectorId);
        setRecentlyConnectedConnectorId(connectorId);
    }, [status, connectorId]);

    function cancelConnection() {
        onClearWalletConnectUri?.();
        setConnectingConnectorId(null);
        disconnectWallet().catch(() => {});
    }

    const handleSelectWallet = async (connector: WalletConnectorMetadata) => {
        setConnectingConnectorId(connector.id);
        try {
            if (connector.name === 'WalletConnect') {
                onClearWalletConnectUri?.();
            }
            await connectWallet(connector.id);
            localStorage.setItem('recentlyConnectedConnectorId', connector.id);
            setRecentlyConnectedConnectorId(connector.id);
            if (connector.name !== 'WalletConnect') onOpenChange(false);
        } catch (error) {
            console.error('Failed to connect:', error);
        } finally {
            setConnectingConnectorId(null);
        }
    };

    const readyConnectors = connectors.filter(c => c.ready);
    const primaryWallets = readyConnectors.slice(0, 3);
    const otherWallets = readyConnectors.slice(3);

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md rounded-[24px]">
                <DialogHeader>
                    <DialogTitle>Connect your wallet</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                    {primaryWallets.map(connector => (
                        <Button
                            key={connector.id}
                            variant="outline"
                            className="w-full justify-between p-4 rounded-[16px]"
                            onClick={() => handleSelectWallet(connector)}
                            disabled={isConnecting}
                        >
                            <span>{connector.name}</span>
                            <Avatar className="h-10 w-10">
                                <AvatarImage src={connector.icon} />
                                <AvatarFallback>
                                    <Wallet />
                                </AvatarFallback>
                            </Avatar>
                        </Button>
                    ))}
                    {otherWallets.length > 0 && (
                        <Accordion type="single" collapsible>
                            <AccordionItem value="more">
                                <AccordionTrigger>Other Wallets</AccordionTrigger>
                                <AccordionContent>
                                    {otherWallets.map(connector => (
                                        <Button
                                            key={connector.id}
                                            variant="outline"
                                            className="w-full mb-2"
                                            onClick={() => handleSelectWallet(connector)}
                                        >
                                            {connector.name}
                                        </Button>
                                    ))}
                                </AccordionContent>
                            </AccordionItem>
                        </Accordion>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}`;

const walletDropdownCode = `'use client';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { BalanceElement, ClusterElement, TokenListElement, TransactionHistoryElement, DisconnectElement } from '@solana/connector/react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Wallet, Copy, Globe, Check, RefreshCw, Coins, History, ExternalLink, LogOut } from 'lucide-react';
import { useState } from 'react';

export function WalletDropdownContent({ selectedAccount, walletIcon, walletName }) {
    const [copied, setCopied] = useState(false);
    const shortAddress = \`\${selectedAccount.slice(0, 4)}...\${selectedAccount.slice(-4)}\`;

    const handleCopy = () => {
        navigator.clipboard.writeText(selectedAccount);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="w-[360px] p-4 space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <Avatar className="h-12 w-12">
                        <AvatarImage src={walletIcon} />
                        <AvatarFallback><Wallet /></AvatarFallback>
                    </Avatar>
                    <div>
                        <div className="font-semibold">{shortAddress}</div>
                        <div className="text-xs text-muted-foreground">{walletName}</div>
                    </div>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" size="icon" onClick={handleCopy}>
                        {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    </Button>
                    <ClusterElement
                        render={({ cluster, clusters, setCluster }) => (
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="outline" size="icon"><Globe /></Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent>
                                    {clusters.map(c => (
                                        <DropdownMenuItem key={c.id} onClick={() => setCluster(c.id)}>
                                            {c.label}
                                        </DropdownMenuItem>
                                    ))}
                                </DropdownMenuContent>
                            </DropdownMenu>
                        )}
                    />
                </div>
            </div>

            {/* Balance */}
            <BalanceElement
                render={({ solBalance, isLoading, refetch }) => (
                    <div className="rounded-[12px] border p-4">
                        <div className="flex justify-between">
                            <span>Balance</span>
                            <button onClick={() => refetch()}><RefreshCw className={isLoading ? 'animate-spin' : ''} /></button>
                        </div>
                        <div className="text-2xl font-bold">{solBalance?.toFixed(4)} SOL</div>
                    </div>
                )}
            />

            {/* Tokens & Transactions */}
            <Accordion type="multiple">
                <AccordionItem value="tokens">
                    <AccordionTrigger><Coins /> Tokens</AccordionTrigger>
                    <AccordionContent>
                        <TokenListElement limit={5} render={({ tokens }) => (
                            tokens.map(t => <div key={t.mint}>{t.symbol}: {t.formatted}</div>)
                        )} />
                    </AccordionContent>
                </AccordionItem>
                <AccordionItem value="transactions">
                    <AccordionTrigger><History /> Activity</AccordionTrigger>
                    <AccordionContent>
                        <TransactionHistoryElement limit={5} render={({ transactions }) => (
                            transactions.map(tx => <a key={tx.signature} href={tx.explorerUrl}>{tx.type}</a>)
                        )} />
                    </AccordionContent>
                </AccordionItem>
            </Accordion>

            {/* Disconnect */}
            <DisconnectElement
                render={({ disconnect, disconnecting }) => (
                    <Button variant="destructive" className="w-full" onClick={disconnect} disabled={disconnecting}>
                        <LogOut /> {disconnecting ? 'Disconnecting...' : 'Disconnect'}
                    </Button>
                )}
            />
        </div>
    );
}`;

// Base UI Code Snippets
const connectButtonCodeBaseUI = `'use client';

import { useConnector } from '@solana/connector/react';
import { Menu } from '@base-ui/react/menu';
import { useState } from 'react';
import { motion } from 'motion/react';
import { WalletModalBaseUI } from './wallet-modal-baseui';
import { WalletDropdownContentBaseUI } from './wallet-dropdown-content-baseui';
import { Wallet, ChevronDown } from 'lucide-react';

// Custom Avatar component for Base UI
function Avatar({ src, alt, fallback, className }) {
    const [hasError, setHasError] = useState(false);
    return (
        <div className={\`relative flex shrink-0 overflow-hidden rounded-full \${className}\`}>
            {src && !hasError ? (
                <img src={src} alt={alt} className="aspect-square h-full w-full object-cover" onError={() => setHasError(true)} />
            ) : (
                <div className="flex h-full w-full items-center justify-center bg-muted">{fallback}</div>
            )}
        </div>
    );
}

export function ConnectButtonBaseUI({ className }) {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const { isConnected, isConnecting, account, connector } = useConnector();

    if (isConnecting) {
        return (
            <button disabled className="inline-flex items-center gap-2 h-8 px-3 rounded-md border bg-background opacity-50">
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                <span className="text-xs">Connecting...</span>
            </button>
        );
    }

    if (isConnected && account && connector) {
        const shortAddress = \`\${account.slice(0, 4)}...\${account.slice(-4)}\`;
        const walletIcon = connector.icon || undefined;

        return (
            <Menu.Root>
                <Menu.Trigger className="inline-flex items-center gap-2 h-8 px-3 rounded-md border bg-background hover:bg-accent">
                    <Avatar
                        src={walletIcon}
                        alt={connector.name}
                        fallback={<Wallet className="h-3 w-3" />}
                        className="h-5 w-5"
                    />
                    <span className="text-xs">{shortAddress}</span>
                    <ChevronDown className="h-4 w-4 opacity-50" />
                </Menu.Trigger>
                <Menu.Portal>
                    <Menu.Positioner sideOffset={8} align="end">
                        <Menu.Popup className="rounded-[20px] bg-background p-0 shadow-lg outline outline-1 outline-gray-200">
                            <WalletDropdownContentBaseUI
                                selectedAccount={String(account)}
                                walletIcon={walletIcon}
                                walletName={connector.name}
                            />
                        </Menu.Popup>
                    </Menu.Positioner>
                </Menu.Portal>
            </Menu.Root>
        );
    }

    return (
        <>
            <button onClick={() => setIsModalOpen(true)} className="inline-flex items-center h-8 px-3 rounded-md border bg-background hover:bg-accent">
                Connect Wallet
            </button>
            <WalletModalBaseUI open={isModalOpen} onOpenChange={setIsModalOpen} />
        </>
    );
}`;

const walletModalCodeBaseUI = `'use client';

import { useConnector, type WalletConnectorId, type WalletConnectorMetadata } from '@solana/connector/react';
import { Dialog } from '@base-ui/react/dialog';
import { Collapsible } from '@base-ui/react/collapsible';
import { Wallet, ExternalLink, ChevronDown, X } from 'lucide-react';
import { useState, useEffect } from 'react';

export function WalletModalBaseUI({ open, onOpenChange }) {
    const { walletStatus, isConnecting, connectorId, connectors, connectWallet, disconnectWallet } = useConnector();
    const status = walletStatus.status;
    const [connectingConnectorId, setConnectingConnectorId] = useState<WalletConnectorId | null>(null);
    const [isOtherWalletsOpen, setIsOtherWalletsOpen] = useState(false);
    const [recentlyConnectedConnectorId, setRecentlyConnectedConnectorId] = useState<WalletConnectorId | null>(null);

    useEffect(() => {
        const recent = localStorage.getItem('recentlyConnectedConnectorId');
        if (recent) setRecentlyConnectedConnectorId(recent as WalletConnectorId);
    }, []);

    useEffect(() => {
        if (status !== 'connected') return;
        if (!connectorId) return;
        localStorage.setItem('recentlyConnectedConnectorId', connectorId);
        setRecentlyConnectedConnectorId(connectorId);
    }, [status, connectorId]);

    const handleSelectWallet = async (connector: WalletConnectorMetadata) => {
        setConnectingConnectorId(connector.id);
        try {
            await connectWallet(connector.id);
            localStorage.setItem('recentlyConnectedConnectorId', connector.id);
            setRecentlyConnectedConnectorId(connector.id);
            onOpenChange(false);
        } catch (error) {
            console.error('Failed to connect:', error);
        } finally {
            setConnectingConnectorId(null);
        }
    };

    const readyConnectors = connectors.filter(c => c.ready);
    const primaryWallets = readyConnectors.slice(0, 3);
    const otherWallets = readyConnectors.slice(3);

    return (
        <Dialog.Root open={open} onOpenChange={onOpenChange}>
            <Dialog.Portal>
                <Dialog.Backdrop className="fixed inset-0 bg-black/80 transition-opacity" />
                <Dialog.Popup className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md rounded-[24px] bg-background p-6 shadow-lg">
                    <div className="flex items-center justify-between mb-4">
                        <Dialog.Title className="text-lg font-semibold">Connect your wallet</Dialog.Title>
                        <Dialog.Close className="rounded-[16px] h-8 w-8 p-2 border hover:bg-accent cursor-pointer">
                            <X className="h-3 w-3" />
                        </Dialog.Close>
                    </div>
                    <div className="space-y-4">
                        {primaryWallets.map(connector => (
                            <button
                                key={connector.id}
                                className="w-full flex justify-between items-center p-4 rounded-[16px] border hover:bg-accent"
                                onClick={() => handleSelectWallet(connector)}
                                disabled={isConnecting}
                            >
                                <span className="font-semibold">{connector.name}</span>
                                <img src={connector.icon} className="h-10 w-10 rounded-full" />
                            </button>
                        ))}
                        {otherWallets.length > 0 && (
                            <Collapsible.Root open={isOtherWalletsOpen} onOpenChange={setIsOtherWalletsOpen}>
                                <Collapsible.Trigger className="w-full flex justify-between items-center px-4 py-3 rounded-[16px] border cursor-pointer">
                                    <span>Other Wallets</span>
                                    <ChevronDown className={\`h-4 w-4 transition-transform \${isOtherWalletsOpen ? 'rotate-180' : ''}\`} />
                                </Collapsible.Trigger>
                                <Collapsible.Panel className="overflow-hidden">
                                    <div className="grid gap-2 pt-2">
                                        {otherWallets.map(connector => (
                                            <button
                                                key={connector.id}
                                                className="w-full flex justify-between items-center p-4 rounded-[16px] border"
                                                onClick={() => handleSelectWallet(connector)}
                                            >
                                                <span>{connector.name}</span>
                                                <img src={connector.icon} className="h-8 w-8 rounded-full" />
                                            </button>
                                        ))}
                                    </div>
                                </Collapsible.Panel>
                            </Collapsible.Root>
                        )}
                    </div>
                </Dialog.Popup>
            </Dialog.Portal>
        </Dialog.Root>
    );
}`;

const walletDropdownCodeBaseUI = `'use client';

import { Collapsible } from '@base-ui/react/collapsible';
import { BalanceElement, ClusterElement, TokenListElement, TransactionHistoryElement, DisconnectElement } from '@solana/connector/react';
import { Wallet, Copy, Globe, ChevronDown, Check, RefreshCw, Coins, History, LogOut } from 'lucide-react';
import { useState } from 'react';

export function WalletDropdownContentBaseUI({ selectedAccount, walletIcon, walletName }) {
    const [copied, setCopied] = useState(false);
    const [isTokensOpen, setIsTokensOpen] = useState(false);
    const [isTransactionsOpen, setIsTransactionsOpen] = useState(false);
    const shortAddress = \`\${selectedAccount.slice(0, 4)}...\${selectedAccount.slice(-4)}\`;

    const handleCopy = () => {
        navigator.clipboard.writeText(selectedAccount);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="w-[360px] p-4 space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <img src={walletIcon} className="h-12 w-12 rounded-full" />
                    <div>
                        <div className="font-semibold text-lg">{shortAddress}</div>
                        <div className="text-xs text-muted-foreground">{walletName}</div>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <button onClick={handleCopy} className="h-9 w-9 rounded-full border flex items-center justify-center hover:bg-accent">
                        {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                    </button>
                    <ClusterElement
                        render={({ cluster }) => (
                            <button className="h-9 w-9 rounded-full border flex items-center justify-center hover:bg-accent relative">
                                <Globe className="h-4 w-4" />
                                <span className="absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full bg-green-500 border-2 border-background" />
                            </button>
                        )}
                    />
                </div>
            </div>

            {/* Balance */}
            <BalanceElement
                render={({ solBalance, isLoading, refetch }) => (
                    <div className="rounded-[12px] border bg-muted/50 p-4">
                        <div className="flex items-center justify-between mb-1">
                            <span className="text-sm text-muted-foreground">Balance</span>
                            <button onClick={() => refetch()} className="p-1 hover:bg-accent rounded">
                                <RefreshCw className={\`h-3.5 w-3.5 \${isLoading ? 'animate-spin' : ''}\`} />
                            </button>
                        </div>
                        <div className="text-2xl font-bold">{solBalance?.toFixed(4)} SOL</div>
                    </div>
                )}
            />

            {/* Tokens - Base UI Collapsible */}
            <Collapsible.Root open={isTokensOpen} onOpenChange={setIsTokensOpen} className="border rounded-[12px] px-3">
                <Collapsible.Trigger className="w-full flex items-center justify-between py-3 cursor-pointer">
                    <div className="flex items-center gap-2">
                        <Coins className="h-4 w-4" />
                        <span className="font-medium">Tokens</span>
                    </div>
                    <ChevronDown className={\`h-4 w-4 transition-transform \${isTokensOpen ? 'rotate-180' : ''}\`} />
                </Collapsible.Trigger>
                <Collapsible.Panel className="overflow-hidden">
                    <TokenListElement limit={5} render={({ tokens }) => (
                        <div className="space-y-2 pb-2">
                            {tokens.map(token => (
                                <div key={token.mint} className="flex items-center gap-3 py-1">
                                    <img src={token.logo} className="h-8 w-8 rounded-full" />
                                    <div className="flex-1">
                                        <p className="font-medium text-sm">{token.symbol}</p>
                                        <p className="text-xs text-muted-foreground">{token.name}</p>
                                    </div>
                                    <p className="font-mono text-sm">{token.formatted}</p>
                                </div>
                            ))}
                        </div>
                    )} />
                </Collapsible.Panel>
            </Collapsible.Root>

            {/* Transactions - Base UI Collapsible */}
            <Collapsible.Root open={isTransactionsOpen} onOpenChange={setIsTransactionsOpen} className="border rounded-[12px] px-3">
                <Collapsible.Trigger className="w-full flex items-center justify-between py-3 cursor-pointer">
                    <div className="flex items-center gap-2">
                        <History className="h-4 w-4" />
                        <span className="font-medium">Recent Activity</span>
                    </div>
                    <ChevronDown className={\`h-4 w-4 transition-transform \${isTransactionsOpen ? 'rotate-180' : ''}\`} />
                </Collapsible.Trigger>
                <Collapsible.Panel className="overflow-hidden">
                    <TransactionHistoryElement limit={5} render={({ transactions }) => (
                        <div className="space-y-2 pb-2">
                            {transactions.map(tx => (
                                <a key={tx.signature} href={tx.explorerUrl} target="_blank" className="flex items-center gap-3 py-1 hover:bg-muted/50 rounded-lg px-1 -mx-1">
                                    <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center">
                                        <History className="h-4 w-4" />
                                    </div>
                                    <div className="flex-1">
                                        <p className="font-medium text-sm">{tx.type}</p>
                                        <p className="text-xs text-muted-foreground">{tx.formattedTime}</p>
                                    </div>
                                </a>
                            ))}
                        </div>
                    )} />
                </Collapsible.Panel>
            </Collapsible.Root>

            {/* Disconnect */}
            <DisconnectElement
                render={({ disconnect, disconnecting }) => (
                    <button onClick={disconnect} disabled={disconnecting} className="w-full h-11 rounded-[12px] bg-destructive text-destructive-foreground hover:bg-destructive/90 flex items-center justify-center gap-2">
                        <LogOut className="h-4 w-4" />
                        {disconnecting ? 'Disconnecting...' : 'Disconnect'}
                    </button>
                )}
            />
        </div>
    );
}`;

// Inline WalletModalContent component (without Dialog wrapper)
function WalletModalContent() {
    const { walletStatus, isConnecting, connectorId, connectors, connectWallet } = useConnector();
    const status = walletStatus.status;

    const [connectingConnectorId, setConnectingConnectorId] = useState<WalletConnectorId | null>(null);
    const [isClient, setIsClient] = useState(false);
    const [recentlyConnectedConnectorId, setRecentlyConnectedConnectorId] = useState<WalletConnectorId | null>(null);

    useEffect(() => {
        setIsClient(true);
    }, []);

    useEffect(() => {
        const recent = localStorage.getItem('recentlyConnectedConnectorId');
        if (recent) setRecentlyConnectedConnectorId(recent as WalletConnectorId);
    }, []);

    useEffect(() => {
        if (status !== 'connected') return;
        if (!connectorId) return;
        localStorage.setItem('recentlyConnectedConnectorId', connectorId);
        setRecentlyConnectedConnectorId(connectorId);
    }, [status, connectorId]);

    const handleSelectWallet = async (connector: WalletConnectorMetadata) => {
        setConnectingConnectorId(connector.id);
        try {
            await connectWallet(connector.id);
        } catch (error) {
            console.error('Failed to connect:', error);
        } finally {
            setConnectingConnectorId(null);
        }
    };

    const readyConnectors = connectors.filter(c => c.ready);
    const notReadyConnectors = connectors.filter(c => !c.ready);

    const sortedReadyConnectors = [...readyConnectors].sort((a, b) => {
        if (recentlyConnectedConnectorId === a.id) return -1;
        if (recentlyConnectedConnectorId === b.id) return 1;
        return 0;
    });
    const primaryWallets = sortedReadyConnectors.slice(0, 3);
    const otherWallets = sortedReadyConnectors.slice(3);

    const getInstallUrl = (walletName: string) => {
        const name = walletName.toLowerCase();
        if (name.includes('phantom')) return 'https://phantom.app';
        if (name.includes('solflare')) return 'https://solflare.com';
        if (name.includes('backpack')) return 'https://backpack.app';
        return 'https://phantom.app';
    };

    return (
        <div className="w-full max-w-md mx-auto p-6 rounded-[24px] border bg-card shadow-lg">
            <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold">Connect your wallet</h2>
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
                            <div className="grid gap-2">
                                {primaryWallets.map(connector => {
                                    const isThisConnecting =
                                        connectingConnectorId === connector.id ||
                                        (isConnecting && connectorId === connector.id);
                                    const isRecent = recentlyConnectedConnectorId === connector.id;
                                    return (
                                        <Button
                                            key={connector.id}
                                            variant="outline"
                                            className="h-auto justify-between p-4 rounded-[16px]"
                                            onClick={() => handleSelectWallet(connector)}
                                            disabled={isThisConnecting}
                                        >
                                            <div className="flex items-center gap-2">
                                                <span className="font-semibold">{connector.name}</span>
                                                {isRecent && (
                                                    <Badge variant="secondary" className="text-xs">
                                                        Recent
                                                    </Badge>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-2">
                                                {isThisConnecting && <Spinner className="h-4 w-4" />}
                                                <Avatar className="h-10 w-10">
                                                    {connector.icon && <AvatarImage src={connector.icon} />}
                                                    <AvatarFallback>
                                                        <Wallet className="h-5 w-5" />
                                                    </AvatarFallback>
                                                </Avatar>
                                            </div>
                                        </Button>
                                    );
                                })}
                            </div>
                        )}

                        {otherWallets.length > 0 && (
                            <>
                                <Separator />
                                <Accordion type="single" collapsible className="w-full">
                                    <AccordionItem value="other" className="border-none">
                                        <AccordionTrigger className="border rounded-[16px] px-4 py-2 hover:no-underline">
                                            Other Wallets
                                        </AccordionTrigger>
                                        <AccordionContent>
                                            <div className="grid gap-2 pt-2">
                                                {otherWallets.map(connector => (
                                                    <Button
                                                        key={connector.id}
                                                        variant="outline"
                                                        className="h-auto justify-between p-4 rounded-[16px]"
                                                        onClick={() => handleSelectWallet(connector)}
                                                    >
                                                        <span>{connector.name}</span>
                                                        <Avatar className="h-8 w-8">
                                                            {connector.icon && <AvatarImage src={connector.icon} />}
                                                            <AvatarFallback>
                                                                <Wallet className="h-4 w-4" />
                                                            </AvatarFallback>
                                                        </Avatar>
                                                    </Button>
                                                ))}
                                            </div>
                                        </AccordionContent>
                                    </AccordionItem>
                                </Accordion>
                            </>
                        )}

                        {notReadyConnectors.length > 0 && (
                            <>
                                <Separator />
                                <div className="space-y-2">
                                    <h3 className="text-sm font-medium text-muted-foreground">Unavailable Wallets</h3>
                                    <div className="grid gap-2">
                                        {notReadyConnectors.slice(0, 3).map(connector => (
                                            <Button
                                                key={connector.id}
                                                variant="outline"
                                                className="h-auto justify-between p-4 rounded-[16px]"
                                                onClick={() => window.open(getInstallUrl(connector.name), '_blank')}
                                            >
                                                <div className="flex items-center gap-3">
                                                    <Avatar className="h-8 w-8">
                                                        {connector.icon && <AvatarImage src={connector.icon} />}
                                                        <AvatarFallback>
                                                            <Wallet className="h-4 w-4" />
                                                        </AvatarFallback>
                                                    </Avatar>
                                                    <div className="text-left">
                                                        <div className="font-medium text-sm">{connector.name}</div>
                                                        <div className="text-xs text-muted-foreground">
                                                            Not available
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

                        {connectors.length === 0 && (
                            <div className="rounded-lg border border-dashed p-8 text-center">
                                <Wallet className="mx-auto h-12 w-12 text-muted-foreground mb-3" />
                                <h3 className="font-semibold mb-2">No Wallets Detected</h3>
                                <p className="text-sm text-muted-foreground mb-4">
                                    Install a Solana wallet to get started
                                </p>
                                <Button onClick={() => window.open('https://phantom.app', '_blank')}>
                                    Get Phantom
                                </Button>
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}

// Inline WalletModalContent for Base UI (without Dialog wrapper)
function WalletModalContentBaseUI() {
    const { walletStatus, isConnecting, connectorId, connectors, connectWallet } = useConnector();
    const status = walletStatus.status;

    const [connectingConnectorId, setConnectingConnectorId] = useState<WalletConnectorId | null>(null);
    const [isClient, setIsClient] = useState(false);
    const [recentlyConnectedConnectorId, setRecentlyConnectedConnectorId] = useState<WalletConnectorId | null>(null);
    const [isOtherWalletsOpen, setIsOtherWalletsOpen] = useState(false);

    useEffect(() => {
        setIsClient(true);
    }, []);

    useEffect(() => {
        const recent = localStorage.getItem('recentlyConnectedConnectorId');
        if (recent) setRecentlyConnectedConnectorId(recent as WalletConnectorId);
    }, []);

    useEffect(() => {
        if (status !== 'connected') return;
        if (!connectorId) return;
        localStorage.setItem('recentlyConnectedConnectorId', connectorId);
        setRecentlyConnectedConnectorId(connectorId);
    }, [status, connectorId]);

    const handleSelectWallet = async (connector: WalletConnectorMetadata) => {
        setConnectingConnectorId(connector.id);
        try {
            await connectWallet(connector.id);
        } catch (error) {
            console.error('Failed to connect:', error);
        } finally {
            setConnectingConnectorId(null);
        }
    };

    const readyConnectors = connectors.filter(c => c.ready);
    const notReadyConnectors = connectors.filter(c => !c.ready);

    const sortedReadyConnectors = [...readyConnectors].sort((a, b) => {
        if (recentlyConnectedConnectorId === a.id) return -1;
        if (recentlyConnectedConnectorId === b.id) return 1;
        return 0;
    });
    const primaryWallets = sortedReadyConnectors.slice(0, 3);
    const otherWallets = sortedReadyConnectors.slice(3);

    const getInstallUrl = (walletName: string) => {
        const name = walletName.toLowerCase();
        if (name.includes('phantom')) return 'https://phantom.app';
        if (name.includes('solflare')) return 'https://solflare.com';
        if (name.includes('backpack')) return 'https://backpack.app';
        return 'https://phantom.app';
    };

    // Custom Avatar for Base UI
    const BaseUIAvatar = ({
        src,
        alt,
        fallback,
        className,
    }: {
        src?: string;
        alt?: string;
        fallback?: React.ReactNode;
        className?: string;
    }) => {
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
    };

    // Custom Button for Base UI
    const BaseUIButton = ({
        children,
        variant = 'outline',
        disabled,
        className,
        onClick,
    }: {
        children: React.ReactNode;
        variant?: 'default' | 'outline';
        disabled?: boolean;
        className?: string;
        onClick?: () => void;
    }) => (
        <button
            className={`inline-flex items-center gap-2 whitespace-nowrap text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 ${
                variant === 'outline'
                    ? 'border border-input bg-background shadow-xs hover:bg-accent hover:text-accent-foreground'
                    : 'bg-primary text-primary-foreground shadow hover:bg-primary/90'
            } ${className || ''}`}
            disabled={disabled}
            onClick={onClick}
        >
            {children}
        </button>
    );

    return (
        <div className="w-full max-w-md mx-auto p-6 rounded-[24px] border bg-card shadow-lg">
            <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold">Connect your wallet</h2>
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
                            <div className="grid gap-2">
                                {primaryWallets.map(connector => {
                                    const isThisConnecting =
                                        connectingConnectorId === connector.id ||
                                        (isConnecting && connectorId === connector.id);
                                    const isRecent = recentlyConnectedConnectorId === connector.id;
                                    return (
                                        <BaseUIButton
                                            key={connector.id}
                                            variant="outline"
                                            className="h-auto justify-between p-4 rounded-[16px] w-full"
                                            onClick={() => handleSelectWallet(connector)}
                                            disabled={isThisConnecting}
                                        >
                                            <div className="flex items-center gap-2">
                                                <span className="font-semibold">{connector.name}</span>
                                                {isRecent && (
                                                    <span className="inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-semibold bg-secondary text-secondary-foreground">
                                                        Recent
                                                    </span>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-2">
                                                {isThisConnecting && <Spinner className="h-4 w-4" />}
                                                <BaseUIAvatar
                                                    src={connector.icon}
                                                    alt={connector.name}
                                                    fallback={<Wallet className="h-5 w-5" />}
                                                    className="h-10 w-10"
                                                />
                                            </div>
                                        </BaseUIButton>
                                    );
                                })}
                            </div>
                        )}

                        {otherWallets.length > 0 && (
                            <>
                                <div className="shrink-0 bg-border h-[1px] w-full" />
                                <div className="w-full">
                                    <button
                                        onClick={() => setIsOtherWalletsOpen(!isOtherWalletsOpen)}
                                        className="w-full flex items-center justify-between border bg-background shadow-xs hover:bg-accent hover:text-accent-foreground dark:bg-input/30 dark:border-input dark:hover:bg-input/50 rounded-[16px] px-4 py-2 cursor-pointer"
                                    >
                                        <span>Other Wallets</span>
                                        <svg
                                            className={`h-4 w-4 shrink-0 transition-transform duration-200 ${isOtherWalletsOpen ? 'rotate-180' : ''}`}
                                            fill="none"
                                            stroke="currentColor"
                                            viewBox="0 0 24 24"
                                        >
                                            <path
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                                strokeWidth={2}
                                                d="M19 9l-7 7-7-7"
                                            />
                                        </svg>
                                    </button>
                                    {isOtherWalletsOpen && (
                                        <div className="grid gap-2 pt-2">
                                            {otherWallets.map(connector => (
                                                <BaseUIButton
                                                    key={connector.id}
                                                    variant="outline"
                                                    className="h-auto justify-between p-4 rounded-[16px] w-full"
                                                    onClick={() => handleSelectWallet(connector)}
                                                >
                                                    <span>{connector.name}</span>
                                                    <BaseUIAvatar
                                                        src={connector.icon}
                                                        alt={connector.name}
                                                        fallback={<Wallet className="h-4 w-4" />}
                                                        className="h-8 w-8"
                                                    />
                                                </BaseUIButton>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </>
                        )}

                        {notReadyConnectors.length > 0 && (
                            <>
                                <div className="shrink-0 bg-border h-[1px] w-full" />
                                <div className="space-y-2">
                                    <h3 className="text-sm font-medium text-muted-foreground">Unavailable Wallets</h3>
                                    <div className="grid gap-2">
                                        {notReadyConnectors.slice(0, 3).map(connector => (
                                            <BaseUIButton
                                                key={connector.id}
                                                variant="outline"
                                                className="h-auto justify-between p-4 rounded-[16px] w-full"
                                                onClick={() => window.open(getInstallUrl(connector.name), '_blank')}
                                            >
                                                <div className="flex items-center gap-3">
                                                    <BaseUIAvatar
                                                        src={connector.icon}
                                                        alt={connector.name}
                                                        fallback={<Wallet className="h-4 w-4" />}
                                                        className="h-8 w-8"
                                                    />
                                                    <div className="text-left">
                                                        <div className="font-medium text-sm">{connector.name}</div>
                                                        <div className="text-xs text-muted-foreground">
                                                            Not available
                                                        </div>
                                                    </div>
                                                </div>
                                                <ExternalLink className="h-4 w-4 text-muted-foreground" />
                                            </BaseUIButton>
                                        ))}
                                    </div>
                                </div>
                            </>
                        )}

                        {connectors.length === 0 && (
                            <div className="rounded-lg border border-dashed p-8 text-center">
                                <Wallet className="mx-auto h-12 w-12 text-muted-foreground mb-3" />
                                <h3 className="font-semibold mb-2">No Wallets Detected</h3>
                                <p className="text-sm text-muted-foreground mb-4">
                                    Install a Solana wallet to get started
                                </p>
                                <button
                                    onClick={() => window.open('https://phantom.app', '_blank')}
                                    className="inline-flex items-center justify-center px-4 py-2 rounded-md bg-primary text-primary-foreground shadow hover:bg-primary/90"
                                >
                                    Get Phantom
                                </button>
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}

// Component section helper with Radix UI and Base UI tabs
function ComponentSection({
    title,
    description,
    code,
    codeBaseUI,
    fileName,
    fileNameBaseUI,
    children,
    childrenBaseUI,
}: {
    title: string;
    description: string;
    badge: string;
    badgeColor: string;
    code: string;
    codeBaseUI: string;
    fileName: string;
    fileNameBaseUI: string;
    children: React.ReactNode;
    childrenBaseUI: React.ReactNode;
}) {
    const [framework, setFramework] = useState<'radix' | 'baseui'>('radix');

    return (
        <section className="py-12 border-b border-sand-200">
            <div className="grid grid-cols-12 gap-6 lg:gap-8">
                <div className="col-span-12 lg:col-span-4 flex flex-col justify-start px-4 lg:px-6">
                    <h3 className="text-title-5 font-diatype-medium text-sand-1500 mb-2">{title}</h3>
                    <p className="text-body-md font-inter text-sand-700">{description}</p>
                </div>

                <div className="col-span-12 lg:col-span-8 px-4 lg:px-6">
                    <Tabs defaultValue="preview" className="w-full">
                        <div className="flex items-center justify-between mb-4">
                            {/* Framework Toggle */}
                            <div className="inline-flex items-center rounded-lg border bg-sand-100 p-1">
                                <button
                                    onClick={() => setFramework('radix')}
                                    className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                                        framework === 'radix'
                                            ? 'bg-background text-foreground shadow-sm'
                                            : 'text-muted-foreground hover:text-foreground'
                                    }`}
                                >
                                    Radix UI
                                </button>
                                <button
                                    onClick={() => setFramework('baseui')}
                                    className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                                        framework === 'baseui'
                                            ? 'bg-background text-foreground shadow-sm'
                                            : 'text-muted-foreground hover:text-foreground'
                                    }`}
                                >
                                    Base UI
                                </button>
                            </div>
                            <TabsList>
                                <TabsTrigger className="text-xs" value="preview">
                                    Preview
                                </TabsTrigger>
                                <TabsTrigger className="text-xs" value="code">
                                    Code
                                </TabsTrigger>
                            </TabsList>
                        </div>

                        <TabsContent value="preview">
                            <Card
                                className="border-sand-300 bg-sand-100/30 rounded-xl"
                                style={{
                                    backgroundImage: `repeating-linear-gradient(
                                        45deg,
                                        transparent,
                                        transparent 10px,
                                        rgba(233, 231, 222, 0.5) 10px,
                                        rgba(233, 231, 222, 0.5) 11px
                                    )`,
                                }}
                            >
                                <CardContent className="p-6 flex items-center justify-center min-h-[300px]">
                                    {framework === 'radix' ? children : childrenBaseUI}
                                </CardContent>
                            </Card>
                        </TabsContent>

                        <TabsContent value="code">
                            <Card className="border-sand-300 bg-[#fafafa] rounded-xl overflow-hidden pt-2">
                                <CardContent className="p-0">
                                    <div className="flex items-center justify-between px-4 py-2 pt-0 border-b border-sand-200">
                                        <div className="flex items-center gap-2">
                                            <IconTypescriptLogo className="h-4 w-4 fill-sand-400" />
                                            <span className="text-xs text-sand-1200 font-inter">
                                                {framework === 'radix' ? fileName : fileNameBaseUI}
                                            </span>
                                        </div>
                                        <CopyButton
                                            textToCopy={framework === 'radix' ? code : codeBaseUI}
                                            showText={false}
                                            className="w-8 h-8 flex items-center"
                                            iconClassName="text-sand-500 group-hover:text-sand-700 h-4 w-4 translate-y-[-1px] translate-x-[-8px]"
                                            iconClassNameCheck="text-green-600 h-4 w-4"
                                        />
                                    </div>
                                    <div className="max-h-[400px] overflow-y-auto">
                                        <CodeBlock
                                            code={framework === 'radix' ? code : codeBaseUI}
                                            language="tsx"
                                            style={oneLight}
                                            customStyle={{
                                                margin: 0,
                                                padding: '1rem',
                                                background: 'transparent',
                                                fontSize: '0.75rem',
                                                lineHeight: '1.5',
                                            }}
                                            showLineNumbers
                                            lineNumberStyle={{
                                                minWidth: '2.5em',
                                                paddingRight: '1em',
                                                color: '#9ca3af',
                                                userSelect: 'none',
                                            }}
                                        />
                                    </div>
                                </CardContent>
                            </Card>
                        </TabsContent>
                    </Tabs>
                </div>
            </div>
        </section>
    );
}

export function FeaturedSection() {
    const { isConnected, account, connector } = useConnector();

    const selectedAccount = account ? String(account) : null;
    const walletIcon = connector?.icon || undefined;
    const walletName = connector?.name || '';

    return (
        <div>
            {/* Section Header */}
            <div
                className="px-4 lg:px-6 py-8 border-b border-sand-200"
                style={{
                    backgroundImage: `repeating-linear-gradient(
                    45deg,
                    transparent,
                    transparent 10px,
                    rgba(233, 231, 222, 0.5) 10px,
                    rgba(233, 231, 222, 0.5) 11px
                )`,
                }}
            >
                <div className="inline-flex items-center gap-2 mb-3">
                    <span className="px-2 py-0.5 bg-indigo-200 text-indigo-900 text-xs font-inter-medium rounded">
                        Pre-built
                    </span>
                </div>
                <h2 className="text-h3 font-diatype-medium text-sand-1500 mb-2">Complete Component Examples</h2>
                <p className="text-body-lg font-inter text-sand-900 max-w-md">
                    Complete components built with ConnectorKit&apos;s Elements based on Radix UI and Base UI.
                </p>

                {/* Supported UI Frameworks */}
                <div className="mt-6">
                    <p className="text-xs font-diatype-medium font-medium text-sand-700 mb-3">
                        Supported UI Frameworks
                    </p>
                    <div className="flex items-center gap-4">
                        {/* Base UI */}
                        <div className="flex items-center gap-2">
                            <BaseUILogo size={12} className="text-sand-800" />
                            <span className="text-sm font-medium font-diatype-medium text-sand-900">Base UI</span>
                        </div>
                        <div className="h-[15px] w-px bg-sand-400" />
                        {/* Radix UI */}
                        <div className="flex items-center gap-2">
                            <RadixUILogo size={11} className="text-sand-900" />
                            <span className="text-sm font-medium font-diatype-medium text-sand-900">Radix UI</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* ConnectButton */}
            <ComponentSection
                title="ConnectButton"
                description="The main entry point. Shows connect button when disconnected, wallet dropdown when connected. Orchestrates the modal and dropdown."
                badge="Entry Point"
                badgeColor="bg-green-100 text-green-700"
                code={connectButtonCode}
                codeBaseUI={connectButtonCodeBaseUI}
                fileName="connect-button.tsx"
                fileNameBaseUI="connect-button-baseui.tsx"
                childrenBaseUI={<ConnectButtonBaseUI />}
            >
                <ConnectButton />
            </ComponentSection>

            {/* WalletModal */}
            <ComponentSection
                title="WalletModal"
                description="Wallet selection modal with installed wallets prioritized, recent wallet badge, expandable 'Other Wallets' section, and install links for popular wallets."
                badge="Connection"
                badgeColor="bg-blue-100 text-blue-700"
                code={walletModalCode}
                codeBaseUI={walletModalCodeBaseUI}
                fileName="wallet-modal.tsx"
                fileNameBaseUI="wallet-modal-baseui.tsx"
                childrenBaseUI={<WalletModalContentBaseUI />}
            >
                <WalletModalContent />
            </ComponentSection>

            {/* WalletDropdownContent */}
            <ComponentSection
                title="WalletDropdownContent"
                description="Account dropdown with address, balance, network selector, tokens list, transaction history, and disconnect button. Uses block components with render props."
                badge="Account"
                badgeColor="bg-purple-100 text-purple-700"
                code={walletDropdownCode}
                codeBaseUI={walletDropdownCodeBaseUI}
                fileName="wallet-dropdown-content.tsx"
                fileNameBaseUI="wallet-dropdown-content-baseui.tsx"
                childrenBaseUI={
                    isConnected && selectedAccount && connector ? (
                        <div className="rounded-[20px] border shadow-lg bg-card">
                            <WalletDropdownContentBaseUI
                                selectedAccount={selectedAccount}
                                walletIcon={walletIcon}
                                walletName={walletName}
                            />
                        </div>
                    ) : (
                        <div className="flex items-center justify-center gap-2 text-center text-sand-600 text-body-md font-inter p-2 border-sand-300 border rounded-lg border-dashed bg-bg1">
                            <Plug className="h-4 w-4 rotate-45" />
                            Connect wallet to preview
                        </div>
                    )
                }
            >
                {isConnected && selectedAccount && connector ? (
                    <div className="rounded-[20px] border shadow-lg bg-card">
                        <WalletDropdownContent
                            selectedAccount={selectedAccount}
                            walletIcon={walletIcon}
                            walletName={walletName}
                        />
                    </div>
                ) : (
                    <div className="flex items-center justify-center gap-2 text-center text-sand-600 text-body-md font-inter p-2 border-sand-300 border rounded-lg border-dashed bg-bg1">
                        <Plug className="h-4 w-4 rotate-45" />
                        Connect wallet to preview
                    </div>
                )}
            </ComponentSection>
        </div>
    );
}
