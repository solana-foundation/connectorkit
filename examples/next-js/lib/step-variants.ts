import { springs } from './pipeline-animations';
import { STEP_COLORS } from './pipeline-colors';

export const stepVariants = {
    idle: {
        scale: 1,
        opacity: 0.6,
        backgroundColor: STEP_COLORS.idle,
        transition: {
            backgroundColor: { duration: 0.1, ease: 'easeInOut' },
            scale: springs.default,
            opacity: springs.default,
        },
    },

    building: {
        scale: 0.95,
        opacity: 1,
        backgroundColor: STEP_COLORS.building,
        transition: {
            backgroundColor: { duration: 0.1, ease: 'easeInOut' },
            scale: springs.default,
            opacity: springs.default,
        },
    },

    signing: {
        scale: 0.95,
        opacity: 1,
        backgroundColor: STEP_COLORS.signing,
        transition: {
            backgroundColor: { duration: 0.1, ease: 'easeInOut' },
            scale: springs.default,
            opacity: springs.default,
        },
    },

    sending: {
        scale: 0.95,
        opacity: 1,
        backgroundColor: STEP_COLORS.sending,
        transition: {
            backgroundColor: { duration: 0.1, ease: 'easeInOut' },
            scale: springs.default,
            opacity: springs.default,
        },
    },

    confirmed: {
        scale: 1,
        opacity: 1,
        backgroundColor: STEP_COLORS.confirmed,
        transition: {
            backgroundColor: { duration: 0.1, ease: 'easeInOut' },
            scale: springs.contentScale,
            opacity: springs.contentScale,
        },
    },

    failed: {
        backgroundColor: STEP_COLORS.failed,
        scale: 1,
        opacity: 1,
        transition: {
            backgroundColor: { duration: 0.1, ease: 'easeInOut' },
            scale: springs.contentScale,
            opacity: springs.contentScale,
        },
    },
} as const;

export function getStepShadow(state: 'idle' | 'building' | 'signing' | 'sending' | 'confirmed' | 'failed'): string {
    switch (state) {
        case 'building':
        case 'signing':
        case 'sending':
        case 'confirmed':
        case 'failed':
            return `0 0 24px ${STEP_COLORS[state].replace('rgb', 'rgba').replace(')', ', 0.2)')}`;
        default:
            return '0 2px 4px rgba(0,0,0,0.1)';
    }
}
