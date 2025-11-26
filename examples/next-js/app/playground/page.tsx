'use client';

import { FeaturedSection, BlockExamplesSection, HooksExamplesSection } from '@/components/playground';

export default function PlaygroundPage() {
    return (
        <div className="max-w-7xl mx-auto min-h-[calc(100vh-4rem)] border-r border-l border-sand-200">
            {/* Hero Section */}
            <section 
                className="py-16 border-b border-sand-200"
            >
                <div className="max-w-7xl mx-auto px-4 lg:px-6">
                    <h1 className="text-h2 text-sand-1500 mb-3 text-center">
                        Playground
                    </h1>
                    <p className="text-body-xl text-sand-800 text-center max-w-xl mx-auto">
                        Explore blocks, hooks, and complete implementations. Copy any example and customize it for your app.
                    </p>
                </div>
            </section>

            {/* Featured: Full ConnectButton Component */}
            <FeaturedSection />

            {/* Individual Block Components */}
            <BlockExamplesSection />

            {/* Headless Hooks */}
            <HooksExamplesSection />
        </div>
    );
}
