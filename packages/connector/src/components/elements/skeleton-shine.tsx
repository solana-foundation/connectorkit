'use client';

import React from 'react';

const shineStyles = `
  .ck-skeleton {
    position: relative;
    overflow: hidden;
  }
  .ck-skeleton-shine {
    position: absolute;
    top: 0;
    left: 0;
    width: 500%;
    height: 500%;
    background: linear-gradient(135deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.1) 50%, rgba(255,255,255,0) 100%);
    animation: ck-skeleton-slide 0.5s infinite;
    z-index: 1;
    pointer-events: none;
  }
  @keyframes ck-skeleton-slide {
    0% { transform: translate(-100%, -100%); }
    100% { transform: translate(100%, 100%); }
  }
`;

let stylesInjected = false;

function injectStyles() {
    if (stylesInjected) return;

    if (typeof document !== 'undefined') {
        const styleId = 'ck-skeleton-shine-styles';
        if (!document.getElementById(styleId)) {
            const style = document.createElement('style');
            style.id = styleId;
            style.textContent = shineStyles;
            document.head.appendChild(style);
        }
        stylesInjected = true;
    }
}

/**
 * Shine overlay component for skeleton loading states.
 * Injects CSS styles once and provides the animated shine effect.
 */
export function SkeletonShine() {
    React.useEffect(() => {
        injectStyles();
    }, []);

    return <div className="ck-skeleton-shine" data-slot="skeleton-shine" />;
}

SkeletonShine.displayName = 'SkeletonShine';
