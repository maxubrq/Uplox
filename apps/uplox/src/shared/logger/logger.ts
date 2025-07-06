import { UploxAppLogger } from "@application/app-logger";
import { createLogger, format, Logger, transports } from "winston";
import { customConsoleFormat, customFileFormat } from "./logger-utils";
import { injectable } from "inversify";
import "reflect-metadata";

@injectable()
export class UploxAppLoggerImpl implements UploxAppLogger {
  private _logger: Logger;

  constructor(
    private _name: string,
    private _useJson: boolean = false,
    private _level: string = "info",
  ) {
    this._logger = createLogger({
      level: _level,
      format: format.combine(
        format.timestamp(),
        customConsoleFormat(_name, _useJson),
      ),
      transports: [
        new transports.Console({
          level: _level,
          format: format.combine(
            format.timestamp(),
            customConsoleFormat(_name, _useJson),
          ),
        }),
        new transports.File({
          filename: "error.log",
          level: "error",
          format: format.combine(
            format.timestamp(),
            customFileFormat(_name, _useJson),
          ),
        }),
        new transports.File({
          level: _level,
          filename: "combined.log",
          format: format.combine(
            format.timestamp(),
            customFileFormat(_name, _useJson),
          ),
        }),
      ],
    });
  }

  public get appName(): string {
    return this._name;
  }

  public get isUseJson(): boolean {
    return this._useJson;
  }

  public get level(): string {
    return this._level;
  }

  static getInstance(
    name: string,
    useJson: boolean = false,
    level: string = "info",
  ): UploxAppLogger {
    return new UploxAppLoggerImpl(name, useJson, level);
  }

  public warn(message: string, ...args: any[]): void {
    this._logger.warn(message, ...args);
  }

  public error(message: string, ...args: any[]): void {
    this._logger.error(message, ...args);
  }

  public debug(message: string, ...args: any[]): void {
    this._logger.debug(message, ...args);
  }

  public child(name: string): UploxAppLogger {
    return new UploxAppLoggerImpl(name);
  }

  public info(message: string, ...args: any[]): void {
    this._logger.info(message, ...args);
  }
}
