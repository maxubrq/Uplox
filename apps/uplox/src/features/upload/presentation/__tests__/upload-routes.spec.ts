import { describe, it, expect, vi, beforeEach } from 'vitest';
import { UploadRoutes } from '../upload-routes';

// Mock dependencies
const mockLogger = {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
};

const mockUploadManager = {
    uploadFile: vi.fn(),
};

// Mock genId
vi.mock('../../../../shared', () => ({
    genId: vi.fn(() => 'file_123'),
}));

describe('UploadRoutes', () => {
    let uploadRoutes: UploadRoutes;
    let mockContext: any;

    beforeEach(() => {
        // Reset mocks
        vi.clearAllMocks();

        // Create instance
        uploadRoutes = new UploadRoutes(mockLogger as any, mockUploadManager as any);

        // Mock context
        mockContext = {
            get: vi.fn(() => 'request_123'),
            req: {
                formData: vi.fn(),
            },
            json: vi.fn(() => ({ status: 'mocked' })),
        };
    });

    describe('constructor', () => {
        it('should create an instance with correct dependencies', () => {
            expect(uploadRoutes).toBeInstanceOf(UploadRoutes);
        });
    });

    describe('getRoutes', () => {
        it('should return correct routes configuration', () => {
            const routes = uploadRoutes.getRoutes();

            expect(routes).toHaveLength(1);
            expect(routes[0]).toEqual({
                method: 'POST',
                path: '/files/upload',
                handler: expect.any(Function),
            });
        });
    });

    describe('attachRoutes', () => {
        it('should attach routes to the app and log each attachment', () => {
            const mockApp = {
                attachRoute: vi.fn(),
            };

            uploadRoutes.attachRoutes(mockApp as any);

            expect(mockApp.attachRoute).toHaveBeenCalledTimes(1);
            expect(mockApp.attachRoute).toHaveBeenCalledWith({
                method: 'POST',
                path: '/files/upload',
                handler: expect.any(Function),
            });

            expect(mockLogger.info).toHaveBeenCalledWith('[UploadRoutes] Attached route POST /files/upload');
        });
    });

    describe('_handleUploadFile', () => {
        it('should handle successful file upload', async () => {
            // Arrange
            const mockFile = { name: 'test.txt', type: 'text/plain' };
            const mockFormData = {
                get: vi.fn((key: string) => {
                    if (key === 'file') return mockFile;
                    if (key === 'sha256') return 'mock_sha256_hash';
                    return null;
                }),
            };

            const mockUploadResult = {
                file: {
                    hashes: { sha256: 'mock_sha256_hash', md5: 'mock_md5_hash' },
                    mimeType: 'text/plain',
                },
                avScan: { status: 'clean' },
            };

            mockContext.req.formData.mockResolvedValue(mockFormData);
            mockUploadManager.uploadFile.mockResolvedValue(mockUploadResult);

            // Act
            await uploadRoutes['_handleUploadFile'](mockContext);

            // Assert
            expect(mockUploadManager.uploadFile).toHaveBeenCalledWith(mockFile, 'mock_sha256_hash');
            expect(mockLogger.info).toHaveBeenCalledWith(
                '[UploadRoutes] File uploaded',
                expect.objectContaining({
                    requestId: 'request_123',
                    fileId: 'file_123',
                    hashes: mockUploadResult.file.hashes,
                    mimeType: 'text/plain',
                    avScan: mockUploadResult.avScan,
                }),
            );
        });

        it('should return 500 when formData throws an error', async () => {
            // Arrange
            mockContext.req.formData.mockRejectedValue(new Error('FormData error'));

            // Act
            await uploadRoutes['_handleUploadFile'](mockContext);

            // Assert
            expect(mockContext.json).toHaveBeenCalledWith(
                { message: 'Failed to upload file', code: 'UPLOAD_FILE_ERROR_UNKNOWN' },
                500,
            );
        });

        it('should return 400 when no sha256 is provided', async () => {
            // Arrange
            const mockFormData = {
                get: vi.fn((key: string) => {
                    if (key === 'file') return { name: 'test.txt' };
                    if (key === 'sha256') return null;
                    return null;
                }),
            };

            mockContext.req.formData.mockResolvedValue(mockFormData);

            // Act
            await uploadRoutes['_handleUploadFile'](mockContext);

            // Assert
            expect(mockContext.json).toHaveBeenCalledWith({ message: 'No file provided or no sha256 hash' }, 400);
        });

        it('should return 400 when no file is provided', async () => {
            // Arrange
            const mockFormData = {
                get: vi.fn((key: string) => {
                    if (key === 'file') return null;
                    if (key === 'sha256') return 'mock_hash';
                    return null;
                }),
            };

            mockContext.req.formData.mockResolvedValue(mockFormData);

            // Act
            await uploadRoutes['_handleUploadFile'](mockContext);

            // Assert
            expect(mockContext.json).toHaveBeenCalledWith({ message: 'No file provided' }, 400);
        });

        it('should handle upload errors and return 500', async () => {
            // Arrange
            const mockFile = { name: 'test.txt', type: 'text/plain' };
            const mockFormData = {
                get: vi.fn((key: string) => {
                    if (key === 'file') return mockFile;
                    if (key === 'sha256') return 'mock_sha256_hash';
                    return null;
                }),
            };

            mockContext.req.formData.mockResolvedValue(mockFormData);
            mockUploadManager.uploadFile.mockRejectedValue(new Error('Upload failed'));

            // Act
            await uploadRoutes['_handleUploadFile'](mockContext);

            // Assert
            expect(mockContext.json).toHaveBeenCalledWith(
                { message: 'Failed to upload file', code: 'UPLOAD_FILE_ERROR_UNKNOWN' },
                500,
            );
        });
    });
});
