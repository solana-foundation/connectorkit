interface LogoProps {
    className?: string;
    width?: number;
    height?: number;
}

export function Logo({ className, width = 106, height = 106 }: LogoProps) {
    return (
        <svg
            width={width}
            height={height}
            viewBox="0 0 106 106"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className={className}
        >
            <g filter="url(#filter0_ddd_390_1181)">
                <path
                    d="M9 35C9 23.799 9 18.1984 11.1799 13.9202C13.0973 10.1569 16.1569 7.09734 19.9202 5.17987C24.1984 3 29.799 3 41 3H65C76.201 3 81.8016 3 86.0798 5.17987C89.843 7.09734 92.9027 10.1569 94.8201 13.9202C97 18.1984 97 23.799 97 35V59C97 70.201 97 75.8016 94.8201 80.0798C92.9027 83.843 89.843 86.9027 86.0798 88.8201C81.8016 91 76.201 91 65 91H41C29.799 91 24.1984 91 19.9202 88.8201C16.1569 86.9027 13.0973 83.843 11.1799 80.0798C9 75.8016 9 70.201 9 59V35Z"
                    fill="url(#paint0_radial_390_1181)"
                />
                <path
                    d="M41 3.75H65C70.6129 3.75 74.7778 3.75012 78.0752 4.01953C81.3636 4.28822 83.7236 4.82068 85.7393 5.84766C89.3614 7.69322 92.3068 10.6386 94.1523 14.2607C95.1793 16.2764 95.7118 18.6364 95.9805 21.9248C96.2499 25.2222 96.25 29.3871 96.25 35V59C96.25 64.6129 96.2499 68.7778 95.9805 72.0752C95.7118 75.3636 95.1793 77.7236 94.1523 79.7393C92.3068 83.3614 89.3614 86.3068 85.7393 88.1523C83.7236 89.1793 81.3636 89.7118 78.0752 89.9805C74.7778 90.2499 70.6129 90.25 65 90.25H41C35.3871 90.25 31.2222 90.2499 27.9248 89.9805C24.6364 89.7118 22.2764 89.1793 20.2607 88.1523C16.6386 86.3068 13.6932 83.3614 11.8477 79.7393C10.8207 77.7236 10.2882 75.3636 10.0195 72.0752C9.75012 68.7778 9.75 64.6129 9.75 59V35C9.75 29.3871 9.75012 25.2222 10.0195 21.9248C10.2882 18.6364 10.8207 16.2764 11.8477 14.2607C13.6932 10.6386 16.6386 7.69322 20.2607 5.84766C22.2764 4.82068 24.6364 4.28822 27.9248 4.01953C31.2222 3.75012 35.3871 3.75 41 3.75Z"
                    stroke="url(#paint1_linear_390_1181)"
                    strokeWidth="1.5"
                />
                <path
                    d="M41 3.75H65C70.6129 3.75 74.7778 3.75012 78.0752 4.01953C81.3636 4.28822 83.7236 4.82068 85.7393 5.84766C89.3614 7.69322 92.3068 10.6386 94.1523 14.2607C95.1793 16.2764 95.7118 18.6364 95.9805 21.9248C96.2499 25.2222 96.25 29.3871 96.25 35V59C96.25 64.6129 96.2499 68.7778 95.9805 72.0752C95.7118 75.3636 95.1793 77.7236 94.1523 79.7393C92.3068 83.3614 89.3614 86.3068 85.7393 88.1523C83.7236 89.1793 81.3636 89.7118 78.0752 89.9805C74.7778 90.2499 70.6129 90.25 65 90.25H41C35.3871 90.25 31.2222 90.2499 27.9248 89.9805C24.6364 89.7118 22.2764 89.1793 20.2607 88.1523C16.6386 86.3068 13.6932 83.3614 11.8477 79.7393C10.8207 77.7236 10.2882 75.3636 10.0195 72.0752C9.75012 68.7778 9.75 64.6129 9.75 59V35C9.75 29.3871 9.75012 25.2222 10.0195 21.9248C10.2882 18.6364 10.8207 16.2764 11.8477 14.2607C13.6932 10.6386 16.6386 7.69322 20.2607 5.84766C22.2764 4.82068 24.6364 4.28822 27.9248 4.01953C31.2222 3.75012 35.3871 3.75 41 3.75Z"
                    stroke="url(#paint2_linear_390_1181)"
                    strokeWidth="1.5"
                />
                <g filter="url(#filter1_dddiii_390_1181)">
                    <path
                        d="M53 61.95C53 62.5299 52.5299 63 51.95 63H46.05C45.4701 63 45 62.5299 45 61.95V56.05C45 55.4701 44.5299 55 43.95 55H38.05C37.4701 55 37 54.5299 37 53.95V48.05C37 47.4701 37.4701 47 38.05 47H53V61.95ZM69 61.95C69 62.5299 68.5299 63 67.95 63H62.05C61.4701 63 61 62.5299 61 61.95V56.05C61 55.4701 61.4701 55 62.05 55H67.95C68.5299 55 69 55.4701 69 56.05V61.95ZM61 37.95C61 38.5299 61.4701 39 62.05 39H67.95C68.5299 39 69 39.4701 69 40.05V45.95C69 46.5299 68.5299 47 67.95 47H53V32.05C53 31.4701 53.4701 31 54.05 31H59.95C60.5299 31 61 31.4701 61 32.05V37.95ZM45 37.95C45 38.5299 44.5299 39 43.95 39H38.05C37.4701 39 37 38.5299 37 37.95V32.05C37 31.4701 37.4701 31 38.05 31H43.95C44.5299 31 45 31.4701 45 32.05V37.95Z"
                        fill="black"
                    />
                    <path
                        d="M53 61.95C53 62.5299 52.5299 63 51.95 63H46.05C45.4701 63 45 62.5299 45 61.95V56.05C45 55.4701 44.5299 55 43.95 55H38.05C37.4701 55 37 54.5299 37 53.95V48.05C37 47.4701 37.4701 47 38.05 47H53V61.95ZM69 61.95C69 62.5299 68.5299 63 67.95 63H62.05C61.4701 63 61 62.5299 61 61.95V56.05C61 55.4701 61.4701 55 62.05 55H67.95C68.5299 55 69 55.4701 69 56.05V61.95ZM61 37.95C61 38.5299 61.4701 39 62.05 39H67.95C68.5299 39 69 39.4701 69 40.05V45.95C69 46.5299 68.5299 47 67.95 47H53V32.05C53 31.4701 53.4701 31 54.05 31H59.95C60.5299 31 61 31.4701 61 32.05V37.95ZM45 37.95C45 38.5299 44.5299 39 43.95 39H38.05C37.4701 39 37 38.5299 37 37.95V32.05C37 31.4701 37.4701 31 38.05 31H43.95C44.5299 31 45 31.4701 45 32.05V37.95Z"
                        fill="url(#paint3_radial_390_1181)"
                    />
                </g>
            </g>
            <defs>
                <filter
                    id="filter0_ddd_390_1181"
                    x="0"
                    y="0"
                    width="106"
                    height="106"
                    filterUnits="userSpaceOnUse"
                    colorInterpolationFilters="sRGB"
                >
                    <feFlood floodOpacity="0" result="BackgroundImageFix" />
                    <feColorMatrix
                        in="SourceAlpha"
                        type="matrix"
                        values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0"
                        result="hardAlpha"
                    />
                    <feOffset dy="0.399006" />
                    <feGaussianBlur stdDeviation="0.299255" />
                    <feColorMatrix type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.0646228 0" />
                    <feBlend mode="normal" in2="BackgroundImageFix" result="effect1_dropShadow_390_1181" />
                    <feColorMatrix
                        in="SourceAlpha"
                        type="matrix"
                        values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0"
                        result="hardAlpha"
                    />
                    <feOffset dy="1.34018" />
                    <feGaussianBlur stdDeviation="1.00513" />
                    <feColorMatrix type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.0953772 0" />
                    <feBlend mode="normal" in2="effect1_dropShadow_390_1181" result="effect2_dropShadow_390_1181" />
                    <feColorMatrix
                        in="SourceAlpha"
                        type="matrix"
                        values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0"
                        result="hardAlpha"
                    />
                    <feOffset dy="6" />
                    <feGaussianBlur stdDeviation="4.5" />
                    <feColorMatrix type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.16 0" />
                    <feBlend mode="normal" in2="effect2_dropShadow_390_1181" result="effect3_dropShadow_390_1181" />
                    <feBlend mode="normal" in="SourceGraphic" in2="effect3_dropShadow_390_1181" result="shape" />
                </filter>
                <filter
                    id="filter1_dddiii_390_1181"
                    x="25"
                    y="27"
                    width="56"
                    height="56"
                    filterUnits="userSpaceOnUse"
                    colorInterpolationFilters="sRGB"
                >
                    <feFlood floodOpacity="0" result="BackgroundImageFix" />
                    <feColorMatrix
                        in="SourceAlpha"
                        type="matrix"
                        values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0"
                        result="hardAlpha"
                    />
                    <feOffset dy="0.532008" />
                    <feGaussianBlur stdDeviation="0.399006" />
                    <feColorMatrix type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.0646228 0" />
                    <feBlend mode="normal" in2="BackgroundImageFix" result="effect1_dropShadow_390_1181" />
                    <feColorMatrix
                        in="SourceAlpha"
                        type="matrix"
                        values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0"
                        result="hardAlpha"
                    />
                    <feOffset dy="1.7869" />
                    <feGaussianBlur stdDeviation="1.34018" />
                    <feColorMatrix type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.0953772 0" />
                    <feBlend mode="normal" in2="effect1_dropShadow_390_1181" result="effect2_dropShadow_390_1181" />
                    <feColorMatrix
                        in="SourceAlpha"
                        type="matrix"
                        values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0"
                        result="hardAlpha"
                    />
                    <feOffset dy="8" />
                    <feGaussianBlur stdDeviation="6" />
                    <feColorMatrix type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.16 0" />
                    <feBlend mode="normal" in2="effect2_dropShadow_390_1181" result="effect3_dropShadow_390_1181" />
                    <feBlend mode="normal" in="SourceGraphic" in2="effect3_dropShadow_390_1181" result="shape" />
                    <feColorMatrix
                        in="SourceAlpha"
                        type="matrix"
                        values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0"
                        result="hardAlpha"
                    />
                    <feMorphology radius="9" operator="erode" in="SourceAlpha" result="effect4_innerShadow_390_1181" />
                    <feOffset />
                    <feGaussianBlur stdDeviation="0.6" />
                    <feComposite in2="hardAlpha" operator="arithmetic" k2="-1" k3="1" />
                    <feColorMatrix
                        type="matrix"
                        values="0 0 0 0 0.964706 0 0 0 0 0.945098 0 0 0 0 0.933333 0 0 0 1 0"
                    />
                    <feBlend mode="normal" in2="shape" result="effect4_innerShadow_390_1181" />
                    <feColorMatrix
                        in="SourceAlpha"
                        type="matrix"
                        values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0"
                        result="hardAlpha"
                    />
                    <feMorphology radius="9" operator="erode" in="SourceAlpha" result="effect5_innerShadow_390_1181" />
                    <feOffset />
                    <feGaussianBlur stdDeviation="1.2" />
                    <feComposite in2="hardAlpha" operator="arithmetic" k2="-1" k3="1" />
                    <feColorMatrix
                        type="matrix"
                        values="0 0 0 0 0.964706 0 0 0 0 0.945098 0 0 0 0 0.933333 0 0 0 1 0"
                    />
                    <feBlend mode="normal" in2="effect4_innerShadow_390_1181" result="effect5_innerShadow_390_1181" />
                    <feColorMatrix
                        in="SourceAlpha"
                        type="matrix"
                        values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0"
                        result="hardAlpha"
                    />
                    <feMorphology radius="9" operator="erode" in="SourceAlpha" result="effect6_innerShadow_390_1181" />
                    <feOffset />
                    <feGaussianBlur stdDeviation="1.2" />
                    <feComposite in2="hardAlpha" operator="arithmetic" k2="-1" k3="1" />
                    <feColorMatrix
                        type="matrix"
                        values="0 0 0 0 0.964706 0 0 0 0 0.945098 0 0 0 0 0.933333 0 0 0 1 0"
                    />
                    <feBlend mode="normal" in2="effect5_innerShadow_390_1181" result="effect6_innerShadow_390_1181" />
                </filter>
                <radialGradient
                    id="paint0_radial_390_1181"
                    cx="0"
                    cy="0"
                    r="1"
                    gradientUnits="userSpaceOnUse"
                    gradientTransform="translate(53 3) rotate(90) scale(88)"
                >
                    <stop stopColor="#1B1A1A" />
                    <stop offset="1" stopColor="#393635" />
                </radialGradient>
                <linearGradient
                    id="paint1_linear_390_1181"
                    x1="9"
                    y1="3"
                    x2="53"
                    y2="47"
                    gradientUnits="userSpaceOnUse"
                >
                    <stop stopColor="white" stopOpacity="0.16" />
                    <stop offset="1" stopColor="white" stopOpacity="0" />
                </linearGradient>
                <linearGradient
                    id="paint2_linear_390_1181"
                    x1="97"
                    y1="91"
                    x2="53"
                    y2="47"
                    gradientUnits="userSpaceOnUse"
                >
                    <stop stopColor="white" stopOpacity="0.16" />
                    <stop offset="1" stopColor="white" stopOpacity="0" />
                </linearGradient>
                <radialGradient
                    id="paint3_radial_390_1181"
                    cx="0"
                    cy="0"
                    r="1"
                    gradientUnits="userSpaceOnUse"
                    gradientTransform="translate(53 31) rotate(90) scale(32)"
                >
                    <stop stopColor="#F6F1EE" />
                    <stop offset="1" stopColor="#F6F1EE" stopOpacity="0.72" />
                </radialGradient>
            </defs>
        </svg>
    );
}
