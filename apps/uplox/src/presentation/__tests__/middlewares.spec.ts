import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
    requestIdMiddleware,
    metricsFailedCounterMiddleware,
    metricsUploadRequestDurationMillisMiddlware,
    metricsThroughputBytesPerSecMiddleware,
    metricsHealthCheckLatencyMillisMiddleware,
} from '../middlewares';
import { genId } from '@shared/utils/gen';
import { Context } from 'hono';
import { UploxAppEnv } from '@application/app-env';
import { AppMetrics } from '@application/app-metric';

// Mock the genId function
vi.mock('@shared/utils/gen', () => ({
    genId: vi.fn(),
}));

describe('Middleware Tests', () => {
    describe('requestIdMiddleware', () => {
        let mockContext: Partial<Context<UploxAppEnv, any, {}>>;
        let mockNext: ReturnType<typeof vi.fn>;
        let mockGenId: ReturnType<typeof vi.fn>;

        beforeEach(() => {
            // Reset all mocks before each test
            vi.clearAllMocks();

            // Setup mock context with set method
            mockContext = {
                set: vi.fn(),
            };

            // Setup mock next function
            mockNext = vi.fn().mockResolvedValue(undefined);

            // Setup mock genId
            mockGenId = vi.mocked(genId);
        });

        it('should generate a request ID with "req" prefix', async () => {
            // Arrange
            const expectedRequestId = 'req_123456789';
            mockGenId.mockReturnValue(expectedRequestId);

            // Act
            await requestIdMiddleware(mockContext as Context<UploxAppEnv, any, {}>, mockNext);

            // Assert
            expect(mockGenId).toHaveBeenCalledWith('req');
            expect(mockGenId).toHaveBeenCalledTimes(1);
        });

        it('should set the generated request ID in context', async () => {
            // Arrange
            const expectedRequestId = 'req_abcdef123';
            mockGenId.mockReturnValue(expectedRequestId);

            // Act
            await requestIdMiddleware(mockContext as Context<UploxAppEnv, any, {}>, mockNext);

            // Assert
            expect(mockContext.set).toHaveBeenCalledWith('requestId', expectedRequestId);
            expect(mockContext.set).toHaveBeenCalledTimes(1);
        });

        it('should call the next function', async () => {
            // Arrange
            mockGenId.mockReturnValue('req_test123');

            // Act
            await requestIdMiddleware(mockContext as Context<UploxAppEnv, any, {}>, mockNext);

            // Assert
            expect(mockNext).toHaveBeenCalledTimes(1);
        });

        it('should return the result of next function', async () => {
            // Arrange
            mockGenId.mockReturnValue('req_test456');
            mockNext.mockResolvedValue(undefined);

            // Act
            const result = await requestIdMiddleware(mockContext as Context<UploxAppEnv, any, {}>, mockNext);

            // Assert
            expect(result).toBeUndefined();
        });

        it('should handle next function rejection', async () => {
            // Arrange
            const error = new Error('Next function failed');
            mockGenId.mockReturnValue('req_error123');
            mockNext.mockRejectedValue(error);

            // Act & Assert
            await expect(requestIdMiddleware(mockContext as Context<UploxAppEnv, any, {}>, mockNext)).rejects.toThrow(
                'Next function failed',
            );

            // Verify that genId and context.set were still called
            expect(mockGenId).toHaveBeenCalledWith('req');
            expect(mockContext.set).toHaveBeenCalledWith('requestId', 'req_error123');
        });

        it('should execute operations in correct order', async () => {
            // Arrange
            const expectedRequestId = 'req_order123';
            mockGenId.mockReturnValue(expectedRequestId);

            const callOrder: string[] = [];
            mockGenId.mockImplementation((prefix: string) => {
                callOrder.push('genId');
                return expectedRequestId;
            });

            mockContext.set = vi.fn().mockImplementation(() => {
                callOrder.push('context.set');
            });

            mockNext.mockImplementation(async () => {
                callOrder.push('next');
            });

            // Act
            await requestIdMiddleware(mockContext as Context<UploxAppEnv, any, {}>, mockNext);

            // Assert
            expect(callOrder).toEqual(['genId', 'context.set', 'next']);
        });
    });

    describe('metricsFailedCounterMiddleware', () => {
        let mockContext: Partial<Context<UploxAppEnv, any, {}>>;
        let mockNext: ReturnType<typeof vi.fn>;
        let mockMetrics: AppMetrics;
        let middleware: ReturnType<typeof metricsFailedCounterMiddleware>;

        beforeEach(() => {
            vi.clearAllMocks();

            // Setup mock context
            const mockRes = { status: 200 };
            mockContext = {
                req: {
                    path: '/upload',
                    method: 'POST',
                } as any,
                res: mockRes as any,
            };

            // Setup mock next function
            mockNext = vi.fn().mockResolvedValue(undefined);

            // Setup mock metrics
            mockMetrics = {
                apiErrorsTotal: vi.fn().mockResolvedValue(undefined),
            } as any;

            // Create middleware instance
            middleware = metricsFailedCounterMiddleware(mockMetrics);
        });

        it('should not call apiErrorsTotal for successful requests (status < 400)', async () => {
            // Arrange
            (mockContext.res as any).status = 200;

            // Act
            await middleware(mockContext as Context<UploxAppEnv, any, {}>, mockNext);

            // Assert
            expect(mockMetrics.apiErrorsTotal).not.toHaveBeenCalled();
            expect(mockNext).toHaveBeenCalledTimes(1);
        });

        it('should call apiErrorsTotal for client errors (status >= 400)', async () => {
            // Arrange
            (mockContext.res as any).status = 400;

            // Act
            await middleware(mockContext as Context<UploxAppEnv, any, {}>, mockNext);

            // Assert
            expect(mockMetrics.apiErrorsTotal).toHaveBeenCalledWith('POST', '/upload', '400');
            expect(mockNext).toHaveBeenCalledTimes(1);
        });

        it('should call apiErrorsTotal for server errors (status >= 500)', async () => {
            // Arrange
            (mockContext.res as any).status = 500;

            // Act
            await middleware(mockContext as Context<UploxAppEnv, any, {}>, mockNext);

            // Assert
            expect(mockMetrics.apiErrorsTotal).toHaveBeenCalledWith('POST', '/upload', '500');
            expect(mockNext).toHaveBeenCalledTimes(1);
        });

        it('should call apiErrorsTotal when an error is thrown', async () => {
            // Arrange
            const error = new Error('Request failed');
            mockNext.mockImplementation(async () => {
                // Simulate error handler setting status code before throwing
                (mockContext.res as any).status = 500;
                throw error;
            });

            // Act & Assert
            await expect(middleware(mockContext as Context<UploxAppEnv, any, {}>, mockNext)).rejects.toThrow(
                'Request failed',
            );

            expect(mockMetrics.apiErrorsTotal).toHaveBeenCalledWith('POST', '/upload', '500');
        });

        it('should work with different HTTP methods and routes', async () => {
            // Arrange
            (mockContext.req as any).method = 'GET';
            (mockContext.req as any).path = '/download';
            (mockContext.res as any).status = 404;

            // Act
            await middleware(mockContext as Context<UploxAppEnv, any, {}>, mockNext);

            // Assert
            expect(mockMetrics.apiErrorsTotal).toHaveBeenCalledWith('GET', '/download', '404');
        });
    });

    describe('metricsUploadRequestDurationMillisMiddlware', () => {
        let mockContext: Partial<Context<UploxAppEnv, any, {}>>;
        let mockNext: ReturnType<typeof vi.fn>;
        let mockMetrics: AppMetrics;
        let middleware: ReturnType<typeof metricsUploadRequestDurationMillisMiddlware>;

        beforeEach(() => {
            vi.clearAllMocks();
            vi.useFakeTimers();

            // Setup mock context
            const mockRes = { status: 200 };
            mockContext = {
                req: {
                    path: '/upload',
                    method: 'POST',
                } as any,
                res: mockRes as any,
            };

            // Setup mock next function
            mockNext = vi.fn().mockResolvedValue(undefined);

            // Setup mock metrics
            mockMetrics = {
                uploadRequestDurationMillis: vi.fn().mockResolvedValue(undefined),
            } as any;

            // Create middleware instance
            middleware = metricsUploadRequestDurationMillisMiddlware(mockMetrics);
        });

        afterEach(() => {
            vi.useRealTimers();
        });

        it('should measure request duration for successful requests', async () => {
            // Arrange
            vi.setSystemTime(new Date('2023-01-01T00:00:00.000Z'));

            // Act
            const middlewarePromise = middleware(mockContext as Context<UploxAppEnv, any, {}>, mockNext);

            // Advance time by 100ms
            vi.advanceTimersByTime(100);

            await middlewarePromise;

            // Assert
            expect(mockMetrics.uploadRequestDurationMillis).toHaveBeenCalledWith(100, 'POST', '/upload', '200');
        });

        it('should measure request duration even when an error is thrown', async () => {
            // Arrange
            vi.setSystemTime(new Date('2023-01-01T00:00:00.000Z'));
            const error = new Error('Request failed');
            mockNext.mockRejectedValue(error);

            // Act & Assert
            const middlewarePromise = middleware(mockContext as Context<UploxAppEnv, any, {}>, mockNext);

            vi.advanceTimersByTime(50);

            await expect(middlewarePromise).rejects.toThrow('Request failed');

            expect(mockMetrics.uploadRequestDurationMillis).toHaveBeenCalledWith(50, 'POST', '/upload', '200');
        });

        it('should ignore /metrics path', async () => {
            // Arrange
            (mockContext.req as any).path = '/metrics';

            // Act
            await middleware(mockContext as Context<UploxAppEnv, any, {}>, mockNext);

            // Assert
            expect(mockMetrics.uploadRequestDurationMillis).not.toHaveBeenCalled();
        });

        it('should ignore /health path', async () => {
            // Arrange
            (mockContext.req as any).path = '/health';

            // Act
            await middleware(mockContext as Context<UploxAppEnv, any, {}>, mockNext);

            // Assert
            expect(mockMetrics.uploadRequestDurationMillis).not.toHaveBeenCalled();
        });
    });

    describe('metricsThroughputBytesPerSecMiddleware', () => {
        let mockContext: Partial<Context<UploxAppEnv, any, {}>>;
        let mockNext: ReturnType<typeof vi.fn>;
        let mockMetrics: AppMetrics;
        let middleware: ReturnType<typeof metricsThroughputBytesPerSecMiddleware>;

        beforeEach(() => {
            vi.clearAllMocks();

            // Setup mock context
            const mockRes = { status: 200 };
            mockContext = {
                req: {
                    method: 'POST',
                    header: vi.fn(),
                    formData: vi.fn(),
                } as any,
                res: mockRes as any,
            };

            // Setup mock next function
            mockNext = vi.fn().mockResolvedValue(undefined);

            // Setup mock metrics
            mockMetrics = {
                throughputBytesPerSecons: vi.fn().mockResolvedValue(undefined),
            } as any;

            // Create middleware instance
            middleware = metricsThroughputBytesPerSecMiddleware(mockMetrics);
        });

        it('should measure throughput using content-length header for 200 status', async () => {
            // Arrange
            (mockContext.req as any).header = vi.fn().mockReturnValue('1024');

            // Act
            await middleware(mockContext as Context<UploxAppEnv, any, {}>, mockNext);

            // Assert
            expect(mockMetrics.throughputBytesPerSecons).toHaveBeenCalledWith(1024, 'POST');
        });

        it('should measure throughput using form data file size when no content-length', async () => {
            // Arrange
            (mockContext.req as any).header = vi.fn().mockReturnValue(null);
            const mockFile = { size: 2048 } as File;
            const mockFormData = new Map([['file', mockFile]]);
            (mockContext.req as any).formData = vi.fn().mockResolvedValue(mockFormData);

            // Act
            await middleware(mockContext as Context<UploxAppEnv, any, {}>, mockNext);

            // Assert
            expect(mockMetrics.throughputBytesPerSecons).toHaveBeenCalledWith(2048, 'POST');
        });

        it('should not measure throughput for non-200 status codes', async () => {
            // Arrange
            (mockContext.res as any).status = 400;

            // Act
            await middleware(mockContext as Context<UploxAppEnv, any, {}>, mockNext);

            // Assert
            expect(mockMetrics.throughputBytesPerSecons).not.toHaveBeenCalled();
        });

        it('should handle error when parsing form data', async () => {
            // Arrange
            (mockContext.req as any).header = vi.fn().mockReturnValue(null);
            (mockContext.req as any).formData = vi.fn().mockRejectedValue(new Error('Form data error'));

            // Act
            await middleware(mockContext as Context<UploxAppEnv, any, {}>, mockNext);

            // Assert
            expect(mockMetrics.throughputBytesPerSecons).toHaveBeenCalledWith(0, 'POST');
        });

        it('should handle invalid content-length header', async () => {
            // Arrange
            (mockContext.req as any).header = vi.fn().mockReturnValue('invalid');

            // Act
            await middleware(mockContext as Context<UploxAppEnv, any, {}>, mockNext);

            // Assert
            expect(mockMetrics.throughputBytesPerSecons).not.toHaveBeenCalled();
        });

        it('should handle file with invalid size', async () => {
            // Arrange
            (mockContext.req as any).header = vi.fn().mockReturnValue(null);
            const mockFile = { size: NaN } as File;
            const mockFormData = new Map([['file', mockFile]]);
            (mockContext.req as any).formData = vi.fn().mockResolvedValue(mockFormData);

            // Act
            await middleware(mockContext as Context<UploxAppEnv, any, {}>, mockNext);

            // Assert
            expect(mockMetrics.throughputBytesPerSecons).not.toHaveBeenCalled();
        });

        it('should handle missing file in form data', async () => {
            // Arrange
            (mockContext.req as any).header = vi.fn().mockReturnValue(null);
            const mockFormData = new Map();
            (mockContext.req as any).formData = vi.fn().mockResolvedValue(mockFormData);

            // Act
            await middleware(mockContext as Context<UploxAppEnv, any, {}>, mockNext);

            // Assert
            expect(mockMetrics.throughputBytesPerSecons).not.toHaveBeenCalled();
        });

        it('should measure throughput even when an error is thrown', async () => {
            // Arrange
            const error = new Error('Request failed');
            (mockContext.res as any).status = 500;
            mockNext.mockRejectedValue(error);

            // Act & Assert
            await expect(middleware(mockContext as Context<UploxAppEnv, any, {}>, mockNext)).rejects.toThrow(
                'Request failed',
            );

            expect(mockMetrics.throughputBytesPerSecons).not.toHaveBeenCalled();
        });
    });

    describe('metricsHealthCheckLatencyMillisMiddleware', () => {
        let mockContext: Partial<Context<UploxAppEnv, any, {}>>;
        let mockNext: ReturnType<typeof vi.fn>;
        let mockMetrics: AppMetrics;
        let middleware: ReturnType<typeof metricsHealthCheckLatencyMillisMiddleware>;

        beforeEach(() => {
            vi.clearAllMocks();
            vi.useFakeTimers();

            // Setup mock context
            const mockRes = { status: 200 };
            mockContext = {
                req: {
                    path: '/health',
                    method: 'GET',
                } as any,
                res: mockRes as any,
            };

            // Setup mock next function
            mockNext = vi.fn().mockResolvedValue(undefined);

            // Setup mock metrics
            mockMetrics = {
                healthCheckLatencyMillis: vi.fn().mockResolvedValue(undefined),
            } as any;

            // Create middleware instance
            middleware = metricsHealthCheckLatencyMillisMiddleware(mockMetrics);
        });

        afterEach(() => {
            vi.useRealTimers();
        });

        it('should measure health check latency for /health path', async () => {
            // Arrange
            vi.setSystemTime(new Date('2023-01-01T00:00:00.000Z'));

            // Act
            const middlewarePromise = middleware(mockContext as Context<UploxAppEnv, any, {}>, mockNext);

            // Advance time by 25ms
            vi.advanceTimersByTime(25);

            await middlewarePromise;

            // Assert
            expect(mockMetrics.healthCheckLatencyMillis).toHaveBeenCalledWith(25, '/health');
        });

        it('should not measure latency for non-health paths', async () => {
            // Arrange
            (mockContext.req as any).path = '/upload';

            // Act
            await middleware(mockContext as Context<UploxAppEnv, any, {}>, mockNext);

            // Assert
            expect(mockMetrics.healthCheckLatencyMillis).not.toHaveBeenCalled();
        });

        it('should measure latency even when an error is thrown', async () => {
            // Arrange
            vi.setSystemTime(new Date('2023-01-01T00:00:00.000Z'));
            const error = new Error('Health check failed');
            mockNext.mockRejectedValue(error);

            // Act & Assert
            const middlewarePromise = middleware(mockContext as Context<UploxAppEnv, any, {}>, mockNext);

            vi.advanceTimersByTime(15);

            await expect(middlewarePromise).rejects.toThrow('Health check failed');

            expect(mockMetrics.healthCheckLatencyMillis).toHaveBeenCalledWith(15, '/health');
        });

        it('should handle different health check paths correctly', async () => {
            // Arrange
            (mockContext.req as any).path = '/healthz';

            // Act
            await middleware(mockContext as Context<UploxAppEnv, any, {}>, mockNext);

            // Assert
            expect(mockMetrics.healthCheckLatencyMillis).not.toHaveBeenCalled();
        });
    });
});
