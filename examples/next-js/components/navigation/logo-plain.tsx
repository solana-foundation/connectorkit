interface LogoPlainProps {
    className?: string;
    width?: number;
    height?: number;
}

export function LogoPlain({ className, width = 10, height = 10 }: LogoPlainProps) {
    return (
        <svg
            width={width}
            height={height}
            viewBox="0 0 10 10"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className={className}
        >
            <rect width="10" height="10" fill="none" />
            <path d="M1.66699 5.83301L4.16699 5.83301V8.33301" stroke="black" strokeWidth="1.66667" />
            <path d="M8.33301 4.16699L5.83301 4.16699V1.66699" stroke="black" strokeWidth="1.66667" />
            <path d="M6.66634 7.5H8.33301" stroke="black" strokeWidth="1.66667" />
            <path d="M1.66634 2.5H3.33301" stroke="black" strokeWidth="1.66667" />
        </svg>
    );
}
