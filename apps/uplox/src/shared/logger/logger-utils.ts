import { format, Logform } from 'winston';

export const COLORS = {
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m',
    cyan: '\x1b[36m',
    white: '\x1b[37m',
    gray: '\x1b[90m',
    reset: '\x1b[0m',
};

export const LEVEL_COLORS = {
    error: COLORS.red,
    warn: COLORS.yellow,
    info: COLORS.blue,
    debug: COLORS.gray,
    trace: COLORS.gray,
};

/**
 * Return the color for the level
 *
 * Example:
 *
 * getLevelColor("info") -> "\x1b[34m"
 *
 * getLevelColor("error") -> "\x1b[31m"
 *
 * getLevelColor("warn") -> "\x1b[33m"
 *
 * getLevelColor("debug") -> "\x1b[90m"
 *
 * getLevelColor("trace") -> "\x1b[90m"
 *
 * getLevelColor("unknown") -> "\x1b[0m"
 *
 * @param level
 * @returns
 */
export function getLevelColor(level: string): string {
    return LEVEL_COLORS[level as keyof typeof LEVEL_COLORS] || COLORS.reset;
}

/**
 * Return the format for the console logger, like this
 *
 * [timestamp] [level] [AppName] [message] [args]
 *
 * Example:
 *
 * [2021-03-06T16:43:18.192Z] [info] [AppName] Hello world
 *
 * @param message
 * @param args
 * @returns
 */
export function customConsoleFormat(appName: string, useJson: boolean = false): Logform.Format {
    return format.printf(({ level, message, ...args }) => {
        const paddedLevel = padString(level, 6, ' ');
        const colorLevel = getLevelColor(level);
        return `${colorLevel}[${paddedLevel}]${COLORS.reset} [${appName}] ${message} ${useJson ? logArgsFormatJson(args) : logArgsFormat(args)}`;
    });
}

/**
 * Return the args in json format, and multi line
 *
 * Example:
 *
 * { key1: value1, key2: value2 } ->
 * {
 *     "key1": "value1",
 *     "key2": "value2"
 * }
 *
 * @param args
 * @returns
 */
export function logArgsFormatJson(args: { [key: string]: any }): string {
    return JSON.stringify(args, null, 2);
}

/**
 * Return the format for the file logger, like this
 *
 * [timestamp] [level] [AppName] [message] [args]
 *
 * Example:
 *
 * 2021-03-06T16:43:18.192Z [info] [AppName] Hello world
 *
 * @param appName
 * @returns
 */
export function customFileFormat(appName: string, useJson: boolean = false): Logform.Format {
    return format.printf(({ level, message, ...args }) => {
        const paddedLevel = padString(level, 6, ' ');
        return `[${paddedLevel}] [${appName}] ${message} ${useJson ? logArgsFormatJson(args) : logArgsFormat(args)}`;
    });
}

/**
 * To parse the args to string, like this
 *
 * { key1: value1, key2: value2 } -> "key1=value1 key2=value2"
 *
 * And if the value is an object, it will be also parsed to string
 *
 * { key1: { key2: value2 } } -> "key1=[key2=value2]"
 *
 * But we accept max 3 levels of nested objects
 *
 * { key1: { key2: { key3: value3 } } } -> "key1=[key2=[key3=value3]]"
 *
 * If the value is an array, it will be parsed to string using JSON.stringify
 *
 * { key1: [value1, value2] } -> "key1=[value1, value2]"
 *
 * @param args
 * @returns
 */
export function logArgsFormat(args: { [key: string]: any }, level: number = 0): string {
    return Object.entries(args)
        .map(([key, value]) => {
            if (typeof value === 'object' && level < 3 && value !== null) {
                if (Array.isArray(value)) {
                    return `${key}=${JSON.stringify(value)}`;
                }
                return `${key}=${logArgsFormat(value, level + 1)}`;
            }
            return `${key}=${value}`;
        })
        .join(' ');
}

/**
 * Pad the string to the length with the padChar
 *
 * Example:
 *
 * padString("Hello", 10, " ") -> "Hello     "
 *
 * padString("Hello", 10, "-") -> "Hello-----"
 *
 * @param str
 * @param length
 * @param padChar
 * @returns
 */
export function padString(str: string, length: number, padChar: string = ' '): string {
    return str.padEnd(length, padChar);
}
