import { UploxAppLogger, UploxStorage } from '@application';
import { UploxFile } from '@domain';
import { Readable } from 'stream';
import * as Minio from 'minio';

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
}
