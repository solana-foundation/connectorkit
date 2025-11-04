'use client';

import { TransactionDemo } from '@/components/transactions';
import { ConnectButton, ClusterSelector, AccountSwitcher } from '@/components/connector';
import { useConnector } from '@solana/connector';

export default function Home() {
    const { connected } = useConnector();

    return (
        <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
            {/* Header */}
            <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
                <div className="container mx-auto px-4 h-16 flex items-center justify-between">
                    <div className="font-semibold text-lg">ConnectorKit Demo</div>
                    <div className="flex items-center gap-2">
                        {connected && (
                            <>
                                <ClusterSelector />
                                <AccountSwitcher />
                            </>
                        )}
                        <ConnectButton />
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="container mx-auto px-4 py-6">
                <div className="max-w-7xl mx-auto">
                    <div className="mb-6">
                        <h1 className="text-3xl font-bold">ConnectorKit Examples</h1>
                        <p className="text-muted-foreground mt-1">
                            Test transactions, Kit signers, chain utilities, and connection abstraction
                        </p>
                    </div>
                    <TransactionDemo />
                </div>
            </main>
        </div>
    );
}
