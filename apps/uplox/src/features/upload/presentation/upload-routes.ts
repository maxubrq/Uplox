import { UploxApp } from '@/application/app';
import { UploxAppLogger } from '@/application/app-logger';
import { UpbloxReadStream } from '@/infrastructure/stream';
import { genId } from '@/shared/utils/gen';
import { hashStream } from '@/shared/utils/hash';
import { UploxRoute, UploxRoutes } from '@application/routes';
import { fileTypeFromStream } from 'file-type';
import { Context, Handler } from 'hono';
import { Readable } from 'stream';
import NodeClam from 'clamscan';

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
        const clamscan = await new NodeClam().init({
            clamdscan: {
                host: 'scanner', // If you want to connect locally but not through socket
                port: 3310, // Because, why not
                timeout: 300000, // 5 minutes
                localFallback: false, // Do no fail over to binary-method of scanning
                tls: false, // Connect to clamd over TLS
            },
        });
        const [fileHash, fileType, clamscanResult, clamVersion] = await Promise.all([
            hashStream('sha256', hashPassThrough),
            fileTypeFromStream(Readable.toWeb(fileTypePassThrough)),
            clamscan.scanStream(clamscanPassThrough),
            clamscan.getVersion(),
        ]);

        this._logger.info(`[${this.constructor.name}] File uploaded`, {
            requestId,
            fileId,
            hashes: { sha256: fileHash },
            fileType: fileType,
            scanResult: {
                version: clamVersion,
                result: clamscanResult,
            },
        });

        return c.json({
            message: 'File uploaded',
            requestId,
            fileId,
            hashes: { sha256: fileHash },
            fileType: fileType,
            scanResult: {
                version: clamVersion,
                result: clamscanResult,
            },
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
