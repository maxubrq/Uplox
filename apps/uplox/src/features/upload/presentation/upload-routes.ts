import { UploxApp } from '@/application/app';
import { UploxAppLogger } from '@/application/app-logger';
import { UploxRoute, UploxRoutes } from '@application/routes';
import { Context, Handler } from 'hono';

export class UploadRoutes implements UploxRoutes<Handler, Context> {
    constructor(private _logger: UploxAppLogger) {
        this._handleUploadFile = this._handleUploadFile.bind(this);
    }

    private _handleUploadFile(c: Context): Response {
        const requestId = c.get('requestId');
        this._logger.info(`[${this.constructor.name}] File uploaded`, { requestId });
        return c.json({ message: 'File uploaded', requestId });
    }

    public getRoutes(): UploxRoute<Handler>[] {
        return [
            {
                method: 'POST',
                path: '/files/upload',
                handler: this._handleUploadFile,
            },
        ];
    }

    public attachRoutes(app: UploxApp<Handler, Context>): void {
        for (const route of this.getRoutes()) {
            app.attachRoute(route);
            this._logger.info(`[${this.constructor.name}] Attached route ${route.method} ${route.path}`);
        }
    }
}
