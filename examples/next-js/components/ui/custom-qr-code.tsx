'use client';

import { useMemo, type ReactNode, type CSSProperties } from 'react';
import QRCodeUtil from 'qrcode';

/**
 * Generate QR code matrix from value
 */
function generateMatrix(value: string, errorCorrectionLevel: 'L' | 'M' | 'Q' | 'H') {
    const arr = Array.prototype.slice.call(
        QRCodeUtil.create(value, { errorCorrectionLevel }).modules.data,
        0
    );
    const sqrt = Math.sqrt(arr.length);
    return arr.reduce(
        (rows: number[][], key: number, index: number) =>
            (index % sqrt === 0 ? rows.push([key]) : rows[rows.length - 1].push(key)) && rows,
        [] as number[][]
    );
}

interface CustomQRCodeProps {
    /** The value to encode in the QR code */
    value: string;
    /** Size of the QR code in pixels */
    size?: number;
    /** Error correction level */
    ecl?: 'L' | 'M' | 'Q' | 'H';
    /** Whether to clear the center area for a logo */
    clearArea?: boolean;
    /** Optional logo/image to display in center */
    image?: ReactNode;
    /** Background color for the logo area */
    imageBackground?: string;
    /** QR code dot color */
    dotColor?: string;
    /** QR code background color */
    backgroundColor?: string;
}

/**
 * QR Code SVG renderer with ConnectKit-style rounded dots and finder patterns
 */
function QRCodeSVG({
    value,
    size: sizeProp = 200,
    ecl = 'M',
    clearArea = false,
    dotColor = 'currentColor',
    backgroundColor = '#ffffff',
}: CustomQRCodeProps) {
    const logoSize = clearArea ? 76 : 0;
    const size = sizeProp - 10 * 2; // Account for padding

    const dots = useMemo(() => {
        const dots: ReactNode[] = [];
        const matrix = generateMatrix(value, ecl);
        const cellSize = size / matrix.length;

        // Finder pattern positions (3 corners)
        const qrList = [
            { x: 0, y: 0 },
            { x: 1, y: 0 },
            { x: 0, y: 1 },
        ];

        // Draw rounded finder patterns
        // These MUST have an opaque background color for the QR to be scannable
        // The pattern is: outer (dark) -> middle ring (light) -> inner (dark)
        qrList.forEach(({ x, y }) => {
            const x1 = (matrix.length - 7) * cellSize * x;
            const y1 = (matrix.length - 7) * cellSize * y;
            for (let i = 0; i < 3; i++) {
                dots.push(
                    <rect
                        key={`finder-${i}-${x}-${y}`}
                        fill={i % 2 !== 0 ? backgroundColor : dotColor}
                        rx={(i - 2) * -5 + (i === 0 ? 2 : 3)}
                        ry={(i - 2) * -5 + (i === 0 ? 2 : 3)}
                        width={cellSize * (7 - i * 2)}
                        height={cellSize * (7 - i * 2)}
                        x={x1 + cellSize * i}
                        y={y1 + cellSize * i}
                    />
                );
            }
        });

        // Calculate center clear area
        const clearArenaSize = Math.floor((logoSize + 25) / cellSize);
        const matrixMiddleStart = matrix.length / 2 - clearArenaSize / 2;
        const matrixMiddleEnd = matrix.length / 2 + clearArenaSize / 2 - 1;

        // Draw circular dots for data modules
        matrix.forEach((row: number[], i: number) => {
            row.forEach((_: number, j: number) => {
                if (matrix[i][j]) {
                    // Skip dots under finder patterns
                    if (
                        !(
                            (i < 7 && j < 7) ||
                            (i > matrix.length - 8 && j < 7) ||
                            (i < 7 && j > matrix.length - 8)
                        )
                    ) {
                        // Skip center area if clearArea is true
                        if (
                            !clearArea ||
                            !(
                                i > matrixMiddleStart &&
                                i < matrixMiddleEnd &&
                                j > matrixMiddleStart &&
                                j < matrixMiddleEnd
                            )
                        ) {
                            dots.push(
                                <circle
                                    key={`dot-${i}-${j}`}
                                    cx={i * cellSize + cellSize / 2}
                                    cy={j * cellSize + cellSize / 2}
                                    fill={dotColor}
                                    r={cellSize / 3}
                                />
                            );
                        }
                    }
                }
            });
        });

        return dots;
    }, [value, ecl, size, clearArea, logoSize, dotColor, backgroundColor]);

    return (
        <svg
            height={size}
            width={size}
            viewBox={`0 0 ${size} ${size}`}
            style={{
                width: '100%',
                height: '100%',
                maxWidth: size,
                maxHeight: size,
            }}
        >
            <rect fill="transparent" height={size} width={size} />
            {dots}
        </svg>
    );
}

