import { describe, it, expect, beforeEach, vi, type MockedFunction } from 'vitest';
import { Context, Hono } from 'hono';
import { PresignRoutes } from '../presign-routes';
import { PresignService, PresignConfig } from '../../application/presign-service';
import { UploxLogger } from '@shared/logger';
import { UploxFile } from '@domain/file';
import { ResourceType } from '@domain/resource-type';
import { ApplicationResult } from '@application/ports';
import { ScannerResult } from '../../application/scanner';

// Mock all dependencies
vi.mock('@shared/utils', () => ({
    generateId: vi.fn()
}));

vi.mock('@shared/zod', () => ({
    getDefaults: vi.fn()
}));

const { generateId } = await import('@shared/utils');
const { getDefaults } = await import('@shared/zod');

const mockGenerateId = generateId as MockedFunction<typeof generateId>;
const mockGetDefaults = getDefaults as MockedFunction<typeof getDefaults>;

describe('PresignRoutes', () => {
    let presignRoutes: PresignRoutes;
    let mockPresignService: PresignService;
    let mockLogger: UploxLogger;
    let mockContext: Context;
    let mockFile: File;
    let mockUploxFile: UploxFile;
    let mockScanResult: ScannerResult;

    beforeEach(() => {
        // Reset all mocks
        vi.clearAllMocks();

        // Mock PresignService
        mockPresignService = {
            createPresign: vi.fn()
        } as any;

        // Mock UploxLogger
        mockLogger = {
            info: vi.fn(),
            error: vi.fn(),
            debug: vi.fn(),
            warn: vi.fn()
        } as any;

        // Mock File
        mockFile = new File(['test content'], 'test.txt', { type: 'text/plain' });

        // Mock UploxFile
        mockUploxFile = {
            id: 'file-123',
            name: 'test.txt',
            size: 1024,
            type: 'text/plain',
            hashes: { blake3: 'hash123' },
            toJSON: vi.fn(() => ({
                id: 'file-123',
                name: 'test.txt',
                size: 1024,
                type: 'text/plain',
                hashes: { blake3: 'hash123' }
            }))
        } as any;

        // Mock ScannerResult
        mockScanResult = {
            isMalware: false,
            isInfected: false,
            isError: false,
            error: null,
            version: '1.0.0',
            name: 'clamav'
        };

        // Mock Context
        mockContext = {
            get: vi.fn(),
            req: {
                parseBody: vi.fn(),
                param: vi.fn()
            },
            json: vi.fn((data, status = 200) => new Response(JSON.stringify(data), { status }))
        } as any;

        // Mock utility functions
        mockGenerateId.mockImplementation((type: ResourceType) => 
            type === ResourceType.REQUEST ? 'req-123' : 'file-123'
        );

        mockGetDefaults.mockReturnValue({
            timeoutMs: 10000,
            algorithm: 'all',
            skipScan: false
        } as PresignConfig);

        presignRoutes = new PresignRoutes(mockPresignService, mockLogger);
    });

    describe('constructor', () => {
        it('should create instance with presign service and logger', () => {
            expect(presignRoutes).toBeDefined();
            expect(presignRoutes['presignService']).toBe(mockPresignService);
            expect(presignRoutes['logger']).toBe(mockLogger);
        });

        it('should bind handler methods', () => {
            expect(presignRoutes.presignHandler).toBeDefined();
            expect(presignRoutes.downloadFileHandler).toBeDefined();
        });
    });

    describe('presignHandler', () => {
        beforeEach(() => {
            (mockContext.get as MockedFunction<any>).mockReturnValue('req-123');
            (mockContext.req.parseBody as MockedFunction<any>).mockResolvedValue({
                file: mockFile,
                config: null
            });
        });

        it('should handle successful presign request with default config', async () => {
            (mockPresignService.createPresign as MockedFunction<any>).mockResolvedValue({
                file: mockUploxFile,
                error: null,
                scanResult: mockScanResult
            });

            const response = await presignRoutes.presignHandler(mockContext);

            expect(mockPresignService.createPresign).toHaveBeenCalledWith(
                'req-123',
                'file-123',
                mockFile,
                {
                    timeoutMs: 10000,
                    algorithm: 'all',
                    skipScan: false
                }
            );

            expect(mockContext.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    requestId: 'req-123',
                    data: mockUploxFile.toJSON(),
                    error: undefined,
                    scanResult: mockScanResult
                }),
                200
            );

            expect(mockLogger.info).toHaveBeenCalledWith('[Presign] Response', expect.any(Object));
        });

        it('should handle successful presign request with valid config', async () => {
            const customConfig = {
                timeoutMs: 5000,
                algorithm: 'sha256' as const,
                skipScan: true
            };

            (mockContext.req.parseBody as MockedFunction<any>).mockResolvedValue({
                file: mockFile,
                config: JSON.stringify(customConfig)
            });

            (mockPresignService.createPresign as MockedFunction<any>).mockResolvedValue({
                file: mockUploxFile,
                error: null,
                scanResult: mockScanResult
            });

            await presignRoutes.presignHandler(mockContext);

            expect(mockPresignService.createPresign).toHaveBeenCalledWith(
                'req-123',
                'file-123',
                mockFile,
                expect.objectContaining(customConfig)
            );

            expect(mockLogger.info).toHaveBeenCalledWith('[Presign] Merged config', expect.any(Object));
        });

        it('should return error for invalid config JSON syntax', async () => {
            (mockContext.req.parseBody as MockedFunction<any>).mockResolvedValue({
                file: mockFile,
                config: 'invalid json'
            });

            const response = await presignRoutes.presignHandler(mockContext);

            expect(mockContext.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    requestId: 'req-123',
                    data: null,
                    error: 'Invalid config',
                    statusCode: 400
                }),
                400
            );

            expect(mockLogger.error).toHaveBeenCalledWith('[Presign] Invalid config', expect.any(Object));
        });

        it('should return error for invalid config schema', async () => {
            (mockContext.req.parseBody as MockedFunction<any>).mockResolvedValue({
                file: mockFile,
                config: JSON.stringify({ algorithm: 'invalid' })
            });

            const response = await presignRoutes.presignHandler(mockContext);

            expect(mockContext.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    requestId: 'req-123',
                    data: null,
                    error: expect.stringContaining('Expected'),
                    statusCode: 400
                }),
                400
            );

            expect(mockLogger.error).toHaveBeenCalledWith('[Presign] Invalid config', expect.any(Object));
        });

        it('should return error when file is missing', async () => {
            (mockContext.req.parseBody as MockedFunction<any>).mockResolvedValue({
                file: null,
                config: null
            });

            const response = await presignRoutes.presignHandler(mockContext);

            expect(mockContext.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    requestId: 'req-123',
                    data: null,
                    error: 'File is required',
                    statusCode: 400
                }),
                400
            );

            expect(mockLogger.error).toHaveBeenCalledWith('[Presign] File is required', expect.any(Object));
        });

        it('should handle service error', async () => {
            const serviceError = new Error('Service error');
            (mockPresignService.createPresign as MockedFunction<any>).mockResolvedValue({
                file: mockUploxFile,
                error: serviceError,
                scanResult: mockScanResult
            });

            const response = await presignRoutes.presignHandler(mockContext);

            expect(mockContext.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    requestId: 'req-123',
                    data: mockUploxFile.toJSON(),
                    error: 'Service error',
                    scanResult: mockScanResult
                }),
                400
            );

            expect(mockLogger.error).toHaveBeenCalledWith('[Presign] Error', expect.any(Object));
        });

        it('should generate requestId when not provided in context', async () => {
            (mockContext.get as MockedFunction<any>).mockReturnValue(null);
            (mockPresignService.createPresign as MockedFunction<any>).mockResolvedValue({
                file: mockUploxFile,
                error: null,
                scanResult: mockScanResult
            });

            await presignRoutes.presignHandler(mockContext);

            expect(mockGenerateId).toHaveBeenCalledWith(ResourceType.REQUEST);
        });

        it('should handle non-string config gracefully', async () => {
            (mockContext.req.parseBody as MockedFunction<any>).mockResolvedValue({
                file: mockFile,
                config: { algorithm: 'sha256' } // Non-string config
            });

            (mockPresignService.createPresign as MockedFunction<any>).mockResolvedValue({
                file: mockUploxFile,
                error: null,
                scanResult: mockScanResult
            });

            await presignRoutes.presignHandler(mockContext);

            // Should use default config when config is not a string
            expect(mockPresignService.createPresign).toHaveBeenCalledWith(
                'req-123',
                'file-123',
                mockFile,
                {
                    timeoutMs: 10000,
                    algorithm: 'all',
                    skipScan: false
                }
            );
        });
    });

    describe('downloadFileHandler', () => {
        it('should return fileId from params', async () => {
            const fileId = 'test-file-id';
            (mockContext.req.param as MockedFunction<any>).mockReturnValue(fileId);

            const response = await presignRoutes.downloadFileHandler(mockContext);

            expect(mockContext.req.param).toHaveBeenCalledWith('fileId');
            expect(mockContext.json).toHaveBeenCalledWith({ fileId }, 200);
        });
    });

    describe('getRoutes', () => {
        it('should return correct route definitions', () => {
            const routes = presignRoutes.getRoutes();

            expect(routes).toHaveLength(2);
            expect(routes[0]).toEqual({
                path: '/presign',
                method: 'POST',
                handler: presignRoutes.presignHandler
            });
            expect(routes[1]).toEqual({
                path: '/presign/:fileId/download',
                method: 'GET',
                handler: presignRoutes.downloadFileHandler
            });
        });
    });

    describe('attachRouteMethod', () => {
        let mockApp: Hono<any>;

        beforeEach(() => {
            mockApp = {
                post: vi.fn(),
                get: vi.fn(),
                put: vi.fn(),
                delete: vi.fn(),
                patch: vi.fn()
            } as any;
        });

        it('should attach POST route correctly', () => {
            const route = { path: '/test', method: 'POST' as const, handler: vi.fn() };
            presignRoutes.attachRouteMethod(mockApp, route);
            expect(mockApp.post).toHaveBeenCalledWith('/test', route.handler);
        });

        it('should attach GET route correctly', () => {
            const route = { path: '/test', method: 'GET' as const, handler: vi.fn() };
            presignRoutes.attachRouteMethod(mockApp, route);
            expect(mockApp.get).toHaveBeenCalledWith('/test', route.handler);
        });

        it('should attach PUT route correctly', () => {
            const route = { path: '/test', method: 'PUT' as const, handler: vi.fn() };
            presignRoutes.attachRouteMethod(mockApp, route);
            expect(mockApp.put).toHaveBeenCalledWith('/test', route.handler);
        });

        it('should attach DELETE route correctly', () => {
            const route = { path: '/test', method: 'DELETE' as const, handler: vi.fn() };
            presignRoutes.attachRouteMethod(mockApp, route);
            expect(mockApp.delete).toHaveBeenCalledWith('/test', route.handler);
        });

        it('should attach PATCH route correctly', () => {
            const route = { path: '/test', method: 'PATCH' as const, handler: vi.fn() };
            presignRoutes.attachRouteMethod(mockApp, route);
            expect(mockApp.patch).toHaveBeenCalledWith('/test', route.handler);
        });

        it('should throw error for unsupported method', () => {
            const route = { path: '/test', method: 'OPTIONS' as any, handler: vi.fn() };
            expect(() => presignRoutes.attachRouteMethod(mockApp, route))
                .toThrow('Method OPTIONS not supported');
        });
    });

    describe('attachRoutes', () => {
        let mockApp: Hono<any>;

        beforeEach(() => {
            mockApp = {
                post: vi.fn(),
                get: vi.fn(),
                put: vi.fn(),
                delete: vi.fn(),
                patch: vi.fn()
            } as any;
        });

        it('should attach all routes and log each attachment', () => {
            presignRoutes.attachRoutes(mockApp);

            expect(mockApp.post).toHaveBeenCalledWith('/presign', presignRoutes.presignHandler);
            expect(mockApp.get).toHaveBeenCalledWith('/presign/:fileId/download', presignRoutes.downloadFileHandler);

            expect(mockLogger.info).toHaveBeenCalledWith('[Presign] Attached route', {
                path: '/presign',
                method: 'POST'
            });
            expect(mockLogger.info).toHaveBeenCalledWith('[Presign] Attached route', {
                path: '/presign/:fileId/download',
                method: 'GET'
            });
        });
    });
});
