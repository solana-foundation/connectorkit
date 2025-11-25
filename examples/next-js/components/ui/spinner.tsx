import { motion } from 'motion/react';
import { cn } from '../../lib/utils';

interface SpinnerProps {
    size?: number;
    className?: string;
}

export const Spinner = ({ size = 24, className }: SpinnerProps) => {
    return (
        <motion.svg
            initial={{ opacity: 0, scale: 0.5, rotate: 0 }}
            animate={{
                opacity: 1,
                scale: 1,
                rotate: 360,
            }}
            exit={{ opacity: 0, scale: 0.5 }}
            transition={{
                opacity: {
                    type: 'spring',
                    stiffness: 400,
                    damping: 25,
                },
                scale: {
                    type: 'spring',
                    stiffness: 400,
                    damping: 25,
                },
                rotate: {
                    type: 'spring',
                    stiffness: 120,
                    damping: 12,
                    mass: 0.8,
                    repeat: Infinity,
                    repeatType: 'loop',
                    duration: 0.8,
                },
            }}
            className={cn('text-neutral-300', className)}
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            width={size}
            height={size}
            style={{ '--spinner-size': `${size}px` } as React.CSSProperties}
        >
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
        </motion.svg>
    );
};
