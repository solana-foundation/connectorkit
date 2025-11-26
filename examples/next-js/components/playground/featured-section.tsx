'use client';

import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { CopyButton } from '@/components/ui/copy-button';
import { ConnectButton } from '@/components/connector/connect-button';
import { WalletDropdownContent } from '@/components/connector/wallet-dropdown-content';
import { useConnector } from '@solana/connector';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Wallet, ExternalLink, Plug } from 'lucide-react';
import { useState, useEffect } from 'react';
import { Spinner } from '@/components/ui/spinner';

// Code snippets for each component
const connectButtonCode = `'use client';

import { useConnector } from '@solana/connector';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useState } from 'react';
import { motion } from 'motion/react';
import { WalletModal } from './wallet-modal';
import { WalletDropdownContent } from './wallet-dropdown-content';
import { Wallet, ChevronDown } from 'lucide-react';

export function ConnectButton({ className }: { className?: string }) {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const { connected, connecting, selectedWallet, selectedAccount, wallets } = useConnector();

    if (connecting) {
        return (
            <Button size="sm" disabled className={className}>
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
            </Button>
        );
    }

    if (connected && selectedAccount && selectedWallet) {
        const shortAddress = \`\${selectedAccount.slice(0, 4)}...\${selectedAccount.slice(-4)}\`;
        const walletWithIcon = wallets.find(w => w.wallet.name === selectedWallet.name);
        const walletIcon = walletWithIcon?.wallet.icon || selectedWallet.icon;

        return (
            <DropdownMenu open={isDropdownOpen} onOpenChange={setIsDropdownOpen}>
                <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" className={className}>
                        <Avatar className="h-5 w-5">
                            {walletIcon && <AvatarImage src={walletIcon} />}
                            <AvatarFallback><Wallet className="h-3 w-3" /></AvatarFallback>
                        </Avatar>
                        <span className="text-xs">{shortAddress}</span>
                        <motion.div animate={{ rotate: isDropdownOpen ? -180 : 0 }}>
                            <ChevronDown className="h-4 w-4 opacity-50" />
                        </motion.div>
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="p-0 rounded-[20px]">
                    <WalletDropdownContent
                        selectedAccount={selectedAccount}
                        walletIcon={walletIcon}
                        walletName={selectedWallet.name}
                    />
                </DropdownMenuContent>
            </DropdownMenu>
        );
    }

    return (
        <>
            <Button size="sm" onClick={() => setIsModalOpen(true)} className={className}>
                Connect Wallet
            </Button>
            <WalletModal open={isModalOpen} onOpenChange={setIsModalOpen} />
        </>
    );
}`;

