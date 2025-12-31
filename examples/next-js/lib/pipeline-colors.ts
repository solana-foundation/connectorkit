// Centralized color constants for pipeline step states

export const STEP_COLORS = {
    idle: 'rgb(229, 231, 235)', // gray-200
    building: 'rgb(192, 132, 252)', // purple-400
    signing: 'rgb(251, 146, 60)', // orange-400
    sending: 'rgb(96, 165, 250)', // blue-400
    confirmed: 'rgb(41, 201, 99)', // green-400
    failed: 'rgb(240, 75, 75)', // red-400
} as const;

export const GLOW_COLORS = {
    building: 'rgba(192, 132, 252, 0.3)', // purple glow
    signing: 'rgba(251, 146, 60, 0.3)', // orange glow
    sending: 'rgba(96, 165, 250, 0.3)', // blue glow
    confirmed: 'rgba(74, 222, 128, 0.3)', // green glow
    failed: 'rgba(248, 113, 113, 0.3)', // red glow
} as const;
