import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SecureLogger, createLogger, logger } from './secure-logger';

// Mock kit-utils
vi.mock('../kit-utils', () => ({
    isDebugEnabled: vi.fn(() => false),
    debug: vi.fn(),
}));

describe('SecureLogger', () => {
    let testLogger: SecureLogger;

    beforeEach(() => {
        testLogger = new SecureLogger({ prefix: 'Test', enabled: true, useConnectorDebug: false });
    });

    it('should create logger instance', () => {
        expect(testLogger).toBeInstanceOf(SecureLogger);
    });

    it('should have logging methods', () => {
        expect(typeof testLogger.debug).toBe('function');
        expect(typeof testLogger.info).toBe('function');
        expect(typeof testLogger.warn).toBe('function');
        expect(typeof testLogger.error).toBe('function');
    });

    it('should export default logger', () => {
        expect(logger).toBeInstanceOf(SecureLogger);
    });

    it('should create logger with custom prefix', () => {
        const customLogger = createLogger('Custom');
        expect(customLogger).toBeInstanceOf(SecureLogger);
    });

    it('should get and update config', () => {
        const config = testLogger.getConfig();
        expect(config).toHaveProperty('enabled');
        expect(config).toHaveProperty('level');
        expect(config).toHaveProperty('prefix');

        testLogger.updateConfig({ level: 'error' });
        expect(testLogger.getConfig().level).toBe('error');
    });
});
