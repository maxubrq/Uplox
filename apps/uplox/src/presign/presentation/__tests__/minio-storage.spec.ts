import { describe, it, expect, vi, beforeEach, afterEach, Mock } from 'vitest';
import { MinioStorage } from '../minio-storage';
import { UploxFile } from '@domain/file';
import { UploxAppConfig } from '@application/app-config';
import { UploxLogger } from '@shared/logger';
import * as Minio from 'minio';
import { Readable } from 'stream';
import { buffer } from 'node:stream/consumers';

// Mock node:stream/consumers
vi.mock('node:stream/consumers', () => ({
    buffer: vi.fn()
}));

// Mock minio
vi.mock('minio', () => {
    const MockClient = vi.fn().mockImplementation(() => ({
        listBuckets: vi.fn(),
        bucketExists: vi.fn(),
        makeBucket: vi.fn(),
        putObject: vi.fn(),
        getObject: vi.fn(),
        removeObject: vi.fn(),
        presignedGetObject: vi.fn()
    }));
    
    return {
        Client: MockClient
    };
});

describe('MinioStorage', () => {
    let mockConfig: UploxAppConfig;
    let mockLogger: UploxLogger;
    let mockMinioClient: any;
    let mockBuffer: Mock;

    beforeEach(() => {
        // Reset singleton instance before each test
        (MinioStorage as any)._instance = undefined;

        mockConfig = {
            nodeEnv: 'test',
            redisUrl: 'redis://localhost:6379',
            databaseUrl: 'postgresql://localhost:5432/test',
            minioEndpoint: 'localhost',
            minioPort: '9000',
            minioAccessKey: 'testaccess',
            minioSecretKey: 'testsecret',
            minioBucket: 'test-bucket',
            minioRegion: 'us-east-1'
        };

        mockLogger = {
            info: vi.fn(),
            error: vi.fn(),
            warn: vi.fn(),
            debug: vi.fn(),
            log: vi.fn()
        } as any;

        mockMinioClient = {
            listBuckets: vi.fn(),
            bucketExists: vi.fn(),
            makeBucket: vi.fn(),
            putObject: vi.fn(),
            getObject: vi.fn(),
            removeObject: vi.fn(),
            presignedGetObject: vi.fn()
        };

        (Minio.Client as any).mockImplementation(() => mockMinioClient);

        mockBuffer = vi.mocked(buffer);
    });

    afterEach(() => {
        vi.clearAllMocks();
        vi.useRealTimers();
    });

    describe('getInstance', () => {
        it('should create a new instance if none exists', async () => {
            mockMinioClient.listBuckets.mockResolvedValue([]);
            mockMinioClient.bucketExists.mockResolvedValue(true);

            const instance = await MinioStorage.getInstance(mockConfig, mockLogger);

            expect(instance).toBeInstanceOf(MinioStorage);
            expect(Minio.Client).toHaveBeenCalledWith({
                endPoint: 'localhost',
                port: 9000,
                useSSL: false,
                accessKey: 'testaccess',
                secretKey: 'testsecret',
                region: 'us-east-1'
            });
        });

        it('should return the same instance on subsequent calls', async () => {
            mockMinioClient.listBuckets.mockResolvedValue([]);
            mockMinioClient.bucketExists.mockResolvedValue(true);

            const instance1 = await MinioStorage.getInstance(mockConfig, mockLogger);
            const instance2 = await MinioStorage.getInstance(mockConfig, mockLogger);

            expect(instance1).toBe(instance2);
        });

        it('should create bucket if it does not exist', async () => {
            mockMinioClient.listBuckets.mockResolvedValue([]);
            mockMinioClient.bucketExists.mockResolvedValue(false);
            mockMinioClient.makeBucket.mockResolvedValue(undefined);

            await MinioStorage.getInstance(mockConfig, mockLogger);

            expect(mockMinioClient.bucketExists).toHaveBeenCalledWith('test-bucket');
            expect(mockMinioClient.makeBucket).toHaveBeenCalledWith('test-bucket', 'us-east-1');
            expect(mockLogger.info).toHaveBeenCalledWith('[MinIO] Creating bucket: test-bucket');
        });

        it('should retry on initialization failure and eventually succeed', async () => {
            mockMinioClient.listBuckets
                .mockRejectedValueOnce(new Error('Connection failed'))
                .mockRejectedValueOnce(new Error('Connection failed'))
                .mockResolvedValue([]);
            mockMinioClient.bucketExists.mockResolvedValue(true);

            const instance = await MinioStorage.getInstance(mockConfig, mockLogger);

            expect(instance).toBeInstanceOf(MinioStorage);
            expect(mockMinioClient.listBuckets).toHaveBeenCalledTimes(3);
            expect(mockLogger.error).toHaveBeenCalledTimes(2);
        });
    });

    describe('streamToBuffer', () => {
        let storage: MinioStorage;

        beforeEach(async () => {
            mockMinioClient.listBuckets.mockResolvedValue([]);
            mockMinioClient.bucketExists.mockResolvedValue(true);
            storage = await MinioStorage.getInstance(mockConfig, mockLogger);
        });

        it('should convert stream to buffer successfully', async () => {
            const mockStream = new Readable();
            const expectedBuffer = Buffer.from('test data');
            mockBuffer.mockResolvedValue(expectedBuffer);

            const result = await storage.streamToBuffer(mockStream);

            expect(result).toBe(expectedBuffer);
            expect(mockBuffer).toHaveBeenCalledWith(mockStream);
        });

        it('should handle stream conversion errors', async () => {
            const mockStream = new Readable();
            const error = new Error('Stream conversion failed');
            mockBuffer.mockRejectedValue(error);

            await expect(storage.streamToBuffer(mockStream)).rejects.toThrow(error);
            expect(mockLogger.error).toHaveBeenCalledWith('[MinIO] Failed to stream to buffer: Error: Stream conversion failed');
        });
    });

    describe('uploadFile', () => {
        let storage: MinioStorage;
        let mockFile: UploxFile;

        beforeEach(async () => {
            mockMinioClient.listBuckets.mockResolvedValue([]);
            mockMinioClient.bucketExists.mockResolvedValue(true);
            storage = await MinioStorage.getInstance(mockConfig, mockLogger);

            const mockFileData = new File(['test content'], 'test.txt', { type: 'text/plain' });
            mockFile = new UploxFile(
                'test-id',
                'test.txt',
                12,
                'text/plain',
                { blake3: 'test-hash' },
                mockFileData
            );
        });

        it('should upload file successfully', async () => {
            mockMinioClient.putObject.mockResolvedValue(undefined);

            const result = await storage.uploadFile(mockFile);

            expect(result).toBe(mockFile);
            expect(mockMinioClient.putObject).toHaveBeenCalledTimes(2);
            expect(mockMinioClient.putObject).toHaveBeenCalledWith(
                'test-bucket',
                'test-id-data',
                expect.any(Readable)
            );
            expect(mockMinioClient.putObject).toHaveBeenCalledWith(
                'test-bucket',
                'test-id-meta.json',
                JSON.stringify(mockFile.toJSON())
            );
            expect(mockLogger.info).toHaveBeenCalledWith('[MinIO] File uploaded', {
                fileId: 'test-id',
                dataFileName: 'test-id-data',
                metaFileName: 'test-id-meta.json'
            });
        });

        it('should rollback and throw error if data upload fails', async () => {
            const error = new Error('Data upload failed');
            mockMinioClient.putObject
                .mockRejectedValueOnce(error)
                .mockResolvedValue(undefined); // For metadata upload
            mockMinioClient.removeObject.mockResolvedValue(undefined);

            await expect(storage.uploadFile(mockFile)).rejects.toThrow('Failed to upload file: Error: Data upload failed');

            expect(mockMinioClient.removeObject).toHaveBeenCalledWith('test-bucket', 'test-id-data');
            expect(mockMinioClient.removeObject).toHaveBeenCalledWith('test-bucket', 'test-id-meta.json');
            expect(mockLogger.error).toHaveBeenCalledWith('[MinIO] Failed to upload file', {
                fileId: 'test-id',
                dataFileName: 'test-id-data',
                metaFileName: 'test-id-meta.json',
                error
            });
        });

        it('should rollback and throw error if metadata upload fails', async () => {
            const error = new Error('Metadata upload failed');
            mockMinioClient.putObject
                .mockResolvedValueOnce(undefined) // For data upload
                .mockRejectedValueOnce(error); // For metadata upload
            mockMinioClient.removeObject.mockResolvedValue(undefined);

            await expect(storage.uploadFile(mockFile)).rejects.toThrow('Failed to upload file: Error: Metadata upload failed');

            expect(mockMinioClient.removeObject).toHaveBeenCalledTimes(2);
        });

        it('should handle rollback errors gracefully', async () => {
            const uploadError = new Error('Upload failed');
            const rollbackError = new Error('Rollback failed');
            mockMinioClient.putObject.mockRejectedValue(uploadError);
            mockMinioClient.removeObject.mockRejectedValue(rollbackError);

            await expect(storage.uploadFile(mockFile)).rejects.toThrow('Failed to upload file: Error: Upload failed');

            expect(mockLogger.error).toHaveBeenCalledWith('[MinIO] Failed to rollback file: Error: Rollback failed');
        });
    });

    describe('getFile', () => {
        let storage: MinioStorage;

        beforeEach(async () => {
            mockMinioClient.listBuckets.mockResolvedValue([]);
            mockMinioClient.bucketExists.mockResolvedValue(true);
            storage = await MinioStorage.getInstance(mockConfig, mockLogger);
        });

        it('should retrieve file successfully', async () => {
            const fileId = 'test-id';
            const mockDataStream = new Readable();
            const mockMetaStream = new Readable();
            const mockBuffer = Buffer.from('test content');
            const mockMeta = {
                id: fileId,
                name: 'test.txt',
                size: 12,
                type: 'text/plain',
                hashes: { blake3: 'test-hash' }
            };

            mockMinioClient.getObject
                .mockResolvedValueOnce(mockDataStream)
                .mockResolvedValueOnce(mockMetaStream);

            // Mock streamToBuffer for data
            const streamToBufferSpy = vi.spyOn(storage, 'streamToBuffer')
                .mockResolvedValue(mockBuffer);

            // Mock meta stream toString by overriding toString method
            mockMetaStream.toString = vi.fn().mockReturnValue(JSON.stringify(mockMeta));

            const result = await storage.getFile(fileId);

            expect(result).toBeInstanceOf(UploxFile);
            expect(result.id).toBe(fileId);
            expect(result.name).toBe('test.txt');
            expect(mockMinioClient.getObject).toHaveBeenCalledWith('test-bucket', 'test-id-data');
            expect(mockMinioClient.getObject).toHaveBeenCalledWith('test-bucket', 'test-id-meta.json');
            expect(streamToBufferSpy).toHaveBeenCalledWith(mockDataStream);
        });

        it('should throw error if data retrieval fails', async () => {
            const fileId = 'test-id';
            const error = new Error('Data retrieval failed');

            mockMinioClient.getObject
                .mockRejectedValueOnce(error)
                .mockResolvedValue(new Readable());

            await expect(storage.getFile(fileId)).rejects.toThrow('Failed to get file');
        });

        it('should throw error if metadata retrieval fails', async () => {
            const fileId = 'test-id';
            const error = new Error('Metadata retrieval failed');

            mockMinioClient.getObject
                .mockResolvedValueOnce(new Readable())
                .mockRejectedValueOnce(error);

            await expect(storage.getFile(fileId)).rejects.toThrow('Failed to get file');
        });
    });

    describe('deleteFile', () => {
        let storage: MinioStorage;

        beforeEach(async () => {
            mockMinioClient.listBuckets.mockResolvedValue([]);
            mockMinioClient.bucketExists.mockResolvedValue(true);
            storage = await MinioStorage.getInstance(mockConfig, mockLogger);
        });

        it('should delete file successfully', async () => {
            const fileId = 'test-id';
            mockMinioClient.removeObject.mockResolvedValue(undefined);

            await storage.deleteFile(fileId);

            expect(mockMinioClient.removeObject).toHaveBeenCalledTimes(2);
            expect(mockMinioClient.removeObject).toHaveBeenCalledWith('test-bucket', 'test-id-data');
            expect(mockMinioClient.removeObject).toHaveBeenCalledWith('test-bucket', 'test-id-meta.json');
        });

        it('should propagate deletion errors', async () => {
            const fileId = 'test-id';
            const error = new Error('Deletion failed');
            mockMinioClient.removeObject.mockRejectedValue(error);

            await expect(storage.deleteFile(fileId)).rejects.toThrow(error);
        });
    });

    describe('getDownloadUrl', () => {
        let storage: MinioStorage;

        beforeEach(async () => {
            mockMinioClient.listBuckets.mockResolvedValue([]);
            mockMinioClient.bucketExists.mockResolvedValue(true);
            storage = await MinioStorage.getInstance(mockConfig, mockLogger);
        });

        it('should generate download URL with default expiry', async () => {
            const fileId = 'test-id';
            const expectedUrl = 'https://minio.example.com/test-bucket/test-id-data';
            mockMinioClient.presignedGetObject.mockResolvedValue(expectedUrl);

            const result = await storage.getDownloadUrl(fileId);

            expect(result).toBe(expectedUrl);
            expect(mockMinioClient.presignedGetObject).toHaveBeenCalledWith(
                'test-bucket',
                'test-id-data',
                60 * 60 * 24 * 7 // 7 days default
            );
        });

        it('should generate download URL with custom expiry', async () => {
            const fileId = 'test-id';
            const customExpiry = 3600; // 1 hour
            const expectedUrl = 'https://minio.example.com/test-bucket/test-id-data';
            mockMinioClient.presignedGetObject.mockResolvedValue(expectedUrl);

            const result = await storage.getDownloadUrl(fileId, customExpiry);

            expect(result).toBe(expectedUrl);
            expect(mockMinioClient.presignedGetObject).toHaveBeenCalledWith(
                'test-bucket',
                'test-id-data',
                customExpiry
            );
        });

        it('should propagate URL generation errors', async () => {
            const fileId = 'test-id';
            const error = new Error('URL generation failed');
            mockMinioClient.presignedGetObject.mockRejectedValue(error);

            await expect(storage.getDownloadUrl(fileId)).rejects.toThrow(error);
        });
    });

    describe('private methods', () => {
        let storage: MinioStorage;

        beforeEach(async () => {
            mockMinioClient.listBuckets.mockResolvedValue([]);
            mockMinioClient.bucketExists.mockResolvedValue(true);
            storage = await MinioStorage.getInstance(mockConfig, mockLogger);
        });

        it('should generate correct data file name', () => {
            const fileId = 'test-id';
            const dataFileName = (storage as any).getDataFileName(fileId);
            expect(dataFileName).toBe('test-id-data');
        });

        it('should generate correct meta file name', () => {
            const fileId = 'test-id';
            const metaFileName = (storage as any).getMetaFileName(fileId);
            expect(metaFileName).toBe('test-id-meta.json');
        });
    });

    describe('constructor logging', () => {
        beforeEach(() => {
            // Reset singleton instance
            (MinioStorage as any)._instance = undefined;
        });

        it('should log initialization details with masked access key', async () => {
            mockMinioClient.listBuckets.mockResolvedValue([]);
            mockMinioClient.bucketExists.mockResolvedValue(true);

            await MinioStorage.getInstance(mockConfig, mockLogger);

            expect(mockLogger.info).toHaveBeenCalledWith('[MinIO] Initializing client', {
                endpoint: 'localhost',
                port: '9000',
                accessKey: 'test***',
                region: 'us-east-1',
                bucket: 'test-bucket'
            });
        });
    });
});
