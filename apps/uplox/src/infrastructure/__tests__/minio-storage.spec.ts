import { describe, it, expect, vi, beforeEach, afterEach, MockedFunction } from 'vitest';
import { MinioStorage, MinioOptions } from '../minio-storage';
import { UploxAppLogger } from '@application';
import { UploxFile } from '@domain';
import { Readable } from 'stream';
import * as Minio from 'minio';

// Mock the minio library
vi.mock('minio', () => ({
    Client: vi.fn().mockImplementation(() => ({
        putObject: vi.fn(),
    })),
}));

// We'll mock Readable.fromWeb manually in the tests

describe('MinioStorage', () => {
    let minioStorage: MinioStorage;
    let mockLogger: UploxAppLogger;
    let mockMinioClient: {
        putObject: MockedFunction<any>;
    };
    let mockMinioOptions: MinioOptions;
    let mockUploxFile: UploxFile;
    let mockBucket: string;
    let mockToJSONData: any;

    beforeEach(() => {
        // Reset all mocks
        vi.clearAllMocks();
        vi.resetAllMocks();

        // Setup mock logger
        mockLogger = {
            info: vi.fn(),
            warn: vi.fn(),
            error: vi.fn(),
            debug: vi.fn(),
            child: vi.fn(),
        };

        // Setup mock MinioClient
        mockMinioClient = {
            putObject: vi.fn(),
        };

        // Mock the Minio.Client constructor
        vi.mocked(Minio.Client).mockImplementation(() => mockMinioClient as any);

        // Setup mock options
        mockMinioOptions = {
            endpoint: 'localhost',
            accessKey: 'test-access-key',
            secretKey: 'test-secret-key',
            useSSL: false,
            region: 'us-east-1',
            port: 9000,
        };

        // Setup mock bucket
        mockBucket = 'test-bucket';

        // Setup mock UploxFile with fresh mock
        mockToJSONData = {
            id: 'test-file-id',
            name: 'test-file.txt',
            size: 1024,
            mimeType: 'text/plain',
            extension: 'txt',
            createdAt: new Date('2023-01-01T00:00:00.000Z'),
            updatedAt: new Date('2023-01-01T00:00:00.000Z'),
            hashes: {
                md5: 'abc123',
                sha1: 'def456',
                sha256: 'ghi789',
            },
        };

        mockUploxFile = {
            id: 'test-file-id',
            name: 'test-file.txt',
            size: 1024,
            mimeType: 'text/plain',
            extension: 'txt',
            createdAt: new Date('2023-01-01T00:00:00.000Z'),
            updatedAt: new Date('2023-01-01T00:00:00.000Z'),
            hashes: {
                md5: 'abc123',
                sha1: 'def456',
                sha256: 'ghi789',
            },
            toJSON: vi.fn().mockReturnValue(mockToJSONData),
        } as UploxFile;

        // Create MinioStorage instance
        minioStorage = new MinioStorage(mockLogger, mockBucket, mockMinioOptions);
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    describe('constructor', () => {
        it('should initialize with correct parameters and create MinioClient', () => {
            expect(Minio.Client).toHaveBeenCalledWith({
                endPoint: mockMinioOptions.endpoint,
                port: mockMinioOptions.port,
                accessKey: mockMinioOptions.accessKey,
                secretKey: mockMinioOptions.secretKey,
                useSSL: mockMinioOptions.useSSL,
                region: mockMinioOptions.region,
            });

            expect(mockLogger.debug).toHaveBeenCalledWith(
                '[MinioStorage] Starting storage with options',
                mockMinioOptions,
            );
        });

        it('should create instance with different options', () => {
            const customOptions: MinioOptions = {
                endpoint: 'custom-endpoint',
                accessKey: 'custom-access',
                secretKey: 'custom-secret',
                useSSL: true,
                region: 'eu-west-1',
                port: 443,
            };

            new MinioStorage(mockLogger, 'custom-bucket', customOptions);

            expect(Minio.Client).toHaveBeenCalledWith({
                endPoint: customOptions.endpoint,
                port: customOptions.port,
                accessKey: customOptions.accessKey,
                secretKey: customOptions.secretKey,
                useSSL: customOptions.useSSL,
                region: customOptions.region,
            });
        });

        it('should log debug message with masked sensitive options', () => {
            const sensitiveOptions: MinioOptions = {
                endpoint: 'localhost',
                accessKey: 'super-secret-key',
                secretKey: 'ultra-secret-key',
                useSSL: false,
                region: 'us-east-1',
                port: 9000,
            };

            new MinioStorage(mockLogger, mockBucket, sensitiveOptions);

            expect(mockLogger.debug).toHaveBeenCalledWith(
                '[MinioStorage] Starting storage with options',
                sensitiveOptions,
            );
        });
    });

    describe('getBucket', () => {
        it('should return the bucket name', () => {
            const result = minioStorage.getBucket();
            expect(result).toBe(mockBucket);
        });

        it('should return the correct bucket name for different instances', () => {
            const customBucket = 'custom-bucket-name';
            const customStorage = new MinioStorage(mockLogger, customBucket, mockMinioOptions);

            expect(customStorage.getBucket()).toBe(customBucket);
        });
    });

    describe('saveFile', () => {
        let mockFile: File;
        let mockReadableStream: Readable;

        beforeEach(() => {
            // Setup mock File with stream method
            mockReadableStream = new Readable();
            mockFile = {
                stream: vi.fn().mockReturnValue(mockReadableStream),
            } as any;

            // Mock Readable.fromWeb
            vi.spyOn(Readable, 'fromWeb').mockReturnValue(mockReadableStream);

            // Mock putObject to resolve successfully
            mockMinioClient.putObject.mockResolvedValue(undefined);
        });

        it('should save file and metadata successfully', async () => {
            const fileId = 'test-file-123';
            const expectedMetadataId = `${fileId}.meta.json`;
            const expectedMetadataContent = JSON.stringify(mockToJSONData, null, 2);

            await minioStorage.saveFile(mockFile, mockUploxFile, fileId);

            expect(mockFile.stream).toHaveBeenCalledTimes(1);
            expect(Readable.fromWeb).toHaveBeenCalledWith(mockReadableStream);
            expect(mockUploxFile.toJSON).toHaveBeenCalledTimes(1);

            expect(mockMinioClient.putObject).toHaveBeenCalledTimes(2);
            expect(mockMinioClient.putObject).toHaveBeenCalledWith(
                mockBucket,
                fileId,
                mockReadableStream,
            );
            expect(mockMinioClient.putObject).toHaveBeenCalledWith(
                mockBucket,
                expectedMetadataId,
                expectedMetadataContent,
            );

            expect(mockLogger.info).toHaveBeenCalledWith('[MinioStorage] Start upload file');
            expect(mockLogger.debug).toHaveBeenCalledWith('[MinioStorage] Uploading files', {
                fileId,
                metadataId: expectedMetadataId,
            });
            expect(mockLogger.info).toHaveBeenCalledWith('[MinioStorage] Done uploading files', {
                fileId,
                metadataId: expectedMetadataId,
            });
        });

        it('should handle upload failure', async () => {
            const fileId = 'test-file-456';
            const uploadError = new Error('Upload failed');

            mockMinioClient.putObject.mockRejectedValue(uploadError);

            await expect(minioStorage.saveFile(mockFile, mockUploxFile, fileId)).rejects.toThrow(
                'Upload failed',
            );

            expect(mockLogger.info).toHaveBeenCalledWith('[MinioStorage] Start upload file');
            expect(mockLogger.info).not.toHaveBeenCalledWith(
                expect.stringContaining('[MinioStorage] Done uploading files'),
            );
        });

        it('should handle metadata generation failure', async () => {
            const fileId = 'test-file-789';
            mockUploxFile.toJSON = vi.fn().mockImplementation(() => {
                throw new Error('Metadata generation failed');
            });

            await expect(minioStorage.saveFile(mockFile, mockUploxFile, fileId)).rejects.toThrow(
                'Metadata generation failed',
            );

            expect(mockLogger.info).toHaveBeenCalledWith('[MinioStorage] Start upload file');
        });

        it('should handle different file IDs correctly', async () => {
            const fileId1 = 'file-with-special-chars-123!@#';
            const fileId2 = 'file.with.dots.456';

            await minioStorage.saveFile(mockFile, mockUploxFile, fileId1);
            await minioStorage.saveFile(mockFile, mockUploxFile, fileId2);

            expect(mockMinioClient.putObject).toHaveBeenCalledWith(
                mockBucket,
                fileId1,
                expect.any(Readable),
            );
            expect(mockMinioClient.putObject).toHaveBeenCalledWith(
                mockBucket,
                `${fileId1}.meta.json`,
                expect.any(String),
            );

            expect(mockMinioClient.putObject).toHaveBeenCalledWith(
                mockBucket,
                fileId2,
                expect.any(Readable),
            );
            expect(mockMinioClient.putObject).toHaveBeenCalledWith(
                mockBucket,
                `${fileId2}.meta.json`,
                expect.any(String),
            );
        });

        it('should use Promise.all for concurrent uploads', async () => {
            const fileId = 'concurrent-test';
            
            // Mock Promise.all to track concurrent execution
            const originalPromiseAll = Promise.all;
            const promiseAllSpy = vi.spyOn(Promise, 'all').mockImplementation(originalPromiseAll);

            await minioStorage.saveFile(mockFile, mockUploxFile, fileId);

            expect(promiseAllSpy).toHaveBeenCalledWith([
                expect.any(Promise),
                expect.any(Promise),
            ]);

            promiseAllSpy.mockRestore();
        });
    });

    describe('saveFileStream', () => {
        let mockStream: Readable;

        beforeEach(() => {
            mockStream = new Readable();
            mockMinioClient.putObject.mockResolvedValue(undefined);
        });

        it('should save stream and metadata successfully', async () => {
            const fileId = 'stream-test-123';
            const expectedMetadataId = `${fileId}.meta.json`;
            const expectedMetadataContent = JSON.stringify(mockToJSONData, null, 2);

            await minioStorage.saveFileStream(mockStream, mockUploxFile, fileId);

            expect(mockUploxFile.toJSON).toHaveBeenCalledTimes(1);

            expect(mockMinioClient.putObject).toHaveBeenCalledTimes(2);
            expect(mockMinioClient.putObject).toHaveBeenCalledWith(
                mockBucket,
                fileId,
                mockStream,
            );
            expect(mockMinioClient.putObject).toHaveBeenCalledWith(
                mockBucket,
                expectedMetadataId,
                expectedMetadataContent,
            );

            expect(mockLogger.info).toHaveBeenCalledWith('[MinioStorage] Uploading files', {
                fileId,
                metadataId: expectedMetadataId,
            });
            expect(mockLogger.info).toHaveBeenCalledWith('[MinioStorage] Done uploading files', {
                fileId,
                metadataId: expectedMetadataId,
            });
        });

        it('should handle stream upload failure', async () => {
            const fileId = 'stream-fail-456';
            const streamError = new Error('Stream upload failed');

            mockMinioClient.putObject.mockRejectedValue(streamError);

            await expect(
                minioStorage.saveFileStream(mockStream, mockUploxFile, fileId),
            ).rejects.toThrow('Stream upload failed');

            expect(mockLogger.info).toHaveBeenCalledWith('[MinioStorage] Uploading files', {
                fileId,
                metadataId: `${fileId}.meta.json`,
            });
            expect(mockLogger.info).not.toHaveBeenCalledWith(
                expect.stringContaining('[MinioStorage] Done uploading files'),
            );
        });

        it('should handle different stream types', async () => {
            const customStream = new Readable({
                read() {
                    this.push('test data');
                    this.push(null);
                },
            });

            const fileId = 'custom-stream-789';

            await minioStorage.saveFileStream(customStream, mockUploxFile, fileId);

            expect(mockMinioClient.putObject).toHaveBeenCalledWith(
                mockBucket,
                fileId,
                customStream,
            );
        });

        it('should use Promise.all for concurrent uploads', async () => {
            const fileId = 'concurrent-stream-test';
            
            // Mock Promise.all to track concurrent execution
            const originalPromiseAll = Promise.all;
            const promiseAllSpy = vi.spyOn(Promise, 'all').mockImplementation(originalPromiseAll);

            await minioStorage.saveFileStream(mockStream, mockUploxFile, fileId);

            expect(promiseAllSpy).toHaveBeenCalledWith([
                expect.any(Promise),
                expect.any(Promise),
            ]);

            promiseAllSpy.mockRestore();
        });
    });

    describe('metadataFileName', () => {
        it('should generate correct metadata filename', async () => {
            const originalFileName = 'test-file.txt';
            const expectedMetadataFileName = `${originalFileName}.meta.json`;

            const result = await minioStorage.metadataFileName(originalFileName);

            expect(result).toBe(expectedMetadataFileName);
        });

        it('should handle filenames with special characters', async () => {
            const originalFileName = 'file-with-special-chars!@#$%^&*()';
            const expectedMetadataFileName = `${originalFileName}.meta.json`;

            const result = await minioStorage.metadataFileName(originalFileName);

            expect(result).toBe(expectedMetadataFileName);
        });

        it('should handle filenames with multiple dots', async () => {
            const originalFileName = 'file.with.multiple.dots.txt';
            const expectedMetadataFileName = `${originalFileName}.meta.json`;

            const result = await minioStorage.metadataFileName(originalFileName);

            expect(result).toBe(expectedMetadataFileName);
        });

        it('should handle empty filename', async () => {
            const originalFileName = '';
            const expectedMetadataFileName = '.meta.json';

            const result = await minioStorage.metadataFileName(originalFileName);

            expect(result).toBe(expectedMetadataFileName);
        });

        it('should handle filenames with spaces', async () => {
            const originalFileName = 'file with spaces.txt';
            const expectedMetadataFileName = `${originalFileName}.meta.json`;

            const result = await minioStorage.metadataFileName(originalFileName);

            expect(result).toBe(expectedMetadataFileName);
        });

        it('should handle very long filenames', async () => {
            const originalFileName = 'a'.repeat(200);
            const expectedMetadataFileName = `${originalFileName}.meta.json`;

            const result = await minioStorage.metadataFileName(originalFileName);

            expect(result).toBe(expectedMetadataFileName);
        });
    });

    describe('integration scenarios', () => {
        it('should handle complete file upload workflow', async () => {
            const mockFile = {
                stream: vi.fn().mockReturnValue(new Readable()),
            } as any;

            const mockReadableStream = new Readable();
            vi.spyOn(Readable, 'fromWeb').mockReturnValue(mockReadableStream);
            mockMinioClient.putObject.mockResolvedValue(undefined);

            const fileId = 'integration-test-123';

            await minioStorage.saveFile(mockFile, mockUploxFile, fileId);

            // Verify complete workflow
            expect(mockFile.stream).toHaveBeenCalled();
            expect(Readable.fromWeb).toHaveBeenCalled();
            expect(mockUploxFile.toJSON).toHaveBeenCalled();
            expect(mockMinioClient.putObject).toHaveBeenCalledTimes(2);
            expect(mockLogger.info).toHaveBeenCalledWith('[MinioStorage] Start upload file');
            expect(mockLogger.info).toHaveBeenCalledWith('[MinioStorage] Done uploading files', {
                fileId,
                metadataId: `${fileId}.meta.json`,
            });
        });

        it('should handle complete stream upload workflow', async () => {
            const mockStream = new Readable();
            mockMinioClient.putObject.mockResolvedValue(undefined);

            const fileId = 'stream-integration-456';

            await minioStorage.saveFileStream(mockStream, mockUploxFile, fileId);

            // Verify complete workflow
            expect(mockUploxFile.toJSON).toHaveBeenCalled();
            expect(mockMinioClient.putObject).toHaveBeenCalledTimes(2);
            expect(mockLogger.info).toHaveBeenCalledWith('[MinioStorage] Uploading files', {
                fileId,
                metadataId: `${fileId}.meta.json`,
            });
            expect(mockLogger.info).toHaveBeenCalledWith('[MinioStorage] Done uploading files', {
                fileId,
                metadataId: `${fileId}.meta.json`,
            });
        });

        it('should handle multiple file uploads sequentially', async () => {
            const mockFile = {
                stream: vi.fn().mockReturnValue(new Readable()),
            } as any;

            vi.spyOn(Readable, 'fromWeb').mockReturnValue(new Readable());
            mockMinioClient.putObject.mockResolvedValue(undefined);

            const fileIds = ['file1', 'file2', 'file3'];

            for (const fileId of fileIds) {
                await minioStorage.saveFile(mockFile, mockUploxFile, fileId);
            }

            // Should have been called 2 times per file (file + metadata)
            expect(mockMinioClient.putObject).toHaveBeenCalledTimes(6);
            expect(mockLogger.info).toHaveBeenCalledTimes(6); // 2 logs per file
        });
    });

    describe('error handling', () => {
        it('should propagate MinioClient constructor errors', () => {
            vi.mocked(Minio.Client).mockImplementation(() => {
                throw new Error('MinioClient initialization failed');
            });

            expect(() => {
                new MinioStorage(mockLogger, mockBucket, mockMinioOptions);
            }).toThrow('MinioClient initialization failed');
        });

        it('should handle partial upload failures in saveFile', async () => {
            const mockFile = {
                stream: vi.fn().mockReturnValue(new Readable()),
            } as any;

            vi.spyOn(Readable, 'fromWeb').mockReturnValue(new Readable());
            
            // Mock first putObject call to succeed, second to fail
            mockMinioClient.putObject
                .mockResolvedValueOnce(undefined)
                .mockRejectedValueOnce(new Error('Metadata upload failed'));

            const fileId = 'partial-fail-test';

            await expect(minioStorage.saveFile(mockFile, mockUploxFile, fileId)).rejects.toThrow(
                'Metadata upload failed',
            );

            expect(mockMinioClient.putObject).toHaveBeenCalledTimes(2);
        });

        it('should handle partial upload failures in saveFileStream', async () => {
            const mockStream = new Readable();
            
            // Mock first putObject call to succeed, second to fail
            mockMinioClient.putObject
                .mockResolvedValueOnce(undefined)
                .mockRejectedValueOnce(new Error('Metadata upload failed'));

            const fileId = 'stream-partial-fail-test';

            await expect(
                minioStorage.saveFileStream(mockStream, mockUploxFile, fileId),
            ).rejects.toThrow('Metadata upload failed');

            expect(mockMinioClient.putObject).toHaveBeenCalledTimes(2);
        });
    });
});
