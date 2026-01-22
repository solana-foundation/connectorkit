// Animation configuration for consistent motion design across pipeline components

// Default spring for MotionConfig wrapper
export const defaultSpring = {
    type: 'spring' as const,
    // Critical damping occurs when damping ≈ 2 * sqrt(stiffness * mass).
    mass: 1,
    stiffness: 200,
    damping: 2 * Math.sqrt(200), // ≈ 28.28
    bounce: 0,
};

// Spring presets
export const springs = {
    default: {
        type: 'spring' as const,
        stiffness: 180,
        damping: 25,
        mass: 0.8,
    },
    bouncy: {
        type: 'spring' as const,
        bounce: 0.3,
        visualDuration: 0.5,
    },
    nodeWidth: {
        type: 'spring' as const,
        stiffness: 180,
        damping: 25,
        mass: 0.8,
        visualDuration: 0.6,
        bounce: 0.3,
    },
    contentScale: {
        type: 'spring' as const,
        bounce: 0.3,
        visualDuration: 0.5,
        stiffness: 260,
        damping: 18,
    },
    failureBubble: {
        type: 'spring' as const,
        visualDuration: 0.2,
        delay: 0.05,
        bounce: 0.3,
    },
};

// Shake animation constants
export const shake = {
    running: {
        angleRange: 4,
        angleBase: 0.5,
        offsetRange: 1.5,
        offsetBase: 0.5,
        offsetYRange: 0.6,
        offsetYBase: 0.1,
        durationMin: 0.1,
        durationMax: 0.2,
    },
    failure: {
        intensity: 8,
        duration: 0.08,
        count: 6,
        rotationRange: 8,
        returnDuration: 0.3,
    },
    bubble: {
        intensity: 4,
        duration: 0.08,
        count: 4,
        rotationRange: 4,
        yOffset: -5,
        returnDuration: 0.3,
        delay: 100,
    },
};

// Animation durations and timing
export const timing = {
    borderPulse: {
        duration: 1.5,
        values: [1, 0.3, 1],
    },
    glowPulse: {
        duration: 0.5,
        values: [1, 5, 1],
    },
    flash: {
        duration: 1.0,
        ease: 'linear' as const,
    },
    exit: {
        duration: 0.3,
        ease: [0.4, 0, 0.6, 1] as const,
    },
    glitch: {
        initialCount: 3,
        initialDelayMin: 20,
        initialDelayMax: 70,
        pauseMin: 50,
        pauseMax: 150,
        subtleDelayMin: 300,
        subtleDelayMax: 800,
    },
};

// Color values for animations
export const colors = {
    flash: 'rgba(255, 255, 255, 0.8)',
    border: {
        default: 'rgba(100, 100, 100, 0.3)',
        death: 'rgba(220, 38, 38, 0.8)',
    },
    glow: {
        death: 'rgba(220, 38, 38, 0.8)',
        running: 'rgba(100, 200, 255, 0.2)',
    },
};

// Transform and filter values
export const effects = {
    death: {
        contrast: 1.2,
        brightness: 0.8,
    },
    glitch: {
        scaleRange: 0.2,
        glowMin: 3,
        glowMax: 7,
        intensePulseMax: 10,
    },
};
