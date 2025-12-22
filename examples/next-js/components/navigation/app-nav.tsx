'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { LogoPlain } from './logo-plain';
import { IconGithubLogo, IconStarFill } from 'symbols-react';
import { Button } from '@/components/ui/button';
import { CopyButton } from '@/components/ui/copy-button';

export function AppNav() {
    const [stars, setStars] = useState<number | null>(null);
    const [showCopyButton, setShowCopyButton] = useState(false);
    const npmCommand = 'npm i @solana/connector';

    useEffect(() => {
        async function fetchStars() {
            try {
                const response = await fetch('https://api.github.com/repos/solana-foundation/connectorkit');
                if (response.ok) {
                    const data = await response.json();
                    setStars(data.stargazers_count);
                }
            } catch (error) {
                console.error('Failed to fetch GitHub stars:', error);
            }
        }
        fetchStars();
    }, []);

    useEffect(() => {
        const handleScroll = () => {
            // Check if we've scrolled past the hero section (approximately 300px)
            const heroSection = document.querySelector('section:first-of-type');
            if (heroSection) {
                const heroBottom = heroSection.getBoundingClientRect().bottom;
                setShowCopyButton(heroBottom < 0);
            } else {
                // Fallback: use scroll position
                setShowCopyButton(window.scrollY > 300);
            }
        };

        window.addEventListener('scroll', handleScroll);
        handleScroll(); // Check initial position

        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    return (
        <header className="sticky top-0 z-50 w-full border-b border-border-low bg-bg1/80 backdrop-blur-sm">
            <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-1">
                {/* Logo & Brand */}
                <div className="w-full flex items-center justify-between gap-8">
                    <Link href="/" className="flex items-center gap-2">
                        <LogoPlain width={32} height={32} className="flex-shrink-0" />
                        <span className="font-diatype-bold text-title-5 text-sand-1500 hidden sm:block">
                            Connector Kit
                        </span>
                    </Link>

                    {/* Copy Button & GitHub Button */}
                    <div className="flex items-center gap-2">
                        {showCopyButton && (
                            <CopyButton
                                textToCopy={npmCommand}
                                displayText={
                                    <code className="font-berkeley-mono text-xs text-sand-1500">{npmCommand}</code>
                                }
                                className="px-4 py-1.5 bg-white hover:bg-sand-50 border border-sand-300 hover:border-sand-400 rounded-md transition-colors shadow-sm"
                                iconClassName="text-sand-500 group-hover:text-sand-700"
                                iconClassNameCheck="text-green-600"
                            />
                        )}
                        <Button
                            onClick={() => {
                                window.open('https://github.com/solana-foundation/connectorkit', '_blank');
                            }}
                            variant="outline"
                            size="sm"
                            className=""
                        >
                            <IconGithubLogo className="h-4 w-4 fill-sand-700" />
                            <span className="text-xs font-berkeley-mono">GitHub</span>
                        </Button>
                        {stars !== null && (
                            <span className="flex items-center gap-1 text-sm">
                                <IconStarFill className="h-4 w-4 fill-amber-500" />
                                {stars.toLocaleString()}
                            </span>
                        )}
                    </div>
                </div>
            </div>
        </header>
    );
}
