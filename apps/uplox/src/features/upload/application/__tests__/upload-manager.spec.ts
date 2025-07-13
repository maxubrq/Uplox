import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { UploadManager } from '../upload-manager';
import { UploadFileErrorHashMismatch, UploadFileErrorInfectedFile } from '../errors';
import {
    AppMetrics,
    UploxAppLogger,
    UploxAVScanner,
    UploxAVScanResult,
    UploxFileTypeScanner,
    UploxFileTypeScanResult,
    UploxStorage,
} from '@application';
import { UploxFile } from '@domain';
import { UpbloxReadStream } from '@infrastructure/stream';
import { hashStream } from '@shared';

// Mock all dependencies
vi.mock('@application');
vi.mock('@domain');
vi.mock('@infrastructure/stream');
vi.mock('@shared');

describe('UploadManager', () => {
    let mockLogger: vi.Mocked<UploxAppLogger>;
    let mockFileTypeScanner: vi.Mocked<UploxFileTypeScanner>;
    let mockAVScanner: vi.Mocked<UploxAVScanner>;
    let mockStorage: vi.Mocked<UploxStorage<UploxFile>>;
    let mockMetrics: vi.Mocked<AppMetrics>;
    let uploadManager: UploadManager;

    let mockFile: File;
    let mockUpbloxReadStream: vi.Mocked<UpbloxReadStream>;
    let mockPassThrough: any;

    beforeEach(() => {
        // Reset all mocks
        vi.clearAllMocks();

        // Mock logger
        mockLogger = {
            info: vi.fn(),
            debug: vi.fn(),
            error: vi.fn(),
            warn: vi.fn(),
        } as any;

        // Mock file type scanner
        mockFileTypeScanner = {
            init: vi.fn(),
            scanStream: vi.fn(),
        } as any;

        // Mock AV scanner
        mockAVScanner = {
            init: vi.fn(),
            scanStream: vi.fn(),
        } as any;

        // Mock storage
        mockStorage = {
            saveFile: vi.fn(),
            getBucket: vi.fn().mockReturnValue('test-bucket'),
        } as any;

        // Mock metrics
        mockMetrics = {
            avScanDurationMillis: vi.fn(),
            avDetectionTotal: vi.fn(),
            avScanFailureTotal: vi.fn(),
            storagePutLatencyMillis: vi.fn(),
            uploadErrorsTotal: vi.fn(),
            sha256MismatchTotal: vi.fn(),
            uploadTotal: vi.fn(),
            uploadsByMime: vi.fn(),
        } as any;

        // Mock File
        mockFile = {
            name: 'test-file.txt',
            size: 1024,
            type: 'text/plain',
            stream: vi.fn(),
        } as any;

        // Mock pass through stream
        mockPassThrough = {
            pipe: vi.fn(),
        };

        // Mock UpbloxReadStream
        mockUpbloxReadStream = {
            passThrough: vi.fn().mockReturnValue(mockPassThrough),
        } as any;

        // Mock static methods
        vi.mocked(UpbloxReadStream.fromWeb).mockReturnValue(mockUpbloxReadStream);
        vi.mocked(hashStream).mockResolvedValue('test-hash-256');
        vi.mocked(UploxFile.fromJSON).mockReturnValue({
            id: 'test-hash-256',
            name: 'test-file.txt',
            size: 1024,
            toJSON: vi.fn().mockReturnValue({
                id: 'test-hash-256',
                name: 'test-file.txt',
                size: 1024,
                mimeType: 'text/plain',
                extension: 'txt',
                hashes: { sha256: 'test-hash-256' },
            }),
        } as any);

        uploadManager = new UploadManager(
            mockLogger,
            mockFileTypeScanner,
            mockAVScanner,
            mockStorage,
            mockMetrics
        );
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    describe('constructor', () => {
        it('should create an instance with all dependencies', () => {
            expect(uploadManager).toBeInstanceOf(UploadManager);
            expect(uploadManager['_logger']).toBe(mockLogger);
            expect(uploadManager['_fileTypeScanner']).toBe(mockFileTypeScanner);
            expect(uploadManager['_avScanner']).toBe(mockAVScanner);
            expect(uploadManager['_storage']).toBe(mockStorage);
            expect(uploadManager['_metrics']).toBe(mockMetrics);
        });

        it('should initialize scanners as not initialized', () => {
            expect(uploadManager['_scannersInitialized']).toBe(false);
        });
    });

    describe('init', () => {
        it('should initialize scanners successfully', async () => {
            mockFileTypeScanner.init.mockResolvedValue();
            mockAVScanner.init.mockResolvedValue();

            await uploadManager.init();

            expect(mockFileTypeScanner.init).toHaveBeenCalledOnce();
            expect(mockAVScanner.init).toHaveBeenCalledOnce();
        });

        it('should handle initialization errors gracefully', async () => {
            const error = new Error('Scanner initialization failed');
            mockFileTypeScanner.init.mockRejectedValue(error);
            mockAVScanner.init.mockResolvedValue();

            await uploadManager.init();

            expect(mockLogger.error).toHaveBeenCalledWith(
                '[UploadManager] Error when initialize scanners',
                { error }
            );
        });

        it('should not initialize scanners if already initialized', async () => {
            // First initialization
            mockFileTypeScanner.init.mockResolvedValue();
            mockAVScanner.init.mockResolvedValue();
            
            await uploadManager.init();
            uploadManager['_scannersInitialized'] = true;

            // Second initialization should not call init again
            mockFileTypeScanner.init.mockClear();
            mockAVScanner.init.mockClear();
            
            await uploadManager.init();

            expect(mockFileTypeScanner.init).not.toHaveBeenCalled();
            expect(mockAVScanner.init).not.toHaveBeenCalled();
        });
    });

    describe('uploadFile', () => {
        beforeEach(() => {
            // Setup default successful responses
            mockFileTypeScanner.init.mockResolvedValue();
            mockAVScanner.init.mockResolvedValue();
            mockFile.stream.mockReturnValue({} as any);
            
            mockFileTypeScanner.scanStream.mockResolvedValue({
                mimeType: 'text/plain',
                extension: 'txt',
            } as UploxFileTypeScanResult);

            mockAVScanner.scanStream.mockResolvedValue({
                isInfected: false,
                viruses: [],
            } as UploxAVScanResult);

            mockStorage.saveFile.mockResolvedValue();
        });

        it('should upload file successfully', async () => {
            const sha256 = 'test-hash-256';
            const result = await uploadManager.uploadFile(mockFile, sha256);

            expect(result).toEqual({
                fileId: 'test-hash-256',
                file: {
                    id: 'test-hash-256',
                    name: 'test-file.txt',
                    size: 1024,
                    mimeType: 'text/plain',
                    extension: 'txt',
                    hashes: { sha256: 'test-hash-256' },
                },
                avScan: {
                    isInfected: false,
                    viruses: [],
                },
            });

            expect(mockLogger.info).toHaveBeenCalledWith(
                '[UploadManager] Uploading file',
                { file: 'test-file.txt' }
            );
            expect(mockStorage.saveFile).toHaveBeenCalled();
            expect(mockMetrics.uploadTotal).toHaveBeenCalledWith('text/plain');
            expect(mockMetrics.uploadsByMime).toHaveBeenCalledWith('text/plain');
        });

        it('should throw error when hash mismatch', async () => {
            const sha256 = 'different-hash';
            vi.mocked(hashStream).mockResolvedValue('test-hash-256');

            await expect(uploadManager.uploadFile(mockFile, sha256)).rejects.toThrow(
                UploadFileErrorHashMismatch
            );

            expect(mockMetrics.sha256MismatchTotal).toHaveBeenCalledWith('POST');
            expect(mockLogger.info).toHaveBeenCalledWith(
                '[UploadManager] File hash mismatch',
                expect.objectContaining({ error: expect.any(UploadFileErrorHashMismatch) })
            );
        });

        it('should throw error when file is infected', async () => {
            const sha256 = 'test-hash-256';
            const infectedResult = {
                isInfected: true,
                viruses: ['Test.Virus'],
            } as UploxAVScanResult;

            mockAVScanner.scanStream.mockResolvedValue(infectedResult);

            await expect(uploadManager.uploadFile(mockFile, sha256)).rejects.toThrow(
                UploadFileErrorInfectedFile
            );

            expect(mockLogger.info).toHaveBeenCalledWith(
                '[UploadManager] File is infected',
                expect.objectContaining({ error: expect.any(UploadFileErrorInfectedFile) })
            );
        });

        it('should handle general errors', async () => {
            const sha256 = 'test-hash-256';
            const error = new Error('General error');
            mockStorage.saveFile.mockRejectedValue(error);

            await expect(uploadManager.uploadFile(mockFile, sha256)).rejects.toThrow(error);

            expect(mockLogger.error).toHaveBeenCalledWith(
                '[UploadManager] Failed to upload file',
                { error }
            );
        });

        it('should call init before processing', async () => {
            const sha256 = 'test-hash-256';
            await uploadManager.uploadFile(mockFile, sha256);

            expect(mockFileTypeScanner.init).toHaveBeenCalled();
            expect(mockAVScanner.init).toHaveBeenCalled();
        });

        it('should create correct stream pipeline', async () => {
            const sha256 = 'test-hash-256';
            const mockStream = {};
            mockFile.stream.mockReturnValue(mockStream);

            await uploadManager.uploadFile(mockFile, sha256);

            expect(UpbloxReadStream.fromWeb).toHaveBeenCalledWith(mockStream);
            expect(mockUpbloxReadStream.passThrough).toHaveBeenCalledTimes(3);
        });

        it('should call all scanners in parallel', async () => {
            const sha256 = 'test-hash-256';
            
            // Mock implementations that track call order
            let callOrder: string[] = [];
            vi.mocked(hashStream).mockImplementation(async () => {
                callOrder.push('hash');
                return 'test-hash-256';
            });
            mockFileTypeScanner.scanStream.mockImplementation(async () => {
                callOrder.push('fileType');
                return { mimeType: 'text/plain', extension: 'txt' } as UploxFileTypeScanResult;
            });
            mockAVScanner.scanStream.mockImplementation(async () => {
                callOrder.push('avScan');
                return { isInfected: false, viruses: [] } as UploxAVScanResult;
            });

            await uploadManager.uploadFile(mockFile, sha256);

            expect(callOrder).toEqual(['hash', 'fileType', 'avScan']);
        });

        it('should log debug messages for each step', async () => {
            const sha256 = 'test-hash-256';
            await uploadManager.uploadFile(mockFile, sha256);

            expect(mockLogger.debug).toHaveBeenCalledWith('[UploadManager] Start hashFile');
            expect(mockLogger.debug).toHaveBeenCalledWith('[UploadManager] End hashFile');
            expect(mockLogger.debug).toHaveBeenCalledWith('[UploadManager] Start fileTypeScanner');
            expect(mockLogger.debug).toHaveBeenCalledWith('[UploadManager] End fileTypeScanner');
            expect(mockLogger.debug).toHaveBeenCalledWith('[UploadManager] Start avScan');
            expect(mockLogger.debug).toHaveBeenCalledWith('[UploadManager] End avScan');
        });
    });

    describe('metricsWrap for avScan', () => {
        beforeEach(() => {
            mockFileTypeScanner.init.mockResolvedValue();
            mockAVScanner.init.mockResolvedValue();
            mockFile.stream.mockReturnValue({} as any);
            mockFileTypeScanner.scanStream.mockResolvedValue({
                mimeType: 'text/plain',
                extension: 'txt',
            } as UploxFileTypeScanResult);
            mockStorage.saveFile.mockResolvedValue();
        });

        it('should record metrics for clean file scan', async () => {
            const sha256 = 'test-hash-256';
            const cleanResult = {
                isInfected: false,
                viruses: [],
            } as UploxAVScanResult;

            mockAVScanner.scanStream.mockResolvedValue(cleanResult);

            await uploadManager.uploadFile(mockFile, sha256);

            expect(mockMetrics.avScanDurationMillis).toHaveBeenCalledWith(
                'ClamAV',
                expect.any(Number),
                'clean'
            );
        });

        it('should record metrics for infected file scan', async () => {
            const sha256 = 'test-hash-256';
            const infectedResult = {
                isInfected: true,
                viruses: ['Test.Virus.A', 'Test.Virus.B'],
            } as UploxAVScanResult;

            mockAVScanner.scanStream.mockResolvedValue(infectedResult);

            await expect(uploadManager.uploadFile(mockFile, sha256)).rejects.toThrow();

            expect(mockMetrics.avScanDurationMillis).toHaveBeenCalledWith(
                'ClamAV',
                expect.any(Number),
                'infected'
            );
            expect(mockMetrics.avDetectionTotal).toHaveBeenCalledWith(
                'ClamAV',
                'Test.Virus.A,Test.Virus.B'
            );
        });

        it('should record metrics for AV scan failure', async () => {
            const sha256 = 'test-hash-256';
            const error = new Error('AV scan failed');
            mockAVScanner.scanStream.mockRejectedValue(error);

            await expect(uploadManager.uploadFile(mockFile, sha256)).rejects.toThrow();

            expect(mockMetrics.avScanFailureTotal).toHaveBeenCalledWith(
                'ClamAV',
                'AV scan failed'
            );
        });

        it('should record metrics for AV scan failure with unknown error', async () => {
            const sha256 = 'test-hash-256';
            const error = new Error();
            error.message = '';
            mockAVScanner.scanStream.mockRejectedValue(error);

            await expect(uploadManager.uploadFile(mockFile, sha256)).rejects.toThrow();

            expect(mockMetrics.avScanFailureTotal).toHaveBeenCalledWith(
                'ClamAV',
                'unknown'
            );
        });
    });

    describe('metricsWrap for storagePut', () => {
        beforeEach(() => {
            mockFileTypeScanner.init.mockResolvedValue();
            mockAVScanner.init.mockResolvedValue();
            mockFile.stream.mockReturnValue({} as any);
            mockFileTypeScanner.scanStream.mockResolvedValue({
                mimeType: 'text/plain',
                extension: 'txt',
            } as UploxFileTypeScanResult);
            mockAVScanner.scanStream.mockResolvedValue({
                isInfected: false,
                viruses: [],
            } as UploxAVScanResult);
        });

        it('should record metrics for successful storage put', async () => {
            const sha256 = 'test-hash-256';
            mockStorage.saveFile.mockResolvedValue();

            await uploadManager.uploadFile(mockFile, sha256);

            expect(mockMetrics.storagePutLatencyMillis).toHaveBeenCalledWith(
                expect.any(Number),
                'test-bucket',
                'success'
            );
        });

        it('should record metrics for storage put failure', async () => {
            const sha256 = 'test-hash-256';
            const error = new Error('Storage put failed');
            mockStorage.saveFile.mockRejectedValue(error);

            await expect(uploadManager.uploadFile(mockFile, sha256)).rejects.toThrow();

            expect(mockMetrics.uploadErrorsTotal).toHaveBeenCalledWith(
                'StoragePut',
                'PUT'
            );
        });
    });

    describe('UploxFile creation', () => {
        beforeEach(() => {
            mockFileTypeScanner.init.mockResolvedValue();
            mockAVScanner.init.mockResolvedValue();
            mockFile.stream.mockReturnValue({} as any);
            mockAVScanner.scanStream.mockResolvedValue({
                isInfected: false,
                viruses: [],
            } as UploxAVScanResult);
            mockStorage.saveFile.mockResolvedValue();
        });

        it('should create UploxFile with correct parameters', async () => {
            const sha256 = 'test-hash-256';
            mockFileTypeScanner.scanStream.mockResolvedValue({
                mimeType: 'application/pdf',
                extension: 'pdf',
            } as UploxFileTypeScanResult);

            await uploadManager.uploadFile(mockFile, sha256);

            expect(UploxFile.fromJSON).toHaveBeenCalledWith({
                id: 'test-hash-256',
                name: 'test-file.txt',
                size: 1024,
                mimeType: 'application/pdf',
                extension: 'pdf',
                hashes: {
                    sha256: 'test-hash-256',
                },
            });
        });

        it('should save file to storage with correct parameters', async () => {
            const sha256 = 'test-hash-256';
            mockFileTypeScanner.scanStream.mockResolvedValue({
                mimeType: 'text/plain',
                extension: 'txt',
            } as UploxFileTypeScanResult);

            await uploadManager.uploadFile(mockFile, sha256);

            expect(mockStorage.saveFile).toHaveBeenCalledWith(
                mockFile,
                expect.objectContaining({
                    id: 'test-hash-256',
                    name: 'test-file.txt',
                    size: 1024,
                }),
                'test-hash-256'
            );
        });
    });

    describe('edge cases', () => {
        beforeEach(() => {
            mockFileTypeScanner.init.mockResolvedValue();
            mockAVScanner.init.mockResolvedValue();
            mockFile.stream.mockReturnValue({} as any);
            mockAVScanner.scanStream.mockResolvedValue({
                isInfected: false,
                viruses: [],
            } as UploxAVScanResult);
            mockStorage.saveFile.mockResolvedValue();
        });

        it('should handle empty virus array', async () => {
            const sha256 = 'test-hash-256';
            mockFileTypeScanner.scanStream.mockResolvedValue({
                mimeType: 'text/plain',
                extension: 'txt',
            } as UploxFileTypeScanResult);

            const infectedResult = {
                isInfected: true,
                viruses: [],
            } as UploxAVScanResult;

            mockAVScanner.scanStream.mockResolvedValue(infectedResult);

            await expect(uploadManager.uploadFile(mockFile, sha256)).rejects.toThrow();

            expect(mockMetrics.avDetectionTotal).toHaveBeenCalledWith('ClamAV', '');
        });

        it('should handle undefined file type results', async () => {
            const sha256 = 'test-hash-256';
            mockFileTypeScanner.scanStream.mockResolvedValue({
                mimeType: undefined,
                extension: undefined,
            } as any);

            await uploadManager.uploadFile(mockFile, sha256);

            expect(UploxFile.fromJSON).toHaveBeenCalledWith(
                expect.objectContaining({
                    mimeType: undefined,
                    extension: undefined,
                })
            );
        });

        it('should handle getBucket returning different bucket names', async () => {
            const sha256 = 'test-hash-256';
            mockStorage.getBucket.mockReturnValue('different-bucket');
            mockFileTypeScanner.scanStream.mockResolvedValue({
                mimeType: 'text/plain',
                extension: 'txt',
            } as UploxFileTypeScanResult);

            await uploadManager.uploadFile(mockFile, sha256);

            expect(mockMetrics.storagePutLatencyMillis).toHaveBeenCalledWith(
                expect.any(Number),
                'different-bucket',
                'success'
            );
        });
    });
});
