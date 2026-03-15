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

    .cdt-select {
        -webkit-appearance: none;
        appearance: none;
        padding: 6px 30px 6px 10px;
        border-radius: 8px;
        border: 1px solid var(--cdt-border);
        background-color: var(--cdt-bg);
        color: var(--cdt-text);
        font-size: 12px;
        font-family: ui-monospace, monospace;
        line-height: 1.2;
        cursor: pointer;
        background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='14' height='14' viewBox='0 0 24 24' fill='none'%3E%3Cpath d='M6 9l6 6 6-6' stroke='%23888888' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E");
        background-repeat: no-repeat;
        background-position: right 10px center;
        background-size: 14px 14px;
    }

    .cdt-select:hover:not(:disabled) {
        background-color: var(--cdt-bg-hover);
        border-color: var(--cdt-border-hover);
    }

    .cdt-select:focus {
        outline: none;
        border-color: var(--cdt-accent);
        box-shadow: 0 0 0 2px color-mix(in srgb, var(--cdt-accent) 25%, transparent);
    }

    .cdt-select:disabled {
        cursor: not-allowed;
        opacity: 0.5;
    }

    .cdt-select option {
        background: var(--cdt-bg);
        color: var(--cdt-text);
    }

    .cdt-select-compact {
        font-size: 11px;
        background-position: right 8px center;
        background-size: 13px 13px;
    }

    .cdt-dropdown {
        position: relative;
        display: inline-block;
    }

    .cdt-dropdown-trigger {
        text-align: left;
        display: inline-flex;
        align-items: center;
        min-width: 120px;
    }

    .cdt-dropdown-trigger-text {
        display: block;
        max-width: 240px;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
    }

    .cdt-dropdown-menu {
        position: absolute;
        top: calc(100% + 6px);
        left: 0;
        z-index: 50;
        min-width: 100%;
        max-width: 320px;
        padding: 4px;
        border-radius: 10px;
        border: 1px solid var(--cdt-border);
        background: var(--cdt-bg-panel);
        box-shadow: 0 14px 34px rgba(0, 0, 0, 0.32);
        max-height: 260px;
        overflow: auto;
        overscroll-behavior: contain;
        opacity: 0;
        transform: translateY(-4px);
        visibility: hidden;
        pointer-events: none;
        transition: opacity 0.12s ease, transform 0.12s ease, visibility 0s linear 0.12s;
    }

    .cdt-dropdown[data-open="true"] .cdt-dropdown-menu {
        opacity: 1;
        transform: translateY(0);
        visibility: visible;
        pointer-events: auto;
        transition: opacity 0.12s ease, transform 0.12s ease, visibility 0s;
    }

    .cdt-dropdown-item {
        width: 100%;
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 10px;
        padding: 7px 8px;
        border-radius: 8px;
        font-size: 12px;
        color: var(--cdt-text);
        background: transparent;
        border: none;
    }

    .cdt-dropdown-item:hover:not(:disabled) {
        background: var(--cdt-bg-hover);
    }

    .cdt-dropdown-item:focus {
        outline: none;
        background: var(--cdt-bg-hover);
        box-shadow: 0 0 0 2px color-mix(in srgb, var(--cdt-accent) 25%, transparent);
    }

    .cdt-dropdown-item[data-selected="true"] {
        background: var(--cdt-bg-active);
    }

    .cdt-dropdown-item-label {
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        min-width: 0;
    }

    .cdt-dropdown-check {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 14px;
        height: 14px;
        flex: none;
        color: var(--cdt-accent);
        opacity: 0;
    }

    .cdt-dropdown-check svg {
        width: 14px;
        height: 14px;
    }

    .cdt-dropdown-item[data-selected="true"] .cdt-dropdown-check {
        opacity: 1;
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
