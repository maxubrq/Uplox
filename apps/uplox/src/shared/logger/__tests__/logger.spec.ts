import { describe, expect, it, vi, beforeEach, MockedFunction } from 'vitest';
import { createLogger, format, Logger, transports } from 'winston';
import { UploxAppLoggerImpl } from '../logger';
import { customConsoleFormat, customFileFormat } from '../logger-utils';

// Mock Winston
vi.mock('winston', () => {
    const mockLogger = {
        warn: vi.fn(),
        error: vi.fn(),
        debug: vi.fn(),
        info: vi.fn(),
    };

    return {
        createLogger: vi.fn(() => mockLogger),
        format: {
            combine: vi.fn(),
            timestamp: vi.fn(),
        },
        transports: {
            Console: vi.fn(),
            File: vi.fn(),
        },
    };
});

// Mock logger-utils
vi.mock('../logger-utils', () => ({
    customConsoleFormat: vi.fn(),
    customFileFormat: vi.fn(),
}));

describe('UploxAppLoggerImpl', () => {
    let mockLogger: Logger;
    let mockCreateLogger: MockedFunction<typeof createLogger>;
    let mockConsoleTransport: any;
    let mockFileTransport: any;
    let mockCustomConsoleFormat: MockedFunction<typeof customConsoleFormat>;
    let mockCustomFileFormat: MockedFunction<typeof customFileFormat>;

    beforeEach(() => {
        vi.clearAllMocks();

        mockLogger = {
            warn: vi.fn(),
            error: vi.fn(),
            debug: vi.fn(),
            info: vi.fn(),
        } as any;

        mockCreateLogger = createLogger as MockedFunction<typeof createLogger>;
        mockCreateLogger.mockReturnValue(mockLogger);

        mockConsoleTransport = transports.Console as any;
        mockFileTransport = transports.File as any;
        mockCustomConsoleFormat = customConsoleFormat as MockedFunction<typeof customConsoleFormat>;
        mockCustomFileFormat = customFileFormat as MockedFunction<typeof customFileFormat>;

        // Mock format functions
        const mockConsoleFormatResult = 'mock-console-format' as any;
        const mockFileFormatResult = 'mock-file-format' as any;
        const mockFormatCombine = 'mock-format-combine' as any;
        const mockFormatTimestamp = 'mock-format-timestamp' as any;

        mockCustomConsoleFormat.mockReturnValue(mockConsoleFormatResult);
        mockCustomFileFormat.mockReturnValue(mockFileFormatResult);

        (format.combine as any).mockReturnValue(mockFormatCombine);
        (format.timestamp as any).mockReturnValue(mockFormatTimestamp);
    });

    describe('constructor', () => {
        it('should create logger with default parameters', () => {
            const logger = new UploxAppLoggerImpl('TestApp');

            expect(mockCreateLogger).toHaveBeenCalledWith({
                level: 'info',
                format: 'mock-format-combine',
                transports: expect.any(Array),
            });

            expect(mockCustomConsoleFormat).toHaveBeenCalledWith('TestApp', false);
            expect(mockCustomFileFormat).toHaveBeenCalledWith('TestApp', false);
        });

        it('should create logger with custom parameters', () => {
            const logger = new UploxAppLoggerImpl('CustomApp', true, 'debug');

            expect(mockCreateLogger).toHaveBeenCalledWith({
                level: 'debug',
                format: 'mock-format-combine',
                transports: expect.any(Array),
            });

            expect(mockCustomConsoleFormat).toHaveBeenCalledWith('CustomApp', true);
            expect(mockCustomFileFormat).toHaveBeenCalledWith('CustomApp', true);
        });

        it('should create console transport with correct configuration', () => {
            new UploxAppLoggerImpl('TestApp', false, 'warn');

            expect(mockConsoleTransport).toHaveBeenCalledWith({
                level: 'warn',
                format: 'mock-format-combine',
            });
        });

        it('should create file transports with correct configuration', () => {
            new UploxAppLoggerImpl('TestApp', true, 'debug');

            expect(mockFileTransport).toHaveBeenCalledWith({
                filename: 'error.log',
                level: 'error',
                format: 'mock-format-combine',
            });

            expect(mockFileTransport).toHaveBeenCalledWith({
                level: 'debug',
                filename: 'combined.log',
                format: 'mock-format-combine',
            });
        });
    });

    describe('getters', () => {
        it('should return correct app name', () => {
            const logger = new UploxAppLoggerImpl('MyApp');
            expect(logger.appName).toBe('MyApp');
        });

        it('should return correct useJson flag', () => {
            const logger1 = new UploxAppLoggerImpl('App1', false);
            const logger2 = new UploxAppLoggerImpl('App2', true);

            expect(logger1.isUseJson).toBe(false);
            expect(logger2.isUseJson).toBe(true);
        });

        it('should return correct level', () => {
            const logger1 = new UploxAppLoggerImpl('App1', false, 'info');
            const logger2 = new UploxAppLoggerImpl('App2', false, 'debug');

            expect(logger1.level).toBe('info');
            expect(logger2.level).toBe('debug');
        });
    });

    describe('static getInstance', () => {
        it('should create instance with default parameters', () => {
            const logger = UploxAppLoggerImpl.getInstance('TestApp');

            expect(logger).toBeInstanceOf(UploxAppLoggerImpl);
            expect(logger.appName).toBe('TestApp');
            expect(logger.isUseJson).toBe(false);
            expect(logger.level).toBe('info');
        });

        it('should create instance with custom parameters', () => {
            const logger = UploxAppLoggerImpl.getInstance('CustomApp', true, 'debug');

            expect(logger).toBeInstanceOf(UploxAppLoggerImpl);
            expect(logger.appName).toBe('CustomApp');
            expect(logger.isUseJson).toBe(true);
            expect(logger.level).toBe('debug');
        });
    });

    describe('logging methods', () => {
        let logger: UploxAppLoggerImpl;

        beforeEach(() => {
            logger = new UploxAppLoggerImpl('TestApp');
        });

        it('should call winston warn method', () => {
            const message = 'Warning message';
            const args = ['arg1', 'arg2'];

            logger.warn(message, ...args);

            expect(mockLogger.warn).toHaveBeenCalledWith(message, ...args);
        });

        it('should call winston error method', () => {
            const message = 'Error message';
            const args = ['arg1', 'arg2'];

            logger.error(message, ...args);

            expect(mockLogger.error).toHaveBeenCalledWith(message, ...args);
        });

        it('should call winston debug method', () => {
            const message = 'Debug message';
            const args = ['arg1', 'arg2'];

            logger.debug(message, ...args);

            expect(mockLogger.debug).toHaveBeenCalledWith(message, ...args);
        });

        it('should call winston info method', () => {
            const message = 'Info message';
            const args = ['arg1', 'arg2'];

            logger.info(message, ...args);

            expect(mockLogger.info).toHaveBeenCalledWith(message, ...args);
        });

        it('should handle logging without additional arguments', () => {
            const message = 'Simple message';

            logger.info(message);

            expect(mockLogger.info).toHaveBeenCalledWith(message);
        });

        it('should handle logging with complex arguments', () => {
            const message = 'Complex message';
            const args = [{ key: 'value' }, [1, 2, 3], null, undefined];

            logger.info(message, ...args);

            expect(mockLogger.info).toHaveBeenCalledWith(message, ...args);
        });
    });

    describe('child method', () => {
        it('should create child logger with new name', () => {
            const parentLogger = new UploxAppLoggerImpl('ParentApp');
            const childLogger = parentLogger.child('ChildApp');

            expect(childLogger).toBeInstanceOf(UploxAppLoggerImpl);
            expect(childLogger.appName).toBe('ChildApp');
            expect(childLogger).not.toBe(parentLogger);
        });

        it('should create child logger with default settings', () => {
            const parentLogger = new UploxAppLoggerImpl('ParentApp', true, 'debug');
            const childLogger = parentLogger.child('ChildApp');

            // Child logger should be created with default settings, not parent settings
            expect(childLogger.appName).toBe('ChildApp');
            expect(childLogger.isUseJson).toBe(false);
            expect(childLogger.level).toBe('info');
        });
    });

    describe('integration with winston configuration', () => {
        it('should configure winston logger correctly for JSON format', () => {
            new UploxAppLoggerImpl('JSONApp', true, 'error');

            expect(mockCustomConsoleFormat).toHaveBeenCalledWith('JSONApp', true);
            expect(mockCustomFileFormat).toHaveBeenCalledWith('JSONApp', true);
        });

        it('should configure winston logger correctly for non-JSON format', () => {
            new UploxAppLoggerImpl('PlainApp', false, 'warn');

            expect(mockCustomConsoleFormat).toHaveBeenCalledWith('PlainApp', false);
            expect(mockCustomFileFormat).toHaveBeenCalledWith('PlainApp', false);
        });

        it('should create exactly 3 transports', () => {
            new UploxAppLoggerImpl('TestApp');

            expect(mockConsoleTransport).toHaveBeenCalledTimes(1);
            expect(mockFileTransport).toHaveBeenCalledTimes(2);
        });

        it('should call format.combine and format.timestamp correctly', () => {
            new UploxAppLoggerImpl('TestApp');

            expect(format.combine).toHaveBeenCalledTimes(4); // 1 for logger + 3 for transports
            expect(format.timestamp).toHaveBeenCalledTimes(4);
        });
    });

    describe('edge cases', () => {
        it('should handle empty string as app name', () => {
            const logger = new UploxAppLoggerImpl('');
            expect(logger.appName).toBe('');
        });

        it('should handle special characters in app name', () => {
            const appName = 'App-Name_123!@#';
            const logger = new UploxAppLoggerImpl(appName);
            expect(logger.appName).toBe(appName);
        });

        it('should handle undefined level gracefully', () => {
            const logger = new UploxAppLoggerImpl('TestApp', false, undefined as any);
            expect(logger.level).toBe('info'); // undefined level defaults to 'info'
        });
    });
});
