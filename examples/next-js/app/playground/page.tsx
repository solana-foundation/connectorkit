'use client';

import { BlocksDemo } from '@/components/blocks-demo';
import { ConnectButton, ClusterSelector, BlocksConnectButton } from '@/components/connector';
import { useConnector } from '@solana/connector';
import Link from 'next/link';

export default function PlaygroundPage() {
    const { connected } = useConnector();

    return (
        <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
            {/* Header */}
            <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
                <div className="container mx-auto px-4 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Link href="/" className="font-semibold text-lg hover:opacity-80">
                            ConnectorKit
                        </Link>
                        <span className="text-muted-foreground">/</span>
                        <span className="text-muted-foreground">Playground</span>
                    </div>
                    <div className="flex items-center gap-2">
                        {connected && <ClusterSelector />}
                        <ConnectButton />
                        <BlocksConnectButton />
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="container mx-auto px-4 py-8">
                <div className="max-w-5xl mx-auto">
                    <div className="mb-8">
                        <h1 className="text-3xl font-bold mb-2">Blocks Playground</h1>
                        <p className="text-muted-foreground">
                            Explore and test all available ConnectorKit blocks. Connect your wallet to see them in action.
                        </p>
                    </div>
                    
                    <BlocksDemo />
                </div>
            </main>
        </div>
    );
}
