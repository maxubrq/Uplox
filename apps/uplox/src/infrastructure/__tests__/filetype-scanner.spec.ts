import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Readable } from 'stream';
import { FileTypeScanner } from '../filetype-scanner';
import { UploxAppLogger } from '@application/app-logger';
import { ReadableStream as NodeReadableStream } from 'stream/web';

// Mock the file-type module
vi.mock('file-type', () => ({
    fileTypeFromStream: vi.fn(),
}));

// Mock UploxAppLogger
const mockLogger = {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
} as unknown as UploxAppLogger;

describe('FileTypeScanner', () => {
    let fileTypeScanner: FileTypeScanner;
    let mockFileTypeFromStream: ReturnType<typeof vi.fn>;

    beforeEach(async () => {
        // Reset the singleton instance before each test
        (FileTypeScanner as any)._instance = null;
        
        // Get mock reference
        const fileTypeModule = await import('file-type');
        mockFileTypeFromStream = vi.mocked(fileTypeModule).fileTypeFromStream;
        
        // Clear all mocks
        vi.clearAllMocks();
        
        // Create instance
        fileTypeScanner = FileTypeScanner.getInstance(mockLogger);
    });

    afterEach(() => {
        vi.clearAllMocks();
        (FileTypeScanner as any)._instance = null;
    });

    describe('getInstance', () => {
        it('should return the same instance when called multiple times', () => {
            const instance1 = FileTypeScanner.getInstance(mockLogger);
            const instance2 = FileTypeScanner.getInstance(mockLogger);
            
            expect(instance1).toBe(instance2);
        });

        it('should create a new instance if none exists', () => {
            const instance = FileTypeScanner.getInstance(mockLogger);
            
            expect(instance).toBeInstanceOf(FileTypeScanner);
        });
    });

    describe('scanFile', () => {
        it('should successfully scan a file and return result', async () => {
            // Mock file with stream method
            const mockFile = {
                stream: vi.fn().mockReturnValue(new NodeReadableStream()),
            } as unknown as File;

            const mockResult = {
                mime: 'image/jpeg',
                ext: 'jpg',
            };

            mockFileTypeFromStream.mockResolvedValue(mockResult);

            const result = await fileTypeScanner.scanFile(mockFile);

            expect(mockFileTypeFromStream).toHaveBeenCalledWith(mockFile.stream());
            expect(result).toEqual({
                mimeType: 'image/jpeg',
                extension: 'jpg',
                version: '1.0.0',
            });
        });

        it('should handle file with no extension', async () => {
            const mockFile = {
                stream: vi.fn().mockReturnValue(new NodeReadableStream()),
            } as unknown as File;

            const mockResult = {
                mime: 'application/octet-stream',
                ext: undefined,
            };

            mockFileTypeFromStream.mockResolvedValue(mockResult);

            const result = await fileTypeScanner.scanFile(mockFile);

            expect(result).toEqual({
                mimeType: 'application/octet-stream',
                extension: '',
                version: '1.0.0',
            });
        });

        it('should throw error when file type detection fails', async () => {
            const mockFile = {
                stream: vi.fn().mockReturnValue(new NodeReadableStream()),
            } as unknown as File;

            mockFileTypeFromStream.mockResolvedValue(null);

            await expect(fileTypeScanner.scanFile(mockFile)).rejects.toThrow(
                '[FileTypeScanner] Failed to detect file type'
            );
        });
    });

    describe('scanStream', () => {
        it('should successfully scan a stream and return result', async () => {
            const mockStream = new Readable({
                read() {
                    this.push('test data');
                    this.push(null);
                },
            });

            const mockResult = {
                mime: 'text/plain',
                ext: 'txt',
            };

            // Mock Readable.toWeb
            const mockWebStream = new NodeReadableStream();
            vi.spyOn(Readable, 'toWeb').mockReturnValue(mockWebStream);
            mockFileTypeFromStream.mockResolvedValue(mockResult);

            const result = await fileTypeScanner.scanStream(mockStream);

            expect(Readable.toWeb).toHaveBeenCalledWith(mockStream);
            expect(mockFileTypeFromStream).toHaveBeenCalledWith(mockWebStream);
            expect(result).toEqual({
                mimeType: 'text/plain',
                extension: 'txt',
                version: '1.0.0',
            });
        });

        it('should handle stream with no extension', async () => {
            const mockStream = new Readable({
                read() {
                    this.push('test data');
                    this.push(null);
                },
            });

            const mockResult = {
                mime: 'application/octet-stream',
                ext: null,
            };

            const mockWebStream = new NodeReadableStream();
            vi.spyOn(Readable, 'toWeb').mockReturnValue(mockWebStream);
            mockFileTypeFromStream.mockResolvedValue(mockResult);

            const result = await fileTypeScanner.scanStream(mockStream);

            expect(result).toEqual({
                mimeType: 'application/octet-stream',
                extension: '',
                version: '1.0.0',
            });
        });

        it('should throw error when stream type detection fails', async () => {
            const mockStream = new Readable({
                read() {
                    this.push('test data');
                    this.push(null);
                },
            });

            const mockWebStream = new NodeReadableStream();
            vi.spyOn(Readable, 'toWeb').mockReturnValue(mockWebStream);
            mockFileTypeFromStream.mockResolvedValue(null);

            await expect(fileTypeScanner.scanStream(mockStream)).rejects.toThrow(
                '[FileTypeScanner] Failed to detect file type'
            );
        });
    });

    describe('init', () => {
        it('should log initialization message', async () => {
            await fileTypeScanner.init();

            expect(mockLogger.info).toHaveBeenCalledWith(
                '[FileTypeScanner] Initializing file type scanner'
            );
        });
    });

    describe('version', () => {
        it('should return version string', async () => {
            const version = await fileTypeScanner.version();

            expect(version).toBe('1.0.0');
        });
    });

    describe('error handling', () => {
        it('should handle fileTypeFromStream throwing an error in scanFile', async () => {
            const mockFile = {
                stream: vi.fn().mockReturnValue(new NodeReadableStream()),
            } as unknown as File;

            mockFileTypeFromStream.mockRejectedValue(new Error('Network error'));

            await expect(fileTypeScanner.scanFile(mockFile)).rejects.toThrow('Network error');
        });

        it('should handle fileTypeFromStream throwing an error in scanStream', async () => {
            const mockStream = new Readable({
                read() {
                    this.push('test data');
                    this.push(null);
                },
            });

            const mockWebStream = new NodeReadableStream();
            vi.spyOn(Readable, 'toWeb').mockReturnValue(mockWebStream);
            mockFileTypeFromStream.mockRejectedValue(new Error('Stream error'));

            await expect(fileTypeScanner.scanStream(mockStream)).rejects.toThrow('Stream error');
        });
    });
});
