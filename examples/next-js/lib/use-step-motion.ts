'use client';

import {
    type AnimationPlaybackControls,
    animate,
    type MotionValue,
    useMotionValue,
    useSpring,
    useTransform,
    useVelocity,
} from 'motion/react';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { colors, shake, springs, timing } from './pipeline-animations';
import type { StepState } from './visual-pipeline';

const NODE_WIDTH = 64;
const NODE_HEIGHT = 64;
const NODE_RADIUS = 32;

export interface StepMotionValues {
    nodeWidth: MotionValue<number>;
    nodeHeight: MotionValue<number>;
    contentOpacity: MotionValue<number>;
    flashOpacity: MotionValue<number>;
    flashColor: MotionValue<string>;
    borderRadius: MotionValue<number>;
    rotation: MotionValue<number>;
    shakeX: MotionValue<number>;
    shakeY: MotionValue<number>;
    contentScale: MotionValue<number>;
    blurAmount: MotionValue<number>;
    borderColor: MotionValue<string>;
    borderOpacity: MotionValue<number>;
    glowIntensity: MotionValue<number>;
}

function usePrefersReducedMotion() {
    const [prefers, setPrefers] = useState(false);
    useEffect(() => {
        if (typeof window === 'undefined' || !('matchMedia' in window)) return;
        const mql = window.matchMedia('(prefers-reduced-motion: reduce)');
        const set = () => setPrefers(mql.matches);
        set();
        const onChange = (e: MediaQueryListEvent) => setPrefers(e.matches);
        mql.addEventListener('change', onChange);
        return () => mql.removeEventListener('change', onChange);
    }, []);
    return prefers;
}

export function useStepMotion(): StepMotionValues {
    const nodeWidth = useSpring(NODE_WIDTH, springs.nodeWidth);
    const contentOpacity = useSpring(1, springs.default);
    const flashOpacity = useMotionValue(0);
    const flashColor = useMotionValue<string>(colors.flash);
    const borderRadius = useSpring(NODE_RADIUS, springs.default);
    const nodeHeight = useMotionValue(NODE_HEIGHT);
    const rotation = useMotionValue(0);
    const shakeX = useMotionValue(0);
    const shakeY = useMotionValue(0);
    const contentScale = useSpring(1, springs.default);
    const borderColor = useMotionValue<string>(colors.border.default);
    const borderOpacity = useSpring(1, springs.default);
    const glowIntensity = useSpring(0, springs.default);

    const rotationVelocity = useVelocity(rotation);
    const blurAmount = useTransform(rotationVelocity, [-100, 0, 100], [1, 0, 1], { clamp: true });

    // Motion values are stable; the object wrapper can be re-created per render safely.
    return {
        nodeWidth,
        nodeHeight,
        contentOpacity,
        flashOpacity,
        flashColor,
        borderRadius,
        rotation,
        shakeX,
        shakeY,
        contentScale,
        blurAmount,
        borderColor,
        borderOpacity,
        glowIntensity,
    };
}

export function useRunningAnimation(
    isRunning: boolean,
    motionValues: Pick<StepMotionValues, 'rotation' | 'shakeX' | 'shakeY' | 'borderOpacity' | 'glowIntensity'>,
) {
    const prefersReducedMotion = usePrefersReducedMotion();

    useEffect(() => {
        let cancelled = false;
        let rafId: number | null = null;
        const animControls: {
            border: AnimationPlaybackControls | undefined;
            glow: AnimationPlaybackControls | undefined;
        } = { border: undefined, glow: undefined };

        const stopAll = () => {
            if (animControls.border) animControls.border.stop();
            if (animControls.glow) animControls.glow.stop();
            if (rafId !== null) cancelAnimationFrame(rafId);
            animate(motionValues.rotation, 0, {
                duration: timing.exit.duration,
                ease: timing.exit.ease,
            });
            animate(motionValues.shakeX, 0, {
                duration: timing.exit.duration,
                ease: timing.exit.ease,
            });
            animate(motionValues.shakeY, 0, {
                duration: timing.exit.duration,
                ease: timing.exit.ease,
            });
            motionValues.borderOpacity.set(1);
            motionValues.glowIntensity.set(0);
        };

        if (!isRunning || prefersReducedMotion) {
            stopAll();
            return;
        }

        animControls.border = animate(motionValues.borderOpacity, [...timing.borderPulse.values], {
            duration: timing.borderPulse.duration,
            ease: 'easeInOut',
            repeat: Infinity,
        });

        animControls.glow = animate(motionValues.glowIntensity, [...timing.glowPulse.values], {
            duration: timing.glowPulse.duration,
            ease: 'easeInOut',
            repeat: Infinity,
        });

        const jitter = () => {
            if (cancelled) return;

            const angle =
                (Math.random() * shake.running.angleRange + shake.running.angleBase) * (Math.random() < 0.5 ? 1 : -1);

            const offset =
                (Math.random() * shake.running.offsetRange + shake.running.offsetBase) * (Math.random() < 0.5 ? -1 : 1);

            const offsetY =
                (Math.random() * shake.running.offsetYRange + shake.running.offsetYBase) *
                (Math.random() < 0.5 ? -1 : 1);

            const min = shake.running.durationMin;
            const max = shake.running.durationMax ?? min * 2;
            const duration = min + Math.random() * Math.max(0.001, max - min);

            const rot = animate(motionValues.rotation, angle, { duration, ease: 'circInOut' });
            const x = animate(motionValues.shakeX, offset, { duration, ease: 'easeInOut' });
            const y = animate(motionValues.shakeY, offsetY, { duration, ease: 'easeInOut' });

            Promise.all([rot.finished, x.finished, y.finished]).then(() => {
                if (cancelled) return;
                rafId = requestAnimationFrame(jitter);
            });
        };

        rafId = requestAnimationFrame(jitter);

        return () => {
            cancelled = true;
            stopAll();
        };
    }, [
        isRunning,
        motionValues.rotation,
        motionValues.shakeX,
        motionValues.shakeY,
        motionValues.borderOpacity,
        motionValues.glowIntensity,
        prefersReducedMotion,
    ]);
}

