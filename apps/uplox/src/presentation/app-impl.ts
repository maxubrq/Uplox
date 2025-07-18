import { UploxApp, UploxAppConfigs, UploxAppEnv, UploxAppLogger, UploxRoute } from '@application';
import { serve } from '@hono/node-server';
import { Context, Handler, Hono } from 'hono';

export class UploxAppImpl implements UploxApp<Handler<any, any, any>, Context<UploxAppEnv, any, {}>> {
    private _app: Hono<UploxAppEnv>;

    constructor(
        private _appConfig: UploxAppConfigs,
        private _logger: UploxAppLogger,
    ) {
        this._app = new Hono<UploxAppEnv>();
    }

    public attachRoute(route: UploxRoute<Handler>): void {
        this._attachRouteByMethod(route.method, route.path, route.handler);
    }

    public use(middleware: (c: Context<UploxAppEnv, any, {}>, next: any) => Promise<void>): void {
        this._app.use(middleware);
    }

    public start(): void {
        serve(
            {
                fetch: this._app.fetch,
                port: this._appConfig.port,
            },
            info => {
                if (info) {
                    this._logger.info(`[${this.constructor.name}] Server is running on port ${this._appConfig.port}`);
                } else {
                    this._logger.error(`[${this.constructor.name}] Failed to start the server`);
                    process.exit(1);
                }
            },
        );
    }

    public stop(): void {
        this._logger.info(`[${this.constructor.name}] Stopping the server`);
        process.exit(0);
    }

    private _attachRouteByMethod(method: 'GET' | 'POST' | 'PUT' | 'DELETE', path: string, handler: Handler): void {
        switch (method) {
            case 'GET':
                this._app.get(path, handler);
                break;
            case 'POST':
                this._app.post(path, handler);
                break;
            case 'PUT':
                this._app.put(path, handler);
                break;
            case 'DELETE':
                this._app.delete(path, handler);
                break;
            default:
                throw new Error(`[${this.constructor.name}] Unsupported method: ${method}`);
        }
    }
}
