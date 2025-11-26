'use client';

import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { CopyButton } from '@/components/ui/copy-button';
import { useConnector } from '@solana/connector';
import { Code, Plug } from 'lucide-react';

export interface ExampleConfig {
    id: string;
    name: string;
    description: string;
    code: string;
    render: () => React.ReactNode;
    fullWidth?: boolean;
    fileName?: string;
}

interface ExampleCardProps {
    example: ExampleConfig;
    requiresConnection?: boolean;
}

export function ExampleCard({ example, requiresConnection = true }: ExampleCardProps) {
    const { connected } = useConnector();

    return (
        <section className="py-12 border-b border-sand-200 last:border-b-0">
            <div className="grid grid-cols-12 gap-6 lg:gap-8">
                {/* Left column: Title and Description */}
                <div className="col-span-12 lg:col-span-4 flex flex-col justify-start px-4 lg:px-6">
                    <h3 className="text-title-5 font-diatype-medium text-sand-1500 mb-2">
                        {example.name}
                    </h3>
                    <p className="text-body-md font-inter text-sand-700">
                        {example.description}
                    </p>
                </div>

                {/* Right column: Tabs with Preview and Code */}
                <div className="col-span-12 lg:col-span-8 px-4 lg:px-6">
                    <Tabs defaultValue="preview" className="w-full">
                        <div className="flex justify-end mb-4">
                            <TabsList>
                                <TabsTrigger className="text-xs" value="preview">Preview</TabsTrigger>
                                <TabsTrigger className="text-xs" value="code">Code</TabsTrigger>
                            </TabsList>
                        </div>

                        <TabsContent value="preview">
                            <Card 
                                className="border-sand-300 bg-sand-100/30 rounded-xl min-h-[180px]"
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
                                <CardContent className="p-6 flex items-center justify-center min-h-[200px]">
                                    {requiresConnection && !connected ? (
                                        <div className="flex items-center justify-center gap-2 text-center text-sand-600 text-body-md font-inter p-2 border-sand-300 border rounded-lg border-dashed bg-bg1">
                                            <Plug className="h-4 w-4 rotate-45" />
                                            Connect wallet to preview
                                        </div>
                                    ) : (
                                        example.render()
                                    )}
                                </CardContent>
                            </Card>
                        </TabsContent>

                        <TabsContent value="code">
                            <Card className="border-sand-300 bg-[#282c34] rounded-xl min-h-[180px] overflow-hidden">
                                <CardContent className="p-0">
                                    <div className="flex items-center justify-between px-4 pb-2 pt-0 border-b border-white/10">
                                        <div className="flex items-center gap-2">
                                            <Code className="h-3.5 w-3.5 text-sand-500" />
                                            <span className="text-xs text-sand-500 font-inter">
                                                {example.fileName || 'TypeScript'}
                                            </span>
                                        </div>
                                        <CopyButton 
                                            textToCopy={example.code}
                                            showText={false}
                                            iconClassName="text-sand-500 group-hover:text-sand-300"
                                            iconClassNameCheck="text-green-400"
                                        />
                                    </div>
                                    <div className="max-h-[400px] overflow-y-auto">
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
                                            {example.code}
                                        </SyntaxHighlighter>
                                    </div>
                                </CardContent>
                            </Card>
                        </TabsContent>
                    </Tabs>
                </div>
            </div>
        </section>
    );
}

