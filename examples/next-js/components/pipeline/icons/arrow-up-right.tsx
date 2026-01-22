import React from 'react';

interface IconArrowUpRightProps {
    className?: string;
    width?: number;
    height?: number;
    stroke?: string;
}

export function IconArrowUpRight({
    className,
    width = 16,
    height = 16,
    stroke = 'currentColor',
}: IconArrowUpRightProps) {
    return (
        <svg
            className={className}
            width={width}
            height={height}
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
        >
            <path
                d="M7 17L17 7M17 7H7M17 7V17"
                stroke={stroke}
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
        </svg>
    );
}
