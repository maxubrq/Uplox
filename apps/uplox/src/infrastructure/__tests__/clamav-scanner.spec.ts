import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ClamAVScanner } from '../clamav-scanner';
import { UploxAppLogger } from '@application';
import NodeClam from 'clamscan';
import { Readable } from 'stream';

// Mock NodeClam
vi.mock('clamscan');

// Mock logger
const mockLogger = {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
} as UploxAppLogger;

describe('ClamAVScanner', () => {
    let scanner: ClamAVScanner;
    let mockClamav: any;
    let mockNodeClamInstance: any;

    beforeEach(() => {
        // Reset all mocks
        vi.clearAllMocks();

        // Reset singleton instance and static properties
        (ClamAVScanner as any)._instance = null;
        (ClamAVScanner as any)._version = undefined;

        // Mock NodeClam instance
        mockClamav = {
            scanStream: vi.fn(),
            getVersion: vi.fn(),
        };

        mockNodeClamInstance = {
            init: vi.fn().mockResolvedValue(mockClamav),
        };

        // Mock NodeClam constructor
        vi.mocked(NodeClam).mockImplementation(() => mockNodeClamInstance);

        scanner = ClamAVScanner.getInstance(mockLogger);
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    describe('getInstance', () => {
        it('should return singleton instance', () => {
            const instance1 = ClamAVScanner.getInstance(mockLogger);
            const instance2 = ClamAVScanner.getInstance(mockLogger);

            expect(instance1).toBe(instance2);
            expect(instance1).toBeInstanceOf(ClamAVScanner);
        });

        it('should create new instance only once', () => {
            ClamAVScanner.getInstance(mockLogger);
            ClamAVScanner.getInstance(mockLogger);

            expect(NodeClam).toHaveBeenCalledTimes(0); // Constructor not called until init
        });
    });

    describe('init', () => {
        it('should initialize ClamAV successfully', async () => {
            await scanner.init();

            expect(NodeClam).toHaveBeenCalledOnce();
            expect(mockNodeClamInstance.init).toHaveBeenCalledWith({
                clamdscan: {
                    host: 'scanner',
                    port: 3310,
                    timeout: 300000, // MIN_MS * 5
                    tls: false,
                    localFallback: false,
                },
            });
            expect(mockLogger.info).toHaveBeenCalledWith('[ClamAVScanner] Initializing ClamAV', {
                host: 'scanner',
                port: 3310,
                timeout: 300000,
                tls: false,
                localFallback: false,
            });
            expect(mockLogger.info).toHaveBeenCalledWith('[ClamAVScanner] ClamAV initialized');
        });

        it('should not reinitialize if already initialized', async () => {
            await scanner.init();
            vi.clearAllMocks();

            await scanner.init();

            expect(NodeClam).not.toHaveBeenCalled();
            expect(mockNodeClamInstance.init).not.toHaveBeenCalled();
            expect(mockLogger.info).toHaveBeenCalledWith('[ClamAVScanner] ClamAV already initialized');
        });

        it('should handle initialization errors', async () => {
            const error = new Error('Init failed');
            mockNodeClamInstance.init.mockRejectedValue(error);

            await expect(scanner.init()).rejects.toThrow('Init failed');
        });
    });

    describe('scanFile', () => {
        beforeEach(async () => {
            await scanner.init();
        });

        it('should scan file successfully when not infected', async () => {
            const mockFile = {
                stream: vi.fn().mockReturnValue(
                    new ReadableStream({
                        start(controller) {
                            controller.enqueue(new Uint8Array([1, 2, 3]));
                            controller.close();
                        },
                    }),
                ),
            } as unknown as File;

            const mockResult = {
                isInfected: false,
                viruses: [],
                file: 'test.txt',
                resultString: 'OK',
                timeout: false,
            };
            mockClamav.scanStream.mockResolvedValue(mockResult);
            mockClamav.getVersion.mockResolvedValue('ClamAV 1.0.0');

            const result = await scanner.scanFile(mockFile);

            expect(result).toEqual({
                isInfected: false,
                viruses: [],
                file: 'test.txt',
                resultString: 'OK',
                timeout: false,
                version: 'ClamAV 1.0.0',
            });
            expect(mockClamav.scanStream).toHaveBeenCalledWith(expect.any(Readable));
        });

        it('should scan file successfully when infected', async () => {
            const mockFile = {
                stream: vi.fn().mockReturnValue(
                    new ReadableStream({
                        start(controller) {
                            controller.enqueue(new Uint8Array([1, 2, 3]));
                            controller.close();
                        },
                    }),
                ),
            } as unknown as File;

            const mockResult = {
                isInfected: true,
                viruses: ['EICAR-Test-File'],
                file: 'infected.txt',
                resultString: 'FOUND',
                timeout: false,
            };
            mockClamav.scanStream.mockResolvedValue(mockResult);
            mockClamav.getVersion.mockResolvedValue('ClamAV 1.0.0');

            const result = await scanner.scanFile(mockFile);

            expect(result).toEqual({
                isInfected: true,
                viruses: ['EICAR-Test-File'],
                file: 'infected.txt',
                resultString: 'FOUND',
                timeout: false,
                version: 'ClamAV 1.0.0',
            });
        });

        it('should handle missing optional fields in scan result', async () => {
            const mockFile = {
                stream: vi.fn().mockReturnValue(
                    new ReadableStream({
                        start(controller) {
                            controller.enqueue(new Uint8Array([1, 2, 3]));
                            controller.close();
                        },
                    }),
                ),
            } as unknown as File;

            const mockResult = {
                isInfected: false,
                viruses: [],
                file: 'test.txt',
            };
            mockClamav.scanStream.mockResolvedValue(mockResult);
            mockClamav.getVersion.mockResolvedValue('ClamAV 1.0.0');

            const result = await scanner.scanFile(mockFile);

            expect(result).toEqual({
                isInfected: false,
                viruses: [],
                file: 'test.txt',
                resultString: '',
                timeout: false,
                version: 'ClamAV 1.0.0',
            });
        });

        it('should throw error when ClamAV not initialized', async () => {
            const mockFile = {
                stream: vi.fn().mockReturnValue(
                    new ReadableStream({
                        start(controller) {
                            controller.enqueue(new Uint8Array([1, 2, 3]));
                            controller.close();
                        },
                    }),
                ),
            } as unknown as File;

            // Reset singleton and create new instance without initializing
            (ClamAVScanner as any)._instance = null;
            const uninitializedScanner = ClamAVScanner.getInstance(mockLogger);

            await expect(uninitializedScanner.scanFile(mockFile)).rejects.toThrow('ClamAV not initialized');
        });

        it('should handle scan errors', async () => {
            const mockFile = {
                stream: vi.fn().mockReturnValue(
                    new ReadableStream({
                        start(controller) {
                            controller.enqueue(new Uint8Array([1, 2, 3]));
                            controller.close();
                        },
                    }),
                ),
            } as unknown as File;

            const error = new Error('Scan failed');
            mockClamav.scanStream.mockRejectedValue(error);

            await expect(scanner.scanFile(mockFile)).rejects.toThrow('Scan failed');
        });
    });

    describe('scanStream', () => {
        const mockStream = new Readable();

        beforeEach(async () => {
            await scanner.init();
        });

        it('should scan stream successfully', async () => {
            const mockResult = {
                isInfected: false,
                viruses: [],
                file: 'stream',
                resultString: 'OK',
                timeout: false,
            };
            mockClamav.scanStream.mockResolvedValue(mockResult);
            mockClamav.getVersion.mockResolvedValue('ClamAV 1.0.0');

            const result = await scanner.scanStream(mockStream);

            expect(result).toEqual({
                isInfected: false,
                viruses: [],
                file: 'stream',
                resultString: 'OK',
                timeout: false,
                version: 'ClamAV 1.0.0',
            });
            expect(mockClamav.scanStream).toHaveBeenCalledWith(mockStream);
        });

        it('should throw error when ClamAV not initialized', async () => {
            // Reset singleton and create new instance without initializing
            (ClamAVScanner as any)._instance = null;
            const uninitializedScanner = ClamAVScanner.getInstance(mockLogger);

            await expect(uninitializedScanner.scanStream(mockStream)).rejects.toThrow('ClamAV not initialized');
        });

        it('should handle stream scan errors', async () => {
            const error = new Error('Stream scan failed');
            mockClamav.scanStream.mockRejectedValue(error);

            await expect(scanner.scanStream(mockStream)).rejects.toThrow('Stream scan failed');
        });
    });

    describe('version', () => {
        beforeEach(async () => {
            await scanner.init();
        });

        it('should get version successfully', async () => {
            mockClamav.getVersion.mockResolvedValue('ClamAV 1.0.0');

            const version = await scanner.version();

            expect(version).toBe('ClamAV 1.0.0');
            expect(mockClamav.getVersion).toHaveBeenCalledOnce();
        });

        it('should cache version after first call', async () => {
            mockClamav.getVersion.mockResolvedValue('ClamAV 1.0.0');

            const version1 = await scanner.version();
            const version2 = await scanner.version();

            expect(version1).toBe('ClamAV 1.0.0');
            expect(version2).toBe('ClamAV 1.0.0');
            expect(mockClamav.getVersion).toHaveBeenCalledOnce();
        });

        it('should throw error when ClamAV not initialized', async () => {
            // Reset singleton and create new instance without initializing
            (ClamAVScanner as any)._instance = null;
            const uninitializedScanner = ClamAVScanner.getInstance(mockLogger);

            await expect(uninitializedScanner.version()).rejects.toThrow('ClamAV not initialized');
        });

        it('should handle version retrieval errors', async () => {
            const error = new Error('Version failed');
            mockClamav.getVersion.mockRejectedValue(error);

            await expect(scanner.version()).rejects.toThrow('Version failed');
        });
    });

    describe('edge cases', () => {
        it('should handle null _clamav after init failure', async () => {
            mockNodeClamInstance.init.mockResolvedValue(null);

            await scanner.init();

            const mockFile = {
                stream: vi.fn().mockReturnValue(
                    new ReadableStream({
                        start(controller) {
                            controller.enqueue(new Uint8Array([1, 2, 3]));
                            controller.close();
                        },
                    }),
                ),
            } as unknown as File;

            await expect(scanner.scanFile(mockFile)).rejects.toThrow('ClamAV not initialized');
        });

        it('should handle initialization state reset', async () => {
            await scanner.init();

            // Manually reset the initialized state to test error handling
            (scanner as any)._initialized = false;

            const mockFile = {
                stream: vi.fn().mockReturnValue(
                    new ReadableStream({
                        start(controller) {
                            controller.enqueue(new Uint8Array([1, 2, 3]));
                            controller.close();
                        },
                    }),
                ),
            } as unknown as File;

            await expect(scanner.scanFile(mockFile)).rejects.toThrow('ClamAV not initialized');
        });
    });
});
