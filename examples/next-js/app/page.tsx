'use client';

import { CopyButton } from '@/components/ui/copy-button';
import { Features } from '@/components/landing';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
    FeaturedSection,
    ElementExamplesSection,
    HooksExamplesSection,
    TransactionsSection,
} from '@/components/playground';
import { Blocks, Code2, Anchor, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ConnectButton } from '@/components/connector/radix-ui/connect-button';

export default function Home() {
    const npmCommand = 'npm i @solana/connector';

    const scrollToPlayground = () => {
        const playgroundSection = document.getElementById('playground');
        if (playgroundSection) {
            playgroundSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    };

    return (
        <div className="max-w-7xl mx-auto min-h-[calc(100vh-4rem)] border-r border-l border-sand-200">
            {/* Hero Section */}
            <section
                className="py-20 sm:py-28 border-b border-sand-200"
                style={{
                    backgroundImage: `repeating-linear-gradient(
                        45deg,
                        transparent,
                        transparent 10px,
                        rgba(233, 231, 222, 0.5) 10px,
                        rgba(233, 231, 222, 0.5) 11px
                    )`,
                }}
            >
                <div className="px-4 lg:px-6">
                    <div className="max-w-3xl mx-auto text-center">
                        <h1 className="text-h1 text-sand-1500">Connector Kit</h1>
                        <p className="text-body-xl text-sand-800 mt-4 max-w-2xl mx-auto">
                            Headless wallet connection components for Solana. Composable blocks, render props, zero
                            styling opinions.
                        </p>

                        {/* Actions */}
                        <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
                            <CopyButton
                                textToCopy={npmCommand}
                                displayText={
                                    <code className="font-berkeley-mono text-sm text-sand-1500">{npmCommand}</code>
                                }
                                className="px-5 py-2 bg-white hover:bg-sand-50 border border-sand-300 hover:border-sand-400 rounded-lg transition-colors shadow-sm"
                                iconClassName="text-sand-500 group-hover:text-sand-700"
                                iconClassNameCheck="text-green-600"
                            />

                            <Button onClick={scrollToPlayground} variant="default" size="sm" className="gap-2">
                                View Playground
                            </Button>
                        </div>
                    </div>
                </div>
            </section>

            {/* Features */}
            <Features />
            {/* Playground Section */}
            <section
                id="playground"
                className="py-12 border-b border-sand-200"
                style={{
                    backgroundImage: `repeating-linear-gradient(
                        45deg,
                        transparent,
                        transparent 10px,
                        rgba(233, 231, 222, 0.5) 10px,
                        rgba(233, 231, 222, 0.5) 11px
                    )`,
                }}
            >
                <div className="max-w-7xl mx-auto px-4 lg:px-6">
                    <h1 className="text-h2 text-sand-1500 mb-3 text-center">Playground</h1>
                    <p className="text-body-xl text-sand-800 text-center max-w-xl mx-auto">
                        Explore components, elements, hooks, and test transactions. Copy any example and customize it
                        for your app.
                    </p>
                </div>
            </section>

            {/* Tabbed Navigation */}
            <Tabs defaultValue="components" className="w-full">
                <div className="sticky top-16 z-40 bg-bg1/95 backdrop-blur-sm border-b border-sand-200">
                    <div className="max-w-7xl mx-auto flex items-center justify-between px-4 lg:px-6">
                        <TabsList className="h-14 justify-start gap-0 bg-transparent border-transparent p-0 rounded-none">
                            <TabsTrigger
                                value="components"
                                className="h-14 px-4 rounded-none border-b-2 border-transparent data-[state=active]:border-sand-1500 data-[state=active]:bg-transparent data-[state=active]:shadow-none gap-2"
                            >
                                <Blocks className="h-4 w-4" />
                                <span className="hidden sm:inline">Components</span>
                            </TabsTrigger>
                            <TabsTrigger
                                value="elements"
                                className="h-14 px-4 rounded-none border-b-2 border-transparent data-[state=active]:border-sand-1500 data-[state=active]:bg-transparent data-[state=active]:shadow-none gap-2"
                            >
                                <Code2 className="h-4 w-4" />
                                <span className="hidden sm:inline">Elements</span>
                            </TabsTrigger>
                            <TabsTrigger
                                value="hooks"
                                className="h-14 px-4 rounded-none border-b-2 border-transparent data-[state=active]:border-sand-1500 data-[state=active]:bg-transparent data-[state=active]:shadow-none gap-2"
                            >
                                <Anchor className="h-4 w-4" />
                                <span className="hidden sm:inline">Hooks</span>
                            </TabsTrigger>
                            <TabsTrigger
                                value="transactions"
                                className="h-14 px-4 rounded-none border-b-2 border-transparent data-[state=active]:border-sand-1500 data-[state=active]:bg-transparent data-[state=active]:shadow-none gap-2"
                            >
                                <Zap className="h-4 w-4" />
                                <span className="hidden sm:inline">Transactions</span>
                            </TabsTrigger>
                        </TabsList>
                        <ConnectButton />
                    </div>
                </div>

                <TabsContent value="components" className="mt-0">
                    <FeaturedSection />
                </TabsContent>

                <TabsContent value="elements" className="mt-0">
                    <ElementExamplesSection />
                </TabsContent>

                <TabsContent value="hooks" className="mt-0">
                    <HooksExamplesSection />
                </TabsContent>

                <TabsContent value="transactions" className="mt-0">
                    <TransactionsSection />
                </TabsContent>
            </Tabs>
        </div>
    );
}
