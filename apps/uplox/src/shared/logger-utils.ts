import { UploxLoggerLevel } from '@shared/logger';

/**
 * The colors for the logger
 *
 *  - RED: '\x1b[31m',
 *  - GREEN: '\x1b[32m',
 *  - YELLOW: '\x1b[33m',
 *  - BLUE: '\x1b[34m',
 *  - MAGENTA: '\x1b[35m',
 *  - CYAN: '\x1b[36m',
 *  - WHITE: '\x1b[37m',
 *  - RESET: '\x1b[0m',
 */
export const ASCIICOLORS = {
    RED: '\x1b[31m',
    GREEN: '\x1b[32m',
    YELLOW: '\x1b[33m',
    BLUE: '\x1b[34m',
    MAGENTA: '\x1b[35m',
    CYAN: '\x1b[36m',
    WHITE: '\x1b[37m',
    RESET: '\x1b[0m',
};

/**
 * Get the color for a level
 * @param level - The level of the message
 * @returns The color for the level
 *
 *  - error: RED
 *  - warn: YELLOW
 *  - info: BLUE
 *  - debug: GREEN
 *  - silly: CYAN
 *  - http: MAGENTA
 *  - verbose: WHITE
 */
export function getColorByLevel(level: UploxLoggerLevel) {
    switch (level) {
        case 'error':
            return ASCIICOLORS.RED;
        case 'warn':
            return ASCIICOLORS.YELLOW;
        case 'info':
            return ASCIICOLORS.BLUE;
        case 'debug':
            return ASCIICOLORS.GREEN;
        case 'silly':
            return ASCIICOLORS.CYAN;
        case 'http':
            return ASCIICOLORS.MAGENTA;
        case 'verbose':
            return ASCIICOLORS.WHITE;
        default:
            return ASCIICOLORS.RESET;
    }
}

/**
 * Pad a string to a given length
 * @param str - The string to pad
 * @param length - The length to pad the string to
 * @returns The padded string
 *
 * Example:
 * ```ts
 * padTo('test', 10) // 'test      '
 * padTo('test', 5) // 'test'
 * padTo('test', 2) // 'te'
 * ```
 */
export function padTo(str: string, length: number) {
    if (!str) return '';
    return str.length < length ? str + ' '.repeat(length - str.length) : str;
}

/**
 * Parse an object to a log message
 * @param obj - The object to parse
 * @returns The log message
 *
 * Example:
 * ```ts
 * parseObjectToLogMessage({ a: 1, b: 2 }) // '[a=1 b=2]'
 * ```
 */
export function parseObjectToLogMessage(obj: any): string {
    let ret = '[';
    for (const key in obj) {
        const value = obj[key];
        
        if (value === null) {
            ret += `${key}=null `;
        } else if (value === undefined) {
            ret += `${key}=undefined `;
        } else if (typeof value === 'string') {
            ret += `${key}="${value}" `;
        } else if (typeof value === 'number' || typeof value === 'boolean') {
            ret += `${key}=${value} `;
        } else if (value instanceof Array) {
            ret += `${key}=${JSON.stringify(value)} `;
        } else if (value instanceof Date) {
            ret += `${key}=${value.toISOString()} `;
        } else if (typeof value === 'object') {
            ret += `${key}=${parseObjectToLogMessage(value)} `;
        } else {
            // For other types (functions, symbols, etc.), use JSON.stringify with fallback
            try {
                ret += `${key}=${JSON.stringify(value)} `;
            } catch (error) {
                ret += `${key}=[object ${typeof value}] `;
            }
        }
    }
    ret += ']';
    return ret;
}
