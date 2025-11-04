'use client';

import { useConnector } from '@solana/connector';
import { Alert } from '@/components/ui/alert';
import { Info } from 'lucide-react';
import { LegacySolTransfer } from './legacy-sol-transfer';
import { ModernSolTransfer } from './modern-sol-transfer';
import { KitSignerDemo } from './kit-signer-demo';
import { ChainUtilitiesDemo } from './chain-utilities-demo';
import { ConnectionAbstractionDemo } from './connection-abstraction-demo';

export function TransactionDemo() {
    const { connected } = useConnector();

    if (!connected) {
        return (
            <Alert>
                <Info className="h-4 w-4" />
                <div className="ml-2">
                    <p className="font-medium">Connect your wallet to get started</p>
                    <p className="text-sm text-muted-foreground mt-1">
                        Works on devnet and mainnet
                    </p>
                </div>
            </Alert>
        );
    }

    return (
        <div className="space-y-6">
            {/* Transactions */}
            <div className="grid gap-4 lg:grid-cols-2">
                <LegacySolTransfer />
                <ModernSolTransfer />
            </div>

            {/* New Features */}
            <div className="grid gap-4 lg:grid-cols-2">
                <KitSignerDemo />
                <ChainUtilitiesDemo />
            </div>

            <ConnectionAbstractionDemo />
        </div>
    );
}
