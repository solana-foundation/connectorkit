'use client';

/**
 * Connection Abstraction Demo Component
 *
 * Demonstrates dual-architecture connection helpers that work with both
 * legacy @solana/web3.js Connection and modern @solana/kit Rpc.
 */

import { useState } from 'react';
import { useConnectorClient, useSolanaClient } from '@solana/connector';
import { getLatestBlockhash, isLegacyConnection, isKitConnection } from '@solana/connector/headless';
import type { DualConnection } from '@solana/connector/headless';
import { Connection } from '@solana/web3.js';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert } from '@/components/ui/alert';

export function ConnectionAbstractionDemo() {
    const client = useConnectorClient();
    const { client: solanaClient } = useSolanaClient();
    const [blockhash, setBlockhash] = useState<{ blockhash: string; lastValidBlockHeight: number } | null>(null);
    const [connectionType, setConnectionType] = useState<'legacy' | 'kit' | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleGetBlockhashLegacy = async () => {
        const rpcUrl = client?.getRpcUrl();
        if (!rpcUrl) {
            setError('No RPC URL available');
            return;
        }

        setLoading(true);
        setError(null);
        setBlockhash(null);

        try {
            const connection = new Connection(rpcUrl, 'confirmed');
            setConnectionType(isLegacyConnection(connection) ? 'legacy' : null);

            // Use abstraction helper - works with legacy Connection
            setBlockhash(await getLatestBlockhash(connection, 'confirmed'));
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to get blockhash');
        } finally {
            setLoading(false);
        }
    };

    const handleGetBlockhashKit = async () => {
        if (!solanaClient) {
            setError('Kit client not available');
            return;
        }

        setLoading(true);
        setError(null);
        setBlockhash(null);

        try {
            // Kit's Rpc satisfies the helper's structural KitRpc shape
            const dualRpc = solanaClient.rpc as unknown as DualConnection;
            setConnectionType(isKitConnection(dualRpc) ? 'kit' : null);

            // Use abstraction helper - works with Kit Rpc
            setBlockhash(await getLatestBlockhash(dualRpc, 'confirmed'));
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to get blockhash');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle>Connection Abstraction</CardTitle>
                <CardDescription>Works with both Legacy Connection and Kit Rpc</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="flex gap-2">
                    <Button onClick={handleGetBlockhashLegacy} disabled={loading} variant="outline" size="sm">
                        Legacy Connection
                    </Button>
                    <Button onClick={handleGetBlockhashKit} disabled={loading} size="sm">
                        Kit Rpc
                    </Button>
                </div>

                {connectionType && (
                    <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Type:</span>
                        <Badge variant="outline">{connectionType === 'legacy' ? 'Legacy' : 'Kit'}</Badge>
                    </div>
                )}

                {blockhash && (
                    <div className="p-3 bg-muted rounded-md space-y-1 text-xs">
                        <div>
                            <span className="text-muted-foreground">Blockhash:</span>
                            <code className="block mt-1 text-[10px] break-all">{blockhash.blockhash}</code>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-muted-foreground">Block Height:</span>
                            <span>{blockhash.lastValidBlockHeight.toLocaleString()}</span>
                        </div>
                    </div>
                )}

                {error && (
                    <Alert variant="destructive" className="py-2">
                        <p className="text-sm">{error}</p>
                    </Alert>
                )}

                {!client && <Alert>Client not available</Alert>}
            </CardContent>
        </Card>
    );
}
