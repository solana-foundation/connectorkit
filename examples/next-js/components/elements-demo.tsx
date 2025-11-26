'use client';

/**
 * Demo component showcasing all available elements.
 */

import React from 'react';
import { useConnector } from '@solana/connector';
import {
    AccountElement,
    BalanceElement,
    ClusterElement,
    DisconnectElement,
    TransactionHistoryElement,
    TokenListElement,
} from '@solana/connector/react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';

export function ElementsDemo() {
    const { connected } = useConnector();

    if (!connected) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>Elements Demo</CardTitle>
                    <CardDescription>Connect your wallet to see the elements in action</CardDescription>
                </CardHeader>
            </Card>
        );
    }

    return (
        <div className="grid gap-6 md:grid-cols-2">
            {/* Account Element Demo */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-lg">AccountElement</CardTitle>
                    <CardDescription>Displays connected account information</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div>
                        <p className="text-sm text-muted-foreground mb-2">Compact variant:</p>
                        <AccountElement variant="compact" />
                    </div>
                    <Separator />
                    <div>
                        <p className="text-sm text-muted-foreground mb-2">Expanded variant:</p>
                        <AccountElement variant="expanded" />
                    </div>
                    <Separator />
                    <div>
                        <p className="text-sm text-muted-foreground mb-2">Inline variant:</p>
                        <AccountElement variant="inline" />
                    </div>
                </CardContent>
            </Card>

            {/* Balance Element Demo */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-lg">BalanceElement</CardTitle>
                    <CardDescription>Shows SOL and token balances</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div>
                        <p className="text-sm text-muted-foreground mb-2">Compact (SOL only):</p>
                        <BalanceElement variant="compact" />
                    </div>
                    <Separator />
                    <div>
                        <p className="text-sm text-muted-foreground mb-2">Inline with refresh:</p>
                        <BalanceElement variant="inline" showRefresh />
                    </div>
                    <Separator />
                    <div>
                        <p className="text-sm text-muted-foreground mb-2">Expanded with tokens:</p>
                        <BalanceElement variant="expanded" showTokens showRefresh />
                    </div>
                </CardContent>
            </Card>

            {/* Cluster Element Demo */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-lg">ClusterElement</CardTitle>
                    <CardDescription>Displays and optionally changes network</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div>
                        <p className="text-sm text-muted-foreground mb-2">Badge variant:</p>
                        <ClusterElement variant="badge" />
                    </div>
                    <Separator />
                    <div>
                        <p className="text-sm text-muted-foreground mb-2">Select variant (changeable):</p>
                        <ClusterElement variant="select" allowChange />
                    </div>
                </CardContent>
            </Card>

            {/* Disconnect Element Demo */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-lg">DisconnectElement</CardTitle>
                    <CardDescription>Button to disconnect wallet</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div>
                        <p className="text-sm text-muted-foreground mb-2">Button variant:</p>
                        <DisconnectElement variant="button" />
                    </div>
                    <Separator />
                    <div>
                        <p className="text-sm text-muted-foreground mb-2">Link variant:</p>
                        <DisconnectElement variant="link" />
                    </div>
                    <Separator />
                    <div>
                        <p className="text-sm text-muted-foreground mb-2">Menu item variant:</p>
                        <div className="border rounded-md p-2">
                            <DisconnectElement variant="menuitem" />
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Transaction History Element Demo */}
            <Card className="md:col-span-2">
                <CardHeader>
                    <CardTitle className="text-lg">TransactionHistoryElement</CardTitle>
                    <CardDescription>Shows recent transactions</CardDescription>
                </CardHeader>
                <CardContent>
                    <TransactionHistoryElement limit={5} variant="expanded" showLoadMore />
                </CardContent>
            </Card>

            {/* Token List Element Demo */}
            <Card className="md:col-span-2">
                <CardHeader>
                    <CardTitle className="text-lg">TokenListElement</CardTitle>
                    <CardDescription>Displays token holdings</CardDescription>
                </CardHeader>
                <CardContent>
                    <TokenListElement limit={6} variant="expanded" showRefresh />
                </CardContent>
            </Card>
        </div>
    );
}

ElementsDemo.displayName = 'ElementsDemo';
