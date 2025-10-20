/**
 * EventEmitter unit tests
 *
 * Tests event emission, listener management, and error handling
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { EventEmitter } from './event-emitter';
import type { ConnectorEventListener } from '../../types/events';
import {
    createConnectedEvent,
    createDisconnectedEvent,
    createErrorEvent,
    createWalletRegisteredEvent,
} from '../../__tests__/fixtures/events';

describe('EventEmitter', () => {
    let eventEmitter: EventEmitter;

    beforeEach(() => {
        eventEmitter = new EventEmitter();
    });

    describe('initialization', () => {
        it('should initialize with no listeners', () => {
            expect(eventEmitter.getListenerCount()).toBe(0);
        });

        it('should accept debug flag', () => {
            const debugEmitter = new EventEmitter(true);
            expect(debugEmitter).toBeDefined();
        });
    });

    describe('on/off', () => {
        it('should add a listener', () => {
            const listener = vi.fn();
            eventEmitter.on(listener);

            expect(eventEmitter.getListenerCount()).toBe(1);
        });

        it('should add multiple listeners', () => {
            const listener1 = vi.fn();
            const listener2 = vi.fn();
            const listener3 = vi.fn();

            eventEmitter.on(listener1);
            eventEmitter.on(listener2);
            eventEmitter.on(listener3);

            expect(eventEmitter.getListenerCount()).toBe(3);
        });

        it('should return unsubscribe function', () => {
            const listener = vi.fn();
            const unsubscribe = eventEmitter.on(listener);

            expect(eventEmitter.getListenerCount()).toBe(1);

            unsubscribe();

            expect(eventEmitter.getListenerCount()).toBe(0);
        });

        it('should remove listener with off', () => {
            const listener = vi.fn();
            eventEmitter.on(listener);

            expect(eventEmitter.getListenerCount()).toBe(1);

            eventEmitter.off(listener);

            expect(eventEmitter.getListenerCount()).toBe(0);
        });

        it('should handle removing non-existent listener', () => {
            const listener = vi.fn();

            expect(() => {
                eventEmitter.off(listener);
            }).not.toThrow();

            expect(eventEmitter.getListenerCount()).toBe(0);
        });
    });

    describe('offAll', () => {
        it('should remove all listeners', () => {
            const listener1 = vi.fn();
            const listener2 = vi.fn();
            const listener3 = vi.fn();

            eventEmitter.on(listener1);
            eventEmitter.on(listener2);
            eventEmitter.on(listener3);

            expect(eventEmitter.getListenerCount()).toBe(3);

            eventEmitter.offAll();

            expect(eventEmitter.getListenerCount()).toBe(0);
        });
    });

    describe('emit', () => {
        it('should emit events to listeners', () => {
            const listener = vi.fn();
            eventEmitter.on(listener);

            const event = createConnectedEvent();
            eventEmitter.emit(event);

            expect(listener).toHaveBeenCalledTimes(1);
            expect(listener).toHaveBeenCalledWith(event);
        });

        it('should emit to all listeners', () => {
            const listener1 = vi.fn();
            const listener2 = vi.fn();
            const listener3 = vi.fn();

            eventEmitter.on(listener1);
            eventEmitter.on(listener2);
            eventEmitter.on(listener3);

            const event = createDisconnectedEvent();
            eventEmitter.emit(event);

            expect(listener1).toHaveBeenCalledWith(event);
            expect(listener2).toHaveBeenCalledWith(event);
            expect(listener3).toHaveBeenCalledWith(event);
        });

        it('should add timestamp if not present', () => {
            const listener = vi.fn();
            eventEmitter.on(listener);

            const event = {
                type: 'connected',
                wallet: 'Phantom',
                accounts: ['test-address'],
            };

            // @ts-expect-error - Testing without timestamp
            eventEmitter.emit(event);

            expect(listener).toHaveBeenCalledWith(
                expect.objectContaining({
                    timestamp: expect.any(String),
                }),
            );
        });

        it('should preserve existing timestamp', () => {
            const listener = vi.fn();
            eventEmitter.on(listener);

            const timestamp = '2024-01-01T00:00:00.000Z';
            const event = createConnectedEvent('Phantom');
            event.timestamp = timestamp;

            eventEmitter.emit(event);

            expect(listener).toHaveBeenCalledWith(
                expect.objectContaining({
                    timestamp,
                }),
            );
        });

        it('should handle different event types', () => {
            const listener = vi.fn();
            eventEmitter.on(listener);

            const events = [
                createWalletRegisteredEvent(),
                createConnectedEvent(),
                createDisconnectedEvent(),
                createErrorEvent(),
            ];

            events.forEach(event => eventEmitter.emit(event));

            expect(listener).toHaveBeenCalledTimes(4);
        });

        it('should not throw if no listeners', () => {
            expect(() => {
                eventEmitter.emit(createConnectedEvent());
            }).not.toThrow();
        });
    });

    describe('error handling', () => {
        it('should catch and handle listener errors', () => {
            const errorListener: ConnectorEventListener = () => {
                throw new Error('Listener error');
            };
            const normalListener = vi.fn();

            eventEmitter.on(errorListener);
            eventEmitter.on(normalListener);

            expect(() => {
                eventEmitter.emit(createConnectedEvent());
            }).not.toThrow();

            // Normal listener should still be called
            expect(normalListener).toHaveBeenCalled();
        });

        it('should continue emitting to other listeners after error', () => {
            const listener1 = vi.fn();
            const errorListener: ConnectorEventListener = () => {
                throw new Error('Error');
            };
            const listener2 = vi.fn();

            eventEmitter.on(listener1);
            eventEmitter.on(errorListener);
            eventEmitter.on(listener2);

            eventEmitter.emit(createConnectedEvent());

            expect(listener1).toHaveBeenCalled();
            expect(listener2).toHaveBeenCalled();
        });
    });

    describe('getListenerCount', () => {
        it('should return correct count', () => {
            expect(eventEmitter.getListenerCount()).toBe(0);

            const listener1 = vi.fn();
            eventEmitter.on(listener1);
            expect(eventEmitter.getListenerCount()).toBe(1);

            const listener2 = vi.fn();
            eventEmitter.on(listener2);
            expect(eventEmitter.getListenerCount()).toBe(2);

            eventEmitter.off(listener1);
            expect(eventEmitter.getListenerCount()).toBe(1);

            eventEmitter.offAll();
            expect(eventEmitter.getListenerCount()).toBe(0);
        });
    });

    describe('timestamp utility', () => {
        it('should generate ISO timestamp', () => {
            const timestamp = EventEmitter.timestamp();

            expect(timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
        });

        it('should generate different timestamps', () => {
            const timestamp1 = EventEmitter.timestamp();

            // Wait a tiny bit
            const start = Date.now();
            while (Date.now() - start < 2) {
                // Busy wait
            }

            const timestamp2 = EventEmitter.timestamp();

            expect(timestamp1).not.toBe(timestamp2);
        });
    });

    describe('debug mode', () => {
        it('should work in debug mode', () => {
            const debugEmitter = new EventEmitter(true);
            const listener = vi.fn();

            debugEmitter.on(listener);
            debugEmitter.emit(createConnectedEvent());

            expect(listener).toHaveBeenCalled();
        });
    });
});
