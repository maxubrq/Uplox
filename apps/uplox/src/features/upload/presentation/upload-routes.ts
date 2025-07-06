import { UploxApp, UploxAppLogger, UploxRoute, UploxRoutes } from '@application';
import { ClamAVScanner, FileTypeScanner, UpbloxReadStream } from '@infrastructure';
import { genId, hashStream } from '@shared';
import { Context, Handler } from 'hono';

export class UploadRoutes implements UploxRoutes<Handler, Context> {
    constructor(private _logger: UploxAppLogger) {
        this._handleUploadFile = this._handleUploadFile.bind(this);
    }

    private async _handleUploadFile(c: Context): Promise<Response> {
        const requestId = c.get('requestId');
        const fileId = genId('file');
        const reqBody = await c.req.formData();
        if (!reqBody) {
            return c.json({ message: 'No file provided' }, 400);
        }

        const reqFile = reqBody.get('file');
        if (!reqFile) {
            return c.json({ message: 'No file provided' }, 400);
        }

        const file = reqFile as File;
        const fileStream = file.stream();
        const upbloxReadStream = UpbloxReadStream.fromWeb(fileStream);
        const hashPassThrough = upbloxReadStream.passThrough();
        const fileTypePassThrough = upbloxReadStream.passThrough();
        const clamscanPassThrough = upbloxReadStream.passThrough();
        const clamscan = ClamAVScanner.getInstance(this._logger);
        const fileTypeScanner = FileTypeScanner.getInstance(this._logger);
        await Promise.all([clamscan.init(), fileTypeScanner.init()]);
        const [fileHash, fileType, clamscanResult] = await Promise.all([
            hashStream('sha256', hashPassThrough),
            fileTypeScanner.scanStream(fileTypePassThrough),
            clamscan.scanStream(clamscanPassThrough),
        ]);

        this._logger.info(`[${this.constructor.name}] File uploaded`, {
            requestId,
            fileId,
            hashes: { sha256: fileHash },
            fileType: fileType,
            clamscan: clamscanResult,
        });

        return c.json({
            message: 'File uploaded',
            requestId,
            fileId,
            hashes: { sha256: fileHash },
            fileType: fileType,
            clamscan: clamscanResult,
        });
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
