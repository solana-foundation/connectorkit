'use client';

import {
    Blocks,
    Paintbrush,
    Zap,
    Shield,
    Code2,
    Layers,
    RefreshCw,
    Smartphone,
    Network,
    Lock,
    Puzzle,
    Globe,
} from 'lucide-react';

const features = [
    {
        icon: Layers,
        title: 'Headless Core',
        description: 'React hooks + framework-agnostic ConnectorClient. Works with Vue, Svelte, or vanilla JavaScript.',
    },
    {
        icon: Blocks,
        title: 'Composable Elements',
        description:
            'Pre-built AccountElement, BalanceElement, TokenListElement, TransactionHistoryElement, and more. Mix and match to build any wallet UI.',
    },
    {
        icon: Paintbrush,
        title: 'Render Props',
        description:
            'Every block accepts render props for complete UI control. Use your own components, styling, and layouts.',
    },
    {
        icon: Shield,
        title: 'Wallet Standard',
        description:
            'Built on the official Wallet Standard protocol. Auto-detects Phantom, Solflare, Backpack, and any compliant wallet.',
    },
    {
        icon: Code2,
        title: 'Transaction Signer',
        description:
            'Dual API support for modern @solana/kit and legacy @solana/web3.js. Unified signing, sending, and batching.',
    },
    {
        icon: Network,
        title: 'Connection Pooling',
        description:
            'Reusable RPC connections with automatic caching. Reduces memory usage and initialization overhead.',
    },
    {
        icon: Smartphone,
        title: 'Mobile Wallet Adapter',
        description: 'First-class Solana Mobile support. Connect to mobile wallets with the same API as desktop.',
    },
    {
        icon: RefreshCw,
        title: 'Auto-Connect',
        description: 'Persistent wallet selection with SSR-safe storage. Users stay connected across page refreshes.',
    },
    {
        icon: Globe,
        title: 'Network Switching',
        description: 'Built-in cluster management for mainnet, devnet, testnet, and custom RPC endpoints.',
    },
    {
        icon: Puzzle,
        title: 'Backward Compatibility',
        description: 'Drop-in compatibility bridge for existing @solana/wallet-adapter code. Migrate incrementally.',
    },
    {
        icon: Lock,
        title: 'Production Diagnostics',
        description:
            'Health checks, debug metrics, and React error boundaries. Built-in image proxy to protect user privacy.',
    },
    {
        icon: Zap,
        title: 'Small Bundle Size',
        description:
            'Tree-shakeable exports. Import only what you need. Debug tools auto-excluded in production builds.',
    },
];

export function Features() {
    return (
        <section className="py-12 border-b border-sand-200">
            <div className="px-4 lg:px-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12">
                    {features.map(feature => (
                        <div key={feature.title} className="group transition-all">
                            <div className="flex items-center justify-left gap-2 mb-2">
                                <feature.icon className="h-3.5 w-3.5 text-sand-700" />
                                <h3 className="text-body-md font-inter-medium text-sand-1500">{feature.title}</h3>
                            </div>
                            <p className="text-xs text-sand-600 font-inter leading-relaxed">{feature.description}</p>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}
