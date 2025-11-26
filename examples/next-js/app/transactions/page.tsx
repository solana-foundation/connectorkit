'use client';

import { TransactionDemo } from '@/components/transactions';
import { ClusterSelector, AccountSwitcher } from '@/components/connector';
import { useConnector } from '@solana/connector';

export default function TransactionsPage() {
    const { connected } = useConnector();

    return (
        <main className="min-h-[calc(100vh-4rem)]">
            {/* Hero Section */}
            <section className="border-b border-border-low">
                <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12">
                    <h1 className="text-title-2 text-sand-1500">
                        Transaction Examples
                    </h1>
                    <p className="text-body-xl text-sand-900 mt-3 max-w-2xl">
                        Test transactions, Kit signers, chain utilities, and connection abstraction with ConnectorKit.
                    </p>
                    
                    {connected && (
                        <div className="flex items-center gap-3 mt-6">
                            <ClusterSelector />
                            <AccountSwitcher />
                        </div>
                    )}
                </div>
            </section>

            {/* Demo Section */}
            <section className="py-12">
                <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                    <TransactionDemo />
                </div>
            </section>
        </main>
    );
}
