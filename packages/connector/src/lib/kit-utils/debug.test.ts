import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { debug, isDebugEnabled } from './debug';

const DEFAULT_PREFIX = '[Connector]';

describe('isDebugEnabled', () => {
    const originalEnv = process.env;

    beforeEach(() => {
        vi.resetModules();
        process.env = { ...originalEnv };
        // @ts-expect-error - global debug flag
        globalThis.__CONNECTOR_DEBUG__ = undefined;
        // @ts-expect-error - global debug level
        globalThis.__CONNECTOR_DEBUG_LEVEL__ = undefined;
    });

    afterEach(() => {
        process.env = originalEnv;
        // @ts-expect-error - global debug flag
        globalThis.__CONNECTOR_DEBUG__ = undefined;
        // @ts-expect-error - global debug level
        globalThis.__CONNECTOR_DEBUG_LEVEL__ = undefined;
    });

    it('returns false when no debug flags are set', () => {
        expect(isDebugEnabled()).toBe(false);
    });

    it('returns true when CONNECTOR_DEBUG_LEVEL is set', () => {
        process.env.CONNECTOR_DEBUG_LEVEL = 'debug';
        expect(isDebugEnabled()).toBe(true);
    });

    it('returns true when global.__CONNECTOR_DEBUG_LEVEL__ is set', () => {
        // @ts-expect-error - global debug level
        globalThis.__CONNECTOR_DEBUG_LEVEL__ = 'info';
        expect(isDebugEnabled()).toBe(true);
    });

    it('returns true when CONNECTOR_DEBUG env is "true"', () => {
        process.env.CONNECTOR_DEBUG = 'true';
        expect(isDebugEnabled()).toBe(true);
    });

    it('returns true when CONNECTOR_DEBUG env is "1"', () => {
        process.env.CONNECTOR_DEBUG = '1';
        expect(isDebugEnabled()).toBe(true);
    });

    it('returns true when global.__CONNECTOR_DEBUG__ is true', () => {
        // @ts-expect-error - global debug flag
        globalThis.__CONNECTOR_DEBUG__ = true;
        expect(isDebugEnabled()).toBe(true);
    });

    it('returns false for falsy values', () => {
        process.env.CONNECTOR_DEBUG = 'false';
        // @ts-expect-error - global debug flag
        globalThis.__CONNECTOR_DEBUG__ = false;
        // @ts-expect-error - global debug level
        globalThis.__CONNECTOR_DEBUG_LEVEL__ = undefined;
        expect(isDebugEnabled()).toBe(false);
    });

    it('returns true when multiple debug flags are set (one true)', () => {
        process.env.CONNECTOR_DEBUG = 'false';
        // @ts-expect-error - global debug flag
        globalThis.__CONNECTOR_DEBUG__ = true;
        expect(isDebugEnabled()).toBe(true);
    });
});

