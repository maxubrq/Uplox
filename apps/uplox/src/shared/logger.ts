import { createLogger, format } from 'winston';
import { Logger, transport, transports } from 'winston';
import { getColorByLevel, padTo, ASCIICOLORS, parseObjectToLogMessage } from '@shared/logger-utils';

/**
 * The level of the logger
 *
 * Map to number:
 *  - 0: error
 *  - 1: warn
 *  - 2: info
 *  - 3: http
 *  - 4: verbose
 *  - 5: debug
 *  - 6: silly
 */
export type UploxLoggerLevel = 'error' | 'warn' | 'info' | 'http' | 'verbose' | 'debug' | 'silly';

/**
 * The options for the logger
 * @param level - The level of the logger
 * @param transports - The transports for the logger
 */
export type UploxLoggerOptions = {
    level: UploxLoggerLevel;
    transports: transport[];
};

export const customConsoleFormat = format.printf(({ level, message, label, timestamp, ...args }) => {
    const paddedLevel = padTo(level.toUpperCase(), Number(process.env.LOG_LEVEL_PADDING_LENGTH ?? '6'));
    const coloredLevel = getColorByLevel(level as UploxLoggerLevel);
    return `${timestamp} [${label}] [${coloredLevel}${paddedLevel}${ASCIICOLORS.RESET}]: ${message} ${parseObjectToLogMessage(args)}`;
});

export const customFileFormat = format.printf(({ level, message, label, timestamp, ...args }) => {
    const paddedLevel = padTo(level.toUpperCase(), Number(process.env.LOG_LEVEL_PADDING_LENGTH ?? '6'));
    return `${timestamp} [${label}] [${paddedLevel}]: ${message} ${parseObjectToLogMessage(args)}`;
});

export function getDefaultTransports(name: string): transport[] {
    return [
        new transports.Console({
            format: format.combine(
                format.label({
                    label: name,
                }),
                format.timestamp(),
                customConsoleFormat,
            ),
        }),
        new transports.File({
            filename: 'error.log',
            level: 'error',
            format: format.combine(
                format.label({
                    label: name,
                }),
                format.timestamp(),
                customFileFormat,
            ),
        }),
        new transports.File({
            filename: 'combined.log',
            format: format.combine(
                format.label({
                    label: name,
                }),
                format.timestamp(),
                customFileFormat,
            ),
        }),
    ];
}

export const DEFAULT_LOGGER_OPTIONS: UploxLoggerOptions = {
    level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
    transports: getDefaultTransports('uplox'),
};

/**
 * The logger class
 * @param name - The name of the logger
 * @param options - The options for the logger
 */
export class UploxLogger {
    private static instance: UploxLogger;
    private logger: Logger;

    public static getInstance(name: string, options?: UploxLoggerOptions): UploxLogger {
        if (!UploxLogger.instance) {
            UploxLogger.instance = new UploxLogger(name, options);
        }
        return UploxLogger.instance;
    }

    private constructor(
        private readonly name: string,
        options?: UploxLoggerOptions,
    ) {
        this.logger = createLogger({
            level: options?.level ?? DEFAULT_LOGGER_OPTIONS.level,
            transports: options?.transports ?? getDefaultTransports(name),
        });
    }

    /**
     * Log a message with a level, this is a wrapper for the logger.log method
     * @param level - The level of the message
     * @param message - The message to log
     * @param args - The arguments to log
     */
    public log(level: UploxLoggerLevel, message: string, ...args: any[]) {
        this.logger.log(level, message, ...args);
    }

    /**
     * Log an error message
     * @param message - The message to log
     * @param args - The arguments to log
     */
    public error(message: string, ...args: any[]) {
        this.logger.error(message, ...args);
    }

    /**
     * Log a warning message
     * @param message - The message to log
     * @param args - The arguments to log
     */
    public warn(message: string, ...args: any[]) {
        this.logger.warn(message, ...args);
    }

    /**
     * Log an info message
     * @param message - The message to log
     * @param args - The arguments to log
     */
    public info(message: string, ...args: any[]) {
        this.logger.info(message, ...args);
    }

    /**
     * Log a debug message
     * @param message - The message to log
     * @param args - The arguments to log
     */
    public debug(message: string, ...args: any[]) {
        this.logger.debug(message, ...args);
    }
}

let logger: UploxLogger;

/**
 * Get the logger instance
 * @param name - The name of the logger
 * @param options - The options for the logger
 * @returns The logger instance
 */
export function getLogger(name: string, options?: UploxLoggerOptions) {
    if (!logger) {
        logger = UploxLogger.getInstance(name, options);
    }
    return logger;
}
