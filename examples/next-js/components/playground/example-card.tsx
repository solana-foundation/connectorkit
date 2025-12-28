'use client';

import { useState } from 'react';
import { oneLight } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { CopyButton } from '@/components/ui/copy-button';
import { CodeBlock } from '@/components/ui/code-block';
import { ExampleCardHeaderActionsProvider, ExampleCardHeaderActionsSlot } from './example-card-actions';
import { useConnector } from '@solana/connector';
import { Plug } from 'lucide-react';
import { IconTypescriptLogo } from 'symbols-react';

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
    const [tab, setTab] = useState<'preview' | 'code'>('preview');

    return (
        <section className="py-12 border-b border-sand-200 last:border-b-0">
            <div className="grid grid-cols-12 gap-6 lg:gap-8">
                {/* Left column: Title and Description */}
                <div className="col-span-12 lg:col-span-4 flex flex-col justify-start px-4 lg:px-6">
                    <h3 className="text-title-5 font-diatype-medium text-sand-1500 mb-2">{example.name}</h3>
                    <p className="text-body-md font-inter text-sand-700">{example.description}</p>
                </div>

                {/* Right column: Tabs with Preview and Code */}
                <div className="col-span-12 lg:col-span-8 px-4 lg:px-6">
                    <ExampleCardHeaderActionsProvider>
                        <Tabs value={tab} onValueChange={v => setTab(v as 'preview' | 'code')} className="w-full">
                            <div className="flex flex-row justify-between items-center mb-4">
                                <div className="flex items-center">
                                    <ExampleCardHeaderActionsSlot />
                                </div>
                                <TabsList>
                                    <TabsTrigger className="text-xs" value="preview">
                                        Preview
                                    </TabsTrigger>
                                    <TabsTrigger className="text-xs" value="code">
                                        Code
                                    </TabsTrigger>
                                </TabsList>
                            </div>

                            <TabsContent value="preview" forceMount hidden={tab !== 'preview'}>
                                <Card
                                    className="border-sand-300 bg-sand-100 rounded-xl min-h-[180px]"
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
                                    <CardContent className="p-6 flex items-center justify-center min-h-[250px]">
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

                            <TabsContent value="code" forceMount hidden={tab !== 'code'}>
                                <Card className="border-sand-300 bg-[#fafafa] rounded-xl min-h-[180px] overflow-hidden pt-2">
                                    <CardContent className="p-0">
                                        <div className="flex items-center justify-between px-4 pb-2 pt-0 border-b border-sand-200">
                                            <div className="flex items-center gap-2">
                                                <IconTypescriptLogo className="h-4 w-4 fill-sand-400" />
                                                <span className="text-xs text-sand-1200 font-inter">
                                                    {example.fileName || 'TypeScript'}
                                                </span>
                                            </div>
                                            <CopyButton
                                                textToCopy={example.code}
                                                showText={false}
                                                className="w-8 h-8 flex items-center"
                                                iconClassName="text-sand-500 group-hover:text-sand-700 h-4 w-4 translate-y-[-1px] translate-x-[-8px]"
                                                iconClassNameCheck="text-green-600"
                                            />
                                        </div>
                                        <div className="max-h-[400px] overflow-y-auto">
                                            <CodeBlock
                                                code={example.code}
                                                language="tsx"
                                                style={oneLight}
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
                                                    color: '#9ca3af',
                                                    userSelect: 'none',
                                                }}
                                            />
                                        </div>
                                    </CardContent>
                                </Card>
                            </TabsContent>
                        </Tabs>
                    </ExampleCardHeaderActionsProvider>
                </div>
            </div>
        </section>
    );
}
