'use client';

/**
 * Demo component showcasing all available blocks.
 */

import React from 'react';
import { useConnector } from '@solana/connector';
import {
    AccountBlock,
    BalanceBlock,
    ClusterBlock,
    DisconnectBlock,
    TransactionHistoryBlock,
    TokenListBlock,
} from '@solana/connector/react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';

export function BlocksDemo() {
    const { connected } = useConnector();
    
    if (!connected) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>Blocks Demo</CardTitle>
                    <CardDescription>
                        Connect your wallet to see the blocks in action
                    </CardDescription>
                </CardHeader>
            </Card>
        );
    }
    
    return (
        <div className="grid gap-6 md:grid-cols-2">
            {/* Account Block Demo */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-lg">AccountBlock</CardTitle>
                    <CardDescription>
                        Displays connected account information
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div>
                        <p className="text-sm text-muted-foreground mb-2">Compact variant:</p>
                        <AccountBlock variant="compact" />
                    </div>
                    <Separator />
                    <div>
                        <p className="text-sm text-muted-foreground mb-2">Expanded variant:</p>
                        <AccountBlock variant="expanded" />
                    </div>
                    <Separator />
                    <div>
                        <p className="text-sm text-muted-foreground mb-2">Inline variant:</p>
                        <AccountBlock variant="inline" />
                    </div>
                </CardContent>
            </Card>
            
            {/* Balance Block Demo */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-lg">BalanceBlock</CardTitle>
                    <CardDescription>
                        Shows SOL and token balances
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div>
                        <p className="text-sm text-muted-foreground mb-2">Compact (SOL only):</p>
                        <BalanceBlock variant="compact" />
                    </div>
                    <Separator />
                    <div>
                        <p className="text-sm text-muted-foreground mb-2">Inline with refresh:</p>
                        <BalanceBlock variant="inline" showRefresh />
                    </div>
                    <Separator />
                    <div>
                        <p className="text-sm text-muted-foreground mb-2">Expanded with tokens:</p>
                        <BalanceBlock variant="expanded" showTokens showRefresh />
                    </div>
                </CardContent>
            </Card>
            
            {/* Cluster Block Demo */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-lg">ClusterBlock</CardTitle>
                    <CardDescription>
                        Displays and optionally changes network
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div>
                        <p className="text-sm text-muted-foreground mb-2">Badge variant:</p>
                        <ClusterBlock variant="badge" />
                    </div>
                    <Separator />
                    <div>
                        <p className="text-sm text-muted-foreground mb-2">Select variant (changeable):</p>
                        <ClusterBlock variant="select" allowChange />
                    </div>
                </CardContent>
            </Card>
            
            {/* Disconnect Block Demo */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-lg">DisconnectBlock</CardTitle>
                    <CardDescription>
                        Button to disconnect wallet
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div>
                        <p className="text-sm text-muted-foreground mb-2">Button variant:</p>
                        <DisconnectBlock variant="button" />
                    </div>
                    <Separator />
                    <div>
                        <p className="text-sm text-muted-foreground mb-2">Link variant:</p>
                        <DisconnectBlock variant="link" />
                    </div>
                    <Separator />
                    <div>
                        <p className="text-sm text-muted-foreground mb-2">Menu item variant:</p>
                        <div className="border rounded-md p-2">
                            <DisconnectBlock variant="menuitem" />
                        </div>
                    </div>
                </CardContent>
            </Card>
            
            {/* Transaction History Block Demo */}
            <Card className="md:col-span-2">
                <CardHeader>
                    <CardTitle className="text-lg">TransactionHistoryBlock</CardTitle>
                    <CardDescription>
                        Shows recent transactions
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <TransactionHistoryBlock 
                        limit={5} 
                        variant="expanded"
                        showLoadMore
                    />
                </CardContent>
            </Card>
            
            {/* Token List Block Demo */}
            <Card className="md:col-span-2">
                <CardHeader>
                    <CardTitle className="text-lg">TokenListBlock</CardTitle>
                    <CardDescription>
                        Displays token holdings
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <TokenListBlock 
                        limit={6} 
                        variant="expanded"
                        showRefresh
                    />
                </CardContent>
            </Card>
        </div>
    );
}

BlocksDemo.displayName = 'BlocksDemo';


