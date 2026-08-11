'use client';

import { useState, useMemo } from 'react';
import {
    createKitSignersFromWallet,
    createMessageSignerFromWallet,
    createSignableMessage,
    address,
} from '@solana/connector/headless';
import type { MessageModifyingSigner } from '@solana/connector/headless';
import { useCluster, useConnectorClient, useConnector } from '@solana/connector/react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert } from '@/components/ui/alert';

/** Signer chains the Kit signer factories accept as a network override */
type SignerNetwork = 'mainnet' | 'devnet' | 'testnet';

function isSignerNetwork(clusterType: string | null): clusterType is SignerNetwork {
    return clusterType === 'mainnet' || clusterType === 'devnet' || clusterType === 'testnet';
}

/** Sign `message` and return the signature as base64 */
async function signMessageToBase64(signer: MessageModifyingSigner, message: string): Promise<string> {
    const signableMessage = createSignableMessage(new TextEncoder().encode(message));
    const [signed] = await signer.modifyAndSignMessages([signableMessage]);

    const [signature] = Object.values(signed?.signatures ?? {});
    if (!(signature instanceof Uint8Array)) {
        throw new Error('Signer did not return a signature');
    }

    return btoa(String.fromCharCode(...signature));
}

export function KitSignerDemo() {
    const { walletStatus, connectorId } = useConnector();
    const session = walletStatus.status === 'connected' ? walletStatus.session : null;
    const { type: clusterType } = useCluster();
    const client = useConnectorClient();

    const wallet = useMemo(() => {
        if (!client || !connectorId) return null;
        return client.getConnector(connectorId);
    }, [client, connectorId]);

    const account = session?.selectedAccount.account ?? null;

    const [messageToSign, setMessageToSign] = useState('Hello from ConnectorKit!');
    const [signedMessage, setSignedMessage] = useState<string | null>(null);
    const [isSigning, setIsSigning] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const kitSigners = useMemo(() => {
        if (!wallet || !account) return null;

        // The signers derive their chain from the connected cluster; no legacy
        // web3.js Connection is involved.
        const network = isSignerNetwork(clusterType) ? clusterType : undefined;

        return createKitSignersFromWallet(wallet, account, null, network);
    }, [wallet, account, clusterType]);

    const manualSigner = useMemo(() => {
        if (!wallet || !account) return null;

        const features = wallet.features as Record<string, unknown> | undefined;
        const signMessageFeature = features?.['solana:signMessage'];

        if (
            !signMessageFeature ||
            typeof signMessageFeature !== 'object' ||
            typeof (signMessageFeature as { signMessage?: unknown }).signMessage !== 'function'
        ) {
            return null;
        }

        const signMessageFn = (signMessageFeature as { signMessage: (args: unknown) => Promise<unknown> }).signMessage;

        return createMessageSignerFromWallet(address(account.address), async (message: Uint8Array) => {
            const result = await signMessageFn({ account, message });

            const firstResult = Array.isArray(result) ? result[0] : null;
            if (!firstResult || !(firstResult.signature instanceof Uint8Array)) {
                throw new Error('Wallet returned invalid results - expected [{ signature: Uint8Array }]');
            }

            return firstResult.signature;
        });
    }, [wallet, account]);

    const handleSignMessage = async (signer: MessageModifyingSigner | null) => {
        if (!signer) {
            setError('Signer not available');
            return;
        }

        setIsSigning(true);
        setError(null);
        setSignedMessage(null);

        try {
            setSignedMessage(await signMessageToBase64(signer, messageToSign));
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to sign message');
        } finally {
            setIsSigning(false);
        }
    };

    if (!wallet || !account) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>Kit Signers</CardTitle>
                    <CardDescription>Message signing with Kit</CardDescription>
                </CardHeader>
                <CardContent>
                    <Alert>Connect wallet to test</Alert>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>Kit Signers</CardTitle>
                <CardDescription>Framework-agnostic message signing</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="space-y-2">
                    <input
                        type="text"
                        value={messageToSign}
                        onChange={e => setMessageToSign(e.target.value)}
                        className="w-full px-3 py-2 border rounded-md text-sm"
                        placeholder="Enter message to sign"
                    />
                    <div className="flex gap-2">
                        {kitSigners?.messageSigner && (
                            <Button
                                onClick={() => handleSignMessage(kitSigners.messageSigner)}
                                disabled={isSigning || !messageToSign.trim()}
                                size="sm"
                                className="flex-1"
                            >
                                {isSigning ? 'Signing...' : 'Modern'}
                            </Button>
                        )}
                        {manualSigner && (
                            <Button
                                onClick={() => handleSignMessage(manualSigner)}
                                disabled={isSigning || !messageToSign.trim()}
                                size="sm"
                                variant="outline"
                                className="flex-1"
                            >
                                Legacy
                            </Button>
                        )}
                    </div>
                </div>

                {signedMessage && (
                    <div className="p-3 bg-muted rounded-md">
                        <p className="text-xs font-mono break-all">{signedMessage}</p>
                    </div>
                )}

                {error && (
                    <Alert variant="destructive" className="py-2">
                        <p className="text-sm">{error}</p>
                    </Alert>
                )}

                {!kitSigners?.messageSigner && !manualSigner && <Alert>Message signing not supported</Alert>}
            </CardContent>
        </Card>
    );
}
