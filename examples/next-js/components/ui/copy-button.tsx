'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Check, Copy } from 'lucide-react';
import { cn } from '../../lib/utils';

interface CopyButtonProps {
    textToCopy: string;
    displayText?: string | React.ReactNode;
    className?: string;
    iconClassName?: string;
    iconClassNameCheck?: string;
    showText?: boolean;
    disabled?: boolean;
}

export function CopyButton({
    textToCopy,
    displayText,
    className,
    iconClassName,
    iconClassNameCheck,
    showText = true,
    disabled,
}: CopyButtonProps) {
    const [copied, setCopied] = useState(false);

    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(textToCopy);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (error) {
            console.error('Failed to copy:', error);
        }
    };

    return (
        <button
            onClick={handleCopy}
            disabled={disabled}
            className={cn(
                'group flex items-center justify-between gap-2 hover:opacity-80 hover:cursor-pointer',
                className,
                disabled && 'opacity-50 cursor-not-allowed',
            )}
        >
            {showText && <span className="font-mono font-medium text-primary-50">{displayText || textToCopy}</span>}
            <div className="relative h-3.5 w-3.5 flex items-center justify-center">
                <AnimatePresence>
                    {copied ? (
                        <motion.div
                            key="checkmark"
                            className="absolute inset-0 flex items-center justify-center"
                            initial={{ opacity: 0, rotate: 90, scale: 0 }}
                            animate={{ opacity: 1, rotate: 0, scale: 1 }}
                            exit={{ opacity: 0, rotate: -10, scale: 0.8 }}
                            transition={{ duration: 0.22, ease: [0.175, 0.885, 0.32, 1.1] }}
                        >
                            <Check
                                className={cn('h-3.5 w-3.5 text-green-500 dark:text-green-300', iconClassNameCheck)}
                            />
                        </motion.div>
                    ) : (
                        <motion.div
                            key="copy"
                            className="absolute inset-0"
                            initial={{ opacity: 0, rotateZ: -90, scale: 0.8 }}
                            animate={{ opacity: 1, rotateZ: 0, scale: 1 }}
                            exit={{ opacity: 0, rotateZ: -20, scale: 0 }}
                            transition={{ duration: 0.22, ease: [0.175, 0.885, 0.32, 1.1] }}
                            style={{ transformOrigin: 'bottom right' }}
                        >
                            <Copy
                                className={cn(
                                    'h-3.5 w-3.5 text-primary-400 group-hover:text-primary-700 dark:group-hover:text-primary-50',
                                    iconClassName,
                                )}
                            />
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </button>
    );
}