const walletModalCode = `'use client';

import { useConnector } from '@solana/connector';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Wallet, ExternalLink } from 'lucide-react';
import { useState, useEffect } from 'react';

export function WalletModal({ open, onOpenChange }) {
    const { wallets, select, connecting, selectedWallet } = useConnector();
    const [connectingWallet, setConnectingWallet] = useState(null);
    const [recentlyConnected, setRecentlyConnected] = useState(null);

    useEffect(() => {
        const recent = localStorage.getItem('recentlyConnectedWallet');
        if (recent) setRecentlyConnected(recent);
    }, []);

    const handleSelectWallet = async (walletName) => {
        setConnectingWallet(walletName);
        try {
            await select(walletName);
            localStorage.setItem('recentlyConnectedWallet', walletName);
            onOpenChange(false);
        } catch (error) {
            console.error('Failed to connect:', error);
        } finally {
            setConnectingWallet(null);
        }
    };

    const installedWallets = wallets.filter(w => w.installed);
    const primaryWallets = installedWallets.slice(0, 3);
    const otherWallets = installedWallets.slice(3);

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md rounded-[24px]">
                <DialogHeader>
                    <DialogTitle>Connect your wallet</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                    {primaryWallets.map(wallet => (
                        <Button
                            key={wallet.wallet.name}
                            variant="outline"
                            className="w-full justify-between p-4 rounded-[16px]"
                            onClick={() => handleSelectWallet(wallet.wallet.name)}
                            disabled={connecting}
                        >
                            <span>{wallet.wallet.name}</span>
                            <Avatar className="h-10 w-10">
                                <AvatarImage src={wallet.wallet.icon} />
                                <AvatarFallback><Wallet /></AvatarFallback>
                            </Avatar>
                        </Button>
                    ))}
                    {otherWallets.length > 0 && (
                        <Accordion type="single" collapsible>
                            <AccordionItem value="more">
                                <AccordionTrigger>Other Wallets</AccordionTrigger>
                                <AccordionContent>
                                    {otherWallets.map(wallet => (
                                        <Button key={wallet.wallet.name} variant="outline" className="w-full mb-2">
                                            {wallet.wallet.name}
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
                            <button onClick={refetch}><RefreshCw className={isLoading ? 'animate-spin' : ''} /></button>
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

// Inline WalletModalContent component (without Dialog wrapper)
function WalletModalContent() {
    const { wallets, select, connecting, selectedWallet } = useConnector();
    const [connectingWallet, setConnectingWallet] = useState<string | null>(null);
    const [isClient, setIsClient] = useState(false);
    const [recentlyConnected, setRecentlyConnected] = useState<string | null>(null);

    useEffect(() => {
        setIsClient(true);
    }, []);

    useEffect(() => {
        const recent = localStorage.getItem('recentlyConnectedWallet');
        if (recent) setRecentlyConnected(recent);
    }, []);

    const handleSelectWallet = async (walletName: string) => {
        setConnectingWallet(walletName);
        try {
            await select(walletName);
        } catch (error) {
            console.error('Failed to connect:', error);
        } finally {
            setConnectingWallet(null);
        }
    };

    const installedWallets = wallets.filter(w => w.installed);
    const notInstalledWallets = wallets.filter(w => !w.installed);
    const sortedInstalledWallets = [...installedWallets].sort((a, b) => {
        if (recentlyConnected === a.wallet.name) return -1;
        if (recentlyConnected === b.wallet.name) return 1;
        return 0;
    });
    const primaryWallets = sortedInstalledWallets.slice(0, 3);
    const otherWallets = sortedInstalledWallets.slice(3);

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
                                            <div className="flex items-center gap-2">
                                                <span className="font-semibold">{walletInfo.wallet.name}</span>
                                                {isRecent && (
                                                    <Badge variant="secondary" className="text-xs">
                                                        Recent
                                                    </Badge>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-2">
                                                {isConnecting && <Spinner className="h-4 w-4" />}
                                                <Avatar className="h-10 w-10">
                                                    {walletInfo.wallet.icon && (
                                                        <AvatarImage src={walletInfo.wallet.icon} />
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
                                                {otherWallets.map(walletInfo => (
                                                    <Button
                                                        key={walletInfo.wallet.name}
                                                        variant="outline"
                                                        className="h-auto justify-between p-4 rounded-[16px]"
                                                        onClick={() => handleSelectWallet(walletInfo.wallet.name)}
                                                    >
                                                        <span>{walletInfo.wallet.name}</span>
                                                        <Avatar className="h-8 w-8">
                                                            {walletInfo.wallet.icon && (
                                                                <AvatarImage src={walletInfo.wallet.icon} />
                                                            )}
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

                        {notInstalledWallets.length > 0 && (
                            <>
                                <Separator />
                                <div className="space-y-2">
                                    <h3 className="text-sm font-medium text-muted-foreground">Popular Wallets</h3>
                                    <div className="grid gap-2">
                                        {notInstalledWallets.slice(0, 3).map(walletInfo => (
                                            <Button
                                                key={walletInfo.wallet.name}
                                                variant="outline"
                                                className="h-auto justify-between p-4 rounded-[16px]"
                                                onClick={() =>
                                                    window.open(getInstallUrl(walletInfo.wallet.name), '_blank')
                                                }
                                            >
                                                <div className="flex items-center gap-3">
                                                    <Avatar className="h-8 w-8">
                                                        {walletInfo.wallet.icon && (
                                                            <AvatarImage src={walletInfo.wallet.icon} />
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

// Component section helper
function ComponentSection({
    title,
    description,
    code,
    fileName,
    children,
}: {
    title: string;
    description: string;
    badge: string;
    badgeColor: string;
    code: string;
    fileName: string;
    children: React.ReactNode;
}) {
    return (
        <section className="py-12 border-b border-sand-200">
            <div className="grid grid-cols-12 gap-6 lg:gap-8">
                <div className="col-span-12 lg:col-span-4 flex flex-col justify-start px-4 lg:px-6">
                    <h3 className="text-title-5 font-diatype-medium text-sand-1500 mb-2">{title}</h3>
                    <p className="text-body-md font-inter text-sand-700">{description}</p>
                </div>

                <div className="col-span-12 lg:col-span-8 px-4 lg:px-6">
                    <Tabs defaultValue="preview" className="w-full">
                        <div className="flex justify-end mb-4">
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
                                    {children}
                                </CardContent>
                            </Card>
                        </TabsContent>

                        <TabsContent value="code">
                            <Card className="border-sand-300 bg-[#282c34] rounded-xl overflow-hidden">
                                <CardContent className="p-0">
                                    <div className="flex items-center justify-between px-4 py-2 border-b border-white/10">
                                        <span className="text-xs text-sand-500 font-inter">{fileName}</span>
                                        <CopyButton
                                            textToCopy={code}
                                            showText={false}
                                            iconClassName="text-sand-500 group-hover:text-sand-300"
                                            iconClassNameCheck="text-green-400"
                                        />
                                    </div>
                                    <div className="max-h-[400px] overflow-y-auto">
                                        <SyntaxHighlighter
                                            language="tsx"
                                            style={oneDark}
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
                                                color: '#636d83',
                                                userSelect: 'none',
                                            }}
                                        >
                                            {code}
                                        </SyntaxHighlighter>
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
    const { connected, selectedWallet, selectedAccount, wallets } = useConnector();
    const walletWithIcon = wallets.find(w => w.wallet.name === selectedWallet?.name);
    const walletIcon = walletWithIcon?.wallet.icon || selectedWallet?.icon;

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
                    <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs font-inter-medium rounded">
                        Full Components
                    </span>
                </div>
                <h2 className="text-h3 font-diatype-medium text-sand-1500 mb-2">Complete Block Examples</h2>
                <p className="text-body-lg font-inter text-sand-700 max-w-lg">
                    Complete block examples built with ConnectorKit blocks and radix. Copy any example and customize it
                    for your app.
                </p>
            </div>

            {/* ConnectButton */}
            <ComponentSection
                title="ConnectButton"
                description="The main entry point. Shows connect button when disconnected, wallet dropdown when connected. Orchestrates the modal and dropdown."
                badge="Entry Point"
                badgeColor="bg-green-100 text-green-700"
                code={connectButtonCode}
                fileName="connect-button.tsx"
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
                fileName="wallet-modal.tsx"
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
                fileName="wallet-dropdown-content.tsx"
            >
                {connected && selectedAccount && selectedWallet ? (
                    <div className="rounded-[20px] border shadow-lg bg-card">
                        <WalletDropdownContent
                            selectedAccount={selectedAccount}
                            walletIcon={walletIcon}
                            walletName={selectedWallet.name}
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
