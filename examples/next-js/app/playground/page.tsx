'use client';

import { BlocksDemo } from '@/components/blocks-demo';
import { ConnectButton } from '@/components/connector';
import { useConnector } from '@solana/connector';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

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
                        <ConnectButton />
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="container mx-auto px-4 py-8">
                <div className="max-w-5xl mx-auto space-y-8">
                    <div className="mb-8">
                        <h1 className="text-3xl font-bold mb-2">Blocks Playground</h1>
                        <p className="text-muted-foreground">
                            Explore all available ConnectorKit blocks. Connect your wallet to see them in action.
                        </p>
                    </div>
                    
                    {/* ConnectButton Example */}
                    <section>
                        <h2 className="text-2xl font-bold mb-4">ConnectButton</h2>
                        <p className="text-muted-foreground mb-6">
                            A complete wallet connection button built with shadcn/ui. Copy this component and customize it!
                        </p>
                        
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-lg">Example Component</CardTitle>
                                <CardDescription>
                                    Located at <code className="bg-muted px-1 rounded text-xs">components/connector/connect-button.tsx</code>
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <ConnectButton />
                                <p className="text-xs text-muted-foreground">
                                    This component uses <code className="bg-muted px-1 rounded">useConnector</code>, <code className="bg-muted px-1 rounded">useBalance</code>, <code className="bg-muted px-1 rounded">useCluster</code> hooks and <code className="bg-muted px-1 rounded">WalletListBlock</code> for wallet selection.
                                </p>
                            </CardContent>
                        </Card>
                    </section>
                    
                    {/* Individual Blocks Demo */}
                    <section>
                        <h2 className="text-2xl font-bold mb-4">Individual Blocks</h2>
                        <p className="text-muted-foreground mb-6">
                            Each block can be used independently for maximum flexibility. Mix and match to build your own UI.
                        </p>
                        <BlocksDemo />
                    </section>
                </div>
            </main>
        </div>
    );
}
