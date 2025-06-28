import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createLogger, format, transports } from 'winston';
import type { Logger } from 'winston';

// Mock winston
vi.mock('winston', () => ({
    createLogger: vi.fn(),
    format: {
        printf: vi.fn(fn => fn),
        combine: vi.fn((...args) => args),
        label: vi.fn(),
        timestamp: vi.fn(),
        colorize: vi.fn(),
    },
    transports: {
        Console: vi.fn(),
        File: vi.fn(),
    },
}));

// Mock logger-utils
vi.mock('../logger-utils', () => ({
    getColorByLevel: vi.fn((level: string) => `color-${level}`),
    padTo: vi.fn((str: string, length: number) => str.padEnd(length)),
    ASCIICOLORS: {
        RESET: '\x1b[0m',
    },
    parseObjectToLogMessage: vi.fn((obj: any) => `parsed-${JSON.stringify(obj)}`),
}));

// Import after mocking
import { UploxLogger, getLogger, customConsoleFormat, customFileFormat, DEFAULT_LOGGER_OPTIONS } from '../logger';
import type { UploxLoggerLevel, UploxLoggerOptions } from '../logger';

describe('logger', () => {
    let mockWinstonLogger: any;

    beforeEach(() => {
        // Clear all mocks before each test
        vi.clearAllMocks();

        // Create a mock winston logger
        mockWinstonLogger = {
            log: vi.fn(),
            error: vi.fn(),
            warn: vi.fn(),
            info: vi.fn(),
            debug: vi.fn(),
        };

        // Mock createLogger to return our mock logger
        vi.mocked(createLogger).mockReturnValue(mockWinstonLogger as Logger);
    });

    describe('DEFAULT_LOGGER_OPTIONS', () => {
        it('should have correct default level based on environment', () => {
            expect(DEFAULT_LOGGER_OPTIONS.level).toBeDefined();
            expect(['info', 'debug']).toContain(DEFAULT_LOGGER_OPTIONS.level);
        });

        it('should have correct transport configuration', () => {
            expect(DEFAULT_LOGGER_OPTIONS.transports).toHaveLength(3);
            expect(DEFAULT_LOGGER_OPTIONS.transports).toBeDefined();
        });

        it('should have console and file transports', () => {
            expect(DEFAULT_LOGGER_OPTIONS.transports.length).toBeGreaterThan(0);
        });
    });

    describe('customConsoleFormat', () => {
        it('should be defined as a winston format', () => {
            expect(customConsoleFormat).toBeDefined();
            expect(typeof customConsoleFormat).toBe('function');
        });
    });

    describe('customFileFormat', () => {
        it('should be defined as a winston format', () => {
            expect(customFileFormat).toBeDefined();
            expect(typeof customFileFormat).toBe('function');
        });
    });

    describe('UploxLogger', () => {
        describe('getInstance', () => {
            it('should create singleton instance', () => {
                // Reset singleton for this test
                (UploxLogger as any).instance = undefined;

                const logger1 = UploxLogger.getInstance('test');
                const logger2 = UploxLogger.getInstance('test2');

                expect(logger1).toBe(logger2);
                expect(createLogger).toHaveBeenCalledOnce();
            });

            it('should use default options when none provided', () => {
                // Reset singleton for this test
                (UploxLogger as any).instance = undefined;

                UploxLogger.getInstance('test');

                expect(createLogger).toHaveBeenCalledWith({
                    level: DEFAULT_LOGGER_OPTIONS.level,
                    transports: DEFAULT_LOGGER_OPTIONS.transports,
                });
            });

            it('should use custom options when provided', () => {
                // Reset singleton for this test
                (UploxLogger as any).instance = undefined;

                const customOptions: UploxLoggerOptions = {
                    level: 'error',
                    transports: [new transports.Console()],
                };

                UploxLogger.getInstance('test', customOptions);

                expect(createLogger).toHaveBeenCalledWith({
                    level: 'error',
                    transports: customOptions.transports,
                });
            });

            it('should use partial custom options with defaults', () => {
                // Reset singleton for this test
                (UploxLogger as any).instance = undefined;

                const customOptions: Partial<UploxLoggerOptions> = {
                    level: 'warn',
                };

                UploxLogger.getInstance('test', customOptions as UploxLoggerOptions);

                expect(createLogger).toHaveBeenCalledWith({
                    level: 'warn',
                    transports: DEFAULT_LOGGER_OPTIONS.transports,
                });
            });
        });

        describe('logging methods', () => {
            let logger: UploxLogger;

            beforeEach(() => {
                // Reset singleton and create fresh logger for each test
                (UploxLogger as any).instance = undefined;
                logger = UploxLogger.getInstance('test');
            });

            it('should call winston log method with correct parameters', () => {
                const testArgs = ['arg1', { key: 'value' }, 123];

                logger.log('info', 'Test message', ...testArgs);

                expect(mockWinstonLogger.log).toHaveBeenCalledWith('info', 'Test message', ...testArgs);
            });

            it('should call winston error method', () => {
                const testArgs = ['error arg', { error: true }];

                logger.error('Error message', ...testArgs);

                expect(mockWinstonLogger.error).toHaveBeenCalledWith('Error message', ...testArgs);
            });

            it('should call winston warn method', () => {
                const testArgs = ['warn arg'];

                logger.warn('Warning message', ...testArgs);

                expect(mockWinstonLogger.warn).toHaveBeenCalledWith('Warning message', ...testArgs);
            });

            it('should call winston info method', () => {
                const testArgs = [{ info: 'data' }];

                logger.info('Info message', ...testArgs);

                expect(mockWinstonLogger.info).toHaveBeenCalledWith('Info message', ...testArgs);
            });

            it('should call winston debug method', () => {
                logger.debug('Debug message');

                expect(mockWinstonLogger.debug).toHaveBeenCalledWith('Debug message');
            });

            it('should handle methods without additional arguments', () => {
                logger.error('Simple error');
                logger.warn('Simple warning');
                logger.info('Simple info');
                logger.debug('Simple debug');

                expect(mockWinstonLogger.error).toHaveBeenCalledWith('Simple error');
                expect(mockWinstonLogger.warn).toHaveBeenCalledWith('Simple warning');
                expect(mockWinstonLogger.info).toHaveBeenCalledWith('Simple info');
                expect(mockWinstonLogger.debug).toHaveBeenCalledWith('Simple debug');
            });

            it('should handle methods with multiple arguments', () => {
                const args = ['arg1', { key: 'value' }, 42, true, null];

                logger.error('Error with args', ...args);
                logger.warn('Warn with args', ...args);
                logger.info('Info with args', ...args);
                logger.debug('Debug with args', ...args);
                logger.log('verbose', 'Log with args', ...args);

                expect(mockWinstonLogger.error).toHaveBeenCalledWith('Error with args', ...args);
                expect(mockWinstonLogger.warn).toHaveBeenCalledWith('Warn with args', ...args);
                expect(mockWinstonLogger.info).toHaveBeenCalledWith('Info with args', ...args);
                expect(mockWinstonLogger.debug).toHaveBeenCalledWith('Debug with args', ...args);
                expect(mockWinstonLogger.log).toHaveBeenCalledWith('verbose', 'Log with args', ...args);
            });

            it('should handle all log levels', () => {
                const levels: UploxLoggerLevel[] = ['error', 'warn', 'info', 'http', 'verbose', 'debug', 'silly'];

                levels.forEach(level => {
                    logger.log(level, `Message for ${level}`, { level });
                    expect(mockWinstonLogger.log).toHaveBeenCalledWith(level, `Message for ${level}`, { level });
                });
            });

            it('should handle empty messages', () => {
                logger.log('info', '');
                logger.error('');
                logger.warn('');
                logger.info('');
                logger.debug('');

                expect(mockWinstonLogger.log).toHaveBeenCalledWith('info', '');
                expect(mockWinstonLogger.error).toHaveBeenCalledWith('');
                expect(mockWinstonLogger.warn).toHaveBeenCalledWith('');
                expect(mockWinstonLogger.info).toHaveBeenCalledWith('');
                expect(mockWinstonLogger.debug).toHaveBeenCalledWith('');
            });

            it('should handle various argument types', () => {
                const errorObj = new Error('Test error');
                const dateObj = new Date();
                const nullValue = null;
                const undefinedValue = undefined;

                logger.info('Message with error', errorObj);
                logger.warn('Message with date', dateObj);
                logger.error('Message with null', nullValue);
                logger.debug('Message with undefined', undefinedValue);

                expect(mockWinstonLogger.info).toHaveBeenCalledWith('Message with error', errorObj);
                expect(mockWinstonLogger.warn).toHaveBeenCalledWith('Message with date', dateObj);
                expect(mockWinstonLogger.error).toHaveBeenCalledWith('Message with null', nullValue);
                expect(mockWinstonLogger.debug).toHaveBeenCalledWith('Message with undefined', undefinedValue);
            });

            it('should handle complex data structures', () => {
                const complexData = {
                    user: { id: 1, name: 'John' },
                    actions: ['create', 'update'],
                    metadata: { timestamp: Date.now(), version: '1.0' },
                };

                logger.info('Complex log', complexData);

                expect(mockWinstonLogger.info).toHaveBeenCalledWith('Complex log', complexData);
            });
        });

        describe('constructor and instance management', () => {
            it('should maintain singleton pattern', () => {
                // Reset singleton for this test
                (UploxLogger as any).instance = undefined;

                const logger1 = UploxLogger.getInstance('test1');
                const logger2 = UploxLogger.getInstance('test2');

                expect(logger1).toBe(logger2);
                expect(logger1).toBeInstanceOf(UploxLogger);
            });

            it('should only create winston logger once for singleton', () => {
                // Reset singleton for this test
                (UploxLogger as any).instance = undefined;

                UploxLogger.getInstance('test1');
                UploxLogger.getInstance('test2');
                UploxLogger.getInstance('test3');

                expect(createLogger).toHaveBeenCalledOnce();
            });

            it('should store the name parameter', () => {
                // Reset singleton for this test
                (UploxLogger as any).instance = undefined;

                const logger = UploxLogger.getInstance('test-name');

                expect(logger).toBeInstanceOf(UploxLogger);
                expect((logger as any).name).toBe('test-name');
            });
        });
    });

    describe('getLogger function', () => {
        it('should return logger instance', () => {
            const logger = getLogger('test1');
            expect(logger).toBeInstanceOf(UploxLogger);
        });

        it('should handle undefined options gracefully', () => {
            const logger = getLogger('testapp', undefined);
            expect(logger).toBeInstanceOf(UploxLogger);
        });

        it('should be callable without options', () => {
            const logger = getLogger('simple-test');
            expect(logger).toBeInstanceOf(UploxLogger);
        });
    });

    describe('type definitions', () => {
        it('should export correct types', () => {
            // This tests that our types are properly exported
            const level: UploxLoggerLevel = 'info';
            expect(['error', 'warn', 'info', 'http', 'verbose', 'debug', 'silly']).toContain(level);
        });

        it('should accept all valid log levels', () => {
            // Reset singleton for this test
            (UploxLogger as any).instance = undefined;

            const logger = UploxLogger.getInstance('type-test');

            // Test that all these compile and run without error
            logger.log('error', 'error');
            logger.log('warn', 'warn');
            logger.log('info', 'info');
            logger.log('http', 'http');
            logger.log('verbose', 'verbose');
            logger.log('debug', 'debug');
            logger.log('silly', 'silly');

            expect(mockWinstonLogger.log).toHaveBeenCalledTimes(7);
        });
    });

    describe('winston integration', () => {
        it('should create winston logger with correct configuration', () => {
            // Reset singleton for this test
            (UploxLogger as any).instance = undefined;

            UploxLogger.getInstance('winston-test');

            expect(createLogger).toHaveBeenCalledWith({
                level: DEFAULT_LOGGER_OPTIONS.level,
                transports: DEFAULT_LOGGER_OPTIONS.transports,
            });
        });

        it('should pass through all arguments to winston methods', () => {
            // Reset singleton for this test
            (UploxLogger as any).instance = undefined;

            const logger = UploxLogger.getInstance('args-test');
            const multipleArgs = ['arg1', 'arg2', { key: 'value' }, 123, true, null];

            logger.log('info', 'Test message', ...multipleArgs);

            expect(mockWinstonLogger.log).toHaveBeenCalledWith('info', 'Test message', ...multipleArgs);
        });

        it('should handle winston format configuration', () => {
            // Format functions are created during module loading
            expect(customConsoleFormat).toBeDefined();
            expect(customFileFormat).toBeDefined();
        });
    });

    describe('edge cases and error handling', () => {
        it('should handle logger creation without errors', () => {
            // Reset singleton for this test
            (UploxLogger as any).instance = undefined;

            expect(() => {
                const logger = UploxLogger.getInstance('error-test');
                expect(logger).toBeInstanceOf(UploxLogger);
            }).not.toThrow();
        });

        it('should handle logging methods without crashing', () => {
            // Reset singleton for this test
            (UploxLogger as any).instance = undefined;

            const logger = UploxLogger.getInstance('crash-test');

            expect(() => {
                logger.log('info', 'test');
                logger.error('test');
                logger.warn('test');
                logger.info('test');
                logger.debug('test');
            }).not.toThrow();
        });

        it('should work with minimal configuration', () => {
            // Reset singleton for this test
            (UploxLogger as any).instance = undefined;

            const logger = UploxLogger.getInstance('minimal');
            logger.info('minimal test');

            expect(mockWinstonLogger.info).toHaveBeenCalledWith('minimal test');
        });
    });
});
