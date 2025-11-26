'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LogoPlain } from './logo-plain';

const navLinks = [
    { href: '/', label: 'Home' },
    { href: '/playground', label: 'Playground' },
];

export function AppNav() {
    const pathname = usePathname();

    return (
        <header className="sticky top-0 z-50 w-full border-b border-border-low bg-bg1/80 backdrop-blur-sm">
            <div className="mx-auto flex h-16 max-w-7xl items-center justify-between">
                {/* Logo & Brand */}
                <div className="w-full flex items-center justify-between gap-8">
                    <Link href="/" className="flex items-center gap-2">
                        <LogoPlain width={32} height={32} className="flex-shrink-0" />
                        <span className="font-diatype-bold text-title-5 text-sand-1500 hidden sm:block">
                            Connector Kit
                        </span>
                    </Link>

                    {/* Navigation Links */}
                    <nav className="hidden md:flex items-center gap-1">
                        {navLinks.map(link => {
                            const isActive = pathname === link.href;
                            return (
                                <Link
                                    key={link.href}
                                    href={link.href}
                                    className={`
                                        text-nav-item px-3 py-2 rounded-md transition-colors
                                        ${
                                            isActive
                                                ? 'bg-sand-200 text-sand-1500'
                                                : 'text-sand-900 hover:text-sand-1500 hover:bg-sand-100'
                                        }
                                    `}
                                >
                                    {link.label}
                                </Link>
                            );
                        })}
                    </nav>
                </div>
            </div>
        </header>
    );
}