/**
 * Viewfinder corner brackets SVG
 */
function ViewfinderFrame({ size, color = '#2D2D2D', opacity = 0.01 }: { size: number; color?: string; opacity?: number }) {
    return (
        <svg
            width={size}
            height={size}
            viewBox="0 0 283 283"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="absolute inset-0 z-10 pointer-events-none"
        >
            <path
                d="M3.5 264.06C3.5 272.587 10.4127 279.5 18.9399 279.5H32.8799C33.7083 279.5 34.3799 280.172 34.3799 281V281C34.3799 281.828 33.7083 282.5 32.8799 282.5H17.4399C8.08427 282.5 0.5 274.916 0.5 265.56V250.12C0.5 249.292 1.17157 248.62 2 248.62V248.62C2.82843 248.62 3.5 249.292 3.5 250.12V264.06ZM282.5 266.058C282.5 275.139 275.139 282.5 266.058 282.5H251.116C250.288 282.5 249.616 281.828 249.616 281V281C249.616 280.172 250.288 279.5 251.116 279.5H264.558C272.81 279.5 279.5 272.81 279.5 264.558V250.12C279.5 249.292 280.172 248.62 281 248.62V248.62C281.828 248.62 282.5 249.292 282.5 250.12V266.058ZM34.3799 2C34.3799 2.82843 33.7083 3.5 32.8799 3.5H18.9399C10.4127 3.5 3.5 10.4127 3.5 18.9399V32.8799C3.5 33.7083 2.82843 34.3799 2 34.3799V34.3799C1.17157 34.3799 0.5 33.7083 0.5 32.8799V17.4399C0.5 8.08427 8.08427 0.5 17.4399 0.5H32.8799C33.7083 0.5 34.3799 1.17157 34.3799 2V2ZM282.5 32.8799C282.5 33.7083 281.828 34.3799 281 34.3799V34.3799C280.172 34.3799 279.5 33.7083 279.5 32.8799V18.4419C279.5 10.1897 272.81 3.5 264.558 3.5H251.116C250.288 3.5 249.616 2.82843 249.616 2V2C249.616 1.17157 250.288 0.5 251.116 0.5H266.058C275.139 0.5 282.5 7.86129 282.5 16.9419V32.8799Z"
                fill={color}
                fillOpacity={opacity}
            />
        </svg>
    );
}

interface CustomQRCodeContainerProps extends CustomQRCodeProps {
    /** Optional logo/image to display in center */
    image?: ReactNode;
    /** Background color for the logo area */
    imageBackground?: string;
    /** Container className */
    className?: string;
    /** Container style */
    style?: CSSProperties;
    /** Show loading placeholder when no value */
    loading?: boolean;
    /** Show scanning animation */
    scanning?: boolean;
    /** Error state */
    error?: boolean;
    /** Viewfinder bracket color */
    frameColor?: string;
}

/**
 * Custom QR Code component with viewfinder-style frame
 *
 * Features:
 * - Rounded finder patterns (corner squares)
 * - Circular dots for data modules
 * - Viewfinder corner brackets
 * - Scanning shine animation
 * - Optional center logo with background
 * - Error/loading states
 *
 * @example
 * ```tsx
 * <CustomQRCode value={walletConnectUri} size={280} />
 * ```
 *
 * @example With scanning animation
 * ```tsx
 * <CustomQRCode value={uri} size={280} scanning />
 * ```
 */
