'use client';

import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
    FeaturedSection,
    BlockExamplesSection,
    HooksExamplesSection,
    TransactionsSection,
} from '@/components/playground';
import { Blocks, Code2, Anchor, Zap } from 'lucide-react';

export default function PlaygroundPage() {
    return (
        <div className="max-w-7xl mx-auto min-h-[calc(100vh-4rem)] border-r border-l border-sand-200">
            {/* Hero Section */}
            <section
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
                        Explore components, blocks, hooks, and test transactions. Copy any example and customize it for
                        your app.
                    </p>
                </div>
            </section>

            {/* Tabbed Navigation */}
            <Tabs defaultValue="components" className="w-full">
                <div className="sticky top-16 z-40 bg-bg1/95 backdrop-blur-sm border-b border-sand-200">
                    <div className="max-w-7xl mx-auto">
                        <TabsList className="h-14 w-full justify-start gap-0 bg-transparent p-0 rounded-none">
                            <TabsTrigger
                                value="components"
                                className="h-14 px-4 rounded-none border-b-2 border-transparent data-[state=active]:border-sand-1500 data-[state=active]:bg-transparent data-[state=active]:shadow-none gap-2"
                            >
                                <Blocks className="h-4 w-4" />
                                <span className="hidden sm:inline">Components</span>
                            </TabsTrigger>
                            <TabsTrigger
                                value="blocks"
                                className="h-14 px-4 rounded-none border-b-2 border-transparent data-[state=active]:border-sand-1500 data-[state=active]:bg-transparent data-[state=active]:shadow-none gap-2"
                            >
                                <Code2 className="h-4 w-4" />
                                <span className="hidden sm:inline">Blocks</span>
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
                    </div>
                </div>

                <TabsContent value="components" className="mt-0">
                    <FeaturedSection />
                </TabsContent>

                <TabsContent value="blocks" className="mt-0">
                    <BlockExamplesSection />
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
