import { UploxAppLogger, UploxStorage } from '@application';
import { UploxFile } from '@domain';
import { Readable } from 'stream';
import * as Minio from 'minio';
import { HOUR_MS } from '@shared';

export type MinioOptions = {
    endpoint: string;
    accessKey: string;
    secretKey: string;
    useSSL: boolean;
    region: string;
    port: number;
};

export class MinioStorage implements UploxStorage<UploxFile> {
    private _minioClient: Minio.Client;
    constructor(
        private _logger: UploxAppLogger,
        private _bucket: string,
        private _options: MinioOptions,
    ) {
        this._logger.debug(`[${this.constructor.name}] Starting storage with options`, {
            ...this._options,
        });

        this._minioClient = new Minio.Client({
            endPoint: this._options.endpoint,
            port: this._options.port,
            accessKey: this._options.accessKey,
            secretKey: this._options.secretKey,
            useSSL: this._options.useSSL,
            region: this._options.region,
        });
    }

    getBucket(): string {
        return this._bucket;
    }

    async saveFile(file: File, metadata: UploxFile, id: string): Promise<void> {
        this._logger.info(`[${this.constructor.name}] Start upload file`);

        const metadataId = await this.metadataFileName(id);
        const metadataContent = JSON.stringify(metadata.toJSON(), null, 2);

        this._logger.debug(`[${this.constructor.name}] Uploading files`, {
            fileId: id,
            metadataId,
        });

        await Promise.all([
            this._minioClient.putObject(this._bucket, id, Readable.fromWeb(file.stream())),
            this._minioClient.putObject(this._bucket, metadataId, metadataContent),
        ]);

        this._logger.info(`[${this.constructor.name}] Done uploading files`, {
            fileId: id,
            metadataId,
        });
    }

    async saveFileStream(stream: Readable, metadata: UploxFile, id: string): Promise<void> {
        const metadataId = await this.metadataFileName(id);
        const metadataContent = JSON.stringify(metadata.toJSON(), null, 2);
        this._logger.info(`[${this.constructor.name}] Uploading files`, {
            fileId: id,
            metadataId,
        });
        await Promise.all([
            this._minioClient.putObject(this._bucket, id, stream),
            this._minioClient.putObject(this._bucket, metadataId, metadataContent),
        ]);
        this._logger.info(`[${this.constructor.name}] Done uploading files`, {
            fileId: id,
            metadataId,
        });
    }

    async metadataFileName(originalFileName: string): Promise<string> {
        return `${originalFileName}.meta.json`;
    }

    async getDownloadableUrl(id: string, ttl: number = 12 * HOUR_MS): Promise<string> {
        const ttlSecs = Math.round(ttl / 1000);
        return this._minioClient.presignedGetObject(this._bucket, id, ttlSecs);
    }

    async fileExist(id: string): Promise<boolean> {
        try{
            await this._minioClient.statObject(this._bucket, id);
            return true;
        }catch(e){
            return false;
        }
    }

    protected async streamToString(readable: Readable):Promise<string>{
        let resultBuffer = Buffer.alloc(0);
        return new Promise((resolve, reject) => {
            readable.on('data', (chunk) => {
                resultBuffer = Buffer.concat([resultBuffer, chunk]);
            });
            readable.on('end', () => {
                resolve(resultBuffer.toString());
            });
            readable.on('error', (err) => {
                reject(err);
            });
        });
    }

    async getFileMetadata(id: string): Promise<UploxFile> {
        const metadataId = await this.metadataFileName(id);
        const metadataContent = await this.streamToString(await this._minioClient.getObject(this._bucket, metadataId));
        return UploxFile.fromJSON(JSON.parse(metadataContent));
    }
}
