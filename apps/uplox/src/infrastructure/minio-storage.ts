import { AppStorage, UploxAppLogger } from "@application";
import { UploxFile } from "@domain";
import * as Minio from 'minio';
import { Readable } from "stream";

export type MinioStorageConfig = {
    endpoint: string;
    accessKey: string;
    secretKey: string;
    bucket: string;
    port: number;
    useSSL: boolean;
    region: string;
}

export class MinioStorage implements AppStorage {
    private static _instance: MinioStorage | null = null;
    private _minioClient: Minio.Client;

    private constructor(private _logger: UploxAppLogger, private _config: MinioStorageConfig) {
        this._minioClient = new Minio.Client({
            endPoint: this._config.endpoint,
            port: this._config.port,
            useSSL: this._config.useSSL,
            accessKey: this._config.accessKey,
            secretKey: this._config.secretKey,
            region: this._config.region,
        });
    }

    init(): Promise<void> {
        this._logger.info(`[${this.constructor.name}] Initializing Minio storage`, {
            config: this._config,
        });
        return Promise.resolve();
    }

    static getInstance(logger: UploxAppLogger, config: MinioStorageConfig) {
        if (!MinioStorage._instance) {
            MinioStorage._instance = new MinioStorage(logger, config);
        }
        return MinioStorage._instance;
    }

    private streamFromString(string: string): Readable {
        const stream = new Readable();
        stream.push(string);
        stream.push(null);
        return stream;
    }

    public async uploadFile(file: UploxFile): Promise<void> {
        this._logger.info(`[${this.constructor.name}] Uploading file`, {
            file: file.id,
        });
        const filePath = file.id;
        const metadataPath = `${filePath}.meta`;
        const metadataStream = this.streamFromString(JSON.stringify(file.toJSON(), null, 2));
        const fileReadStream = file.getFile()?.stream();
        if (!fileReadStream) {
            throw new Error("File stream not found");
        }
        const fileStream = Readable.fromWeb(fileReadStream);
        await Promise.all([
            this._minioClient.putObject(this._config.bucket, metadataPath, metadataStream),
            this._minioClient.putObject(this._config.bucket, filePath, fileStream),
        ]);
    }

    public async getDownloadableUrl(fileId: string): Promise<string> {
        this._logger.info(`[${this.constructor.name}] Getting downloadable url`, {
            fileId,
        });
        const filePath = fileId;
        const presignedUrl = await this._minioClient.presignedGetObject(this._config.bucket, filePath);
        return presignedUrl;
    }

    private bufferFromReadable(readable: Readable): Promise<Buffer> {
        return new Promise<Buffer>((resolve, reject) => {
            const chunks: Buffer[] = [];
            readable.on('data', (chunk) => chunks.push(chunk));
            readable.on('end', () => resolve(Buffer.concat(chunks)));
            readable.on('error', reject);
        });
    }

    public async getFileMetadata(fileId: string): Promise<UploxFile> {
        this._logger.info(`[${this.constructor.name}] Getting file metadata`, {
            fileId,
        });
        const metadataPath = `${fileId}.meta`;
        const metadata = await this._minioClient.getObject(this._config.bucket, metadataPath);
        const readableToBuffer = await this.bufferFromReadable(metadata);
        const metadataJson = JSON.parse(readableToBuffer.toString());
        return UploxFile.fromJSON(metadataJson);
    }
}   