'use client';

import Link from 'next/link';
import { ArrowRight, Blocks, Code2, Sparkles } from 'lucide-react';
import { CopyButton } from '@/components/ui/copy-button';
import { Features } from '@/components/landing';

export default function Home() {
    const npmCommand = 'npm install @solana/connector';

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
                    )`
                }}
            >
                <div className="px-4 lg:px-6">
                    <div className="max-w-3xl mx-auto text-center">
                        <h1 className="text-h1 text-sand-1500">
                            Connector Kit
                        </h1>
                        <p className="text-body-xl text-sand-800 mt-4 max-w-2xl mx-auto">
                            Headless wallet connection components for Solana. 
                            Composable blocks, render props, zero styling opinions.
                        </p>
                        
                        {/* Actions */}
                        <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
                            <CopyButton
                                textToCopy={npmCommand}
                                displayText={
                                    <code className="font-berkeley-mono text-sm text-sand-1500">
                                        {npmCommand}
                                    </code>
                                }
                                className="px-5 py-2 bg-white hover:bg-sand-50 border border-sand-300 hover:border-sand-400 rounded-lg transition-colors shadow-sm"
                                iconClassName="text-sand-500 group-hover:text-sand-700"
                                iconClassNameCheck="text-green-600"
                            />
                            
                            <Link 
                                href="/playground"
                                className="inline-flex items-center gap-2 px-5 py-2.5 bg-sand-1500 hover:bg-sand-1400 text-white rounded-lg transition-colors font-inter-medium text-body-md"
                            >
                                View Playground
                                <ArrowRight className="h-4 w-4" />
                            </Link>
                        </div>
                    </div>
                </div>
            </section>

            {/* Features */}
            <Features />

        </div>
    );
}
