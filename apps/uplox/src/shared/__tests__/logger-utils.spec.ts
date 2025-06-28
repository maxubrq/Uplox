import { describe, it, expect } from 'vitest';
import { getColorByLevel, padTo, parseObjectToLogMessage, ASCIICOLORS } from '../logger-utils';
import type { UploxLoggerLevel } from '../logger';

describe('logger-utils', () => {
    describe('ASCIICOLORS', () => {
        it('should have all required color constants', () => {
            expect(ASCIICOLORS.RED).toBe('\x1b[31m');
            expect(ASCIICOLORS.GREEN).toBe('\x1b[32m');
            expect(ASCIICOLORS.YELLOW).toBe('\x1b[33m');
            expect(ASCIICOLORS.BLUE).toBe('\x1b[34m');
            expect(ASCIICOLORS.MAGENTA).toBe('\x1b[35m');
            expect(ASCIICOLORS.CYAN).toBe('\x1b[36m');
            expect(ASCIICOLORS.WHITE).toBe('\x1b[37m');
            expect(ASCIICOLORS.RESET).toBe('\x1b[0m');
        });
    });

    describe('getColorByLevel', () => {
        it('should return RED for error level', () => {
            expect(getColorByLevel('error')).toBe(ASCIICOLORS.RED);
        });

        it('should return YELLOW for warn level', () => {
            expect(getColorByLevel('warn')).toBe(ASCIICOLORS.YELLOW);
        });

        it('should return BLUE for info level', () => {
            expect(getColorByLevel('info')).toBe(ASCIICOLORS.BLUE);
        });

        it('should return GREEN for debug level', () => {
            expect(getColorByLevel('debug')).toBe(ASCIICOLORS.GREEN);
        });

        it('should return CYAN for silly level', () => {
            expect(getColorByLevel('silly')).toBe(ASCIICOLORS.CYAN);
        });

        it('should return MAGENTA for http level', () => {
            expect(getColorByLevel('http')).toBe(ASCIICOLORS.MAGENTA);
        });

        it('should return WHITE for verbose level', () => {
            expect(getColorByLevel('verbose')).toBe(ASCIICOLORS.WHITE);
        });

        it('should return RESET for unknown level', () => {
            // Test the default case by passing an invalid level
            expect(getColorByLevel('unknown' as UploxLoggerLevel)).toBe(ASCIICOLORS.RESET);
        });
    });

    describe('padTo', () => {
        it('should pad string when shorter than target length', () => {
            expect(padTo('test', 10)).toBe('test      ');
            expect(padTo('a', 5)).toBe('a    ');
        });

        it('should return original string when equal to target length', () => {
            expect(padTo('test', 4)).toBe('test');
            expect(padTo('hello', 5)).toBe('hello');
        });

        it('should return original string when longer than target length', () => {
            expect(padTo('toolongstring', 5)).toBe('toolongstring');
            expect(padTo('verylongtext', 3)).toBe('verylongtext');
        });

        it('should handle empty string', () => {
            expect(padTo('', 5)).toBe('     ');
        });

        it('should handle zero length target', () => {
            expect(padTo('test', 0)).toBe('test');
        });

        it('should handle negative length target', () => {
            expect(padTo('test', -1)).toBe('test');
        });
    });

    describe('parseObjectToLogMessage', () => {
        it('should parse simple object with primitive values', () => {
            const obj = { name: 'John', age: 30, active: true };
            const result = parseObjectToLogMessage(obj);
            expect(result).toBe('[name=John age=30 active=true ]');
        });

        it('should parse nested objects', () => {
            const obj = {
                user: { name: 'John', age: 30 },
                settings: { theme: 'dark' },
            };
            const result = parseObjectToLogMessage(obj);
            expect(result).toBe('[user=[name=John age=30 ] settings=[theme=dark ] ]');
        });

        it('should parse arrays of primitives', () => {
            const obj = {
                tags: ['javascript', 'nodejs', 'vitest'],
                numbers: [1, 2, 3],
            };
            const result = parseObjectToLogMessage(obj);
            expect(result).toBe('[tags=["javascript","nodejs","vitest"] numbers=[1,2,3] ]');
        });

        it('should parse arrays of objects', () => {
            const obj = {
                users: [
                    { name: 'John', age: 30 },
                    { name: 'Jane', age: 25 },
                ],
            };
            const result = parseObjectToLogMessage(obj);
            expect(result).toBe('[users=[{"name":"John","age":30},{"name":"Jane","age":25}] ]');
        });

        it('should handle mixed nested structures', () => {
            const obj = {
                id: 123,
                user: {
                    name: 'John',
                    preferences: ['email', 'sms'],
                    profile: {
                        avatar: 'avatar.jpg',
                        settings: { notifications: true },
                    },
                },
                tags: ['important'],
            };
            const result = parseObjectToLogMessage(obj);
            expect(result).toBe(
                '[id=123 user=[name=John preferences=["email","sms"] profile=[avatar=avatar.jpg settings=[notifications=true ] ] ] tags=["important"] ]',
            );
        });

        it('should handle empty object', () => {
            const result = parseObjectToLogMessage({});
            expect(result).toBe('[]');
        });

        it('should handle empty arrays', () => {
            const obj = { emptyArray: [], data: 'test' };
            const result = parseObjectToLogMessage(obj);
            expect(result).toBe('[emptyArray=[] data=test ]');
        });

        it('should handle null and undefined values', () => {
            const obj = { nullValue: null, undefinedValue: undefined, data: 'test' };
            const result = parseObjectToLogMessage(obj);
            expect(result).toBe('[nullValue=null undefinedValue=undefined data=test ]');
        });

        it('should handle special values', () => {
            const obj = {
                zero: 0,
                falsy: false,
                emptyString: '',
                data: 'test',
            };
            const result = parseObjectToLogMessage(obj);
            expect(result).toBe('[zero=0 falsy=false emptyString= data=test ]');
        });

        it('should handle deeply nested structures', () => {
            const obj = {
                level1: {
                    level2: {
                        level3: {
                            value: 'deep',
                        },
                    },
                },
            };
            const result = parseObjectToLogMessage(obj);
            expect(result).toBe('[level1=[level2=[level3=[value=deep ] ] ] ]');
        });

        it('should handle mixed arrays with objects and primitives', () => {
            const obj = {
                mixed: ['string', { name: 'object' }, 42, ['nested', 'array']],
            };
            const result = parseObjectToLogMessage(obj);
            expect(result).toBe('[mixed=["string",{"name":"object"},42,["nested","array"]] ]');
        });
    });
});
