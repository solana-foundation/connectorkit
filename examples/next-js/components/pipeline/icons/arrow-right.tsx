import React from 'react';

interface IconArrowRightProps {
    className?: string;
    width?: number;
    height?: number;
    fill?: string;
    stroke?: string;
}

export function IconArrowRight({
    className,
    width = 24,
    height = 24,
    fill = 'currentColor',
    stroke = 'currentColor',
}: IconArrowRightProps) {
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
                d="M3.75 11.25C3.19772 11.25 2.75 11.6977 2.75 12.25C2.75 12.8023 3.19772 13.25 3.75 13.25L3.75 12.25L3.75 11.25ZM19.75 12.25L19.75 11.25L3.75 11.25L3.75 12.25L3.75 13.25L19.75 13.25L19.75 12.25Z"
                fill={fill}
            />
            <path
                d="M17.25 9.25C18.4216 10.4216 19.0784 11.0784 20.25 12.25L17.25 15.25"
                stroke={stroke}
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
        </svg>
    );
}
