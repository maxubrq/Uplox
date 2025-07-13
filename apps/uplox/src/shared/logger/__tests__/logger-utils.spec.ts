import { describe, it, expect, vi, beforeEach } from 'vitest';
import { format } from 'winston';
import {
    COLORS,
    LEVEL_COLORS,
    getLevelColor,
    customConsoleFormat,
    customFileFormat,
    logArgsFormatJson,
    logArgsFormat,
    padString
} from '../logger-utils';

// Mock winston format
vi.mock('winston', () => ({
    format: {
        printf: vi.fn()
    }
}));

describe('logger-utils', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('COLORS constant', () => {
        it('should contain all expected color codes', () => {
            expect(COLORS).toEqual({
                red: '\x1b[31m',
                green: '\x1b[32m',
                yellow: '\x1b[33m',
                blue: '\x1b[34m',
                magenta: '\x1b[35m',
                cyan: '\x1b[36m',
                white: '\x1b[37m',
                gray: '\x1b[90m',
                reset: '\x1b[0m',
            });
        });
    });

    describe('LEVEL_COLORS constant', () => {
        it('should contain all expected level color mappings', () => {
            expect(LEVEL_COLORS).toEqual({
                error: COLORS.red,
                warn: COLORS.yellow,
                info: COLORS.blue,
                debug: COLORS.gray,
                trace: COLORS.gray,
            });
        });
    });

    describe('getLevelColor', () => {
        it('should return correct color for error level', () => {
            expect(getLevelColor('error')).toBe(COLORS.red);
        });

        it('should return correct color for warn level', () => {
            expect(getLevelColor('warn')).toBe(COLORS.yellow);
        });

        it('should return correct color for info level', () => {
            expect(getLevelColor('info')).toBe(COLORS.blue);
        });

        it('should return correct color for debug level', () => {
            expect(getLevelColor('debug')).toBe(COLORS.gray);
        });

        it('should return correct color for trace level', () => {
            expect(getLevelColor('trace')).toBe(COLORS.gray);
        });

        it('should return reset color for unknown level', () => {
            expect(getLevelColor('unknown')).toBe(COLORS.reset);
        });

        it('should return reset color for empty string', () => {
            expect(getLevelColor('')).toBe(COLORS.reset);
        });
    });

    describe('customConsoleFormat', () => {
        it('should call format.printf with a function', () => {
            const mockFormat = { transform: vi.fn() };
            vi.mocked(format.printf).mockReturnValue(mockFormat as any);

            const result = customConsoleFormat('TestApp');

            expect(format.printf).toHaveBeenCalledWith(expect.any(Function));
            expect(result).toBe(mockFormat);
        });

        it('should format log message correctly when calling the internal function', () => {
            let formatFunction: any;
            vi.mocked(format.printf).mockImplementation((callback) => {
                formatFunction = callback;
                return callback as any;
            });

            customConsoleFormat('TestApp');

            const result = formatFunction({
                level: 'info',
                message: 'Test message',
                key1: 'value1',
                key2: 'value2'
            });

            expect(result).toContain('[info  ]');
            expect(result).toContain('[TestApp]');
            expect(result).toContain('Test message');
            expect(result).toContain('key1=value1');
            expect(result).toContain('key2=value2');
            expect(result).toContain(COLORS.blue); // info level color
            expect(result).toContain(COLORS.reset);
        });

        it('should format log message with JSON args when useJson is true', () => {
            let formatFunction: any;
            vi.mocked(format.printf).mockImplementation((callback) => {
                formatFunction = callback;
                return callback as any;
            });

            customConsoleFormat('TestApp', true);

            const result = formatFunction({
                level: 'error',
                message: 'Test message',
                key1: 'value1',
                key2: 'value2'
            });

            expect(result).toContain('[error ]');
            expect(result).toContain('[TestApp]');
            expect(result).toContain('Test message');
            expect(result).toContain('"key1": "value1"');
            expect(result).toContain('"key2": "value2"');
            expect(result).toContain(COLORS.red); // error level color
        });
    });

    describe('customFileFormat', () => {
        it('should call format.printf with a function', () => {
            const mockFormat = { transform: vi.fn() };
            vi.mocked(format.printf).mockReturnValue(mockFormat as any);

            const result = customFileFormat('TestApp');

            expect(format.printf).toHaveBeenCalledWith(expect.any(Function));
            expect(result).toBe(mockFormat);
        });

        it('should format log message correctly when calling the internal function', () => {
            let formatFunction: any;
            vi.mocked(format.printf).mockImplementation((callback) => {
                formatFunction = callback;
                return callback as any;
            });

            customFileFormat('TestApp');

            const result = formatFunction({
                level: 'warn',
                message: 'Test message',
                key1: 'value1',
                key2: 'value2'
            });

            expect(result).toBe('[warn  ] [TestApp] Test message key1=value1 key2=value2');
        });

        it('should format log message with JSON args when useJson is true', () => {
            let formatFunction: any;
            vi.mocked(format.printf).mockImplementation((callback) => {
                formatFunction = callback;
                return callback as any;
            });

            customFileFormat('TestApp', true);

            const result = formatFunction({
                level: 'debug',
                message: 'Test message',
                key1: 'value1',
                key2: 'value2'
            });

            expect(result).toContain('[debug ] [TestApp] Test message');
            expect(result).toContain('"key1": "value1"');
            expect(result).toContain('"key2": "value2"');
        });
    });

    describe('logArgsFormatJson', () => {
        it('should format simple object as JSON', () => {
            const args = { key1: 'value1', key2: 'value2' };
            const result = logArgsFormatJson(args);
            
            expect(result).toBe('{\n  "key1": "value1",\n  "key2": "value2"\n}');
        });

        it('should format nested object as JSON', () => {
            const args = { 
                key1: 'value1', 
                nested: { key2: 'value2', key3: 'value3' } 
            };
            const result = logArgsFormatJson(args);
            
            expect(result).toContain('"key1": "value1"');
            expect(result).toContain('"nested": {');
            expect(result).toContain('"key2": "value2"');
            expect(result).toContain('"key3": "value3"');
        });

        it('should format empty object as JSON', () => {
            const args = {};
            const result = logArgsFormatJson(args);
            
            expect(result).toBe('{}');
        });

        it('should format array values as JSON', () => {
            const args = { items: ['item1', 'item2'], count: 2 };
            const result = logArgsFormatJson(args);
            
            expect(result).toContain('"items": [\n    "item1",\n    "item2"\n  ]');
            expect(result).toContain('"count": 2');
        });
    });

    describe('logArgsFormat', () => {
        it('should format simple object as key=value pairs', () => {
            const args = { key1: 'value1', key2: 'value2' };
            const result = logArgsFormat(args);
            
            expect(result).toBe('key1=value1 key2=value2');
        });

        it('should format nested object with level 1 nesting', () => {
            const args = { 
                key1: 'value1', 
                nested: { key2: 'value2', key3: 'value3' } 
            };
            const result = logArgsFormat(args);
            
            expect(result).toBe('key1=value1 nested=key2=value2 key3=value3');
        });

        it('should format arrays as JSON strings', () => {
            const args = { items: ['item1', 'item2'], count: 2 };
            const result = logArgsFormat(args);
            
            expect(result).toBe('items=["item1","item2"] count=2');
        });

        it('should handle null values', () => {
            const args = { key1: null, key2: 'value2' };
            const result = logArgsFormat(args);
            
            expect(result).toBe('key1=null key2=value2');
        });

        it('should handle undefined values', () => {
            const args = { key1: undefined, key2: 'value2' };
            const result = logArgsFormat(args);
            
            expect(result).toBe('key1=undefined key2=value2');
        });

        it('should handle boolean values', () => {
            const args = { isEnabled: true, isVisible: false };
            const result = logArgsFormat(args);
            
            expect(result).toBe('isEnabled=true isVisible=false');
        });

        it('should handle number values', () => {
            const args = { count: 42, price: 99.99 };
            const result = logArgsFormat(args);
            
            expect(result).toBe('count=42 price=99.99');
        });

        it('should limit nesting to 3 levels', () => {
            const args = { 
                level1: { 
                    level2: { 
                        level3: { 
                            level4: 'deep value' 
                        } 
                    } 
                } 
            };
            const result = logArgsFormat(args);
            
            expect(result).toContain('level1=level2=level3=level4=deep value');
        });

        it('should handle empty object', () => {
            const args = {};
            const result = logArgsFormat(args);
            
            expect(result).toBe('');
        });

        it('should handle complex nested structures', () => {
            const args = {
                user: { id: 1, name: 'John' },
                items: [1, 2, 3],
                enabled: true,
                config: { timeout: 5000, retries: 3 }
            };
            const result = logArgsFormat(args);
            
            expect(result).toContain('user=id=1 name=John');
            expect(result).toContain('items=[1,2,3]');
            expect(result).toContain('enabled=true');
            expect(result).toContain('config=timeout=5000 retries=3');
        });
    });

    describe('padString', () => {
        it('should pad string to specified length with spaces by default', () => {
            const result = padString('hello', 10);
            expect(result).toBe('hello     ');
            expect(result.length).toBe(10);
        });

        it('should pad string to specified length with custom character', () => {
            const result = padString('hello', 10, '-');
            expect(result).toBe('hello-----');
            expect(result.length).toBe(10);
        });

        it('should not pad if string is already longer than specified length', () => {
            const result = padString('hello world', 5);
            expect(result).toBe('hello world');
            expect(result.length).toBe(11);
        });

        it('should not pad if string is exactly the specified length', () => {
            const result = padString('hello', 5);
            expect(result).toBe('hello');
            expect(result.length).toBe(5);
        });

        it('should handle empty string', () => {
            const result = padString('', 5);
            expect(result).toBe('     ');
            expect(result.length).toBe(5);
        });

        it('should handle zero length', () => {
            const result = padString('hello', 0);
            expect(result).toBe('hello');
            expect(result.length).toBe(5);
        });

        it('should handle negative length', () => {
            const result = padString('hello', -5);
            expect(result).toBe('hello');
            expect(result.length).toBe(5);
        });

        it('should handle multi-character pad string', () => {
            const result = padString('hello', 10, 'ab');
            expect(result).toBe('helloababa');
            expect(result.length).toBe(10);
        });
    });
});
