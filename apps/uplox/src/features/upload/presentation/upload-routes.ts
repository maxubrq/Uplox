import { UploxApp, UploxAppLogger, UploxRoute, UploxRoutes } from '@application';
import { UploadFileErrorHashMismatch, UploadFileErrorInfectedFile, UploadManager } from '@features/upload/application';
import { genId } from '@shared';
import { Context, Handler } from 'hono';

export class UploadRoutes implements UploxRoutes<Handler, Context> {
    constructor(
        private _logger: UploxAppLogger,
        private _uploadManager: UploadManager,
    ) {
        this._handleUploadFile = this._handleUploadFile.bind(this);
    }

    private async _handleUploadFile(c: Context): Promise<Response> {
        const requestId = c.get('requestId');
        try {
            const fileId = genId('file');
            const reqBody = await c.req.formData();
            const sha256 = reqBody.get('sha256');
            if (!reqBody || !sha256) {
                return c.json({ message: 'No file provided or no sha256 hash' }, 400);
            }

            const reqFile = reqBody.get('file');
            if (!reqFile) {
                return c.json({ message: 'No file provided' }, 400);
            }

            const file = reqFile as File;
            const result = await this._uploadManager.uploadFile(file, sha256 as string);
            this._logger.info(`[${this.constructor.name}] File uploaded`, {
                requestId,
                fileId,
                hashes: { sha256: result.fileHash },
                fileType: result.fileType,
                avScan: result.avScan,
            });

            return c.json({
                message: 'File uploaded',
                requestId,
                fileId,
                hashes: { sha256: result.fileHash },
                fileType: result.fileType,
                avScan: result.avScan,
            });
        } catch (error) {
            if (error instanceof UploadFileErrorHashMismatch) {
                return c.json({ message: 'File hash mismatch', code: error.code }, 400);
            }
            if (error instanceof UploadFileErrorInfectedFile) {
                return c.json({ message: 'File is infected', code: error.code, avScan: error.result }, 400);
            }
            return c.json({ message: 'Failed to upload file', code: 'UPLOAD_FILE_ERROR_UNKNOWN' }, 500);
        }
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
