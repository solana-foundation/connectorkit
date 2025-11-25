'use client';

import { useState, useMemo } from 'react';
import { 
    createKitSignersFromWallet, 
    createMessageSignerFromWallet, 
    createSignableMessage, 
    address 
} from '@solana/connector/headless';
import { useConnector, useConnectorClient } from '@solana/connector';
import { Connection } from '@solana/web3.js';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert } from '@/components/ui/alert';

export function KitSignerDemo() {
    const { selectedWallet, accounts, selectedAccount, cluster } = useConnector();
    const client = useConnectorClient();
    
    const account = useMemo(() => {
        if (!selectedAccount || !accounts.length) return null;
        return accounts.find(acc => acc.address === selectedAccount)?.raw || null;
    }, [selectedAccount, accounts]);
    
    const [messageToSign, setMessageToSign] = useState('Hello from ConnectorKit!');
    const [signedMessage, setSignedMessage] = useState<string | null>(null);
    const [isSigning, setIsSigning] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const kitSigners = useMemo(() => {
        if (!selectedWallet || !account || !cluster) return null;

        const rpcUrl = client?.getRpcUrl();
        const connection = rpcUrl ? new Connection(rpcUrl) : null;

        return createKitSignersFromWallet(selectedWallet, account, connection, undefined);
    }, [selectedWallet, account, cluster, client]);

    const manualSigner = useMemo(() => {
        if (!selectedWallet || !account) return null;
        
        // Validate features structure
        if (!selectedWallet.features || typeof selectedWallet.features !== 'object') {
            return null;
        }
        
        const features = selectedWallet.features as Record<string, unknown>;
        const signMessageFeature = features['solana:signMessage'];
        
        // Validate signMessage feature exists and has the expected structure
        if (
            !signMessageFeature ||
            typeof signMessageFeature !== 'object' ||
            !('signMessage' in signMessageFeature) ||
            typeof (signMessageFeature as { signMessage?: unknown }).signMessage !== 'function'
        ) {
            return null;
        }

        const signMessageFn = (signMessageFeature as { signMessage: (args: unknown) => Promise<unknown> }).signMessage;

        return createMessageSignerFromWallet(
            address(account.address),
            async (message: Uint8Array) => {
                try {
                    const result = await signMessageFn({
                        account,
                        message,
                    });

                    // Validate result structure
                    if (!Array.isArray(result)) {
                        throw new Error('Wallet signMessage did not return an array');
                    }

                    if (result.length === 0) {
                        throw new Error('Wallet returned empty results array');
                    }

                    const firstResult = result[0];
                    if (
                        !firstResult ||
                        typeof firstResult !== 'object' ||
                        !('signature' in firstResult) ||
                        !(firstResult.signature instanceof Uint8Array)
                    ) {
                        throw new Error('Wallet returned invalid result structure - expected { signature: Uint8Array }');
                    }

                    return firstResult.signature;
                } catch (error) {
                    console.error('Manual signer message signing error:', error);
                    throw error instanceof Error ? error : new Error(String(error));
                }
            },
        );
    }, [selectedWallet, account]);

    const handleSignMessage = async () => {
        if (!kitSigners?.messageSigner) {
            setError('Message signer not available');
            return;
        }

        setIsSigning(true);
        setError(null);
        setSignedMessage(null);

        try {
            const messageBytes = new TextEncoder().encode(messageToSign);
            const signableMessage = createSignableMessage(messageBytes);

            const signedMessages = await kitSigners.messageSigner.modifyAndSignMessages([signableMessage]);
            
            if (!Array.isArray(signedMessages) || signedMessages.length === 0) {
                throw new Error('Signer did not return signed messages');
            }

            const signed = signedMessages[0];
            if (!signed || !signed.signatures || typeof signed.signatures !== 'object') {
                throw new Error('Invalid signed message structure');
            }

            const signatureValues = Object.values(signed.signatures);
            if (signatureValues.length === 0) {
                throw new Error('No signatures found in signed message');
            }

            const signature = signatureValues[0];
            if (!(signature instanceof Uint8Array)) {
                throw new Error('Signature is not a Uint8Array');
            }

            const signatureBase64 = btoa(String.fromCharCode(...Array.from(signature)));
            setSignedMessage(signatureBase64);
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Failed to sign message';
            console.error('Message signing error:', err);
            setError(errorMessage);
        } finally {
            setIsSigning(false);
        }
    };

    const handleSignMessageManual = async () => {
        if (!manualSigner) {
            setError('Manual signer not available');
            return;
        }

        setIsSigning(true);
        setError(null);
        setSignedMessage(null);

        try {
            const signedMessages = await manualSigner.modifyAndSignMessages([
                createSignableMessage(new TextEncoder().encode(messageToSign))
            ]);
            
            if (!Array.isArray(signedMessages) || signedMessages.length === 0) {
                throw new Error('Signer did not return signed messages');
            }

            const signed = signedMessages[0];
            if (!signed || !signed.signatures || typeof signed.signatures !== 'object') {
                throw new Error('Invalid signed message structure');
            }

            const signatureValues = Object.values(signed.signatures);
            if (signatureValues.length === 0) {
                throw new Error('No signatures found in signed message');
            }

            const sig = signatureValues[0];
            if (!(sig instanceof Uint8Array)) {
                throw new Error('Signature is not a Uint8Array');
            }

            setSignedMessage(btoa(String.fromCharCode(...Array.from(sig))));
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed');
        } finally {
            setIsSigning(false);
        }
    };

    if (!selectedWallet || !account) {
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
                        onChange={(e) => setMessageToSign(e.target.value)}
                        className="w-full px-3 py-2 border rounded-md text-sm"
                        placeholder="Enter message to sign"
                    />
                    <div className="flex gap-2">
                        {kitSigners?.messageSigner && (
                            <Button onClick={handleSignMessage} disabled={isSigning || !messageToSign.trim()} size="sm" className="flex-1">
                                {isSigning ? 'Signing...' : 'Modern'}
                            </Button>
                        )}
                        {manualSigner && (
                            <Button 
                                onClick={handleSignMessageManual} 
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

                {!kitSigners?.messageSigner && !manualSigner && (
                    <Alert>Message signing not supported</Alert>
                )}
            </CardContent>
        </Card>
    );
}
