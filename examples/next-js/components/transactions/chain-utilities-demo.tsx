'use client';

/**
 * Chain Utilities Demo Component
 *
 * Demonstrates Wallet Standard chain ID utilities integrated with ConnectorKit's cluster system.
 * Shows bidirectional conversion between Wallet Standard chain IDs and cluster types.
 */

import { useConnector } from '@solana/connector';
import {
    getChainIdFromCluster,
    getChainIdFromClusterId,
    getChainIdFromClusterType,
    getClusterTypeFromChainId,
    getClusterIdFromChainId,
    isSolanaChain,
    isKnownSolanaChain,
    SOLANA_CHAIN_IDS,
} from '@solana/connector/headless';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert } from '@/components/ui/alert';

export function ChainUtilitiesDemo() {
    const { cluster, clusters } = useConnector();

    // Get chain ID from current cluster
    const currentChainId = cluster ? getChainIdFromCluster(cluster) : null;
    // Get cluster type from chain ID if available, otherwise derive from cluster
    const currentClusterType = currentChainId ? getClusterTypeFromChainId(currentChainId) : null;

    // Show all chain IDs
    const allChainIds = Object.values(SOLANA_CHAIN_IDS);

    return (
        <Card>
            <CardHeader>
                <CardTitle>Chain Utilities</CardTitle>
                <CardDescription>Wallet Standard chain IDs</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
                {cluster ? (
                    <div className="space-y-2 text-sm">
                        <div className="flex items-center justify-between">
                            <span className="text-muted-foreground">Cluster:</span>
                            <Badge>{cluster.id}</Badge>
                        </div>
                        {currentChainId && (
                            <div className="flex items-center justify-between">
                                <span className="text-muted-foreground">Chain ID:</span>
                                <code className="text-xs">{currentChainId.slice(0, 20)}...</code>
                            </div>
                        )}
                        {currentClusterType && (
                            <div className="flex items-center justify-between">
                                <span className="text-muted-foreground">Type:</span>
                                <Badge variant="outline">{currentClusterType}</Badge>
                            </div>
                        )}
                    </div>
                ) : (
                    <Alert>Connect wallet to see chain info</Alert>
                )}

                <div className="space-y-2">
                    <p className="text-xs text-muted-foreground">Standard Chain IDs:</p>
                    {Object.entries(SOLANA_CHAIN_IDS).map(([network, chainId]) => (
                        <div key={network} className="flex items-center justify-between text-xs p-2 bg-muted rounded">
                            <span className="capitalize font-medium">{network}</span>
                            <code className="text-[10px]">{chainId.slice(-12)}</code>
                        </div>
                    ))}
                </div>
            </CardContent>
        </Card>
    );
}

