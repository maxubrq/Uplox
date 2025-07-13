import { UploxApp, UploxAppLogger, UploxRoute, UploxRoutes } from '@application';
import { MetadataErrorFileNotFound, MetadataManager } from '@features/metadata';
import { Context, Handler } from 'hono';

export class MetadataRoutes implements UploxRoutes<Handler, Context> {
    constructor(
        private _logger: UploxAppLogger,
        private _metadataManager: MetadataManager,
    ) {
        this.metadataHandle = this.metadataHandle.bind(this);
    }

    private async metadataHandle(context: Context) {
        const fileId = context.req.param('fileId');
        if (!fileId) {
            this._logger.warn(`[${this.constructor.name}] File ID is required`);

            return context.json(
                {
                    error: {
                        code: 'METADATA_ERROR_FILE_ID_REQUIRED',
                        message: 'File ID is required',
                    },
                },
                400,
            );
        }

        try {
            const metadata = await this._metadataManager.getMetadata(fileId);
            return context.json(
                {
                    data: {
                        ...metadata.toJSON(),
                    },
                },
                200,
            );
        } catch (err) {
            if (err instanceof MetadataErrorFileNotFound) {
                return context.json(
                    {
                        error: {
                            code: err.code,
                            message: err.message,
                        },
                    },
                    404,
                );
            }

            this._logger.error(`[${this.constructor.name}] Error getting metadata for file ${fileId}`, {
                error: err,
            });

            return context.json(
                {
                    error: {
                        message: (err as any).message,
                    },
                },
                500,
            );
        }
    }

    getRoutes(): UploxRoute<Handler>[] {
        return [
            {
                path: '/files/:fileId/metadata',
                method: 'GET',
                handler: this.metadataHandle,
            },
        ];
    }

    attachRoutes(app: UploxApp<Handler, Context<any, any, {}>>): void {
        const routes = this.getRoutes();
        for (const route of routes) {
            app.attachRoute(route);
            this._logger.info(`[${this.constructor.name}] Attached route ${route.method} ${route.path}`);
        }
    }
}
