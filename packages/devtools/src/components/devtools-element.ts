/**
 * Main devtools Web Component
 *
 * Creates a custom element with Shadow DOM that contains:
 * - Floating trigger button
 * - Docked panel with tabs
 * - Plugin content area
 */

import type {
    ConnectorDevtoolsConfig,
    ConnectorDevtoolsPlugin,
    DevtoolsPersistedState,
    PluginContext,
    DevtoolsPosition,
} from '../types';
import { BASE_STYLES, generateThemeCss } from '../styles/tokens';
import { resolveTheme } from '../utils/theme';
import { ICONS } from './icons';

interface DevtoolsElementOptions {
    config: ConnectorDevtoolsConfig;
    state: DevtoolsPersistedState;
    plugins: ConnectorDevtoolsPlugin[];
    context: PluginContext;
    onStateChange: (partial: Partial<DevtoolsPersistedState>) => void;
}

/**
 * Create the devtools element with Shadow DOM
 */
export function createDevtoolsElement(options: DevtoolsElementOptions): HTMLElement {
    const { config, state, plugins, context, onStateChange } = options;

    // Create container element
    const container = document.createElement('div');
    container.className = 'connector-devtools-root';

    // Attach shadow DOM for style isolation
    const shadow = container.attachShadow({ mode: 'open' });

    // Internal state
    let isOpen = state.isOpen;
    let activeTab = state.activeTab;
    let panelHeight = state.panelHeight;
    let isDragging = false;
    let currentPluginCleanup: (() => void) | undefined;

    // Get effective theme
    const getEffectiveTheme = () => resolveTheme(config.theme);

    // Generate styles
    const createStyles = () => {
        const theme = getEffectiveTheme();
        return `
            ${BASE_STYLES}
            :host {
                ${generateThemeCss(theme)}
            }

            .cdt-container {
                position: fixed;
                z-index: 999999;
                font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
            }

            /* Trigger button */
            .cdt-trigger {
                position: fixed;
                ${getPositionStyles(state.position)}
                width: 40px;
                height: 40px;
                border-radius: 10px;
                background: #0a0a0a;
                border: 1px solid #333;
                cursor: pointer;
                display: flex;
                align-items: center;
                justify-content: center;
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
                transition: transform 0.2s, box-shadow 0.2s, border-color 0.2s;
                z-index: 1000000;
            }

            .cdt-trigger:hover {
                transform: scale(1.05);
                box-shadow: 0 6px 16px rgba(0, 0, 0, 0.4);
                border-color: #555;
            }

            .cdt-trigger:active {
                transform: scale(0.98);
            }

            .cdt-trigger svg {
                width: 18px;
                height: 16px;
                color: white;
            }

            .cdt-trigger.cdt-hidden {
                display: none;
            }

            /* Panel */
            .cdt-panel {
                position: fixed;
                left: 0;
                right: 0;
                bottom: 0;
                height: ${panelHeight}px;
                background: var(--cdt-bg);
                border-top: 1px solid var(--cdt-border);
                display: flex;
                flex-direction: column;
                z-index: 999999;
                transform: translateY(100%);
                transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            }

            .cdt-panel.cdt-open {
                transform: translateY(0);
            }

            /* Resize handle */
            .cdt-resize-handle {
                position: absolute;
                top: -4px;
                left: 0;
                right: 0;
                height: 8px;
                cursor: ns-resize;
                background: transparent;
            }

            .cdt-resize-handle:hover,
            .cdt-resize-handle.cdt-dragging {
                background: var(--cdt-accent);
                opacity: 0.5;
            }

            /* Header */
            .cdt-header {
                display: flex;
                align-items: center;
                justify-content: space-between;
                padding: 0 12px;
                height: 40px;
                border-bottom: 1px solid var(--cdt-border);
                background: var(--cdt-bg-panel);
                flex-shrink: 0;
            }

            .cdt-header-left {
                display: flex;
                align-items: center;
                gap: 12px;
            }

            .cdt-logo {
                display: flex;
                align-items: center;
                gap: 8px;
                color: var(--cdt-text);
                font-weight: 600;
                font-size: 13px;
            }

            .cdt-logo svg {
                width: 18px;
                height: 18px;
            }

            .cdt-tabs {
                display: flex;
                gap: 2px;
            }

            .cdt-tab {
                display: flex;
                align-items: center;
                gap: 6px;
                padding: 6px 12px;
                border-radius: 6px;
                font-size: 12px;
                font-weight: 500;
                color: var(--cdt-text-muted);
                background: transparent;
                transition: all 0.15s ease;
            }

            .cdt-tab:hover {
                background: var(--cdt-bg-hover);
                color: var(--cdt-text);
            }

            .cdt-tab.cdt-active {
                background: var(--cdt-bg-active);
                color: var(--cdt-text);
            }

            .cdt-tab svg {
                width: 14px;
                height: 14px;
            }

            .cdt-header-right {
                display: flex;
                align-items: center;
                gap: 4px;
            }

            .cdt-header-btn {
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 6px;
                height: 28px;
                padding: 0 10px;
                border-radius: 6px;
                font-size: 11px;
                font-weight: 500;
                color: var(--cdt-text-muted);
                background: transparent;
                border: 1px solid transparent;
                transition: all 0.15s ease;
            }

            .cdt-header-btn:hover:not(:disabled) {
                background: var(--cdt-bg-hover);
                color: var(--cdt-text);
            }

            .cdt-header-btn:disabled {
                opacity: 0.4;
                cursor: not-allowed;
            }

            .cdt-header-btn svg {
                width: 12px;
                height: 12px;
            }

            .cdt-disconnect-btn {
                border-color: var(--cdt-border);
            }

            .cdt-disconnect-btn:hover:not(:disabled) {
                border-color: var(--cdt-error);
                color: var(--cdt-error);
            }

            .cdt-close-btn {
                display: flex;
                align-items: center;
                justify-content: center;
                width: 28px;
                height: 28px;
                border-radius: 6px;
                color: var(--cdt-text-muted);
                transition: all 0.15s ease;
            }

            .cdt-close-btn:hover {
                background: var(--cdt-bg-hover);
                color: var(--cdt-text);
            }

            .cdt-close-btn svg {
                width: 16px;
                height: 16px;
            }

            /* Content */
            .cdt-content {
                flex: 1;
                overflow: auto;
                background: var(--cdt-bg);
            }
        `;
    };

    // Position styles helper
    function getPositionStyles(position: DevtoolsPosition): string {
        const offset = '16px';
        switch (position) {
            case 'bottom-left':
                return `bottom: ${offset}; left: ${offset};`;
            case 'bottom-right':
                return `bottom: ${offset}; right: ${offset};`;
            case 'top-left':
                return `top: ${offset}; left: ${offset};`;
            case 'top-right':
                return `top: ${offset}; right: ${offset};`;
        }
    }

    // Render the devtools
    function render() {
        const theme = getEffectiveTheme();

        shadow.innerHTML = `
            <style>${createStyles()}</style>
            <div class="cdt-container">
                <!-- Trigger button -->
                <button class="cdt-trigger ${isOpen || config.triggerHidden ? 'cdt-hidden' : ''}" aria-label="Open Devtools">
                    ${ICONS.solana}
                </button>

                <!-- Panel -->
                <div class="cdt-panel ${isOpen ? 'cdt-open' : ''}">
                    <div class="cdt-resize-handle"></div>
                    <div class="cdt-header">
                        <div class="cdt-header-left">
                            <div class="cdt-logo">
                                ${ICONS.solana}
                                <span>Devtools</span>
                            </div>
                            <div class="cdt-tabs">
                                ${plugins
                                    .map(
                                        plugin => `
                                    <button class="cdt-tab ${activeTab === plugin.id ? 'cdt-active' : ''}" data-tab="${plugin.id}">
                                        ${plugin.icon ?? ''}
                                        <span>${plugin.name}</span>
                                    </button>
                                `,
                                    )
                                    .join('')}
                            </div>
                        </div>
                        <div class="cdt-header-right">
                            <button class="cdt-header-btn cdt-disconnect-btn" id="disconnect-btn" aria-label="Disconnect Wallet" ${!context.client.getSnapshot().connected ? 'disabled' : ''}>
                                Disconnect
                            </button>
                            <button class="cdt-close-btn" aria-label="Close Devtools">
                                ${ICONS.close}
                            </button>
                        </div>
                    </div>
                    <div class="cdt-content" id="plugin-content"></div>
                </div>
            </div>
        `;

        // Attach event listeners
        attachEventListeners();

        // Render active plugin
        renderActivePlugin();
    }

    // Attach event listeners
    function attachEventListeners() {
        const triggerBtn = shadow.querySelector('.cdt-trigger');
        const closeBtn = shadow.querySelector('.cdt-close-btn');
        const disconnectBtn = shadow.querySelector('#disconnect-btn');
        const tabs = shadow.querySelectorAll('.cdt-tab');
        const resizeHandle = shadow.querySelector('.cdt-resize-handle');
        const panel = shadow.querySelector('.cdt-panel') as HTMLElement | null;

        // Trigger button click
        triggerBtn?.addEventListener('click', () => {
            isOpen = true;
            onStateChange({ isOpen: true });
            render();
        });

        // Close button click
        closeBtn?.addEventListener('click', () => {
            isOpen = false;
            onStateChange({ isOpen: false });
            render();
        });

        // Disconnect button click
        disconnectBtn?.addEventListener('click', async () => {
            await context.client.disconnect();
            render();
        });

        // Tab clicks
        tabs.forEach(tab => {
            tab.addEventListener('click', () => {
                const tabId = tab.getAttribute('data-tab');
                if (tabId && tabId !== activeTab) {
                    activeTab = tabId;
                    onStateChange({ activeTab });
                    render();
                }
            });
        });

        // Resize handle
        if (resizeHandle && panel) {
            resizeHandle.addEventListener('mousedown', e => {
                e.preventDefault();
                isDragging = true;
                resizeHandle.classList.add('cdt-dragging');

                const startY = e.clientY;
                const startHeight = panelHeight;

                const onMouseMove = (e: MouseEvent) => {
                    if (!isDragging) return;
                    const delta = startY - e.clientY;
                    const newHeight = Math.max(200, Math.min(window.innerHeight - 100, startHeight + delta));
                    panelHeight = newHeight;
                    panel.style.height = `${newHeight}px`;
                };

                const onMouseUp = () => {
                    isDragging = false;
                    resizeHandle.classList.remove('cdt-dragging');
                    onStateChange({ panelHeight });
                    document.removeEventListener('mousemove', onMouseMove);
                    document.removeEventListener('mouseup', onMouseUp);
                };

                document.addEventListener('mousemove', onMouseMove);
                document.addEventListener('mouseup', onMouseUp);
            });
        }

        // Keyboard shortcut (Cmd/Ctrl + Shift + D)
        const keyHandler = (e: KeyboardEvent) => {
            if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key.toLowerCase() === 'd') {
                e.preventDefault();
                isOpen = !isOpen;
                onStateChange({ isOpen });
                render();
            }
        };
        document.addEventListener('keydown', keyHandler);
    }

    // Render active plugin content
    function renderActivePlugin() {
        const content = shadow.getElementById('plugin-content');
        if (!content) return;

        // Cleanup previous plugin
        currentPluginCleanup?.();
        currentPluginCleanup = undefined;
        content.innerHTML = '';

        // Find active plugin
        const plugin = plugins.find(p => p.id === activeTab);
        if (!plugin) return;

        // Create plugin container
        const pluginContainer = document.createElement('div');
        pluginContainer.className = 'cdt-plugin-container';
        pluginContainer.style.height = '100%';
        content.appendChild(pluginContainer);

        // Update context with current theme
        const pluginContext: PluginContext = {
            ...context,
            theme: getEffectiveTheme(),
        };

        // Render plugin
        plugin.render(pluginContainer, pluginContext);

        // Store cleanup
        currentPluginCleanup = () => plugin.destroy?.();
    }

    // Subscribe to context changes to re-render
    context.subscribe(() => {
        if (isOpen) {
            renderActivePlugin();
        }
    });

    // Subscribe to client state changes for header updates (disconnect button state)
    context.client.subscribe(() => {
        // Update disconnect button disabled state
        const disconnectBtn = shadow.querySelector('#disconnect-btn') as HTMLButtonElement | null;
        if (disconnectBtn) {
            disconnectBtn.disabled = !context.client.getSnapshot().connected;
        }
    });

    // Initial render
    render();

    return container;
}
