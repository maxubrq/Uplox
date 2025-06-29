import { describe, it, expect, vi, beforeEach, Mock } from 'vitest';
import { PresignService, PresignConfig } from '../presign-service';
import { UploxLogger } from '@shared/logger';
import { UploxAppConfig } from '@application/app-config';
import { UploxStorage } from '../storage';
import { UploxFile, FileHashes } from '@domain/file';
import { fetchFile } from '@shared/fetch';
import { hash } from '@shared/hash';
import { isUrl } from '@shared/utils';

// Mock all dependencies
vi.mock('@shared/fetch');
vi.mock('@shared/hash');
vi.mock('@shared/utils');
vi.mock('@domain/file');

describe('PresignService', () => {
    let presignService: PresignService;
    let mockLogger: UploxLogger;
    let mockConfig: UploxAppConfig;
    let mockStorage: UploxStorage;
    let mockFetchFile: Mock;
    let mockHash: Mock;
    let mockIsUrl: Mock;
    let mockUploxFileFromFileWithHashes: Mock;

    const createMockFile = (name: string = 'test.txt', size: number = 1024, type: string = 'text/plain') => {
        return new File(['test content'], name, { type }) as File;
    };

    const createMockUploxFile = (id: string = 'test-id') => {
        return {
            id,
            name: 'test.txt',
            size: 1024,
            type: 'text/plain',
            hashes: { blake3: 'mock-blake3-hash', sha256: 'mock-sha256-hash' },
            file: createMockFile(),
            toJSON: vi.fn().mockReturnValue({
                id,
                name: 'test.txt',
                size: 1024,
                type: 'text/plain',
                hashes: { blake3: 'mock-blake3-hash', sha256: 'mock-sha256-hash' }
            })
        };
    };

    beforeEach(() => {
        vi.clearAllMocks();

        // Mock logger
        mockLogger = {
            info: vi.fn(),
            debug: vi.fn(),
            error: vi.fn(),
            warn: vi.fn(),
            log: vi.fn()
        } as unknown as UploxLogger;

        // Mock config
        mockConfig = {
            nodeEnv: 'test',
            redisUrl: 'redis://localhost:6379',
            databaseUrl: 'postgresql://localhost:5432/test',
            minioEndpoint: 'localhost',
            minioPort: '9000',
            minioAccessKey: 'testkey',
            minioSecretKey: 'testsecret',
            minioBucket: 'test-bucket',
            minioRegion: 'us-east-1'
        };

        // Mock storage
        mockStorage = {
            uploadFile: vi.fn().mockResolvedValue(createMockUploxFile())
        } as unknown as UploxStorage;

        // Mock external functions
        mockFetchFile = vi.mocked(fetchFile);
        mockHash = vi.mocked(hash);
        mockIsUrl = vi.mocked(isUrl);
        mockUploxFileFromFileWithHashes = vi.fn().mockReturnValue(createMockUploxFile());

        // Mock UploxFile static method
        (UploxFile as any).fromFileWithHashes = mockUploxFileFromFileWithHashes;

        presignService = new PresignService(mockLogger, mockConfig, mockStorage);
    });

    describe('constructor', () => {
        it('should initialize with provided dependencies', () => {
            expect(presignService).toBeInstanceOf(PresignService);
        });
    });

    describe('createPresignForString', () => {
        const config: PresignConfig = { timeoutMs: 5000, algorithm: 'all' };

        it('should successfully create presign for valid URL string', async () => {
            const fileId = 'test-file-id';
            const url = 'https://example.com/file.txt';
            const mockFile = createMockFile();
            const mockUploxFile = createMockUploxFile(fileId);

            mockFetchFile.mockResolvedValue(mockFile);
            mockHash.mockResolvedValueOnce('mock-blake3-hash');
            mockHash.mockResolvedValueOnce('mock-sha256-hash');
            mockUploxFileFromFileWithHashes.mockReturnValue(mockUploxFile);

            const result = await presignService.createPresignForString(fileId, url, config);

            expect(mockLogger.info).toHaveBeenCalledWith('[Presign] Try to download file', { 
                from: url, 
                timeoutMs: config.timeoutMs 
            });
            expect(mockFetchFile).toHaveBeenCalledWith(url, config.timeoutMs);
            expect(result.error).toBeNull();
            expect(result.file).toBe(mockUploxFile);
        });

        it('should handle fetch file error', async () => {
            const fileId = 'test-file-id';
            const url = 'https://example.com/file.txt';
            const fetchError = new Error('Network error');

            mockFetchFile.mockRejectedValue(fetchError);

            await expect(presignService.createPresignForString(fileId, url, config))
                .rejects.toThrow('Network error');

            expect(mockFetchFile).toHaveBeenCalledWith(url, config.timeoutMs);
        });
    });

    describe('uploadAndPresign', () => {
        const fileId = 'test-file-id';
        const mockFile = createMockFile();

        it('should handle "all" algorithm correctly', async () => {
            const config: PresignConfig = { timeoutMs: 5000, algorithm: 'all' };
            const mockUploxFile = createMockUploxFile(fileId);

            mockHash.mockResolvedValueOnce('mock-blake3-hash');
            mockHash.mockResolvedValueOnce('mock-sha256-hash');
            mockUploxFileFromFileWithHashes.mockReturnValue(mockUploxFile);

            const result = await (presignService as any).uploadAndPresign(fileId, mockFile, config);

            expect(mockHash).toHaveBeenCalledTimes(2);
            expect(mockHash).toHaveBeenCalledWith(mockFile, 'blake3');
            expect(mockHash).toHaveBeenCalledWith(mockFile, 'sha256');
            expect(mockUploxFileFromFileWithHashes).toHaveBeenCalledWith(fileId, mockFile, {
                blake3: 'mock-blake3-hash',
                sha256: 'mock-sha256-hash'
            });
            expect(mockStorage.uploadFile).toHaveBeenCalledWith(mockUploxFile);
            expect(result.error).toBeNull();
            expect(result.file).toBe(mockUploxFile);
        });

        it('should handle "blake3" algorithm correctly', async () => {
            const config: PresignConfig = { timeoutMs: 5000, algorithm: 'blake3' };
            const mockUploxFile = createMockUploxFile(fileId);

            mockHash.mockResolvedValue('mock-blake3-hash');
            mockUploxFileFromFileWithHashes.mockReturnValue(mockUploxFile);

            const result = await (presignService as any).uploadAndPresign(fileId, mockFile, config);

            expect(mockHash).toHaveBeenCalledTimes(1);
            expect(mockHash).toHaveBeenCalledWith(mockFile, 'blake3');
            expect(mockUploxFileFromFileWithHashes).toHaveBeenCalledWith(fileId, mockFile, {
                blake3: 'mock-blake3-hash'
            });
            expect(result.error).toBeNull();
            expect(result.file).toBe(mockUploxFile);
        });

        it('should handle "sha256" algorithm correctly', async () => {
            const config: PresignConfig = { timeoutMs: 5000, algorithm: 'sha256' };
            const mockUploxFile = createMockUploxFile(fileId);

            mockHash.mockResolvedValue('mock-sha256-hash');
            mockUploxFileFromFileWithHashes.mockReturnValue(mockUploxFile);

            const result = await (presignService as any).uploadAndPresign(fileId, mockFile, config);

            expect(mockHash).toHaveBeenCalledTimes(1);
            expect(mockHash).toHaveBeenCalledWith(mockFile, 'sha256');
            expect(mockUploxFileFromFileWithHashes).toHaveBeenCalledWith(fileId, mockFile, {
                sha256: 'mock-sha256-hash'
            });
            expect(result.error).toBeNull();
            expect(result.file).toBe(mockUploxFile);
        });

        it('should log debug information', async () => {
            const config: PresignConfig = { timeoutMs: 5000, algorithm: 'blake3' };
            const mockUploxFile = createMockUploxFile(fileId);

            mockHash.mockResolvedValue('mock-blake3-hash');
            mockUploxFileFromFileWithHashes.mockReturnValue(mockUploxFile);

            await (presignService as any).uploadAndPresign(fileId, mockFile, config);

            expect(mockLogger.debug).toHaveBeenCalledWith('[Presign] Hashes', { 
                uploxFile: mockUploxFile.toJSON() 
            });
            expect(mockLogger.info).toHaveBeenCalledWith('[Presign] File uploaded', { 
                fileId: mockUploxFile.id 
            });
        });
    });

    describe('createPresign', () => {
        const requestId = 'test-request-id';
        const fileId = 'test-file-id';
        const config: PresignConfig = { timeoutMs: 5000, algorithm: 'all' };

        it('should handle File input successfully', async () => {
            const mockFile = createMockFile();
            const mockUploxFile = createMockUploxFile(fileId);

            mockHash.mockResolvedValueOnce('mock-blake3-hash');
            mockHash.mockResolvedValueOnce('mock-sha256-hash');
            mockUploxFileFromFileWithHashes.mockReturnValue(mockUploxFile);

            const result = await presignService.createPresign(requestId, fileId, mockFile, config);

            expect(result.error).toBeNull();
            expect(result.requestId).toBe(requestId);
            expect(result.fileId).toBe(fileId);
            expect(result.file).toBe(mockUploxFile);
        });

        it('should handle valid URL string successfully', async () => {
            const url = 'https://example.com/file.txt';
            const mockFile = createMockFile();
            const mockUploxFile = createMockUploxFile(fileId);

            mockIsUrl.mockReturnValue(true);
            mockFetchFile.mockResolvedValue(mockFile);
            mockHash.mockResolvedValueOnce('mock-blake3-hash');
            mockHash.mockResolvedValueOnce('mock-sha256-hash');
            mockUploxFileFromFileWithHashes.mockReturnValue(mockUploxFile);

            const result = await presignService.createPresign(requestId, fileId, url, config);

            expect(mockIsUrl).toHaveBeenCalledWith(url);
            expect(result.error).toBeNull();
            expect(result.requestId).toBe(requestId);
            expect(result.fileId).toBe(fileId);
            expect(result.file).toBe(mockUploxFile);
        });

        it('should return error for invalid URL string', async () => {
            const invalidUrl = 'invalid-url';

            mockIsUrl.mockReturnValue(false);

            const result = await presignService.createPresign(requestId, fileId, invalidUrl, config);

            expect(mockIsUrl).toHaveBeenCalledWith(invalidUrl);
            expect(result.error).toBeInstanceOf(Error);
            expect(result.error?.message).toBe('Invalid file url');
            expect(result.requestId).toBe(requestId);
            expect(result.fileId).toBe(fileId);
            expect(result.file).toBeNull();
        });

        it('should handle errors during processing', async () => {
            const mockFile = createMockFile();
            const processingError = new Error('Processing failed');

            mockHash.mockRejectedValue(processingError);

            const result = await presignService.createPresign(requestId, fileId, mockFile, config);

            expect(result.error).toBeInstanceOf(Error);
            expect(result.error?.message).toBe('Failed to create presign');
            expect(result.requestId).toBe(requestId);
            expect(result.fileId).toBe(fileId);
            expect(result.file).toBeNull();
            expect(mockLogger.error).toHaveBeenCalledWith(
                '[Presign] Failed to create presign',
                { requestId, fileId, error: processingError }
            );
        });

        it('should handle storage upload errors', async () => {
            const mockFile = createMockFile();
            const uploadError = new Error('Storage upload failed');

            mockHash.mockResolvedValueOnce('mock-blake3-hash');
            mockHash.mockResolvedValueOnce('mock-sha256-hash');
            mockUploxFileFromFileWithHashes.mockReturnValue(createMockUploxFile(fileId));
            mockStorage.uploadFile = vi.fn().mockRejectedValue(uploadError);

            const result = await presignService.createPresign(requestId, fileId, mockFile, config);

            expect(result.error).toBeInstanceOf(Error);
            expect(result.error?.message).toBe('Failed to create presign');
            expect(mockLogger.error).toHaveBeenCalledWith(
                '[Presign] Failed to create presign',
                { requestId, fileId, error: uploadError }
            );
        });

        it('should handle URL fetch errors in string path', async () => {
            const url = 'https://example.com/file.txt';
            const fetchError = new Error('Fetch failed');

            mockIsUrl.mockReturnValue(true);
            mockFetchFile.mockRejectedValue(fetchError);

            const result = await presignService.createPresign(requestId, fileId, url, config);

            expect(result.error).toBeInstanceOf(Error);
            expect(result.error?.message).toBe('Failed to create presign');
            expect(mockLogger.error).toHaveBeenCalledWith(
                '[Presign] Failed to create presign',
                { requestId, fileId, error: fetchError }
            );
        });
    });

    describe('edge cases and configuration', () => {
        it('should use configuration values properly', () => {
            const config: PresignConfig = { timeoutMs: 5000, algorithm: 'all' };
            
            // Test that configuration values are set correctly
            expect(config.timeoutMs).toBe(5000);
            expect(config.algorithm).toBe('all');
        });

        it('should handle empty file name in fetch', async () => {
            const fileId = 'test-file-id';
            const url = 'https://example.com/';
            const config: PresignConfig = { timeoutMs: 5000, algorithm: 'blake3' };
            
            const mockFile = new File(['content'], 'file', { type: 'text/plain' });
            const mockUploxFile = createMockUploxFile(fileId);

            mockFetchFile.mockResolvedValue(mockFile);
            mockHash.mockResolvedValue('mock-blake3-hash');
            mockUploxFileFromFileWithHashes.mockReturnValue(mockUploxFile);

            const result = await presignService.createPresignForString(fileId, url, config);

            expect(result.error).toBeNull();
            expect(result.file).toBe(mockUploxFile);
        });
    });
});
