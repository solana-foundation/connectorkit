'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CopyButton } from '@/components/ui/copy-button';
import { ExternalLink, CheckCircle2 } from 'lucide-react';

interface TransactionResultProps {
    signature: string | null;
    cluster?: string;
}

export function TransactionResult({ signature, cluster = 'devnet' }: TransactionResultProps) {
    if (!signature) {
        return null;
    }

    const explorerUrl = `https://explorer.solana.com/tx/${signature}?cluster=${cluster}`;

    return (
        <Card className="bg-green-50 border-green-200">
            <CardHeader>
                <CardTitle className="flex items-center gap-2 text-green-700">
                    <CheckCircle2 className="h-5 w-5" />
                    Transaction Sent
                </CardTitle>
                <CardDescription>Your transaction has been submitted to the network</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
                <div className="space-y-2">
                    <div className="text-sm font-medium">Transaction Signature</div>
                    <div className="flex items-center gap-2 p-3 bg-white rounded-lg border border-green-200">
                        <code className="text-xs font-mono flex-1 truncate">{signature}</code>
                        <CopyButton textToCopy={signature} showText={false} />
                    </div>
                </div>

                <a
                    href={explorerUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-sm text-green-700 hover:text-green-800 font-medium"
                >
                    View on Solana Explorer
                    <ExternalLink className="h-4 w-4" />
                </a>
            </CardContent>
        </Card>
    );
}
