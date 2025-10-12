import type { ConnectorEvent, ConnectorEventListener } from '../../types/events';

/**
 * EventEmitter - Handles event system for connector
 *
 * Provides event listener management and emission with error handling.
 * Used for analytics, logging, monitoring, and custom behavior.
 */
export class EventEmitter {
    private listeners = new Set<ConnectorEventListener>();
    private debug: boolean;

    constructor(debug = false) {
        this.debug = debug;
    }

    /**
     * Subscribe to connector events
     */
    on(listener: ConnectorEventListener): () => void {
        this.listeners.add(listener);
        return () => this.listeners.delete(listener);
    }

    /**
     * Remove a specific event listener
     */
    off(listener: ConnectorEventListener): void {
        this.listeners.delete(listener);
    }

    /**
     * Remove all event listeners
     */
    offAll(): void {
        this.listeners.clear();
    }

    /**
     * Emit an event to all listeners
     */
    emit(event: ConnectorEvent): void {
        // Log events in debug mode
        if (this.debug) {
            console.log('[Connector Event]', event.type, event);
        }

        // Call all event listeners
        this.listeners.forEach(listener => {
            try {
                listener(event);
            } catch (error) {
                // Don't let listener errors crash the connector
                console.error('[Connector] Event listener error:', error);
            }
        });
    }

    /**
     * Get the number of active listeners
     */
    getListenerCount(): number {
        return this.listeners.size;
    }
}
