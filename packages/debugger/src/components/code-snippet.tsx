/**
 * @solana/connector-debugger - Code Snippet Component
 *
 * Displays code snippets with syntax highlighting and copy functionality
 */

'use client';

import { useState } from 'react';

interface CodeSnippetProps {
    code: string;
    language?: string;
    title?: string;
    maxHeight?: number;
}

/**
 * Code snippet display with copy button
 */
export function CodeSnippet({ code, language = 'typescript', title, maxHeight = 400 }: CodeSnippetProps) {
    const [copied, setCopied] = useState(false);

    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(code);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (err) {
            console.error('Failed to copy code:', err);
        }
    };

    return (
        <div
            style={{
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: 8,
                overflow: 'hidden',
                backgroundColor: 'rgba(0, 0, 0, 0.3)',
            }}
        >
            {/* Header */}
            {title && (
                <div
                    style={{
                        padding: '8px 12px',
                        borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        backgroundColor: 'rgba(255, 255, 255, 0.03)',
                    }}
                >
                    <span style={{ fontSize: 10, fontWeight: 600, opacity: 0.8 }}>{title}</span>
                    <button
                        onClick={handleCopy}
                        style={{
                            padding: '4px 8px',
                            fontSize: 9,
                            backgroundColor: copied ? 'rgba(34, 197, 94, 0.2)' : 'rgba(255, 255, 255, 0.1)',
                            border: copied ? '1px solid rgba(34, 197, 94, 0.3)' : '1px solid rgba(255, 255, 255, 0.2)',
                            borderRadius: 4,
                            color: copied ? '#22c55e' : 'rgba(255, 255, 255, 0.9)',
                            cursor: 'pointer',
                            fontWeight: 500,
                            transition: 'all 0.2s ease',
                        }}
                    >
                        {copied ? '✓ Copied' : 'Copy'}
                    </button>
                </div>
            )}

            {/* Code */}
            <div
                style={{
                    padding: 12,
                    maxHeight,
                    overflowY: 'auto',
                    fontSize: 9,
                    fontFamily: 'monospace',
                    lineHeight: 1.5,
                    color: 'rgba(255, 255, 255, 0.9)',
                }}
            >
                <pre style={{ margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                    <code>{code}</code>
                </pre>
            </div>

            {/* Copy button (if no title) */}
            {!title && (
                <div
                    style={{
                        padding: '8px 12px',
                        borderTop: '1px solid rgba(255, 255, 255, 0.1)',
                        display: 'flex',
                        justifyContent: 'flex-end',
                    }}
                >
                    <button
                        onClick={handleCopy}
                        style={{
                            padding: '4px 10px',
                            fontSize: 9,
                            backgroundColor: copied ? 'rgba(34, 197, 94, 0.2)' : 'rgba(255, 255, 255, 0.1)',
                            border: copied ? '1px solid rgba(34, 197, 94, 0.3)' : '1px solid rgba(255, 255, 255, 0.2)',
                            borderRadius: 4,
                            color: copied ? '#22c55e' : 'rgba(255, 255, 255, 0.9)',
                            cursor: 'pointer',
                            fontWeight: 500,
                            transition: 'all 0.2s ease',
                        }}
                    >
                        {copied ? '✓ Copied' : 'Copy Code'}
                    </button>
                </div>
            )}
        </div>
    );
}

/**
 * Inline code snippet (single line)
 */
export function InlineCode({ children }: { children: string }) {
    return (
        <code
            style={{
                padding: '2px 6px',
                backgroundColor: 'rgba(255, 255, 255, 0.1)',
                borderRadius: 4,
                fontSize: 9,
                fontFamily: 'monospace',
                border: '1px solid rgba(255, 255, 255, 0.1)',
            }}
        >
            {children}
        </code>
    );
}
