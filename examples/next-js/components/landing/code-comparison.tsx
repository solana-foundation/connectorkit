'use client';

import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { Card, CardContent } from '@/components/ui/card';
import { CopyButton } from '@/components/ui/copy-button';

interface CodeComparisonProps {
    beforeTitle: string;
    beforeDescription: string;
    beforeCode: string;
    afterTitle: string;
    afterDescription: string;
    afterCode: string;
}

export function CodeComparison({
    beforeTitle,
    beforeDescription,
    beforeCode,
    afterTitle,
    afterDescription,
    afterCode,
}: CodeComparisonProps) {
    return (
        <section className="py-16 border-b border-sand-200">
            <div className="px-4 lg:px-6">
                <div className="text-center mb-12">
                    <h2 className="text-h2 text-sand-1500 mb-3">Zero to production in minutes</h2>
                    <p className="text-body-xl text-sand-800 max-w-4xl mx-auto">
                        Skip the boilerplate. ConnectorKit auto-detects wallets via Wallet Standard, no manual adapter
                        imports, no CSS files, no nested providers. Just one more provider, a few blocks, and
                        you&apos;re set.
                    </p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Before */}
                    <div>
                        <div className="mb-4">
                            <h3 className="text-title-5 text-sand-1500 font-diatype-medium">{beforeTitle}</h3>
                            <p className="text-body-md text-sand-700 font-inter mt-1">{beforeDescription}</p>
                        </div>
                        <Card className="border-sand-300 bg-[#282c34] rounded-xl shadow-sm overflow-hidden">
                            <CardContent className="p-0">
                                <div className="flex items-center justify-between px-4 py-2 border-b border-white/10">
                                    <span className="text-xs text-sand-500 font-inter">TypeScript</span>
                                    <CopyButton
                                        textToCopy={beforeCode}
                                        showText={false}
                                        iconClassName="text-sand-500 group-hover:text-sand-300"
                                        iconClassNameCheck="text-green-400"
                                    />
                                </div>
                                <div className="max-h-[1200px] overflow-y-auto">
                                    <SyntaxHighlighter
                                        language="typescript"
                                        style={oneDark}
                                        customStyle={{
                                            margin: 0,
                                            padding: '1rem',
                                            background: 'transparent',
                                            fontSize: '0.75rem',
                                            lineHeight: '1.5',
                                        }}
                                        showLineNumbers
                                        lineNumberStyle={{
                                            minWidth: '2.5em',
                                            paddingRight: '1em',
                                            color: '#636d83',
                                            userSelect: 'none',
                                        }}
                                    >
                                        {beforeCode}
                                    </SyntaxHighlighter>
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* After */}
                    <div>
                        <div className="mb-4">
                            <h3 className="text-title-5 text-sand-1500 font-diatype-medium">{afterTitle}</h3>
                            <p className="text-body-md text-sand-700 font-inter mt-1">{afterDescription}</p>
                        </div>
                        <Card className="border-green-500/30 bg-[#282c34] rounded-xl shadow-sm overflow-hidden ring-1 ring-green-500/20">
                            <CardContent className="p-0">
                                <div className="flex items-center justify-between px-4 py-2 border-b border-white/10">
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs text-sand-500 font-inter">TypeScript</span>
                                        <span className="text-xs text-green-400 font-inter-medium">✓ Recommended</span>
                                    </div>
                                    <CopyButton
                                        textToCopy={afterCode}
                                        showText={false}
                                        iconClassName="text-sand-500 group-hover:text-sand-300"
                                        iconClassNameCheck="text-green-400"
                                    />
                                </div>
                                <div className="max-h-[1200px] overflow-y-auto">
                                    <SyntaxHighlighter
                                        language="tsx"
                                        style={oneDark}
                                        customStyle={{
                                            margin: 0,
                                            padding: '1rem',
                                            background: 'transparent',
                                            fontSize: '0.75rem',
                                            lineHeight: '1.5',
                                        }}
                                        showLineNumbers
                                        lineNumberStyle={{
                                            minWidth: '2.5em',
                                            paddingRight: '1em',
                                            color: '#636d83',
                                            userSelect: 'none',
                                        }}
                                    >
                                        {afterCode}
                                    </SyntaxHighlighter>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>
        </section>
    );
}
