'use client';

import { useMemo, useSyncExternalStore } from 'react';
import { Prism as SyntaxHighlighter, type SyntaxHighlighterProps } from 'react-syntax-highlighter';
import type { CSSProperties } from 'react';
import { cn } from '@/lib/utils';

const emptySubscribe = () => () => {};
const getClientSnapshot = () => true;
const getServerSnapshot = () => false;

interface CodeBlockProps {
    code: string;
    language?: string;
    style: SyntaxHighlighterProps['style'];
    showLineNumbers?: boolean;
    customStyle?: CSSProperties;
    className?: string;
    lineNumberStyle?: CSSProperties;
    wrapLongLines?: boolean;
}

function getCodeLines(code: string) {
    const normalized = code.endsWith('\n') ? code.slice(0, -1) : code;
    return normalized.split('\n');
}

function CodeBlockFallback({
    code,
    showLineNumbers,
    customStyle,
    className,
}: Pick<CodeBlockProps, 'code' | 'showLineNumbers' | 'customStyle' | 'className'>) {
    const lines = useMemo(() => getCodeLines(code), [code]);

    return (
        <pre
            className={cn('overflow-auto rounded-lg bg-gray-50 p-4 text-xs leading-5 text-gray-800', className)}
            style={{
                margin: 0,
                ...customStyle,
            }}
        >
            <code>
                {showLineNumbers
                    ? lines.map((line, index) => (
                          <span key={index} className="block">
                              <span className="inline-block min-w-[2.25em] pr-4 text-right text-gray-400 select-none">
                                  {index + 1}
                              </span>
                              <span className="whitespace-pre">{line.length > 0 ? line : '\u00A0'}</span>
                          </span>
                      ))
                    : code}
            </code>
        </pre>
    );
}

export function CodeBlock({
    code,
    language = 'typescript',
    style,
    showLineNumbers = false,
    customStyle,
    className,
    lineNumberStyle,
    wrapLongLines,
}: CodeBlockProps) {
    const hasMounted = useSyncExternalStore(emptySubscribe, getClientSnapshot, getServerSnapshot);

    if (!hasMounted) {
        return (
            <CodeBlockFallback
                code={code}
                showLineNumbers={showLineNumbers}
                customStyle={customStyle}
                className={className}
            />
        );
    }

    return (
        <SyntaxHighlighter
            language={language}
            style={style}
            customStyle={customStyle}
            showLineNumbers={showLineNumbers}
            className={className}
            lineNumberStyle={lineNumberStyle}
            wrapLongLines={wrapLongLines}
        >
            {code}
        </SyntaxHighlighter>
    );
}
