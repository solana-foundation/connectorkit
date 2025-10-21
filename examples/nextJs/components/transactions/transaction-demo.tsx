'use client';

import { useConnector } from '@solana/connector';
import { Alert } from '@/components/ui/alert';
import { Info } from 'lucide-react';
import { LegacySolTransfer } from './legacy-sol-transfer';
import { ModernSolTransfer } from './modern-sol-transfer';

/**
 * Transaction Demo Container
 *
 * Displays both legacy and modern transaction approaches side-by-side,
 * demonstrating how connector-kit's compat layer seamlessly bridges
 * the gap between old and new Solana development patterns.
 */
export function TransactionDemo() {
    const { connected } = useConnector();

    if (!connected) {
        return (
            <div className="container mx-auto px-4 py-8">
                <div className="max-w-4xl mx-auto">
                    <Alert>
                        <Info className="h-4 w-4" />
                        <div className="ml-2">
                            <p className="font-medium">Wallet Connection Required</p>
                            <p className="text-sm text-muted-foreground mt-1">
                                Please connect your wallet to test transactions. This demo works on devnet and mainnet.
                            </p>
                        </div>
                    </Alert>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-8">
            {/* Transaction Forms Grid */}
            <div className="grid gap-6 lg:grid-cols-2">
                <LegacySolTransfer />
                <ModernSolTransfer />
            </div>
        </div>
    );
}
