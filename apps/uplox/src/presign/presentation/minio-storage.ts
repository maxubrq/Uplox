import { UploxFile } from '@domain/file';
import { UploxStorage } from '@/presign/application/storage';
import { UploxAppConfig } from '@application/app-config';
import * as Minio from 'minio';
import { Readable } from 'stream';
import { UploxLogger } from '@shared/logger';
import { buffer } from 'node:stream/consumers';

export class MinioStorage extends UploxStorage {
    private readonly _minioClient: Minio.Client;
    private static _instance: MinioStorage;
    private readonly logger: UploxLogger;

    public async streamToBuffer(stream: Readable): Promise<Buffer> {
        try {
            return await buffer(stream);
        } catch (e) {
            this.logger.error(`[MinIO] Failed to stream to buffer: ${e}`);
            throw e;
        }
    }

    public static async getInstance(config: UploxAppConfig, logger: UploxLogger): Promise<MinioStorage> {
        if (!MinioStorage._instance) {
            MinioStorage._instance = new MinioStorage(config, logger);
            await MinioStorage._instance.initializeBucket();
        }
        return MinioStorage._instance;
    }

    private getDataFileName(fileId: string): string {
        return `${fileId}-data`;
    }
    private getMetaFileName(fileId: string): string {
        return `${fileId}-meta.json`;
    }

    private constructor(config: UploxAppConfig, logger: UploxLogger) {
        super(config);

        // Log MinIO connection details for debugging (without exposing secrets)
        logger.info('[MinIO] Initializing client', {
            endpoint: config.minioEndpoint,
            port: config.minioPort,
            accessKey: config.minioAccessKey?.substring(0, 4) + '***',
            region: config.minioRegion,
            bucket: config.minioBucket,
        });

        this._minioClient = new Minio.Client({
            endPoint: config.minioEndpoint,
            port: parseInt(config.minioPort),
            useSSL: false,
            accessKey: config.minioAccessKey,
            secretKey: config.minioSecretKey,
            region: config.minioRegion,
        });
        this.logger = logger;
    }

    private async initializeBucket(): Promise<void> {
        const bucket = this.config.minioBucket;
        const maxRetries = 5;
        const retryDelay = 2000; // 2 seconds

        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                // First, test basic connectivity by listing buckets
                this.logger.info(`[MinIO] Testing connection (attempt ${attempt}/${maxRetries})`);
                await this._minioClient.listBuckets();
                this.logger.info(`[MinIO] Connection successful`);

                this.logger.info(`[MinIO] Checking bucket existence: ${bucket}`);
                const bucketExists = await this._minioClient.bucketExists(bucket);

                if (!bucketExists) {
                    this.logger.info(`[MinIO] Creating bucket: ${bucket}`);
                    await this._minioClient.makeBucket(bucket, this.config.minioRegion);
                    this.logger.info(`[MinIO] Bucket created successfully: ${bucket}`);
                } else {
                    this.logger.info(`[MinIO] Bucket already exists: ${bucket}`);
                }
                return; // Success, exit the retry loop
            } catch (error) {
                this.logger.error(`[MinIO] Failed to initialize bucket (attempt ${attempt}/${maxRetries}): ${error}`);

                if (attempt === maxRetries) {
                    this.logger.error(`[MinIO] All ${maxRetries} attempts failed. Giving up.`);
                    throw error;
                }

                this.logger.info(`[MinIO] Retrying in ${retryDelay}ms...`);
                await new Promise(resolve => setTimeout(resolve, retryDelay));
            }
        }
    }

    private async rollback(file: UploxFile): Promise<void> {
        try {
            const bucket = this.config.minioBucket;
            const dataFileName = this.getDataFileName(file.id);
            const metaFileName = this.getMetaFileName(file.id);
            await Promise.all([
                this._minioClient.removeObject(bucket, dataFileName),
                this._minioClient.removeObject(bucket, metaFileName),
            ]);
        } catch (e) {
            this.logger.error(`[MinIO] Failed to rollback file: ${e}`);
        }
    }

    public async uploadFile(file: UploxFile): Promise<UploxFile> {
        const bucket = this.config.minioBucket;
        const fileBuffer = await file.file.arrayBuffer();
        const fileStream = new Readable();
        fileStream.push(Buffer.from(fileBuffer));
        fileStream.push(null);
        const dataFileName = this.getDataFileName(file.id);
        const metaFileName = this.getMetaFileName(file.id);

        this.logger.info(`[MinIO] Uploading file`, { fileId: file.id, dataFileName, metaFileName });

        const results = await Promise.allSettled([
            this._minioClient.putObject(bucket, dataFileName, fileStream),
            this._minioClient.putObject(bucket, metaFileName, JSON.stringify(file.toJSON())),
        ]);

        for (const result of results) {
            if (result.status === 'rejected') {
                this.logger.error(`[MinIO] Failed to upload file`, {
                    fileId: file.id,
                    dataFileName,
                    metaFileName,
                    error: result.reason,
                });

                await this.rollback(file);
                throw new Error(`Failed to upload file: ${result.reason}`);
            }
        }

        this.logger.info(`[MinIO] File uploaded`, { fileId: file.id, dataFileName, metaFileName });
        return file;
    }

    public async getFile(fileId: string): Promise<UploxFile> {
        const bucket = this.config.minioBucket;
        const dataFileName = this.getDataFileName(fileId);
        const metaFileName = this.getMetaFileName(fileId);
        const [data, meta] = await Promise.allSettled([
            this._minioClient.getObject(bucket, dataFileName),
            this._minioClient.getObject(bucket, metaFileName),
        ]);
        if (data.status === 'rejected' || meta.status === 'rejected') {
            throw new Error('Failed to get file');
        }
        const fileData = await this.streamToBuffer(data.value);
        const fileMeta = JSON.parse(meta.value.toString());
        const file = UploxFile.fromBufferWithMeta(fileId, fileData, fileMeta);
        return file;
    }

    public async deleteFile(fileId: string): Promise<void> {
        const bucket = this.config.minioBucket;
        const dataFileName = this.getDataFileName(fileId);
        const metaFileName = this.getMetaFileName(fileId);
        await Promise.all([
            this._minioClient.removeObject(bucket, dataFileName),
            this._minioClient.removeObject(bucket, metaFileName),
        ]);
    }

    public async getDownloadUrl(fileId: string, expiresInSeconds: number = 60 * 60 * 24 * 7): Promise<string> {
        const bucket = this.config.minioBucket;
        const dataFileName = this.getDataFileName(fileId);
        const url = await this._minioClient.presignedGetObject(bucket, dataFileName, expiresInSeconds);
        return url;
    }
}
