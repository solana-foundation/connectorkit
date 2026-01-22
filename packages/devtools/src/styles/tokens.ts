/**
 * Design tokens and CSS for the devtools
 */

export const COLORS = {
    dark: {
        bg: '#0a0a0a',
        bgPanel: '#111111',
        bgHover: '#1a1a1a',
        bgActive: '#252525',
        border: '#2a2a2a',
        borderHover: '#3a3a3a',
        text: '#fafafa',
        textMuted: '#888888',
        textDim: '#666666',
        accent: '#9945ff',
        accentHover: '#a855f7',
        success: '#22c55e',
        warning: '#f59e0b',
        error: '#ef4444',
        info: '#3b82f6',
    },
    light: {
        bg: '#ffffff',
        bgPanel: '#f8f8f8',
        bgHover: '#f0f0f0',
        bgActive: '#e8e8e8',
        border: '#e0e0e0',
        borderHover: '#d0d0d0',
        text: '#0a0a0a',
        textMuted: '#666666',
        textDim: '#999999',
        accent: '#9945ff',
        accentHover: '#7c3aed',
        success: '#16a34a',
        warning: '#d97706',
        error: '#dc2626',
        info: '#2563eb',
    },
} as const;

export function getThemeColors(theme: 'dark' | 'light') {
    return COLORS[theme];
}

/**
 * Generate CSS custom properties for a theme
 */
export function generateThemeCss(theme: 'dark' | 'light'): string {
    const colors = COLORS[theme];
    return `
        --cdt-bg: ${colors.bg};
        --cdt-bg-panel: ${colors.bgPanel};
        --cdt-bg-hover: ${colors.bgHover};
        --cdt-bg-active: ${colors.bgActive};
        --cdt-border: ${colors.border};
        --cdt-border-hover: ${colors.borderHover};
        --cdt-text: ${colors.text};
        --cdt-text-muted: ${colors.textMuted};
        --cdt-text-dim: ${colors.textDim};
        --cdt-accent: ${colors.accent};
        --cdt-accent-hover: ${colors.accentHover};
        --cdt-success: ${colors.success};
        --cdt-warning: ${colors.warning};
        --cdt-error: ${colors.error};
        --cdt-info: ${colors.info};
    `;
}

/**
 * Base styles for the devtools shadow DOM
 */
export const BASE_STYLES = `
    * {
        box-sizing: border-box;
        margin: 0;
        padding: 0;
    }

    :host {
        font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
        font-size: 13px;
        line-height: 1.5;
        color: var(--cdt-text);
        -webkit-font-smoothing: antialiased;
        -moz-osx-font-smoothing: grayscale;
    }

    button {
        font-family: inherit;
        font-size: inherit;
        border: none;
        background: none;
        cursor: pointer;
        color: inherit;
    }

    button:disabled {
        cursor: not-allowed;
        opacity: 0.5;
    }

    input, select {
        font-family: inherit;
        font-size: inherit;
    }

    /* Scrollbar styling */
    ::-webkit-scrollbar {
        width: 8px;
        height: 8px;
    }

    ::-webkit-scrollbar-track {
        background: transparent;
    }

    ::-webkit-scrollbar-thumb {
        background: var(--cdt-border);
        border-radius: 4px;
    }

    ::-webkit-scrollbar-thumb:hover {
        background: var(--cdt-border-hover);
    }

    /* Common utility classes */
    .cdt-badge {
        display: inline-flex;
        align-items: center;
        padding: 2px 8px;
        border-radius: 9999px;
        font-size: 11px;
        font-weight: 500;
        text-transform: uppercase;
        letter-spacing: 0.025em;
    }

    .cdt-badge-success {
        background: color-mix(in srgb, var(--cdt-success) 15%, transparent);
        color: var(--cdt-success);
    }

    .cdt-badge-warning {
        background: color-mix(in srgb, var(--cdt-warning) 15%, transparent);
        color: var(--cdt-warning);
    }

    .cdt-badge-error {
        background: color-mix(in srgb, var(--cdt-error) 15%, transparent);
        color: var(--cdt-error);
    }

    .cdt-badge-info {
        background: color-mix(in srgb, var(--cdt-info) 15%, transparent);
        color: var(--cdt-info);
    }

    .cdt-badge-muted {
        background: var(--cdt-bg-hover);
        color: var(--cdt-text-muted);
    }

    .cdt-btn {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 6px;
        padding: 6px 12px;
        border-radius: 6px;
        font-size: 12px;
        font-weight: 500;
        transition: all 0.15s ease;
    }

    .cdt-btn-primary {
        background: var(--cdt-accent);
        color: white;
    }

    .cdt-btn-primary:hover:not(:disabled) {
        background: var(--cdt-accent-hover);
    }

    .cdt-btn-secondary {
        background: var(--cdt-bg-hover);
        color: var(--cdt-text);
        border: 1px solid var(--cdt-border);
    }

    .cdt-btn-secondary:hover:not(:disabled) {
        background: var(--cdt-bg-active);
        border-color: var(--cdt-border-hover);
    }

    .cdt-btn-ghost {
        background: transparent;
        color: var(--cdt-text-muted);
    }

    .cdt-btn-ghost:hover:not(:disabled) {
        background: var(--cdt-bg-hover);
        color: var(--cdt-text);
    }

    .cdt-btn-icon {
        padding: 6px;
        width: 28px;
        height: 28px;
    }

    .cdt-section {
        padding: 12px;
        border-bottom: 1px solid var(--cdt-border);
    }

    .cdt-section:last-child {
        border-bottom: none;
    }

    .cdt-section-title {
        font-size: 11px;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.05em;
        color: var(--cdt-text-muted);
        margin-bottom: 8px;
    }

    .cdt-row {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 6px 0;
    }

    .cdt-label {
        color: var(--cdt-text-muted);
        font-size: 12px;
    }

    .cdt-value {
        color: var(--cdt-text);
        font-size: 12px;
        font-family: inherit;
    }

    .cdt-mono {
        font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
    }

    .cdt-truncate {
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
    }

    .cdt-empty {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        padding: 32px;
        color: var(--cdt-text-dim);
        text-align: center;
        gap: 8px;
    }

    .cdt-empty-icon {
        font-size: 32px;
        opacity: 0.5;
    }
`;
