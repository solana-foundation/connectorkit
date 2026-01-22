/**
 * Events Plugin
 *
 * Displays:
 * - Real-time event stream
 * - Event filtering by type
 * - Pause/resume/clear functionality
 * - Event details expansion
 */

import type { ConnectorDevtoolsPlugin, PluginContext } from '../types';
import { ICONS } from '../components/icons';

interface StoredEvent {
    id: number;
    type: string;
    timestamp: string;
    data: Record<string, unknown>;
}

export function createEventsPlugin(maxEvents = 100): ConnectorDevtoolsPlugin {
    let events: StoredEvent[] = [];
    let eventId = 0;
    let isPaused = false;
    let selectedType: string | null = null;
    let expandedEventId: number | null = null;
    let unsubscribe: (() => void) | undefined;
    let renderFn: (() => void) | undefined;

    return {
        id: 'events',
        name: 'Events',
        icon: ICONS.events,

        render(el: HTMLElement, ctx: PluginContext) {
            const { client } = ctx;

            // Get unique event types for filter
            const getEventTypes = () => {
                const types = new Set(events.map(e => e.type));
                return Array.from(types).sort();
            };

            // Get filtered events
            const getFilteredEvents = () => {
                if (!selectedType) return events;
                return events.filter(e => e.type === selectedType);
            };

            // Format timestamp
            const formatTime = (timestamp: string) => {
                const date = new Date(timestamp);
                const timeStr = date.toLocaleTimeString('en-US', {
                    hour12: false,
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit',
                });
                const ms = date.getMilliseconds().toString().padStart(3, '0');
                return `${timeStr}.${ms}`;
            };

            // Get event type color
            const getEventTypeClass = (type: string) => {
                if (type.startsWith('wallet:')) return 'cdt-event-wallet';
                if (type.startsWith('account:')) return 'cdt-event-account';
                if (type.startsWith('cluster:')) return 'cdt-event-cluster';
                if (type.startsWith('transaction:')) return 'cdt-event-transaction';
                if (type.startsWith('error')) return 'cdt-event-error';
                if (type.startsWith('storage:')) return 'cdt-event-storage';
                return 'cdt-event-default';
            };

            // Render content
            function renderContent() {
                const filteredEvents = getFilteredEvents();
                const eventTypes = getEventTypes();

                el.innerHTML = `
                    <div class="cdt-events">
                        <style>
                            .cdt-events {
                                display: flex;
                                flex-direction: column;
                                height: 100%;
                            }

                            .cdt-events-toolbar {
                                display: flex;
                                align-items: center;
                                justify-content: space-between;
                                padding: 8px 12px;
                                border-bottom: 1px solid var(--cdt-border);
                                background: var(--cdt-bg-panel);
                                gap: 8px;
                            }

                            .cdt-events-toolbar-left {
                                display: flex;
                                align-items: center;
                                gap: 8px;
                            }

                            .cdt-events-toolbar-right {
                                display: flex;
                                align-items: center;
                                gap: 8px;
                            }

                            .cdt-events-filter {
                                padding: 4px 8px;
                                font-size: 11px;
                                border-radius: 4px;
                                background: var(--cdt-bg-hover);
                                border: 1px solid var(--cdt-border);
                                color: var(--cdt-text);
                                cursor: pointer;
                            }

                            .cdt-events-count {
                                font-size: 11px;
                                color: var(--cdt-text-muted);
                            }

                            .cdt-events-list {
                                flex: 1;
                                overflow-y: auto;
                                font-size: 12px;
                            }

                            .cdt-event-item {
                                display: flex;
                                flex-direction: column;
                                border-bottom: 1px solid var(--cdt-border);
                                cursor: pointer;
                                transition: background 0.1s;
                            }

                            .cdt-event-item:hover {
                                background: var(--cdt-bg-hover);
                            }

                            .cdt-event-header {
                                display: flex;
                                align-items: center;
                                padding: 8px 12px;
                                gap: 12px;
                            }

                            .cdt-event-time {
                                font-family: ui-monospace, monospace;
                                font-size: 11px;
                                color: var(--cdt-text-dim);
                                flex-shrink: 0;
                            }

                            .cdt-event-type {
                                font-weight: 500;
                                padding: 2px 8px;
                                border-radius: 4px;
                                font-size: 11px;
                            }

                            .cdt-event-wallet {
                                background: color-mix(in srgb, var(--cdt-accent) 15%, transparent);
                                color: var(--cdt-accent);
                            }

                            .cdt-event-account {
                                background: color-mix(in srgb, var(--cdt-info) 15%, transparent);
                                color: var(--cdt-info);
                            }

                            .cdt-event-cluster {
                                background: color-mix(in srgb, var(--cdt-warning) 15%, transparent);
                                color: var(--cdt-warning);
                            }

                            .cdt-event-transaction {
                                background: color-mix(in srgb, var(--cdt-success) 15%, transparent);
                                color: var(--cdt-success);
                            }

                            .cdt-event-error {
                                background: color-mix(in srgb, var(--cdt-error) 15%, transparent);
                                color: var(--cdt-error);
                            }

                            .cdt-event-storage {
                                background: color-mix(in srgb, #f59e0b 15%, transparent);
                                color: #f59e0b;
                            }

                            .cdt-event-default {
                                background: var(--cdt-bg-hover);
                                color: var(--cdt-text-muted);
                            }

                            .cdt-event-preview {
                                flex: 1;
                                color: var(--cdt-text-muted);
                                font-family: ui-monospace, monospace;
                                font-size: 11px;
                                overflow: hidden;
                                text-overflow: ellipsis;
                                white-space: nowrap;
                            }

                            .cdt-event-details {
                                padding: 8px 12px;
                                background: var(--cdt-bg-panel);
                                border-top: 1px solid var(--cdt-border);
                            }

                            .cdt-event-json {
                                font-family: ui-monospace, monospace;
                                font-size: 11px;
                                color: var(--cdt-text);
                                white-space: pre-wrap;
                                word-break: break-all;
                                line-height: 1.6;
                            }

                            .cdt-events-empty {
                                display: flex;
                                flex-direction: column;
                                align-items: center;
                                justify-content: center;
                                height: 100%;
                                color: var(--cdt-text-dim);
                                gap: 8px;
                            }

                            .cdt-events-empty svg {
                                width: 32px;
                                height: 32px;
                                opacity: 0.5;
                            }

                            .cdt-paused-indicator {
                                display: flex;
                                align-items: center;
                                gap: 4px;
                                font-size: 11px;
                                color: var(--cdt-warning);
                            }
                        </style>

                        <div class="cdt-events-toolbar">
                            <div class="cdt-events-toolbar-left">
                                <button class="cdt-btn cdt-btn-ghost cdt-btn-icon" id="toggle-pause" title="${isPaused ? 'Resume' : 'Pause'}">
                                    ${isPaused ? ICONS.play : ICONS.pause}
                                </button>
                                <button class="cdt-btn cdt-btn-ghost cdt-btn-icon" id="clear-events" title="Clear events">
                                    ${ICONS.trash}
                                </button>
                                <select class="cdt-events-filter" id="event-filter">
                                    <option value="">All events</option>
                                    ${eventTypes.map(type => `<option value="${type}" ${selectedType === type ? 'selected' : ''}>${type}</option>`).join('')}
                                </select>
                            </div>
                            <div class="cdt-events-toolbar-right">
                                ${isPaused ? '<div class="cdt-paused-indicator">⏸ Paused</div>' : ''}
                                <span class="cdt-events-count">${filteredEvents.length} / ${events.length} events</span>
                            </div>
                        </div>

                        <div class="cdt-events-list" id="events-list">
                            ${
                                filteredEvents.length === 0
                                    ? `
                                <div class="cdt-events-empty">
                                    ${ICONS.events}
                                    <span>No events yet</span>
                                    <span style="font-size: 11px">Events will appear as they occur</span>
                                </div>
                            `
                                    : filteredEvents
                                          .slice()
                                          .reverse()
                                          .map(
                                              event => `
                                <div class="cdt-event-item" data-event-id="${event.id}">
                                    <div class="cdt-event-header">
                                        <span class="cdt-event-time">${formatTime(event.timestamp)}</span>
                                        <span class="cdt-event-type ${getEventTypeClass(event.type)}">${event.type}</span>
                                        <span class="cdt-event-preview">${getEventPreview(event.data)}</span>
                                    </div>
                                    ${
                                        expandedEventId === event.id
                                            ? `
                                        <div class="cdt-event-details">
                                            <pre class="cdt-event-json">${JSON.stringify(event.data, null, 2)}</pre>
                                        </div>
                                    `
                                            : ''
                                    }
                                </div>
                            `,
                                          )
                                          .join('')
                            }
                        </div>
                    </div>
                `;

                // Attach event handlers
                const togglePauseBtn = el.querySelector('#toggle-pause');
                const clearBtn = el.querySelector('#clear-events');
                const filterSelect = el.querySelector('#event-filter') as HTMLSelectElement | null;
                const eventItems = el.querySelectorAll('.cdt-event-item');

                togglePauseBtn?.addEventListener('click', () => {
                    isPaused = !isPaused;
                    renderContent();
                });

                clearBtn?.addEventListener('click', () => {
                    events = [];
                    expandedEventId = null;
                    renderContent();
                });

                filterSelect?.addEventListener('change', () => {
                    selectedType = filterSelect.value || null;
                    renderContent();
                });

                eventItems.forEach(item => {
                    item.addEventListener('click', () => {
                        const id = parseInt(item.getAttribute('data-event-id') ?? '', 10);
                        expandedEventId = expandedEventId === id ? null : id;
                        renderContent();
                    });
                });
            }

            // Get preview text for event data
            function getEventPreview(data: Record<string, unknown>): string {
                const { type, timestamp, ...rest } = data;
                const keys = Object.keys(rest);
                if (keys.length === 0) return '';

                const preview = keys
                    .slice(0, 3)
                    .map(k => {
                        const v = rest[k];
                        if (typeof v === 'string' && v.length > 20) {
                            return `${k}: ${v.slice(0, 8)}...${v.slice(-4)}`;
                        }
                        return `${k}: ${JSON.stringify(v)}`;
                    })
                    .join(', ');

                return preview;
            }

            // Store render function for updates
            renderFn = renderContent;

            // Subscribe to connector events
            unsubscribe = client.on(event => {
                if (isPaused) return;

                const { type, ...data } = event;
                events.push({
                    id: ++eventId,
                    type,
                    timestamp: event.timestamp,
                    data: data as Record<string, unknown>,
                });

                // Limit events
                if (events.length > maxEvents) {
                    events = events.slice(-maxEvents);
                }

                renderContent();
            });

            // Initial render
            renderContent();
        },

        destroy() {
            unsubscribe?.();
            unsubscribe = undefined;
            renderFn = undefined;
            // Keep events in memory for when tab is re-opened
        },
    };
}
