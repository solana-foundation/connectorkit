import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { isDebugEnabled, debug } from './debug';

describe('Kit Debug Utilities', () => {
    const originalEnv = process.env;

    beforeEach(() => {
        process.env = { ...originalEnv };
        vi.clearAllMocks();
    });

    afterEach(() => {
        process.env = originalEnv;
    });

    describe('isDebugEnabled', () => {
        it('should return false when debug is not enabled', () => {
            delete process.env.CONNECTOR_DEBUG;
            delete process.env.CONNECTOR_DEBUG_LEVEL;
            expect(isDebugEnabled()).toBe(false);
        });

        it('should return true when CONNECTOR_DEBUG is true', () => {
            process.env.CONNECTOR_DEBUG = 'true';
            expect(isDebugEnabled()).toBe(true);
        });

        it('should return true when CONNECTOR_DEBUG is 1', () => {
            process.env.CONNECTOR_DEBUG = '1';
            expect(isDebugEnabled()).toBe(true);
        });

        it('should return true when CONNECTOR_DEBUG_LEVEL is set', () => {
            process.env.CONNECTOR_DEBUG_LEVEL = 'debug';
            expect(isDebugEnabled()).toBe(true);
        });
    });

    describe('debug', () => {
        it('should not log when debug is disabled', () => {
            const consoleSpy = vi.spyOn(console, 'info');
            delete process.env.CONNECTOR_DEBUG;
            delete process.env.CONNECTOR_DEBUG_LEVEL;

            debug('test message');

            expect(consoleSpy).not.toHaveBeenCalled();
        });

        it('should log when debug is enabled', () => {
            const consoleSpy = vi.spyOn(console, 'info');
            process.env.CONNECTOR_DEBUG = 'true';

            debug('test message');

            expect(consoleSpy).toHaveBeenCalledWith('[Connector]', 'test message');
        });

        it('should stringify objects', () => {
            const consoleSpy = vi.spyOn(console, 'info');
            process.env.CONNECTOR_DEBUG = 'true';

            debug({ key: 'value' });

            expect(consoleSpy).toHaveBeenCalledWith('[Connector]', expect.stringContaining('key'));
        });

        it('should use custom prefix', () => {
            const consoleSpy = vi.spyOn(console, 'info');
            process.env.CONNECTOR_DEBUG = 'true';

            debug('test message', 'info', '[Custom]');

            expect(consoleSpy).toHaveBeenCalledWith('[Custom]', 'test message');
        });
    });
});
