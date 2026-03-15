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

export interface DevtoolsElement extends HTMLElement {
    /**
     * Cleanup hook invoked by `ConnectorDevtools.unmount()`.
     *
     * Must remove any document/window-level listeners and subscriptions.
     */
    __cdtCleanup?: () => void;
}

type PanelAnimState = 'hidden' | 'enter' | 'entered' | 'exit';

let hasPlayedTriggerEntrance = false;

/**
 * Create the devtools element with Shadow DOM
 */
export function createDevtoolsElement(options: DevtoolsElementOptions): DevtoolsElement {
    const { config, state, plugins, context, onStateChange } = options;

    // Create container element
    const container = document.createElement('div') as DevtoolsElement;
    container.className = 'connector-devtools-root';

    // Attach shadow DOM for style isolation
    const shadow = container.attachShadow({ mode: 'open' });

    // Cleanup controller (for document-level listeners)
    const abortController = new AbortController();

    // Internal state
    let isOpen = state.isOpen;
    let activeTab = state.activeTab;
    let panelHeight = state.panelHeight;
    const position: DevtoolsPosition = state.position;

    let isDragging = false;
    let currentPluginCleanup: (() => void) | undefined;

    // Always start hidden to avoid a flash before we can animate.
    let panelAnimState: PanelAnimState = 'hidden';
    let enterTimeout: number | undefined;
    let exitTimeout: number | undefined;

    const PANEL_ENTER_MS = 200;
    const PANEL_EXIT_MS = 150;

    const getConfig = () => context.getConfig?.() ?? config;
    const getEffectiveTheme = () => resolveTheme(getConfig().theme);

    // Position styles helper
    function getPositionStyles(pos: DevtoolsPosition): string {
        const offset = '16px';
        switch (pos) {
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

    function clearPanelTimers() {
        if (enterTimeout) window.clearTimeout(enterTimeout);
        if (exitTimeout) window.clearTimeout(exitTimeout);
        enterTimeout = undefined;
        exitTimeout = undefined;
    }

    // Generate styles (Agentation-inspired primitives + polish)
    const createStyles = () => {
        const theme = getEffectiveTheme();
        return `
${BASE_STYLES}
:host {
  ${generateThemeCss(theme)}
  color-scheme: ${theme};
}

@keyframes cdtToolbarEnter {
  from { opacity: 0; transform: scale(0.5) rotate(30deg); }
  to { opacity: 1; transform: scale(1) rotate(0deg); }
}

@keyframes cdtPanelEnter {
  from { height: 0; }
  to { height: var(--cdt-panel-height); }
}

@keyframes cdtPanelExit {
  from { height: var(--cdt-panel-height); }
  to { height: 0; }
}

.cdt-container {
  position: fixed;
  z-index: 999999;
}

/* Trigger button */
.cdt-trigger {
  position: fixed;
  ${getPositionStyles(position)}
  width: 40px;
  height: 40px;
  border-radius: 14px;
  background: var(--cdt-bg-panel);
  border: 1px solid var(--cdt-border);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2), 0 4px 16px rgba(0, 0, 0, 0.1);
  transition: opacity 0.2s ease, transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease;
  /* Keep below panel so panel can cover it */
  z-index: 999999;
  will-change: transform, opacity;
  font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  opacity: 1;
  transform: scale(1);
}

.cdt-trigger[data-entrance="true"] {
  animation: cdtToolbarEnter 0.5s cubic-bezier(0.34, 1.2, 0.64, 1) forwards;
}

.cdt-trigger:hover {
  transform: scale(1.05);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.26), 0 10px 24px rgba(0, 0, 0, 0.18);
  border-color: var(--cdt-border-hover);
}

.cdt-trigger:active {
  transform: scale(0.95);
}

.cdt-trigger svg {
  width: 18px;
  height: 16px;
  color: var(--cdt-text);
}

.cdt-trigger[data-hidden="true"] {
  opacity: 0;
  transform: scale(0.85);
  pointer-events: none;
}

.cdt-trigger[data-force-hidden="true"] {
  display: none;
}

/* Panel */
.cdt-panel {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  --cdt-panel-height: ${panelHeight}px;
  height: var(--cdt-panel-height);
  background: var(--cdt-bg);
  border-top: 1px solid var(--cdt-border);
  border-top-left-radius: 16px;
  border-top-right-radius: 16px;
  box-shadow: 0 -4px 24px rgba(0, 0, 0, 0.35), 0 0 0 1px color-mix(in srgb, var(--cdt-text) 8%, transparent);
  display: flex;
  flex-direction: column;
  /* Above trigger */
  z-index: 1000000;
  will-change: height;
  font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
}

.cdt-panel[data-state="hidden"] {
  height: 0;
  visibility: hidden;
  pointer-events: none;
}

.cdt-panel[data-state="enter"] {
  visibility: visible;
  pointer-events: auto;
  animation: cdtPanelEnter 0.2s cubic-bezier(0.34, 1.56, 0.64, 1) both;
}

.cdt-panel[data-state="entered"] {
  height: var(--cdt-panel-height);
  visibility: visible;
  pointer-events: auto;
}

.cdt-panel[data-state="exit"] {
  visibility: visible;
  pointer-events: none;
  animation: cdtPanelExit 0.15s ease-in both;
}

/* Resize handle */
.cdt-resize-handle {
  position: absolute;
  top: -6px;
  left: 0;
  right: 0;
  height: 12px;
  cursor: ns-resize;
  background: transparent;
}

.cdt-resize-handle:hover,
.cdt-resize-handle.cdt-dragging {
  background: var(--cdt-accent);
  opacity: 0.35;
}

/* Header */
.cdt-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 12px;
  height: 44px;
  border-bottom: 1px solid var(--cdt-border);
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
  font-weight: 650;
  font-size: 13px;
  letter-spacing: -0.01em;
}

.cdt-logo svg { width: 18px; height: 18px; }

.cdt-tabs { display: flex; gap: 2px; }

.cdt-tab {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  border-radius: 10px;
  font-size: 12px;
  font-weight: 550;
  color: var(--cdt-text-muted);
  background: transparent;
  transition: background-color 0.15s ease, color 0.15s ease, transform 0.1s ease;
}

.cdt-tab:hover {
  background: var(--cdt-bg-hover);
  color: var(--cdt-text);
}

.cdt-tab:active {
  transform: scale(0.98);
}

.cdt-tab.cdt-active {
  background: var(--cdt-bg-active);
  color: var(--cdt-text);
}

.cdt-tab svg { width: 14px; height: 14px; }

.cdt-header-right { display: flex; align-items: center; gap: 6px; }

.cdt-header-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  height: 30px;
  padding: 0 10px;
  border-radius: 10px;
  font-size: 11px;
  font-weight: 600;
  color: var(--cdt-text-muted);
  background: transparent;
  border: 1px solid transparent;
  transition: background-color 0.15s ease, color 0.15s ease, border-color 0.15s ease, transform 0.1s ease;
}

.cdt-header-btn:hover:not(:disabled) {
  background: var(--cdt-bg-hover);
  color: var(--cdt-text);
}

.cdt-header-btn:active:not(:disabled) {
  transform: scale(0.98);
}

.cdt-header-btn:disabled { opacity: 0.4; cursor: not-allowed; }

.cdt-disconnect-btn { border-color: var(--cdt-border); }

.cdt-disconnect-btn:hover:not(:disabled) {
  border-color: var(--cdt-error);
  color: var(--cdt-error);
}

.cdt-close-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: 12px;
  color: var(--cdt-text-muted);
  transition: background-color 0.15s ease, color 0.15s ease, transform 0.1s ease;
}

.cdt-close-btn:hover { background: var(--cdt-bg-hover); color: var(--cdt-text); }
.cdt-close-btn:active { transform: scale(0.92); }
.cdt-close-btn svg { width: 16px; height: 16px; }

/* Tooltip */
.cdt-tooltip-wrap {
  position: relative;
  display: inline-flex;
}

.cdt-tooltip-wrap[data-visible="false"] {
  display: none;
}

.cdt-tooltip {
  position: absolute;
  right: 0;
  bottom: calc(100% + 10px);
  width: 260px;
  padding: 10px 10px 9px;
  border-radius: 12px;
  border: 1px solid var(--cdt-border);
  background: var(--cdt-bg-panel);
  box-shadow: 0 10px 26px rgba(0, 0, 0, 0.28);
  color: var(--cdt-text);
  font-size: 11px;
  line-height: 1.35;
  opacity: 0;
  transform: translateY(4px);
  pointer-events: none;
  transition: opacity 0.12s ease, transform 0.12s ease;
  z-index: 2;
}

.cdt-tooltip-title {
  font-weight: 750;
  margin-bottom: 4px;
}

.cdt-tooltip-body {
  color: var(--cdt-text-muted);
}

.cdt-tooltip-wrap:hover .cdt-tooltip,
.cdt-tooltip-wrap:focus-within .cdt-tooltip {
  opacity: 1;
  transform: translateY(0);
}

.cdt-fresh-user-btn svg {
  width: 14px;
  height: 14px;
}

.cdt-fresh-user-btn:hover:not(:disabled) {
  border-color: var(--cdt-warning);
  color: var(--cdt-warning);
}

/* Content */
.cdt-content {
  flex: 1;
  overflow: auto;
  background: var(--cdt-bg);
}
        `;
    };

    const showTriggerEntrance = !hasPlayedTriggerEntrance;
    if (!hasPlayedTriggerEntrance) hasPlayedTriggerEntrance = true;

    // Build Shadow DOM once (same structure)
    shadow.innerHTML = `
      <style id="cdt-styles"></style>
      <div class="cdt-container">
        <button class="cdt-trigger" data-entrance="${showTriggerEntrance}" aria-label="Open Devtools">
          ${ICONS.solana}
        </button>

        <div class="cdt-panel" data-state="${panelAnimState}">
          <div class="cdt-resize-handle"></div>
          <div class="cdt-header">
            <div class="cdt-header-left">
              <div class="cdt-logo">
                ${ICONS.solana}
                <span>Debugger</span>
              </div>
              <div class="cdt-tabs">
                ${/* Plugin icon/name are developer-configured, not user input. icon must be trusted static SVG. */ ''}
                ${plugins
                    .map(
                        plugin => `
                  <button class="cdt-tab ${activeTab === plugin.id ? 'cdt-active' : ''}" data-tab="${plugin.id}">
                    ${plugin.icon ?? ''}
                    <span>${plugin.name.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</span>
                  </button>
                `,
                    )
                    .join('')}
              </div>
            </div>
            <div class="cdt-header-right">
              <button class="cdt-header-btn cdt-disconnect-btn" id="disconnect-btn" aria-label="Disconnect Wallet" ${
                  !context.client.getSnapshot().connected ? 'disabled' : ''
              }>
                Disconnect
              </button>
              <div class="cdt-tooltip-wrap" id="fresh-user-wrap" data-visible="true">
                <button class="cdt-header-btn cdt-fresh-user-btn" id="fresh-user-btn" aria-label="Simulate Fresh User">
                  ${ICONS.trash}
                </button>
                <div class="cdt-tooltip" role="tooltip">
                  <div class="cdt-tooltip-title">Simulate fresh user</div>
                  <div class="cdt-tooltip-body">
                    Clears stored wallet/account/network and reloads the page. This is different from Disconnect, which only ends the current session.
                  </div>
                </div>
              </div>
              <button class="cdt-close-btn" aria-label="Close Devtools">
                ${ICONS.close}
              </button>
            </div>
          </div>
          <div class="cdt-content" id="plugin-content"></div>
        </div>
      </div>
    `;

    const stylesEl = shadow.getElementById('cdt-styles') as HTMLStyleElement | null;
    const triggerBtn = shadow.querySelector<HTMLButtonElement>('.cdt-trigger');
    const panelEl = shadow.querySelector<HTMLElement>('.cdt-panel');
    const resizeHandle = shadow.querySelector<HTMLElement>('.cdt-resize-handle');
    const closeBtn = shadow.querySelector<HTMLButtonElement>('.cdt-close-btn');
    const disconnectBtn = shadow.querySelector<HTMLButtonElement>('#disconnect-btn');
    const freshUserWrapEl = shadow.querySelector<HTMLElement>('#fresh-user-wrap');
    const freshUserBtn = shadow.querySelector<HTMLButtonElement>('#fresh-user-btn');
    const pluginContentEl = shadow.getElementById('plugin-content');

    if (
        !stylesEl ||
        !triggerBtn ||
        !panelEl ||
        !resizeHandle ||
        !closeBtn ||
        !disconnectBtn ||
        !freshUserWrapEl ||
        !freshUserBtn ||
        !pluginContentEl
    ) {
        return container;
    }

    // TS nullability: create non-null aliases for closures.
    const styles = stylesEl;
    const trigger = triggerBtn;
    const panel = panelEl;
    const resize = resizeHandle;
    const close = closeBtn;
    const disconnect = disconnectBtn;
    const freshUserWrap = freshUserWrapEl;
    const freshUser = freshUserBtn;
    const pluginContent = pluginContentEl;

    function updateStyles() {
        styles.textContent = createStyles();
        // keep panel height in sync without rebuilding the whole DOM
        panel.style.setProperty('--cdt-panel-height', `${panelHeight}px`);
    }

    function updateFreshUserVisibility() {
        // Persist across all tabs (like Disconnect).
        freshUserWrap.dataset.visible = 'true';
    }

    function setPanelState(next: PanelAnimState) {
        panelAnimState = next;
        panel.dataset.state = next;
    }

    function updateTriggerVisibility() {
        const cfg = getConfig();
        trigger.dataset.forceHidden = cfg.triggerHidden ? 'true' : 'false';
        trigger.dataset.hidden = !cfg.triggerHidden && isOpen ? 'true' : 'false';
    }

    // Render active plugin content
    function renderActivePlugin() {
        // Cleanup previous plugin
        currentPluginCleanup?.();
        currentPluginCleanup = undefined;
        pluginContent.innerHTML = '';

        const plugin = plugins.find(p => p.id === activeTab);
        if (!plugin) return;

        const pluginContainer = document.createElement('div');
        pluginContainer.className = 'cdt-plugin-container';
        pluginContainer.style.height = '100%';
        pluginContent.appendChild(pluginContainer);

        const pluginContext: PluginContext = {
            ...context,
            theme: getEffectiveTheme(),
        };

        plugin.render(pluginContainer, pluginContext);
        currentPluginCleanup = () => plugin.destroy?.();
    }

    function animatePanelOpen() {
        clearPanelTimers();
        // Ensure panel is in a hidden baseline before starting enter animation
        setPanelState('hidden');
        requestAnimationFrame(() => {
            setPanelState('enter');
            enterTimeout = window.setTimeout(() => {
                if (panelAnimState === 'enter') setPanelState('entered');
            }, PANEL_ENTER_MS);
        });
    }

    function animatePanelClose() {
        clearPanelTimers();
        setPanelState('exit');
        exitTimeout = window.setTimeout(() => {
            if (panelAnimState === 'exit') setPanelState('hidden');
        }, PANEL_EXIT_MS);
    }

    function openDevtools() {
        if (isOpen) return;
        isOpen = true;
        onStateChange({ isOpen: true });
        updateTriggerVisibility();
        animatePanelOpen();
        renderActivePlugin();
    }

    function closeDevtools() {
        if (!isOpen) return;
        isOpen = false;
        onStateChange({ isOpen: false });
        updateTriggerVisibility();
        animatePanelClose();
    }

    // --- Event listeners (attach once) ---
    triggerBtn.addEventListener(
        'click',
        () => {
            openDevtools();
        },
        { signal: abortController.signal },
    );

    close.addEventListener(
        'click',
        () => {
            closeDevtools();
        },
        { signal: abortController.signal },
    );

    disconnect.addEventListener(
        'click',
        async () => {
            await context.client.disconnect();
            disconnect.disabled = !context.client.getSnapshot().connected;
        },
        { signal: abortController.signal },
    );

    freshUser.addEventListener(
        'click',
        () => {
            if (!window.confirm('This will clear stored wallet/account/network and reload the page. Continue?')) return;

            try {
                context.client.resetStorage();
            } catch {
                // best-effort
            }

            try {
                // Keep in sync with default-config storage keys and the Overview plugin persistence hints.
                localStorage.removeItem('connector-kit:v1:account');
                localStorage.removeItem('connector-kit:v1:wallet');
                localStorage.removeItem('connector-kit:v1:cluster');
                // Legacy keys (pre-v1)
                localStorage.removeItem('connector-kit:account');
                localStorage.removeItem('connector-kit:wallet');
                localStorage.removeItem('connector-kit:cluster');
            } catch {
                // ignore
            }

            window.location.reload();
        },
        { signal: abortController.signal },
    );

    // Tab clicks
    shadow.querySelectorAll<HTMLButtonElement>('.cdt-tab').forEach(tab => {
        tab.addEventListener(
            'click',
            () => {
                const tabId = tab.getAttribute('data-tab');
                if (tabId && tabId !== activeTab) {
                    activeTab = tabId;
                    onStateChange({ activeTab });
                    shadow.querySelectorAll('.cdt-tab').forEach(t => t.classList.remove('cdt-active'));
                    tab.classList.add('cdt-active');
                    updateFreshUserVisibility();
                    renderActivePlugin();
                }
            },
            { signal: abortController.signal },
        );
    });

    function setDropdownOpen(dropdown: HTMLElement, isOpen: boolean) {
        dropdown.dataset.open = isOpen ? 'true' : 'false';
        const trigger = dropdown.querySelector<HTMLElement>('[data-cdt-dropdown-trigger]');
        if (trigger) trigger.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
    }

    function closeAllDropdowns(except?: HTMLElement) {
        shadow.querySelectorAll<HTMLElement>('.cdt-dropdown[data-open="true"]').forEach(dropdown => {
            if (except && dropdown === except) return;
            setDropdownOpen(dropdown, false);
        });
    }

    function selectDropdownValue(dropdown: HTMLElement, value: string, label?: string) {
        dropdown.dataset.value = value;
        const textEl = dropdown.querySelector<HTMLElement>('.cdt-dropdown-trigger-text');
        if (textEl && label !== undefined) textEl.textContent = label;

        dropdown.querySelectorAll<HTMLElement>('[data-cdt-dropdown-option]').forEach(option => {
            const optionValue = option.getAttribute('data-value') ?? '';
            const isSelected = optionValue === value;
            option.dataset.selected = isSelected ? 'true' : 'false';
            option.setAttribute('aria-selected', isSelected ? 'true' : 'false');
        });
    }

    // Custom dropdown behavior (single implementation for all plugins).
    shadow.addEventListener(
        'pointerdown',
        e => {
            const target = e.target as HTMLElement | null;
            if (!target) return;
            const withinDropdown = target.closest?.('.cdt-dropdown');
            if (withinDropdown) return;
            closeAllDropdowns();
        },
        { signal: abortController.signal },
    );

    shadow.addEventListener(
        'click',
        e => {
            const target = e.target as HTMLElement | null;
            if (!target) return;

            const option = target.closest<HTMLElement>('[data-cdt-dropdown-option]');
            if (option) {
                const dropdown = option.closest<HTMLElement>('.cdt-dropdown');
                if (!dropdown) return;

                const value = option.getAttribute('data-value') ?? '';
                const current = dropdown.dataset.value ?? '';
                const label = option.querySelector<HTMLElement>('.cdt-dropdown-item-label')?.textContent ?? value;

                setDropdownOpen(dropdown, false);

                if (value !== current) {
                    selectDropdownValue(dropdown, value, label);
                    dropdown.dispatchEvent(
                        new CustomEvent('cdt-dropdown-change', {
                            detail: { id: dropdown.id, value },
                            bubbles: true,
                        }),
                    );
                }

                e.preventDefault();
                e.stopPropagation();
                return;
            }

            const trigger = target.closest<HTMLButtonElement>('[data-cdt-dropdown-trigger]');
            if (trigger) {
                const dropdown = trigger.closest<HTMLElement>('.cdt-dropdown');
                if (!dropdown) return;

                const isOpenNow = dropdown.dataset.open === 'true';
                if (isOpenNow) setDropdownOpen(dropdown, false);
                else {
                    closeAllDropdowns(dropdown);
                    setDropdownOpen(dropdown, true);
                }

                e.preventDefault();
                e.stopPropagation();
            }
        },
        { signal: abortController.signal },
    );

    shadow.addEventListener(
        'keydown',
        e => {
            const keyboardEvent = e as KeyboardEvent;
            const target = e.target as HTMLElement | null;
            if (!target) return;

            const dropdown = target.closest<HTMLElement>('.cdt-dropdown');
            if (!dropdown) return;

            const isOpen = dropdown.dataset.open === 'true';
            const trigger = dropdown.querySelector<HTMLButtonElement>('[data-cdt-dropdown-trigger]');
            const items = Array.from(dropdown.querySelectorAll<HTMLButtonElement>('[data-cdt-dropdown-option]'));
            const currentItem = target.closest<HTMLButtonElement>('[data-cdt-dropdown-option]');

            if (keyboardEvent.key === 'Escape') {
                setDropdownOpen(dropdown, false);
                trigger?.focus();
                keyboardEvent.preventDefault();
                keyboardEvent.stopPropagation();
                return;
            }

            if (
                !isOpen &&
                (keyboardEvent.key === 'Enter' ||
                    keyboardEvent.key === ' ' ||
                    keyboardEvent.key === 'ArrowDown' ||
                    keyboardEvent.key === 'ArrowUp')
            ) {
                closeAllDropdowns(dropdown);
                setDropdownOpen(dropdown, true);

                const selected = dropdown.querySelector<HTMLButtonElement>(
                    '[data-cdt-dropdown-option][data-selected="true"]',
                );
                const fallback = keyboardEvent.key === 'ArrowUp' ? items[items.length - 1] : items[0];
                (selected ?? fallback)?.focus();

                keyboardEvent.preventDefault();
                keyboardEvent.stopPropagation();
                return;
            }

            if (!isOpen) return;

            if ((keyboardEvent.key === 'Enter' || keyboardEvent.key === ' ') && currentItem) {
                currentItem.click();
                keyboardEvent.preventDefault();
                keyboardEvent.stopPropagation();
                return;
            }

            if (keyboardEvent.key === 'Tab') {
                setDropdownOpen(dropdown, false);
                return;
            }

            if (keyboardEvent.key !== 'ArrowDown' && keyboardEvent.key !== 'ArrowUp') return;

            const idx = currentItem ? items.indexOf(currentItem) : -1;
            if (!items.length) return;
            const nextIdx =
                keyboardEvent.key === 'ArrowDown'
                    ? (idx + 1 + items.length) % items.length
                    : (idx - 1 + items.length) % items.length;
            items[nextIdx]?.focus();
            keyboardEvent.preventDefault();
            keyboardEvent.stopPropagation();
        },
        { signal: abortController.signal },
    );

    // Resize handle
    resizeHandle.addEventListener(
        'mousedown',
        e => {
            e.preventDefault();
            isDragging = true;
            resize.classList.add('cdt-dragging');

            const startY = e.clientY;
            const startHeight = panelHeight;

            const onMouseMove = (e: MouseEvent) => {
                if (!isDragging) return;
                const delta = startY - e.clientY;
                const newHeight = Math.max(200, Math.min(window.innerHeight - 100, startHeight + delta));
                panelHeight = newHeight;
                panel.style.setProperty('--cdt-panel-height', `${newHeight}px`);
            };

            const onMouseUp = () => {
                isDragging = false;
                resize.classList.remove('cdt-dragging');
                onStateChange({ panelHeight });
                document.removeEventListener('mousemove', onMouseMove);
                document.removeEventListener('mouseup', onMouseUp);
            };

            document.addEventListener('mousemove', onMouseMove, { signal: abortController.signal });
            document.addEventListener('mouseup', onMouseUp, { signal: abortController.signal });
        },
        { signal: abortController.signal },
    );

    // Keyboard shortcut (Cmd/Ctrl + Shift + D)
    document.addEventListener(
        'keydown',
        e => {
            if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key.toLowerCase() === 'd') {
                e.preventDefault();
                if (isOpen) closeDevtools();
                else openDevtools();
            }
        },
        { signal: abortController.signal },
    );

    // Subscribe to context changes: refresh styles + plugin (theme changes)
    const unsubscribeContext = context.subscribe(() => {
        updateStyles();
        updateTriggerVisibility();
        updateFreshUserVisibility();
        if (isOpen) renderActivePlugin();
    });

    // Subscribe to client state changes for disconnect button updates
    const unsubscribeClient = context.client.subscribe(() => {
        disconnectBtn.disabled = !context.client.getSnapshot().connected;
    });

    // Expose cleanup hook for `ConnectorDevtools.unmount()`
    container.__cdtCleanup = () => {
        clearPanelTimers();
        unsubscribeContext?.();
        unsubscribeClient?.();
        abortController.abort();
    };

    // Initial paint
    updateStyles();
    updateTriggerVisibility();
    updateFreshUserVisibility();
    if (isOpen) {
        animatePanelOpen();
        renderActivePlugin();
    } else {
        setPanelState('hidden');
    }

    return container;
}
