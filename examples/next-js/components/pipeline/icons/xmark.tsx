import React from 'react';

interface IconXmarkProps {
    className?: string;
    width?: number;
    height?: number;
    fill?: string;
}

export function IconXmark({ className, width = 16, height = 16, fill = 'currentColor' }: IconXmarkProps) {
    return (
        <svg
            className={className}
            width={width}
            height={height}
            viewBox="0 0 16 16"
            fill={fill}
            xmlns="http://www.w3.org/2000/svg"
        >
            <g>
                <rect height="15.4956" opacity="0" width="15.8472" x="0" y="0"></rect>
                <path
                    d="M0.252699 15.2429C0.594496 15.575 1.1609 15.575 1.49293 15.2429L7.74293 8.99293L13.9929 15.2429C14.325 15.575 14.9011 15.5847 15.2332 15.2429C15.5652 14.9011 15.5652 14.3445 15.2332 14.0125L8.98317 7.7527L15.2332 1.5027C15.5652 1.17067 15.575 0.604261 15.2332 0.27223C14.8914-0.0695668 14.325-0.0695668 13.9929 0.27223L7.74293 6.52223L1.49293 0.27223C1.1609-0.0695668 0.58473-0.0793324 0.252699 0.27223C-0.0793324 0.614027-0.0793324 1.17067 0.252699 1.5027L6.5027 7.7527L0.252699 14.0125C-0.0793324 14.3445-0.0890981 14.9109 0.252699 15.2429Z"
                    fillOpacity="0.85"
                ></path>
            </g>
        </svg>
    );
}
