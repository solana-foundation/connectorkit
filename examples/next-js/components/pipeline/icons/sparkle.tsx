import React from 'react';

interface IconSparkleProps {
    className?: string;
    width?: number;
    height?: number;
}

export function IconSparkle({ className, width = 19.3848, height = 19.0137 }: IconSparkleProps) {
    return (
        <svg
            className={className}
            width={width}
            height={height}
            viewBox="0 0 19.3848 19.0137"
            fill="currentColor"
            stroke="none"
            xmlns="http://www.w3.org/2000/svg"
        >
            <g>
                <rect height="19.0137" opacity="0" width="19.3848" x="0" y="0" />
                <path
                    d="M9.51172 19.0039C9.87305 19.0039 10.166 18.7402 10.2246 18.3496C11.0645 11.8457 11.9824 10.918 18.3398 10.2148C18.7402 10.1758 19.0234 9.88281 19.0234 9.50195C19.0234 9.12109 18.7402 8.82812 18.3398 8.7793C11.9824 8.08594 11.0645 7.1582 10.2246 0.644531C10.166 0.253906 9.87305 0 9.51172 0C9.15039 0 8.85742 0.253906 8.79883 0.644531C7.95898 7.1582 7.04102 8.08594 0.683594 8.7793C0.283203 8.82812 0 9.12109 0 9.50195C0 9.88281 0.283203 10.1758 0.683594 10.2148C7.04102 11.0547 7.90039 11.8555 8.79883 18.3496C8.85742 18.7402 9.15039 19.0039 9.51172 19.0039Z"
                    fillOpacity="0.85"
                />
            </g>
        </svg>
    );
}