describe('debug logger', () => {
    const originalConsole = { ...console };
    const originalEnv = process.env;

    beforeEach(() => {
        console.log = vi.fn();
        console.debug = vi.fn();
        console.info = vi.fn();
        console.warn = vi.fn();
        console.error = vi.fn();

        vi.resetModules();
        process.env = { ...originalEnv };
        // @ts-expect-error - global debug flag
        globalThis.__CONNECTOR_DEBUG__ = undefined;
        // @ts-expect-error - global debug level
        globalThis.__CONNECTOR_DEBUG_LEVEL__ = undefined;
    });

    afterEach(() => {
        console.log = originalConsole.log;
        console.debug = originalConsole.debug;
        console.info = originalConsole.info;
        console.warn = originalConsole.warn;
        console.error = originalConsole.error;

        process.env = originalEnv;
        // @ts-expect-error - global debug flag
        globalThis.__CONNECTOR_DEBUG__ = undefined;
        // @ts-expect-error - global debug level
        globalThis.__CONNECTOR_DEBUG_LEVEL__ = undefined;
    });

    describe('when debug is enabled', () => {
        beforeEach(() => {
            // @ts-expect-error - global debug flag
            globalThis.__CONNECTOR_DEBUG__ = true;
            // @ts-expect-error - global debug level
            globalThis.__CONNECTOR_DEBUG_LEVEL__ = 'debug';
        });

        it('calls console.log for debug level', () => {
            debug('test message', 'debug');
            expect(console.log).toHaveBeenCalledWith(DEFAULT_PREFIX, 'test message');
            expect(console.debug).not.toHaveBeenCalled();
            expect(console.info).not.toHaveBeenCalled();
            expect(console.warn).not.toHaveBeenCalled();
            expect(console.error).not.toHaveBeenCalled();
        });

        it('calls console.info for info level', () => {
            debug('test message', 'info');
            expect(console.log).not.toHaveBeenCalled();
            expect(console.debug).not.toHaveBeenCalled();
            expect(console.info).toHaveBeenCalledWith(DEFAULT_PREFIX, 'test message');
            expect(console.warn).not.toHaveBeenCalled();
            expect(console.error).not.toHaveBeenCalled();
        });

        it('calls console.warn for warn level', () => {
            debug('test message', 'warn');
            expect(console.log).not.toHaveBeenCalled();
            expect(console.debug).not.toHaveBeenCalled();
            expect(console.info).not.toHaveBeenCalled();
            expect(console.warn).toHaveBeenCalledWith(DEFAULT_PREFIX, 'test message');
            expect(console.error).not.toHaveBeenCalled();
        });

        it('calls console.error for error level', () => {
            debug('test message', 'error');
            expect(console.log).not.toHaveBeenCalled();
            expect(console.debug).not.toHaveBeenCalled();
            expect(console.info).not.toHaveBeenCalled();
            expect(console.warn).not.toHaveBeenCalled();
            expect(console.error).toHaveBeenCalledWith(DEFAULT_PREFIX, 'test message');
        });

        it('stringifies objects', () => {
            const obj = { test: 'value' };
            debug(obj, 'info');
            expect(console.info).toHaveBeenCalledWith(DEFAULT_PREFIX, JSON.stringify(obj, null, 2));
        });

        it('uses custom prefix', () => {
            debug('test message', 'info', '[Custom]');
            expect(console.info).toHaveBeenCalledWith('[Custom]', 'test message');
        });

        it('defaults to info level', () => {
            debug('test message');
            expect(console.info).toHaveBeenCalledWith(DEFAULT_PREFIX, 'test message');
        });
    });

    describe('log level filtering', () => {
        beforeEach(() => {
            // @ts-expect-error - global debug flag
            globalThis.__CONNECTOR_DEBUG__ = true;
        });

        it('does not log debug when level is info', () => {
            // @ts-expect-error - global debug level
            globalThis.__CONNECTOR_DEBUG_LEVEL__ = 'info';
            debug('test message', 'debug');
            expect(console.log).not.toHaveBeenCalled();
            expect(console.debug).not.toHaveBeenCalled();
        });

        it('does not log info when level is warn', () => {
            // @ts-expect-error - global debug level
            globalThis.__CONNECTOR_DEBUG_LEVEL__ = 'warn';
            debug('test message', 'info');
            expect(console.info).not.toHaveBeenCalled();
        });

        it('does not log warn when level is error', () => {
            // @ts-expect-error - global debug level
            globalThis.__CONNECTOR_DEBUG_LEVEL__ = 'error';
            debug('test message', 'warn');
            expect(console.warn).not.toHaveBeenCalled();
        });

        it('logs error regardless of level', () => {
            // @ts-expect-error - global debug level
            globalThis.__CONNECTOR_DEBUG_LEVEL__ = 'error';
            debug('test message', 'error');
            expect(console.error).toHaveBeenCalled();
        });

        it('logs all levels when set to debug', () => {
            // @ts-expect-error - global debug level
            globalThis.__CONNECTOR_DEBUG_LEVEL__ = 'debug';

            debug('debug message', 'debug');
            expect(console.log).toHaveBeenCalled();

            debug('info message', 'info');
            expect(console.info).toHaveBeenCalled();

            debug('warn message', 'warn');
            expect(console.warn).toHaveBeenCalled();

            debug('error message', 'error');
            expect(console.error).toHaveBeenCalled();
        });
    });

    describe('when debug is disabled', () => {
        beforeEach(() => {
            // @ts-expect-error - global debug flag
            globalThis.__CONNECTOR_DEBUG__ = false;
        });

        it('does not log anything', () => {
            debug('test message', 'debug');
            debug('test message', 'info');
            debug('test message', 'warn');
            debug('test message', 'error');

            expect(console.log).not.toHaveBeenCalled();
            expect(console.debug).not.toHaveBeenCalled();
            expect(console.info).not.toHaveBeenCalled();
            expect(console.warn).not.toHaveBeenCalled();
            expect(console.error).not.toHaveBeenCalled();
        });
    });
});