export function CustomQRCode({
    value,
    size = 280,
    ecl = 'M',
    clearArea = false,
    image,
    imageBackground = 'transparent',
    dotColor,
    backgroundColor,
    className,
    style,
    loading = false,
    scanning = true,
    error = false,
    frameColor,
}: CustomQRCodeContainerProps) {
    const showPlaceholder = loading || !value;

    // QR codes need solid backgrounds for scanners to work reliably
    const resolvedBackground = backgroundColor || '#ffffff';
    const resolvedDotColor = dotColor || '#000000';
    const resolvedFrameColor = error ? '#FF0000' : (frameColor || '#2D2D2D');
    const frameOpacity = error ? 0.56 : 0.01;

    return (
        <div
            className={`relative ${className || ''}`}
            style={{
                width: size,
                height: size,
                ...style,
            }}
            data-slot="qr-code-container"
        >
            {/* Viewfinder corner brackets */}
            <ViewfinderFrame size={size} color={resolvedFrameColor} opacity={frameOpacity} />

            {/* QR Content Area */}
            <div
                className={`absolute inset-0 z-20 flex items-center justify-center border-[3px] rounded-[28px] overflow-hidden ${
                    error ? 'border-red-500/30' : 'border-black/5'
                }`}
                style={{ background: resolvedBackground }}
                data-slot="qr-code-content"
            >
                {/* Gradient glow background */}
                <div
                    className={`absolute inset-0 opacity-25 blur-[15px] pointer-events-none ${
                        error ? 'bg-gradient-to-br from-red-500 to-red-600' : 'bg-gradient-to-br from-violet-100 to-blue-200'
                    }`}
                    style={{ transform: 'scale(0.9)' }}
                />

                {/* Shine scanning effect */}
                {scanning && !showPlaceholder && !error && (
                    <div
                        className="absolute inset-0 z-30 pointer-events-none overflow-hidden"
                        style={{
                            background: 'linear-gradient(to bottom, rgba(255,255,255,0) 0%, rgba(255,255,255,0.6) 50%, rgba(255,255,255,0) 100%)',
                            animation: 'qr-scan-slide 2s ease-in-out infinite',
                        }}
                    />
                )}

                {/* QR Code or placeholder */}
                <div className="relative z-20 flex items-center justify-center" style={{ transform: 'scale(1)' }}>
                    {showPlaceholder ? (
                        <QRPlaceholder size={size} dotColor={resolvedDotColor} backgroundColor={resolvedBackground} />
                    ) : (
                        <>
                            <QRCodeSVG
                                value={value}
                                size={size - 40}
                                ecl={ecl}
                                clearArea={clearArea || !!image}
                                dotColor={resolvedDotColor}
                                backgroundColor={resolvedBackground}
                            />
                            {image && (
                                <div
                                    className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-[17px]"
                                    style={{
                                        width: '28%',
                                        height: '28%',
                                        background: imageBackground || resolvedBackground,
                                        boxShadow: 'inset 0 0 0 1px rgba(0, 0, 0, 0.02)',
                                    }}
                                    data-slot="qr-code-logo"
                                >
                                    {image}
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>

            {/* Keyframe animations */}
            <style jsx>{`
                @keyframes qr-scan-slide {
                    0% {
                        transform: translateY(-100%);
                    }
                    100% {
                        transform: translateY(100%);
                    }
                }
            `}</style>
        </div>
    );
}

/**
 * Placeholder shown while QR code is loading
 */
function QRPlaceholder({ size, dotColor, backgroundColor }: { size: number; dotColor: string; backgroundColor: string }) {
    return (
        <div className="relative flex items-center justify-center" style={{ width: size - 40, height: size - 40 }}>
            {/* Dot pattern background */}
            <div
                className="absolute inset-0 opacity-10 rounded-[14px]"
                style={{
                    backgroundImage: `radial-gradient(${dotColor} 41%, transparent 41%)`,
                    backgroundSize: '1.888% 1.888%',
                    backgroundRepeat: 'repeat',
                }}
            />

            {/* Corner finder pattern placeholders */}
            {[
                { top: 0, left: 0 },
                { top: 0, right: 0 },
                { bottom: 0, left: 0 },
            ].map((pos, i) => (
                <span
                    key={i}
                    className="absolute rounded-[12px]"
                    style={{
                        ...pos,
                        width: '13.25%',
                        height: '13.25%',
                        background: dotColor,
                        opacity: 0.1,
                    }}
                />
            ))}

            {/* Center area */}
            <div
                className="relative rounded-[20px] z-10"
                style={{
                    width: '28%',
                    height: '28%',
                    background: backgroundColor,
                    boxShadow: `0 0 0 7px ${backgroundColor}`,
                }}
            />

            {/* Loading spinner */}
            <div className="absolute inset-0 flex flex-col items-center justify-center z-20">
                <div
                    className="w-8 h-8 border-2 border-current border-t-transparent rounded-full animate-spin mb-3"
                    style={{ color: `${dotColor}40` }}
                />
                <span className="text-xs" style={{ color: `${dotColor}70` }}>
                    Generating QR code...
                </span>
            </div>
        </div>
    );
}

CustomQRCode.displayName = 'CustomQRCode';
