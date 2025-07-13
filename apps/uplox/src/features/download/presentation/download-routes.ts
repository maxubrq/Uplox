import { UploxApp, UploxAppLogger, UploxRoute, UploxRoutes } from '@application';
import { DownloadFileErrorFileNotFound, DownloadManager } from '@features/download';
import { Context, Handler } from 'hono';

export class DownloadRoutes implements UploxRoutes<Handler, Context> {
    constructor(
        private _logger: UploxAppLogger,
        private _manager: DownloadManager,
    ) {
        this.downloadHandler = this.downloadHandler.bind(this);
    }

    protected async downloadHandler(c: Context): Promise<Response> {
        const fileId = c.req.param('fileId');
        if(!fileId){
            this._logger.warn(`[${this.constructor.name}] File ID is required`);

            return c.json({
                error: {
                    code: 'DOWNLOAD_FILE_ERROR_FILE_ID_REQUIRED',
                }
            }, 400);
        }

        try{
            const url = await this._manager.getDownloadableUrl(fileId);
            return c.json(
                {
                    data: {
                        url,
                    },
                },
                200,
            );
        }catch(e){
            if(e instanceof DownloadFileErrorFileNotFound){
                return c.json({
                    error: {
                        code: e.code,
                    }
                }, 404);
            }

            this._logger.error(`[${this.constructor.name}] Error downloading file ${fileId}`, {
                error: e,
            });
            
            return c.json({
                error: {
                    code: 'DOWNLOAD_FILE_ERROR',
                }
            }, 500);
        }
    }

    getRoutes(): UploxRoute<Handler>[] {
        return [
            {
                path: '/files/:fileId/download',
                method: 'GET',
                handler: this.downloadHandler,
            },
        ];
    }

    attachRoutes(app: UploxApp<Handler, Context<any, any, {}>>): void {
        const routes = this.getRoutes();
        for (const r of routes) {
            app.attachRoute(r);
            this._logger.info(`[${this.constructor.name}] Attached route ${r.method} ${r.path}`);
        }
    }
}