export function useStateAnimations(state: StepState, motionValues: StepMotionValues) {
    const isRunning = state.type === 'building' || state.type === 'signing' || state.type === 'sending';

    useEffect(() => {
        motionValues.borderRadius.set(NODE_RADIUS);
    }, [motionValues.borderRadius]);

    useEffect(() => {
        animate(motionValues.nodeHeight, NODE_HEIGHT, {
            duration: 0.4,
            bounce: isRunning ? 0.3 : 0.5,
            type: 'spring',
        });
    }, [isRunning, motionValues.nodeHeight]);

    useEffect(() => {
        const hasResult = state.type === 'confirmed' || state.type === 'failed';

        if (!hasResult) {
            motionValues.nodeWidth.set(NODE_WIDTH);
        }

        motionValues.contentOpacity.set(hasResult ? 1 : isRunning ? 0 : 1);
    }, [state, motionValues, isRunning]);
}

export function useStepAnimations(
    state: StepState,
    motionValues: StepMotionValues,
    isHovering: boolean,
    setShowErrorBubble: (show: boolean) => void,
) {
    const prefersReducedMotion = usePrefersReducedMotion();
    const isFailed = state.type === 'failed';
    const previousTypeRef = useRef<StepState['type']>('idle');

    useEffect(() => {
        let timer: ReturnType<typeof setTimeout> | undefined;

        if (isFailed) {
            setShowErrorBubble(true);
            timer = setTimeout(() => {
                if (!isHovering) setShowErrorBubble(false);
            }, 1500);
        } else {
            setShowErrorBubble(false);
        }

        return () => {
            if (timer) clearTimeout(timer);
        };
    }, [isFailed, isHovering, setShowErrorBubble]);

    // State-transition effects (flash + completion pop) without reading refs during render.
    useLayoutEffect(() => {
        const previousType = previousTypeRef.current;
        const currentType = state.type;

        const justCompleted = previousType !== 'confirmed' && currentType === 'confirmed';
        const justStarted =
            previousType === 'idle' &&
            (currentType === 'building' || currentType === 'signing' || currentType === 'sending');

        // Update ref for next render
        previousTypeRef.current = currentType;

        if (justCompleted || justStarted) {
            const up = animate(motionValues.flashOpacity, 0.6, {
                duration: 0.02,
                ease: 'circOut',
            });
            up.finished.then(() => {
                if (prefersReducedMotion) {
                    motionValues.flashOpacity.set(0);
                    return;
                }
                animate(motionValues.flashOpacity, 0, {
                    duration: timing.flash.duration,
                    ease: timing.flash.ease,
                });
            });
        }

        if (justCompleted) {
            motionValues.contentScale.set(0);
            animate(motionValues.contentScale, [1.3, 1], springs.contentScale).finished.catch(() => {
                // ignore cancellation
            });
        }
    }, [state.type, motionValues.contentScale, motionValues.flashOpacity, prefersReducedMotion]);

    useEffect(() => {
        if (!isFailed || prefersReducedMotion) return;

        let cancelled = false;

        const shakeSequence = async () => {
            const { intensity, duration, count, rotationRange, returnDuration } = shake.failure;

            for (let i = 0; i < count && !cancelled; i++) {
                const xOffset = (Math.random() - 0.5) * intensity;
                const yOffset = (Math.random() - 0.5) * intensity;
                const rotOffset = (Math.random() - 0.5) * rotationRange;

                const anims = [
                    animate(motionValues.shakeX, xOffset, { duration, ease: 'easeInOut' }),
                    animate(motionValues.shakeY, yOffset, { duration, ease: 'easeInOut' }),
                    animate(motionValues.rotation, rotOffset, { duration, ease: 'easeInOut' }),
                ];
                await Promise.all(anims.map(a => a.finished));
            }

            if (!cancelled) {
                await Promise.all([
                    animate(motionValues.shakeX, 0, { duration: returnDuration, ease: 'easeOut' }).finished,
                    animate(motionValues.shakeY, 0, { duration: returnDuration, ease: 'easeOut' }).finished,
                    animate(motionValues.rotation, 0, { duration: returnDuration, ease: 'easeOut' }).finished,
                ]);
            }
        };

        shakeSequence();
        return () => {
            cancelled = true;
        };
    }, [state, prefersReducedMotion, motionValues.shakeX, motionValues.shakeY, motionValues.rotation, isFailed]);
}
