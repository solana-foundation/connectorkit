import * as React from 'react';

interface RadixUILogoProps extends React.SVGProps<SVGSVGElement> {
    size?: number;
}

export function RadixUILogo({ size = 20, className, ...props }: RadixUILogoProps) {
    return (
        <svg
            width={size}
            height={(size * 23) / 15}
            viewBox="0 0 15 23"
            fill="currentColor"
            aria-label="Radix UI"
            className={className}
            {...props}
        >
            <path d="M7 23C3.13401 23 0 19.6422 0 15.5C0 11.3578 3.13401 8 7 8V23Z" />
            <path d="M7 0H0V7H7V0Z" />
            <path d="M11.5 7C13.433 7 15 5.433 15 3.5C15 1.567 13.433 0 11.5 0C9.56704 0 8 1.567 8 3.5C8 5.433 9.56704 7 11.5 7Z" />
        </svg>
    );
}
