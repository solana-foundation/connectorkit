'use client';

import { useState } from 'react';
import { useSignOffchainMessage } from '@solana/connector/react';
import { getBase58Decoder } from '@solana/kit';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert } from '@/components/ui/alert';

export function OffchainMessageDemo() {
    const { signOffchainMessage, canSignOffchainMessage, supportedMessageVersions, ready } = useSignOffchainMessage();

    const [message, setMessage] = useState('Sign in to ConnectorKit Playground');
    const [signature, setSignature] = useState<string | null>(null);
    const [signedBytes, setSignedBytes] = useState<string | null>(null);
    const [isSigning, setIsSigning] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSign = async () => {
        setIsSigning(true);
        setError(null);
        setSignature(null);
        setSignedBytes(null);

        try {
            const result = await signOffchainMessage(message);
            const base58 = getBase58Decoder();
            setSignature(base58.decode(result.signature));
            setSignedBytes(base58.decode(result.signedOffchainMessage));
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to sign off-chain message');
        } finally {
            setIsSigning(false);
        }
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle>Off-Chain Message Signing</CardTitle>
                <CardDescription>
                    Sign a human-readable v1 off-chain message (sRFC 38) via <code>solana:signOffchainMessage</code>.
                    The signed bytes are verified against the canonical encoding before being returned.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                {!ready ? (
                    <Alert>Connect a wallet to sign off-chain messages</Alert>
                ) : !canSignOffchainMessage ? (
                    <Alert>Connected wallet does not support off-chain message signing</Alert>
                ) : (
                    <>
                        <p className="text-xs text-muted-foreground">
                            Supported message versions: {supportedMessageVersions.join(', ')}
                        </p>
                        <div className="space-y-2">
                            <input
                                type="text"
                                value={message}
                                onChange={e => setMessage(e.target.value)}
                                className="w-full px-3 py-2 border rounded-md text-sm"
                                placeholder="Enter message to sign"
                            />
                            <Button
                                onClick={handleSign}
                                disabled={isSigning || !message.trim()}
                                size="sm"
                                className="w-full"
                            >
                                {isSigning ? 'Signing...' : 'Sign Off-Chain Message'}
                            </Button>
                        </div>
                    </>
                )}

                {signature && (
                    <div className="space-y-2">
                        <div className="p-3 bg-muted rounded-md">
                            <p className="text-xs font-medium mb-1">Signature (base58)</p>
                            <p className="text-xs font-mono break-all">{signature}</p>
                        </div>
                        <div className="p-3 bg-muted rounded-md">
                            <p className="text-xs font-medium mb-1">Signed message bytes (base58)</p>
                            <p className="text-xs font-mono break-all">{signedBytes}</p>
                        </div>
                    </div>
                )}

                {error && (
                    <Alert variant="destructive" className="py-2">
                        <p className="text-sm">{error}</p>
                    </Alert>
                )}
            </CardContent>
        </Card>
    );
}
