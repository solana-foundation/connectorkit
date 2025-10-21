'use client';

import { ConnectButton, AccountSwitcher, ClusterSelector } from '@/components/connector';
import { useConnector, useAccount, useCluster, useWalletInfo } from '@solana/connector';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { Wallet, Network, User, Info, ArrowRight, TestTube2 } from 'lucide-react';
import Link from 'next/link';

export default function Home() {
    const { connected, connecting, selectedWallet, selectedAccount } = useConnector();
    const { accounts } = useAccount();
    const { cluster } = useCluster();
    const walletInfo = useWalletInfo();

    return (
        <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
            {/* Header */}
            <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
                <div className="container mx-auto px-4 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Wallet className="h-6 w-6" />
                        <h1 className="text-xl font-bold">ConnectorKit</h1>
                    </div>

                    <div className="flex items-center gap-2">
                        {connected && (
                            <>
                                <ClusterSelector />
                                <AccountSwitcher />
                            </>
                        )}
                        <ConnectButton />
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="container mx-auto px-4 py-8">
                <div className="max-w-4xl mx-auto space-y-8">
                    {/* Hero Section */}
                    <div className="text-center space-y-4 py-12">
                        <h2 className="text-4xl font-bold tracking-tight">Solana Wallet Connection</h2>
                        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                            Production-ready wallet connection components built with shadcn/ui. Copy and customize these
                            components for your Solana applications.
                        </p>
                    </div>

                    {/* Connection Status */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Info className="h-5 w-5" />
                                Connection Status
                            </CardTitle>
                            <CardDescription>Current wallet connection information</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid gap-4 sm:grid-cols-2">
                                <div className="space-y-2">
                                    <div className="text-sm font-medium text-muted-foreground">Status</div>
                                    <Badge variant={connected ? 'default' : connecting ? 'secondary' : 'outline'}>
                                        {connecting ? 'Connecting...' : connected ? 'Connected' : 'Disconnected'}
                                    </Badge>
                                </div>

                                {selectedWallet && (
                                    <div className="space-y-2">
                                        <div className="text-sm font-medium text-muted-foreground">Wallet</div>
                                        <div className="font-medium">{selectedWallet.name}</div>
                                    </div>
                                )}

                                {cluster && (
                                    <div className="space-y-2">
                                        <div className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                                            <Network className="h-3 w-3" />
                                            Network
                                        </div>
                                        <div className="font-medium" suppressHydrationWarning>
                                            {cluster.label}
                                        </div>
                                        <div
                                            className="text-xs text-muted-foreground font-mono"
                                            suppressHydrationWarning
                                        >
                                            {cluster.url}
                                        </div>
                                    </div>
                                )}

                                {accounts.length > 0 && (
                                    <div className="space-y-2">
                                        <div className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                                            <User className="h-3 w-3" />
                                            Accounts
                                        </div>
                                        <div className="font-medium">
                                            {accounts.length} account
                                            {accounts.length !== 1 ? 's' : ''}
                                        </div>
                                    </div>
                                )}
                            </div>

                            {selectedAccount && (
                                <>
                                    <Separator />
                                    <div className="space-y-2">
                                        <div className="text-sm font-medium text-muted-foreground">Active Address</div>
                                        <div className="font-mono text-sm bg-muted p-3 rounded-lg break-all">
                                            {selectedAccount}
                                        </div>
                                    </div>
                                </>
                            )}

                            {walletInfo && (
                                <>
                                    <Separator />
                                    <div className="space-y-2">
                                        <div className="text-sm font-medium text-muted-foreground">Wallet Info</div>
                                        <pre className="text-xs bg-muted p-3 rounded-lg overflow-auto">
                                            {JSON.stringify(walletInfo, null, 2)}
                                        </pre>
                                    </div>
                                </>
                            )}
                        </CardContent>
                    </Card>

                    {/* Transaction Testing Card */}
                    <Card className="bg-gradient-to-br from-purple-50 to-blue-50 border-purple-200">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <TestTube2 className="h-5 w-5" />
                                Transaction Testing Lab
                            </CardTitle>
                            <CardDescription>
                                Test real SOL transfers with legacy and modern Solana approaches
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <p className="text-sm text-muted-foreground">
                                Try out our interactive transaction testing environment. Compare legacy @solana/web3.js
                                with modern @solana/kit, test the wallet adapter compat layer, and see the debugger in
                                action.
                            </p>
                            <Link href="/transactions">
                                <Button className="w-full sm:w-auto">
                                    Go to Transaction Testing
                                    <ArrowRight className="ml-2 h-4 w-4" />
                                </Button>
                            </Link>
                        </CardContent>
                    </Card>
                </div>
            </main>

            {/* Footer */}
            <footer className="border-t mt-12 py-6 text-center text-sm text-muted-foreground">
                <p>Built with ConnectorKit, Next.js, and shadcn/ui</p>
            </footer>
        </div>
    );
}
